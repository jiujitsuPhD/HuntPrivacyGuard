(() => {
  const DEFAULT_TERMS = ["Protected Name"];
  const form = document.getElementById("add-form");
  const input = document.getElementById("new-term");
  const list = document.getElementById("term-list");
  const count = document.getElementById("count");
  const emptyState = document.getElementById("empty-state");
  const lockedListMessage = document.getElementById("locked-list-message");
  const suggestedToggle = document.getElementById("suggested-toggle");
  const suggestedPanel = document.getElementById("suggested-panel");
  const suggestedList = document.getElementById("suggested-list");
  const autoBlockListButton = document.getElementById("auto-block-list");
  const status = document.getElementById("status");
  const blockedCount = document.getElementById("blocked-count");
  const pinForm = document.getElementById("pin-form");
  const pinInput = document.getElementById("pin-input");
  const pinAction = document.getElementById("pin-action");
  const pinTitle = document.getElementById("lock-title");
  const pinLabel = document.getElementById("pin-label");
  const pinHelp = document.getElementById("lock-help");
  const pinStatus = document.getElementById("pin-status");
  const changePinForm = document.getElementById("change-pin-form");
  const oldPinInput = document.getElementById("old-pin");
  const newPinInput = document.getElementById("new-pin");
  const confirmPinInput = document.getElementById("confirm-pin");
  const lockListButton = document.getElementById("lock-list-button");
  const changePinButton = document.getElementById("change-pin-button");
  const cancelChangePinButton = document.getElementById("cancel-change-pin");
  const forgotPinButton = document.getElementById("forgot-pin-button");
  const settingsLink = document.getElementById("settings-link");
  const settingsPanel = document.getElementById("settings-panel");
  const newTabUrlInput = document.getElementById("new-tab-url");
  const saveSettingsButton = document.getElementById("save-settings");
  const closeSettingsButton = document.getElementById("close-settings");
  const settingsStatus = document.getElementById("settings-status");
  const protectionState = document.getElementById("protection-state");
  const protectionHelp = document.getElementById("protection-help");
  const toggleProtectionButton = document.getElementById("toggle-protection");

  let terms = [];
  let pinHash = null;
  let isUnlocked = true;
  let changePinMode = false;
  let protectionEnabled = true;
  let newTabUrl = "https://www.google.com/";
  let suggestionsOpen = false;
  const SUGGESTED_DETAILS = [
    "First name",
    "Last name",
    "Full name",
    "Home address",
    "Birthday or date of birth",
    "Phone number",
    "Email address",
    "School name",
    "Parent or guardian name"
  ];
  const MAX_TERMS = 250;
  const SAFETY_TERMS = [
    "porn", "pornography", "xxx", "adult content", "explicit content", "adult site", "adult website",
    "onlyfans", "nude", "nudes", "nudity", "erotic", "erotica", "sex", "sexual", "sexual content",
    "sexting", "hookup", "hookups", "fetish", "cam site", "strip club", "gambling", "casino",
    "sports betting", "betting", "wager", "wagering", "poker", "blackjack", "roulette", "slot machine",
    "slots", "lottery", "sportsbook", "parlay", "baccarat", "online casino", "cryptocurrency", "crypto",
    "bitcoin", "btc", "ethereum", "eth", "altcoin", "altcoins", "meme coin", "memecoin", "crypto wallet",
    "wallet address", "blockchain", "nft", "nfts", "coinbase", "binance", "crypto exchange", "crypto trading",
    "private key", "seed phrase"
  ];

  function refreshBlockedCount() {
    chrome.storage.session.get({ blockedCount: 0 }, result => {
      blockedCount.textContent = String(result.blockedCount || 0);
    });
  }

  refreshBlockedCount();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "session" && changes.blockedCount) {
      blockedCount.textContent = String(changes.blockedCount.newValue || 0);
    }
    if (areaName === "local" && changes.protectionEnabled) {
      protectionEnabled = changes.protectionEnabled.newValue !== false;
      renderProtectionControls();
    }
  });

  function renderProtectionControls() {
    const locked = Boolean(pinHash && !isUnlocked);
    protectionState.textContent = protectionEnabled ? "On" : "Off";
    protectionState.classList.toggle("off", !protectionEnabled);
    toggleProtectionButton.textContent = protectionEnabled ? "Turn off" : "Turn on";
    toggleProtectionButton.disabled = locked;
    protectionHelp.textContent = locked
      ? "Unlock the list with your PIN to change protection."
      : protectionEnabled
        ? "Protected terms are checked before you submit text."
        : "Submissions will not be checked until protection is turned on.";
  }

  function saveTerms(message) {
    if (!isUnlocked) return;
    chrome.storage.local.set({ protectedTerms: terms }, () => {
      if (chrome.runtime.lastError) {
        status.textContent = "Could not save. Please try again.";
        return;
      }
      status.textContent = message;
    });
  }

  function renderPinControls() {
    const settingUp = !pinHash;
    const locked = Boolean(pinHash && !isUnlocked);
    form.hidden = locked;
    pinForm.hidden = Boolean(pinHash && isUnlocked) || changePinMode;
    changePinForm.hidden = !changePinMode;
    lockListButton.hidden = !pinHash || !isUnlocked || changePinMode;
    changePinButton.hidden = !pinHash || !isUnlocked || changePinMode;
    forgotPinButton.hidden = !locked;
    settingsLink.hidden = !isUnlocked || changePinMode;
    if (!isUnlocked || changePinMode) settingsPanel.hidden = true;
    suggestedToggle.disabled = locked;
    suggestedPanel.hidden = locked || !suggestionsOpen;

    if (settingUp) {
      pinTitle.textContent = "Set a list PIN";
      pinHelp.textContent = "The PIN stays on this device so it can be saved as a text file. Anyone using this computer may be able to read it.";
      pinLabel.textContent = "Create a PIN (4–12 digits)";
      pinAction.textContent = "Save PIN";
      pinInput.autocomplete = "new-password";
    } else if (locked) {
      pinTitle.textContent = "Your list is locked";
      pinHelp.textContent = "Enter your PIN to add or remove protected terms.";
      pinLabel.textContent = "Enter your PIN";
      pinAction.textContent = "Unlock";
      pinInput.autocomplete = "current-password";
    } else {
      pinTitle.textContent = changePinMode ? "Change your PIN" : "Your list is unlocked";
      pinHelp.textContent = changePinMode
        ? "Enter your current PIN, then choose a new one."
        : "Lock the list again or change the PIN.";
    }
    renderProtectionControls();
  }

  function renderSuggestions() {
    suggestedList.replaceChildren();
    SUGGESTED_DETAILS.forEach((category, index) => {
      const row = document.createElement("li");
      row.className = "suggested-row";
      const label = document.createElement("label");
      const inputId = `suggested-value-${index}`;
      label.htmlFor = inputId;
      label.textContent = category;
      const form = document.createElement("form");
      form.className = "entry-row";
      const valueInput = document.createElement("input");
      valueInput.id = inputId;
      valueInput.type = "text";
      valueInput.maxLength = 120;
      valueInput.placeholder = "Enter the value to block";
      valueInput.autocomplete = "off";
      const addButton = document.createElement("button");
      addButton.type = "submit";
      addButton.className = "suggested-add";
      addButton.textContent = "Add";
      form.append(valueInput, addButton);
      form.addEventListener("submit", event => {
        event.preventDefault();
        addProtectedTerm(valueInput.value);
      });
      row.append(label, form);
      suggestedList.append(row);
    });
  }

  function addProtectedTerm(value) {
    if (!isUnlocked) {
      status.textContent = "Unlock the list before adding protected terms.";
      return false;
    }
    const term = String(value).trim();
    if (!term) {
      status.textContent = "Enter the detail you want to protect.";
      return false;
    }
    if (terms.some(existing => existing.toLocaleLowerCase() === term.toLocaleLowerCase())) {
      status.textContent = "That detail is already on your protected list.";
      return false;
    }
    if (terms.length >= MAX_TERMS) {
      status.textContent = `Your list is full (${MAX_TERMS} terms maximum).`;
      return false;
    }
    terms.push(term);
    render();
    saveTerms("Protected list updated.");
    return true;
  }

  toggleProtectionButton.addEventListener("click", () => {
    if (pinHash && !isUnlocked) return;
    const nextState = !protectionEnabled;
    chrome.storage.local.set({ protectionEnabled: nextState }, () => {
      if (chrome.runtime.lastError) {
        status.textContent = "Could not change protection. Please try again.";
        return;
      }
      protectionEnabled = nextState;
      renderProtectionControls();
      status.textContent = nextState ? "Protection turned on." : "Protection turned off.";
    });
  });

  lockListButton.addEventListener("click", () => {
    isUnlocked = false;
    settingsPanel.hidden = true;
    status.textContent = "";
    pinStatus.textContent = "List locked.";
    render();
  });

  changePinButton.addEventListener("click", () => {
    changePinMode = true;
    settingsPanel.hidden = true;
    pinStatus.textContent = "";
    renderPinControls();
    oldPinInput.focus();
  });

  settingsLink.addEventListener("click", () => {
    if (!isUnlocked) return;
    newTabUrlInput.value = newTabUrl;
    settingsStatus.textContent = "";
    settingsPanel.hidden = false;
    newTabUrlInput.focus();
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsPanel.hidden = true;
    settingsStatus.textContent = "";
  });

  suggestedToggle.addEventListener("click", () => {
    if (pinHash && !isUnlocked) return;
    suggestionsOpen = !suggestionsOpen;
    suggestedToggle.textContent = suggestionsOpen ? "Hide suggested details" : "Suggested privacy details";
    renderSuggestions();
    suggestedPanel.hidden = !suggestionsOpen;
  });

  autoBlockListButton.addEventListener("click", () => {
    if (!isUnlocked) {
      status.textContent = "Unlock the list before adding protected terms.";
      return;
    }
    let added = 0;
    let alreadyPresent = 0;
    for (const term of SAFETY_TERMS) {
      const exists = terms.some(existing => existing.toLocaleLowerCase() === term.toLocaleLowerCase());
      if (exists) {
        alreadyPresent++;
        continue;
      }
      if (terms.length >= MAX_TERMS) break;
      terms.push(term);
      added++;
    }
    if (added) {
      render();
      saveTerms(`Added ${added} safety terms${alreadyPresent ? `; ${alreadyPresent} were already listed` : ""}.`);
    } else if (terms.length >= MAX_TERMS && alreadyPresent < SAFETY_TERMS.length) {
      status.textContent = `Your list is full (${MAX_TERMS} terms maximum).`;
    } else {
      status.textContent = "The safety word list is already on your protected list.";
    }
  });

  saveSettingsButton.addEventListener("click", () => {
    if (!isUnlocked) return;
    let value = newTabUrlInput.value.trim();
    if (!value) {
      settingsStatus.textContent = "Enter a website address.";
      newTabUrlInput.focus();
      return;
    }
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      settingsStatus.textContent = "Enter a valid website address.";
      newTabUrlInput.focus();
      return;
    }
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) {
      settingsStatus.textContent = "Use a website address that starts with http:// or https://.";
      newTabUrlInput.focus();
      return;
    }

    const normalizedUrl = parsed.href;
    chrome.storage.local.set({ newTabUrl: normalizedUrl }, () => {
      if (chrome.runtime.lastError) {
        settingsStatus.textContent = "Could not save this setting. Please try again.";
        return;
      }
      newTabUrl = normalizedUrl;
      newTabUrlInput.value = normalizedUrl;
      settingsStatus.textContent = "Saved. New tabs will open this page.";
    });
  });

  cancelChangePinButton.addEventListener("click", () => {
    changePinMode = false;
    changePinForm.reset();
    pinStatus.textContent = "PIN change cancelled.";
    renderPinControls();
  });

  forgotPinButton.addEventListener("click", () => {
    pinStatus.textContent = "PIN recovery is in Hunt's Privacy Guard Details: open chrome://extensions, choose Details, then use its Options section.";
  });

  function render() {
    const locked = Boolean(pinHash && !isUnlocked);
    list.replaceChildren();
    terms.forEach((term, index) => {
      if (locked) return;
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = term;
      if (isUnlocked) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-button";
        remove.setAttribute("aria-label", `Remove ${term}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          terms.splice(index, 1);
          render();
          saveTerms("Protected list updated.");
        });
        item.append(label, remove);
      } else {
        item.append(label);
      }
      list.append(item);
    });
    count.textContent = locked ? "—" : String(terms.length);
    list.hidden = locked;
    lockedListMessage.hidden = !locked;
    emptyState.hidden = locked || terms.length > 0;
    renderSuggestions();
    renderPinControls();
  }

  async function hashPin(pin) {
    const bytes = new TextEncoder().encode(pin);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  chrome.storage.local.get(
    { protectedTerms: DEFAULT_TERMS, pinHash: null, pinCode: null, protectionEnabled: true, newTabUrl: "https://www.google.com/" },
    result => {
      terms = Array.isArray(result.protectedTerms)
        ? result.protectedTerms.map(term => String(term).trim()).filter(Boolean).slice(0, MAX_TERMS)
        : [...DEFAULT_TERMS];
      pinHash = typeof result.pinHash === "string" ? result.pinHash : null;
      protectionEnabled = result.protectionEnabled !== false;
      newTabUrl = typeof result.newTabUrl === "string" ? result.newTabUrl : "https://www.google.com/";
      chrome.storage.local.remove("recoveryEmail");
      isUnlocked = !pinHash;
      render();
    }
  );

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!isUnlocked) return;
    if (addProtectedTerm(input.value)) {
      input.value = "";
      input.focus();
    }
  });

  pinForm.addEventListener("submit", async event => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    pinStatus.textContent = "";

    if (!/^\d{4,12}$/.test(pin)) {
      pinStatus.textContent = "Use a PIN with 4–12 digits.";
      pinInput.focus();
      return;
    }

    if (!pinHash) {
      try {
        const newHash = await hashPin(pin);
        chrome.storage.local.set({ pinHash: newHash, pinCode: pin }, () => {
          if (chrome.runtime.lastError) {
            pinStatus.textContent = "Could not save the PIN. Please try again.";
            return;
          }
          pinHash = newHash;
          isUnlocked = false;
          pinInput.value = "";
          pinStatus.textContent = "PIN saved. Your list is locked.";
          render();
        });
      } catch {
        pinStatus.textContent = "Could not create the PIN. Please try again.";
      }
      return;
    }

    try {
      if (await hashPin(pin) !== pinHash) {
        pinStatus.textContent = "That PIN didn’t match. Try again.";
        pinInput.select();
        return;
      }
      isUnlocked = true;
      pinInput.value = "";
      chrome.storage.local.set({ pinCode: pin }, () => {
        pinStatus.textContent = chrome.runtime.lastError
          ? "List unlocked, but the recovery PIN could not be saved."
          : "List unlocked.";
      });
      render();
    } catch {
      pinStatus.textContent = "Could not check the PIN. Please try again.";
    }
  });

  changePinForm.addEventListener("submit", async event => {
    event.preventDefault();
    pinStatus.textContent = "";
    const oldPin = oldPinInput.value.trim();
    const newPin = newPinInput.value.trim();
    const confirmation = confirmPinInput.value.trim();

    if (!/^\d{4,12}$/.test(oldPin)) {
      pinStatus.textContent = "Enter your current 4–12 digit PIN.";
      oldPinInput.focus();
      return;
    }
    if (newPin === oldPin) {
      pinStatus.textContent = "Choose a different PIN.";
      newPinInput.focus();
      return;
    }
    if (!/^\d{4,12}$/.test(newPin)) {
      pinStatus.textContent = "Your new PIN must have 4–12 digits.";
      newPinInput.focus();
      return;
    }
    if (confirmation !== newPin) {
      pinStatus.textContent = "The new PINs don’t match.";
      confirmPinInput.select();
      return;
    }

    try {
      if (await hashPin(oldPin) !== pinHash) {
        pinStatus.textContent = "Your current PIN didn’t match.";
        oldPinInput.select();
        return;
      }
      const newHash = await hashPin(newPin);
      chrome.storage.local.set({ pinHash: newHash, pinCode: newPin }, () => {
        if (chrome.runtime.lastError) {
          pinStatus.textContent = "Could not save the new PIN. Please try again.";
          return;
        }
        pinHash = newHash;
        isUnlocked = false;
        changePinMode = false;
        changePinForm.reset();
        pinStatus.textContent = "PIN changed. Your list is locked.";
        render();
      });
    } catch {
      pinStatus.textContent = "Could not change the PIN. Please try again.";
    }
  });
})();
