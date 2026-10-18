document.getElementById("download-pin").addEventListener("click", () => {
  const status = document.getElementById("status");
  chrome.storage.local.get({ pinCode: null }, result => {
    if (typeof result.pinCode !== "string" || !result.pinCode) {
      status.textContent = "No recoverable PIN is saved. Unlock Hunt's Privacy Guard and change the PIN first.";
      return;
    }

    const contents = [
      "Hunt's Privacy Guard PIN recovery",
      "Keep this file somewhere private and delete it when you no longer need it.",
      `PIN: ${result.pinCode}`,
      ""
    ].join("\n");
    const fileUrl = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
    chrome.downloads.download({
      url: fileUrl,
      filename: "Privacy_Guard_PIN.txt",
      conflictAction: "uniquify",
      saveAs: false
    }, downloadId => {
      const error = chrome.runtime.lastError;
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      status.textContent = error || downloadId === undefined
        ? "Could not download the PIN file. Check Chrome’s download settings."
        : "PIN file sent to Chrome Downloads.";
    });
  });
});
