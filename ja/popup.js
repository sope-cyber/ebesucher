const toggleBtn = document.getElementById("toggleBtn");
const tabList = document.getElementById("tabList");
const emptyCount = document.getElementById("emptyCount");
const reloadStatus = document.getElementById("reloadStatus");

function updateUI() {
  chrome.runtime.sendMessage({ action: "getStatus" }, (data) => {
    if (chrome.runtime.lastError || !data) {
      document.getElementById("reloadStatus").textContent = "⚠️ Keine Verbindung zum Hintergrunddienst";
      return;
    }

    toggleBtn.textContent = data.pluginActive ? "✅ Deaktivieren" : "⛔️ Aktivieren";
    emptyCount.textContent = data.emptyRounds;

    if (data.reloadCountdown > 0) {
      reloadStatus.textContent = `⏳ Reload in ${data.reloadCountdown}s`;
    } else {
      reloadStatus.textContent = `🔁 Keine Wartezeit aktiv`;
    }

    tabList.innerHTML = "";
    Object.entries(data.tabs).forEach(([tabId, tab]) => {
      const li = document.createElement("li");
      li.textContent = `🆔 ${tabId} – ${tab.title} – ${tab.remaining}s`;
      tabList.appendChild(li);
    });
  });
}

toggleBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "togglePlugin" }, (response) => {
    if (chrome.runtime.lastError) {
      alert("Fehler beim Umschalten: Hintergrund nicht erreichbar.");
    } else {
      updateUI();
    }
  });
});

setInterval(updateUI, 1000);
updateUI();