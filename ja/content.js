let emptyCheckCounter = 0;
let reloadTimeout = null;

// Nur bei manuellem Reload zurücksetzen
window.addEventListener("beforeunload", () => {
  if (performance.navigation.type === 1 && chrome?.storage?.local?.set) {
    chrome.storage.local.set({ emptyRounds: 0, reloadCountdown: 0 }).catch(err => {
      console.warn("❌ Fehler beim Reset vor Benutzer-Reload:", err);
    });
  }
});


setTimeout(startProcessing, 4000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 3000, max = 15000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateClick(el) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

async function startProcessing() {
  try {
    const { pluginActive, emptyRounds } = await chrome.storage.local.get(["pluginActive", "emptyRounds"]);
    emptyCheckCounter = emptyRounds ?? 0;
    if (pluginActive === false) return;

    const elements = Array.from(document.querySelectorAll(
      '.adshelper[data-value^="http://www.ebesucher.de/advertisement/show?surfForUser="]:not([data-processed="true"])'
    ));

    if (elements.length === 0) {
      emptyCheckCounter++;
      await chrome.storage.local.set({ emptyRounds: emptyCheckCounter });

      if (emptyCheckCounter >= 3) {
        const reloadDelay = 30 * 60 * 1000;
        const steps = reloadDelay / 1000;
        await chrome.storage.local.set({ reloadCountdown: steps });

        let i = steps;
        reloadTimeout = setInterval(async () => {
          i--;
          await chrome.storage.local.set({ reloadCountdown: i });
          if (i <= 0) {
            clearInterval(reloadTimeout);
            emptyCheckCounter = 0;
            location.reload();
          }
        }, 1000);
      } else {
        location.reload();
      }
      return;
    }

    // Zähler zurücksetzen nur bei Anzeige
    emptyCheckCounter = 0;
    await chrome.storage.local.set({ emptyRounds: 0 });

    const el = elements[0];
    const url = el.getAttribute("data-url") || el.getAttribute("data-value");
    const viewTime = parseInt(el.getAttribute("data-viewtime"), 10);
    if (!url || isNaN(viewTime)) return;

    el.dataset.processed = "true";
    el.style.border = "2px solid green";

    // Klick simulieren
    simulateClick(el);
    await sleep(500);

    await sleep(3000); // 3 Sekunden warten bis zur nächsten Anzeige

    scheduleNextCheck();
  } catch (err) {
    console.error("❌ Fehler in startProcessing:", err?.message || err);
  }
}

function scheduleNextCheck() {
  const delay = randomDelay();
  setTimeout(startProcessing, delay);
}