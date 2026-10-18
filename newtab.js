(() => {
  const DEFAULT_NEW_TAB_URL = "https://www.google.com/";

  function safeDestination(value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.href;
      }
    } catch {
      // Use the default destination if the saved value is invalid.
    }
    return DEFAULT_NEW_TAB_URL;
  }

  chrome.storage.local.get({ newTabUrl: DEFAULT_NEW_TAB_URL }, result => {
    location.replace(safeDestination(result.newTabUrl));
  });
})();
