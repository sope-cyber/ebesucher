const tabData = {}; // tabId → { title, remaining, total }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "openAndTrackTab") {
    const { url, duration, activate } = msg;
    chrome.tabs.create({ url, active: activate ?? false }, (tab) => {
      if (!tab?.id) {
        sendResponse({ success: false });
        return;
      }

      const tabId = tab.id;
      const seconds = Math.floor(duration / 1000);
      tabData[tabId] = { title: "Lädt...", remaining: seconds, total: seconds };

      const interval = setInterval(() => {
        if (tabData[tabId]) {
          tabData[tabId].remaining--;
          if (tabData[tabId].remaining <= 0) clearInterval(interval);
        }
      }, 1000);

      setTimeout(() => {
        chrome.tabs.remove(tabId, () => {
          delete tabData[tabId];
          chrome.runtime.sendMessage({ action: "tabClosed", tabId });
        });
      }, duration);
    });
    sendResponse({ success: true }); // <- das hat gefehlt!
    return true;
  }

  if (msg.action === "getStatus") {
    chrome.storage.local.get(["pluginActive", "emptyRounds", "reloadCountdown"]).then(data => {
      sendResponse({
        pluginActive: data.pluginActive ?? true,
        emptyRounds: data.emptyRounds ?? 0,
        reloadCountdown: data.reloadCountdown ?? 0,
        tabs: tabData
      });
    });
    return true;
  }

  if (msg.action === "togglePlugin") {
    chrome.storage.local.get("pluginActive").then(data => {
      const newState = !(data.pluginActive ?? true);
      chrome.storage.local.set({ pluginActive: newState }).then(() => {
        sendResponse({ pluginActive: newState });
      });
    });
    return true;
  }
});
