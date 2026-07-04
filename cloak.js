(function () {
  const CLOAK_MS = 3000;

  function shouldSkipCloak() {
    const params = new URLSearchParams(location.search);
    return (
      location.hash === "#cloakx" ||
      /\bembed=1\b/.test(location.search) ||
      params.get("jetstream_auth") === "1" ||
      params.get("chat_auth") === "1" ||
      params.get("signup_auth") === "1" ||
      params.has("auth_error") ||
      params.get("auth_done") === "1" ||
      /^\/owner-admin\/?$/.test(location.pathname) ||
      (/^\/jetstream\/?$/.test(location.pathname) && params.get("auth_done") === "1") ||
      /^\/jetstream(\/|$)/.test(location.pathname)
    );
  }

  if (shouldSkipCloak()) {
    return;
  }

  function revealSiteBranding() {
    if (typeof window.restoreAfterNasaSplash === "function") {
      window.restoreAfterNasaSplash();
      return;
    }
    window.applyInurlCloakToDocument?.(window.getCloakXInurlType?.(), { force: true });
  }

  function ensureCloakPanel(overlay) {
    let panel = overlay.querySelector(".site-cloak-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.className = "site-cloak-panel";
    while (overlay.firstChild) {
      panel.appendChild(overlay.firstChild);
    }
    overlay.appendChild(panel);
    return panel;
  }

  function detachCloakFrame(overlay) {
    const iframe = overlay.querySelector("iframe");
    if (!iframe) return;
    iframe.src = "about:blank";
    iframe.remove();
  }

  function finishCloak() {
    const overlay = document.getElementById("site-cloak");

    if (!overlay) {
      document.documentElement.classList.remove("is-cloaked");
      revealSiteBranding();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      document.documentElement.classList.remove("is-cloaked");
      overlay.remove();
      revealSiteBranding();
      return;
    }

    document.documentElement.classList.remove("is-cloaked");
    document.documentElement.classList.add("cloak-revealing");

    ensureCloakPanel(overlay);

    let fallbackTimer;

    function cleanup() {
      window.clearTimeout(fallbackTimer);
      detachCloakFrame(overlay);
      overlay.remove();
      document.documentElement.classList.remove("cloak-revealing");
      revealSiteBranding();
    }

    const startOut = () => {
      overlay.classList.add("site-cloak-out");
      overlay.addEventListener(
        "animationend",
        (event) => {
          if (event.animationName === "cloak-fall-back") cleanup();
        },
        { once: true }
      );
      fallbackTimer = window.setTimeout(cleanup, 1400);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(startOut);
    });
  }

  function ensureCloak() {
    document.documentElement.classList.add("is-cloaked");
    window.applyNasaSplashCloakToDocument?.();

    let overlay = document.getElementById("site-cloak");
    if (!overlay && document.body) {
      overlay = document.createElement("div");
      overlay.id = "site-cloak";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML =
        '<div class="site-cloak-panel"><iframe src="/cloak/nasa.html" title="NASA" referrerpolicy="no-referrer" loading="eager"></iframe></div>';
      document.body.insertBefore(overlay, document.body.firstChild);
    }

    window.setTimeout(finishCloak, CLOAK_MS);
  }

  if (document.body) {
    ensureCloak();
  } else {
    document.addEventListener("DOMContentLoaded", ensureCloak, { once: true });
  }
})();
