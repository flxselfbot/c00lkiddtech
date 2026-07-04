(function (global) {
  const CLOAKX_INURL_TYPE_KEY = "cloakxInurlType";
  const CLOAKX_USER_EMAIL_KEY = "cloakxUserEmail";
  const SITE_CLOAK_TITLE = "c00lkiddtech";
  const SITE_CLOAK_FAVICON = "/favicon.ico";
  const NASA_CLOAK_TITLE = "NASA";
  const NASA_CLOAK_FAVICON =
    "https://www.nasa.gov/wp-content/plugins/nasa-hds-core-setup/assets/favicons/favicon-16x16.png";
  const NASA_EMBED_DESCRIPTION =
    "NASA.gov brings you the latest news, images and videos from America's space agency, pioneering the future in space exploration, scientific discovery and aeronautics research.";
  const NASA_EMBED_IMAGE =
    "https://www.nasa.gov/wp-content/uploads/2018/07/174116main_2006_01777_highres.jpg";
  const NASA_EMBED_URL = "https://www.nasa.gov/";

  const CLOAKX_INURL_TYPES = [
    {
      id: "new-tab",
      label: "Default",
      title: SITE_CLOAK_TITLE,
      favicon: SITE_CLOAK_FAVICON,
    },
    {
      id: "google",
      label: "Google",
      title: "Google",
      favicon: "https://www.google.com/favicon.ico",
    },
    {
      id: "ixl",
      label: "IXL",
      title: "IXL",
      favicon: "https://www.ixl.com/favicon.ico",
    },
    {
      id: "google-classroom",
      label: "Google Classroom",
      title: "Home - Classroom",
      favicon: "https://www.gstatic.com/classroom/logo_square_rounded.svg",
    },
    {
      id: "gmail",
      label: "Gmail",
      title: "Inbox - Gmail",
      favicon: "https://ssl.gstatic.com/ui/v1/icons/mail/images/favicon_gmail_2026_v2.ico",
    },
    {
      id: "google-drive",
      label: "Google Drive",
      title: "Home - Google Drive",
      favicon:
        "https://ssl.gstatic.com/images/branding/productlogos/drive_2026/v2/ico/drive_2026_32dp.ico",
    },
  ];

  function stashCloakXUserEmail(email) {
    const normalized = String(email || "").trim();
    if (!normalized) return;
    try {
      global.localStorage.setItem(CLOAKX_USER_EMAIL_KEY, normalized);
    } catch (_) {}
  }

  function clearCloakXUserEmail() {
    try {
      global.localStorage.removeItem(CLOAKX_USER_EMAIL_KEY);
    } catch (_) {}
  }

  function getCloakXUserEmail() {
    try {
      const raw = global.sessionStorage.getItem("jetstream-auth-user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) return String(parsed.email).trim();
      }
    } catch (_) {}
    try {
      const saved = global.localStorage.getItem(CLOAKX_USER_EMAIL_KEY);
      if (saved) return saved.trim();
    } catch (_) {}
    return "";
  }

  function resolveCloakXTitle(type) {
    if (!type) return SITE_CLOAK_TITLE;
    if (type.id === "new-tab") return SITE_CLOAK_TITLE;
    if (type.id === "gmail") {
      const email = getCloakXUserEmail();
      return email ? `Inbox - ${email} - Gmail` : type.title;
    }
    return type.title;
  }

  function withResolvedCloakXTitle(type) {
    if (!type) return type;
    return { ...type, title: resolveCloakXTitle(type) };
  }

  function getCloakXInurlType(id) {
    if (!id) {
      try {
        const select = global.document?.getElementById("cloakxInurlType");
        if (select?.value) id = select.value;
      } catch (_) {}
    }
    if (id) {
      const match = CLOAKX_INURL_TYPES.find((entry) => entry.id === id);
      if (match) return withResolvedCloakXTitle(match);
    }
    let saved = "new-tab";
    try {
      saved = global.localStorage.getItem(CLOAKX_INURL_TYPE_KEY) || "new-tab";
    } catch (_) {}
    const type = CLOAKX_INURL_TYPES.find((entry) => entry.id === saved) || CLOAKX_INURL_TYPES[0];
    return withResolvedCloakXTitle(type);
  }

  function isNasaSplashActive() {
    const root = global.document?.documentElement;
    if (!root) return false;
    return root.classList.contains("is-cloaked") || root.classList.contains("cloak-revealing");
  }

  function setDocumentFavicon(href, { svg = false, png = false } = {}) {
    let icon = global.document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = global.document.createElement("link");
      icon.rel = "icon";
      global.document.head.appendChild(icon);
    }
    if (!icon.hasAttribute("data-site-icon")) {
      icon.setAttribute("data-site-icon", icon.getAttribute("href") || SITE_CLOAK_FAVICON);
    }
    icon.setAttribute("href", href);
    if (svg) {
      icon.setAttribute("type", "image/svg+xml");
    } else if (png) {
      icon.setAttribute("type", "image/png");
    } else {
      icon.setAttribute("type", "image/x-icon");
    }
  }

  function applyNasaSplashCloakToDocument() {
    if (!global.document) return;
    global.document.title = NASA_CLOAK_TITLE;
    setDocumentFavicon(NASA_CLOAK_FAVICON, { png: true });
  }

  function applyInurlCloakToDocument(type, options) {
    const force = options && options.force;
    if (!type || !global.document) return;
    if (!force && isNasaSplashActive()) return;
    global.document.title = resolveCloakXTitle(type);
    if (type.favicon) {
      setDocumentFavicon(type.favicon, {
        svg: type.favicon.endsWith(".svg"),
        png: type.favicon.endsWith(".png"),
      });
    } else {
      const icon = global.document.querySelector('link[rel="icon"]');
      setDocumentFavicon(icon?.getAttribute("data-site-icon") || SITE_CLOAK_FAVICON);
    }
  }

  function restoreAfterNasaSplash() {
    applyInurlCloakToDocument(getCloakXInurlType(), { force: true });
  }

  function escapeCloakHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cloakXHeadMarkup(type) {
    const title = escapeCloakHtml(resolveCloakXTitle(type));
    let tags = `<title>${title}</title>`;
    if (type.favicon) {
      const mime = type.favicon.endsWith(".svg") ? ' type="image/svg+xml"' : "";
      tags += `<link rel="icon"${mime} href="${escapeCloakHtml(type.favicon)}">`;
    }
    return tags;
  }

  function shouldKeepInurlDisguise() {
    return getCloakXInurlType().id !== "new-tab";
  }

  function refreshInurlCloakDisguise() {
    if (isNasaSplashActive()) return;
    applyInurlCloakToDocument(getCloakXInurlType());
  }

  async function refreshCloakXUserEmail() {
    const apiBase =
      global.__STATIC_MIRROR__ && global.__MIRROR_API__ ? global.__MIRROR_API__ : "";
    try {
      const res = await fetch(`${apiBase}/jetstream/api/session`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (data?.authenticated && data.email) {
        stashCloakXUserEmail(data.email);
        refreshInurlCloakDisguise();
        return data.email;
      }
    } catch (_) {}
    return getCloakXUserEmail();
  }

  global.CLOAKX_INURL_TYPE_KEY = CLOAKX_INURL_TYPE_KEY;
  global.SITE_CLOAK_TITLE = SITE_CLOAK_TITLE;
  global.SITE_CLOAK_FAVICON = SITE_CLOAK_FAVICON;
  global.NASA_CLOAK_TITLE = NASA_CLOAK_TITLE;
  global.NASA_CLOAK_FAVICON = NASA_CLOAK_FAVICON;
  global.NASA_EMBED_DESCRIPTION = NASA_EMBED_DESCRIPTION;
  global.NASA_EMBED_IMAGE = NASA_EMBED_IMAGE;
  global.NASA_EMBED_URL = NASA_EMBED_URL;
  global.applyNasaSplashCloakToDocument = applyNasaSplashCloakToDocument;
  global.CLOAKX_INURL_TYPES = CLOAKX_INURL_TYPES;
  global.getCloakXInurlType = getCloakXInurlType;
  global.getCloakXUserEmail = getCloakXUserEmail;
  global.stashCloakXUserEmail = stashCloakXUserEmail;
  global.clearCloakXUserEmail = clearCloakXUserEmail;
  global.applyInurlCloakToDocument = applyInurlCloakToDocument;
  global.restoreAfterNasaSplash = restoreAfterNasaSplash;
  global.cloakXHeadMarkup = cloakXHeadMarkup;
  global.shouldKeepInurlDisguise = shouldKeepInurlDisguise;
  global.refreshInurlCloakDisguise = refreshInurlCloakDisguise;
  global.refreshCloakXUserEmail = refreshCloakXUserEmail;
})(typeof window !== "undefined" ? window : globalThis);
