(function () {
  const host = location.hostname;
  const isPages = /\.pages\.dev$/i.test(host);
  const isJsdelivr = /(^|\.)jsdelivr\.net$/i.test(host);

  if (!isPages && !isJsdelivr) return;

  window.__STATIC_MIRROR__ = true;
  window.__MIRROR_API__ = "https://c00lkiddtech.live";

  if (isJsdelivr) {
    const path = location.pathname;
    const match = path.match(/^(\/gh\/[^/]+\/[^/@]+@[^/]+)(\/.*)?$/);
    if (match) {
      const filePart = match[2] || "/";
      let dir = filePart.replace(/[^/]+$/, "") || "/";
      if (!dir.endsWith("/")) dir += "/";
      const base = document.createElement("base");
      base.href = "https://cdn.jsdelivr.net" + match[1] + dir;
      document.head.prepend(base);
    }
  }

  document.documentElement.classList.add("static-mirror");

  const label = isJsdelivr ? "jsDelivr mirror" : "Static mirror";
  const banner = document.createElement("div");
  banner.className = "static-mirror-banner";
  banner.innerHTML =
    label +
    ' — static games hub (no chat/login). Full site: <a href="https://c00lkiddtech.live" rel="noopener">c00lkiddtech.live</a>';
  document.addEventListener("DOMContentLoaded", function () {
    document.body.prepend(banner);
  });
})();
