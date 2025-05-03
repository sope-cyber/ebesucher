const tabData = {}; // tabId → { title, remaining, total }
let lastTabSwitch = 0;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  const sourceTabId = details.sourceTabId;
  const newTabId = details.tabId;
  const url = details.url;

  console.log("🔄 Weitergeleiteter Tab erkannt:", url);

  if (tabData[sourceTabId]) {
    const original = tabData[sourceTabId];
    delete tabData[sourceTabId];

    tabData[newTabId] = {
      title: "Weitergeleitet",
      remaining: original.remaining,
      total: original.total
    };

    const interval = setInterval(() => {
      if (tabData[newTabId]) {
        tabData[newTabId].remaining--;
        if (tabData[newTabId].remaining <= 0) clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      chrome.tabs.remove(newTabId, () => {
        delete tabData[newTabId];
        chrome.runtime.sendMessage({ action: "tabClosed", tabId: newTabId });
      });
    }, original.total * 1000);
  }
});