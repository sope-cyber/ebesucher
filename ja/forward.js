setTimeout(() => {
  const realLink = document.querySelector('a[href*="surfdata/forward?method=click"]');
  if (realLink) {
    const url = realLink.href;
    console.log("🔁 Weiterleitung gefunden:", url);
    window.location.href = url;
  } else {
    console.warn("⚠️ Kein Weiterleitungslink gefunden.");
  }
}, 2000);