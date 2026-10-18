chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "PRIVACY_GUARD_BLOCKED") return;

  chrome.storage.session.get({ blockedCount: 0 }, result => {
    chrome.storage.session.set({ blockedCount: (result.blockedCount || 0) + 1 });
  });
});
