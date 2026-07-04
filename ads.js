function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function injectAdCode(container, code) {
  if (!container || !code?.trim()) return;
  const holder = document.createElement("div");
  holder.innerHTML = code.trim();

  holder.querySelectorAll("script").forEach((oldScript) => {
    const script = document.createElement("script");
    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    script.textContent = oldScript.textContent;
    oldScript.remove();
    container.appendChild(script);
  });

  while (holder.firstChild) {
    container.appendChild(holder.firstChild);
  }
}

function slotHasContent(slot) {
  return Boolean(slot.code?.trim());
}

async function renderAdsHaven({ containerId = "ads-slots", emptyId = "ads-empty", smartlinkId = "ads-smartlink" } = {}) {
  const container = document.getElementById(containerId);
  const emptyEl = emptyId ? document.getElementById(emptyId) : null;
  const smartlinkEl = smartlinkId ? document.getElementById(smartlinkId) : null;
  if (!container) return false;

  try {
    const res = await fetch("/api/ads");
    const data = await res.json();
    container.innerHTML = "";
    if (smartlinkEl) {
      smartlinkEl.classList.add("hidden");
      smartlinkEl.removeAttribute("href");
    }

    const entries = Object.entries(data.slots || {}).filter(([, slot]) => slotHasContent(slot));
    if (!data.enabled || entries.length === 0) {
      emptyEl?.classList.remove("hidden");
      return true;
    }

    emptyEl?.classList.add("hidden");

    for (const [, slot] of entries) {
      if (slot.hidden) {
        const holder = document.createElement("div");
        holder.hidden = true;
        document.body.appendChild(holder);
        injectAdCode(holder, slot.code);
        continue;
      }

      if (slot.type === "link") {
        if (smartlinkEl) {
          smartlinkEl.href = slot.code.trim();
          smartlinkEl.textContent = slot.linkText || "SmartLink (click if you want, i dont recommend it tho)";
          smartlinkEl.classList.remove("hidden");
        }
        continue;
      }

      injectAdCode(container, slot.code);
    }

    return true;
  } catch {
    emptyEl?.classList.remove("hidden");
    if (emptyEl) emptyEl.textContent = "Could not load ads.";
    return false;
  }
}

function setupAdsAutoRefresh() {
  const checkbox = document.getElementById("autoRefresh");
  if (!checkbox) return;

  const scheduleRefresh = () => {
    if (localStorage.getItem("adsAutoRefresh") !== "true") return;
    setTimeout(() => location.reload(), 7000);
  };

  checkbox.checked = localStorage.getItem("adsAutoRefresh") === "true";
  checkbox.addEventListener("change", () => {
    localStorage.setItem("adsAutoRefresh", checkbox.checked ? "true" : "false");
    if (checkbox.checked) scheduleRefresh();
  });

  scheduleRefresh();
}

async function renderAds(slotsRootId, emptyId) {
  return renderAdsHaven({ containerId: slotsRootId, emptyId, smartlinkId: null });
}
