
(() => {
  // Avoid installing the guard more than once on the same page.
  if (window.__privacyGuardInstalled) return;
  window.__privacyGuardInstalled = true;

  const DEFAULT_TERMS = ["Protected Name"];
  let protectedTerms = DEFAULT_TERMS;
  let protectionEnabled = true;

  // Read the list locally from Chrome extension storage.
  chrome.storage.local.get(
    { protectedTerms: DEFAULT_TERMS, protectionEnabled: true },
    (result) => {
      protectedTerms = Array.isArray(result.protectedTerms)
        ? result.protectedTerms
            .map(term => String(term).trim())
            .filter(Boolean)
        : DEFAULT_TERMS;
      protectionEnabled = result.protectionEnabled !== false;
    }
  );

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.protectionEnabled) {
      protectionEnabled = changes.protectionEnabled.newValue !== false;
    }
    if (changes.protectedTerms) {
      protectedTerms = Array.isArray(changes.protectedTerms.newValue)
        ? changes.protectedTerms.newValue.map(term => String(term).trim()).filter(Boolean)
        : DEFAULT_TERMS;
    }
  });

  function getText(element) {
    if (!element) return "";

    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    ) {
      return element.value || "";
    }

    return element.innerText || element.textContent || "";
  }

  const FIELD_SELECTOR = [
    "textarea",
    'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"]',
    '[contenteditable="true"]',
    '[role="textbox"]'
  ].join(",");

  function isVisibleField(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && !element.disabled &&
      element.getAttribute("aria-hidden") !== "true";
  }

  function fieldsWithin(root) {
    if (!root) return [];
    const fields = [...root.querySelectorAll(FIELD_SELECTOR)];
    if (root.matches?.(FIELD_SELECTOR)) fields.unshift(root);
    return fields.filter(isVisibleField);
  }

  function fieldForAction(target) {
    const form = target.closest("form");
    if (form) {
      const formFields = fieldsWithin(form);
      const nonempty = formFields.filter(field => getText(field).trim());
      return nonempty[nonempty.length - 1] || formFields[formFields.length - 1] || null;
    }

    // Custom web apps often use buttons outside a form. Look nearby first.
    let container = target.parentElement;
    for (let depth = 0; container && depth < 5; depth++, container = container.parentElement) {
      const fields = fieldsWithin(container);
      const nonempty = fields.filter(field => getText(field).trim());
      if (nonempty.length) return nonempty[nonempty.length - 1];
    }
    return null;
  }

  function findMatchingTerm(text) {
    const normalizedText = text.toLocaleLowerCase();

    return protectedTerms.find(term =>
      normalizedText.includes(term.toLocaleLowerCase())
    );
  }

  function showWarning(term) {
    let warning = document.getElementById("privacy-guard-warning");

    if (!warning) {
      warning = document.createElement("div");
      warning.id = "privacy-guard-warning";

      Object.assign(warning.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: "2147483647",
        maxWidth: "360px",
        padding: "14px 18px",
        background: "#7f1d1d",
        color: "#ffffff",
        border: "2px solid #fecaca",
        borderRadius: "10px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.3)",
        fontSize: "14px",
        lineHeight: "1.5",
        fontFamily: "Arial, sans-serif"
      });

      document.documentElement.appendChild(warning);
    }

    warning.textContent =
      `Hunt's Privacy Guard blocked this message because it contains a protected term. ` +
      `Detected term: "${term}". Remove it or revise your message before sending.`;

    warning.style.display = "block";
  }

  function blockIfSensitive(text, event) {
    if (!protectionEnabled) return false;
    const term = findMatchingTerm(text);
    if (!term) return false;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    showWarning(term);
    chrome.runtime.sendMessage({ type: "PRIVACY_GUARD_BLOCKED" }, () => {
      // Read lastError to avoid an unchecked warning if Chrome is shutting down.
      void chrome.runtime.lastError;
    });
    console.warn("Hunt's Privacy Guard: message blocked.");
    return true;
  }

  function isComposer(element) {
    if (!(element instanceof Element)) return false;
    return element.matches(FIELD_SELECTOR);
  }

  function isSubmissionControl(element) {
    if (!(element instanceof Element)) return false;

    const button = element.closest("button");
    const inputButton = element.closest('input[type="submit"], input[type="image"]');
    const control = button || inputButton;
    if (!control) return false;

    if (control.type === "submit" || control.type === "image") return true;

    const marker = [
      control.getAttribute("data-testid") || "",
      control.getAttribute("aria-label") || "",
      control.getAttribute("title") || "",
      control.innerText || control.value || ""
    ].join(" ").toLowerCase();

    return (
      marker.includes("send-button") ||
      marker.includes("send message") ||
      marker === "send" ||
      marker.includes("submit") ||
      marker.includes("post")
    );
  }

  // Check Enter before the page's own handlers can submit the message.
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return;
    }

    if (!isComposer(event.target)) return;

    blockIfSensitive(getText(event.target), event);
  }, true);

  // Check standard submit controls and common custom Send/Post buttons.
  document.addEventListener("click", event => {
    if (!isSubmissionControl(event.target)) return;

    const composer = fieldForAction(event.target);
    if (composer) {
      blockIfSensitive(getText(composer), event);
    }
  }, true);

  // Backup check for standard form submissions.
  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const composer = fieldsWithin(form).filter(field => getText(field).trim()).pop() ||
      fieldsWithin(form).pop();

    if (composer) {
      blockIfSensitive(getText(composer), event);
    }
  }, true);

  console.info("Hunt's Privacy Guard loaded.");
})();
