
const DEFAULT_TERMS = ["Protected Name"];

const textarea = document.getElementById("terms");
const status = document.getElementById("status");

chrome.storage.local.get(
  { protectedTerms: DEFAULT_TERMS },
  result => {
    textarea.value = result.protectedTerms.join("\n");
  }
);

document.getElementById("save").addEventListener("click", () => {
  const terms = textarea.value
    .split(/\r?\n/)
    .map(term => term.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!terms.length) {
    status.textContent = "Enter at least one protected term.";
    return;
  }

  chrome.storage.local.set({ protectedTerms: terms }, () => {
    status.textContent = chrome.runtime.lastError
      ? "Error saving settings."
      : "Settings saved. Reload the test page.";
  });
});
