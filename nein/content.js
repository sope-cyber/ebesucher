let emptyCheckCounter = 0;
let reloadTimeout = null;

// Sicherer Reset nach manuellem Reload
window.addEventListener("DOMContentLoaded", () => {
  if (performance.navigation.type === 1) {
    try {
      chrome.runtime?.id && chrome.storage.local.set({ emptyRounds: 0, reloadCountdown: 0 }).catch(() => {});
    } catch (e) {
      console.warn("⚠️ Speicher beim DOMContentLoaded nicht verfügbar:", e);
    }
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
  const href = el.getAttribute("href");
  if (href?.startsWith("javascript:")) {
    console.warn("⚠️ Ignoriert: javascript:-URL");
    return;
  }

  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
  sleep(200).then(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
}

function sendMessageSafe(msg) {
  return new Promise((resolve, reject) => {
    let done = false;
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        done = true;
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    } catch (err) {
      reject(err);
    }
    setTimeout(() => {
      if (!done) reject(new Error("Timeout beim Senden der Nachricht."));
    }, 2000);
  });
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

    // Anzeige vorhanden: Zähler zurücksetzen
    emptyCheckCounter = 0;
    await chrome.storage.local.set({ emptyRounds: 0 });

    const el = elements[0];
    const url = el.getAttribute("data-url") || el.getAttribute("data-value");
    const viewTime = parseInt(el.getAttribute("data-viewtime"), 10);
    if (!url || isNaN(viewTime)) return;

    el.dataset.processed = "true";
    el.style.border = "2px solid green";
    el.removeAttribute("target");

    simulateClick(el);
    await sleep(500);

    await sendMessageSafe({
      action: "openAndTrackTab",
      url: url,
      duration: viewTime * 1000,
      activate: true
    });

    await sleep(3000);
    scheduleNextCheck();
  } catch (err) {
    console.error("❌ Fehler in startProcessing:", err?.message || err);
  }
}

function scheduleNextCheck() {
  const delay = randomDelay();
  setTimeout(startProcessing, delay);
}
