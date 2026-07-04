window.__STATIC_MIRROR__ = true;

function siteOrigin() {
  if (window.__STATIC_MIRROR__ && window.__MIRROR_API__) {
    return window.__MIRROR_API__;
  }
  return "";
}

function siteFetch(path, options) {
  return fetch(`${siteOrigin()}${path}`, options);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function isChromebook() {
  return Boolean(window.__IS_CHROMEBOOK__) || /CrOS/i.test(navigator.userAgent || "");
}

function show(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  const tab = document.getElementById(tabName);
  const button = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
  if (tab) tab.classList.add("active");
  if (button) button.classList.add("active");
  const onLinkTabs =
    tabName === "game-links" || tabName === "others" || tabName === "partners" || tabName === "link-checker";
  document.getElementById("linkCheckTabBar")?.classList.toggle(
    "hidden",
    tabName !== "game-links" && tabName !== "others" && tabName !== "partners"
  );
  if (!onLinkTabs) {
    document.getElementById("glFilterPanel")?.classList.add("hidden");
  }
}

function activeLinkCheckGridId() {
  const activeTab = document.querySelector(".tab.active")?.id;
  if (activeTab === "others") return "othersGrid";
  if (activeTab === "partners") return "partnersGrid";
  return "gamesGrid";
}


function loadAdsFrame(frame) {
  if (!frame || frame.src) return;
  const src = frame.dataset.src;
  if (src) frame.src = src;
}

function reloadAdsEmbed() {
  const frame = document.getElementById("ads-frame");
  if (!frame) return;
  frame.src = frame.dataset.src || "/ads.html";
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    show(tab);
    if (tab === "home") {
      if (typeof window.initHomeTab === "function") window.initHomeTab();
    }
    if (btn.dataset.tab === "ads") {
      loadAdsFrame(document.getElementById("ads-frame"));
    }
    if (btn.dataset.tab === "playables") {
      loadPlayables();
    }
    if (btn.dataset.tab === "shows") {
      if (typeof loadShowsCatalog === "function") loadShowsCatalog();
    }
    if (btn.dataset.tab === "game-links" || btn.dataset.tab === "others") {
      loadData();
    }
  });
});

function renderItems(containerId, items, openLabel, { linkCheck = false } = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `<div class="empty">Nothing here yet.</div>`;
    return;
  }
  items.forEach((item) => {
    const title = escapeHtml(item.title || "Untitled");
    const link = normalizeUrl(item.link || "");
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${title}</h3>
      <a class="card-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a>
      <div class="card-actions">
        <a class="open-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${openLabel}</a>
        ${linkCheck ? `<button type="button" class="link-check-btn" data-link="${escapeHtml(link)}">Check link</button>` : ""}
      </div>
      ${linkCheck ? `<p class="link-check-status" aria-live="polite"></p>` : ""}
    `;
    if (linkCheck) {
      card.querySelector(".link-check-btn")?.addEventListener("click", () => {
        void checkGameLink(card, link);
      });
    }
    container.appendChild(card);
  });
}

const GL_FILTER_STORAGE_KEY = "gl-link-check-filters";
const GNMATH_FILTER_STORAGE_KEY = "gnmath-link-check-filters";
const LINK_CHECK_SOURCE_KEY = "link-check-source";
let glFilterCatalog = [];

function blockerFilterStorageKey() {
  return linkCheckSource() === "gnmath" ? GNMATH_FILTER_STORAGE_KEY : GL_FILTER_STORAGE_KEY;
}

function usesBlockerFilters() {
  const source = linkCheckSource();
  return source === "glseries" || source === "gnmath";
}

function linkCheckSource() {
  const el =
    document.getElementById("linkCheckSource") || document.getElementById("linkCheckSourceBar");
  const value = el?.value || localStorage.getItem(LINK_CHECK_SOURCE_KEY) || "glseries";
  syncLinkCheckSourceSelects(value);
  return value;
}

function syncLinkCheckSourceSelects(value) {
  for (const id of ["linkCheckSource", "linkCheckSourceBar"]) {
    const select = document.getElementById(id);
    if (select && select.value !== value) select.value = value;
  }
}

function saveLinkCheckSource(value) {
  syncLinkCheckSourceSelects(value);
  try {
    localStorage.setItem(LINK_CHECK_SOURCE_KEY, value);
  } catch {}
}

function loadGlFilterSelection() {
  try {
    const raw = localStorage.getItem(blockerFilterStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveGlFilterSelection(ids) {
  try {
    localStorage.setItem(blockerFilterStorageKey(), JSON.stringify(ids));
  } catch {}
}

function getSelectedGlFilterIds() {
  const toggles = document.querySelectorAll(".gl-filter-toggle-input:checked");
  return Array.from(toggles)
    .map((el) => el.value)
    .filter(Boolean);
}

function syncGlFilterPanelVisibility() {
  const showFilters = usesBlockerFilters();
  for (const id of ["toggleGlFiltersBtn", "toggleGlFiltersBtnBar"]) {
    document.getElementById(id)?.toggleAttribute("hidden", !showFilters);
  }
  if (!showFilters) {
    document.getElementById("glFilterPanel")?.classList.add("hidden");
  }
  const desc = document.getElementById("glFilterPanelDesc");
  if (desc) {
    desc.textContent =
      linkCheckSource() === "gnmath"
        ? "Toggle which blockers run for GN-Math checks."
        : "Toggle which blockers run for GLSeries checks.";
  }
}

function toggleGlFilterPanel() {
  document.getElementById("glFilterPanel")?.classList.toggle("hidden");
}

function renderGlFilterGrid(filters) {
  const grid = document.getElementById("glFilterGrid");
  if (!grid) return;

  glFilterCatalog = filters;
  const saved = loadGlFilterSelection();
  const enabled = saved ? new Set(saved) : new Set(filters.map((f) => f.id));

  grid.innerHTML = filters
    .map((filter) => {
      const on = enabled.has(filter.id);
      return `
        <label class="gl-filter-card ${on ? "is-on" : "is-off"}">
          <input type="checkbox" class="gl-filter-toggle-input" value="${escapeHtml(filter.id)}" ${on ? "checked" : ""} />
          <span class="gl-filter-name">${escapeHtml(filter.name)}</span>
          <span class="gl-filter-state">${on ? "ON" : "OFF"}</span>
        </label>
      `;
    })
    .join("");

  grid.querySelectorAll(".gl-filter-toggle-input").forEach((input) => {
    input.addEventListener("change", () => {
      const card = input.closest(".gl-filter-card");
      card?.classList.toggle("is-on", input.checked);
      card?.classList.toggle("is-off", !input.checked);
      const state = card?.querySelector(".gl-filter-state");
      if (state) state.textContent = input.checked ? "ON" : "OFF";
      saveGlFilterSelection(getSelectedGlFilterIds());
    });
  });
}

function setAllGlFilters(checked) {
  document.querySelectorAll(".gl-filter-toggle-input").forEach((input) => {
    input.checked = checked;
    const card = input.closest(".gl-filter-card");
    card?.classList.toggle("is-on", checked);
    card?.classList.toggle("is-off", !checked);
    const state = card?.querySelector(".gl-filter-state");
    if (state) state.textContent = checked ? "ON" : "OFF";
  });
  saveGlFilterSelection(getSelectedGlFilterIds());
}

async function loadBlockerFilterCatalog(source) {
  const res = await fetch(`https://c00lkiddtech.live/api/link-check/filters?source=${encodeURIComponent(source)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.filters) ? data.filters : [];
}

async function initGlFilterControls() {
  const savedSource = localStorage.getItem(LINK_CHECK_SOURCE_KEY);
  if (savedSource) syncLinkCheckSourceSelects(savedSource);

  try {
    const filters = await loadBlockerFilterCatalog(linkCheckSource());
    if (filters.length) renderGlFilterGrid(filters);
  } catch {}

  for (const id of ["linkCheckSource", "linkCheckSourceBar"]) {
    document.getElementById(id)?.addEventListener("change", async (event) => {
      saveLinkCheckSource(event.target.value);
      syncGlFilterPanelVisibility();
      try {
        const filters = await loadBlockerFilterCatalog(event.target.value);
        if (filters.length) renderGlFilterGrid(filters);
      } catch {}
    });
  }
  for (const id of ["toggleGlFiltersBtn", "toggleGlFiltersBtnBar"]) {
    document.getElementById(id)?.addEventListener("click", toggleGlFilterPanel);
  }
  document.getElementById("glFiltersAllOn")?.addEventListener("click", () => setAllGlFilters(true));
  document.getElementById("glFiltersAllOff")?.addEventListener("click", () => setAllGlFilters(false));
  syncGlFilterPanelVisibility();
}

function buildLinkCheckQuery(link) {
  const source = linkCheckSource();
  const params = new URLSearchParams({
    url: link,
    source,
  });
  if (source === "glseries" || source === "gnmath") {
    const filters = getSelectedGlFilterIds();
    if (filters.length && filters.length < glFilterCatalog.length) {
      params.set("filters", filters.join(","));
    }
  }
  return params.toString();
}

function pickGlCategory(data) {
  const blocked = data.blockedBy || [];
  if (blocked.length) {
    return blocked[0].category || "Unknown";
  }
  const results = data.results || [];
  const clear = results.find((row) => row.blocked === false);
  return clear?.category || results[0]?.category || "Unknown";
}

function formatGlCheckStatus(data) {
  const type = pickGlCategory(data);
  if (data.ok) return `unblocked | ${type}`;
  if ((data.blockedBy || []).length) return `blocked | ${type}`;
  return `Check failed (${data.error || "unknown"})`;
}

function linkCheckStatusClass(statusEl, state) {
  const isStandalone = statusEl.id === "linkCheckerStatus";
  return isStandalone ? `link-check-status link-checker-status ${state}` : `link-check-status ${state}`;
}

function applyLinkCheckResponse(statusEl, data) {
  if (data.source === "glseries" || data.source === "gnmath") {
    statusEl.textContent = formatGlCheckStatus(data);
    if (data.blockedBy?.length) {
      statusEl.title = data.blockedBy
        .map((row) => `${row.name}${row.category ? ` - ${row.category}` : ""}`)
        .join("\n");
    } else {
      statusEl.title = "";
    }
  } else if (String(data.source || "").toLowerCase() === "ourlinewize") {
    statusEl.textContent = data.message || `${data.ok ? "Unblocked" : "Blocked"} | OurLinewize`;
    statusEl.title = "";
  } else if (data.message) {
    statusEl.textContent = data.message;
    statusEl.title = "";
  } else {
    statusEl.textContent = data.ok
      ? `OK (${data.source}, HTTP ${data.status || 200})`
      : `Blocked or down (${data.source}${data.status ? `, HTTP ${data.status}` : ""}${data.error ? `, ${data.error}` : ""})`;
    statusEl.title = "";
  }

  statusEl.className = linkCheckStatusClass(statusEl, data.ok ? "ok" : "bad");
}

async function runLinkCheck(link, { statusEl, btn } = {}) {
  if (!statusEl || !link) return;

  const source = linkCheckSource();
  if (usesBlockerFilters() && !getSelectedGlFilterIds().length) {
    statusEl.textContent = "Enable at least one blocker filter.";
    statusEl.className = linkCheckStatusClass(statusEl, "bad");
    statusEl.title = "";
    return;
  }

  statusEl.textContent = "Checking…";
  statusEl.className = linkCheckStatusClass(statusEl, "pending");
  statusEl.title = "";
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`https://c00lkiddtech.live/api/link-check?${buildLinkCheckQuery(link)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Check failed");
    applyLinkCheckResponse(statusEl, data);
  } catch (err) {
    statusEl.textContent = err.message || "Check failed";
    statusEl.className = linkCheckStatusClass(statusEl, "bad");
    statusEl.title = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function checkStandaloneLink() {
  const input = document.getElementById("linkCheckerUrl");
  const statusEl = document.getElementById("linkCheckerStatus");
  const btn = document.getElementById("linkCheckerRun");
  const link = normalizeUrl(input?.value || "");
  if (!link) {
    if (statusEl) {
      statusEl.textContent = "Enter a URL first.";
      statusEl.className = linkCheckStatusClass(statusEl, "bad");
      statusEl.title = "";
    }
    input?.focus();
    return;
  }
  await runLinkCheck(link, { statusEl, btn });
}

async function checkGameLink(card, link) {
  const statusEl = card.querySelector(".link-check-status");
  const btn = card.querySelector(".link-check-btn");
  await runLinkCheck(link, { statusEl, btn });
}

async function checkAllLinksInTab() {
  const gridId = activeLinkCheckGridId();
  const cards = document.querySelectorAll(`#${gridId} .card`);
  const delay = usesBlockerFilters() ? 2000 : 350;
  for (const card of cards) {
    const link = card.querySelector(".link-check-btn")?.dataset.link;
    if (link) await checkGameLink(card, link);
    await new Promise((r) => setTimeout(r, delay));
  }
}


async function loadAnnouncement() {
  try {
    const res = await fetch("./data/announcement.json");
    const data = await res.json();
    const bar = document.getElementById("announcement");
    if (data.text) {
      bar.textContent = data.text;
      bar.classList.add("visible");
    } else {
      bar.classList.remove("visible");
    }
  } catch {}
}

async function loadPartners() {
  try {
    const res = await fetch("./data/partners.json");
    const partners = await res.json();
    renderItems("partnersGrid", partners, "Visit", { linkCheck: true });
  } catch {
    document.getElementById("partnersGrid").innerHTML = `<div class="empty">Failed to load partners.</div>`;
  }
}

function initFluxerBtn() {
  const btn = document.getElementById("fluxerBtn");
  if (!btn) return;
  btn.href = "https://fluxer.gg/UkaZTMIb";
  btn.title = "https://fluxer.gg/UkaZTMIb";
}

async function loadInvite() {
  initFluxerBtn();
}

async function loadData() {
  try {
    const response = await fetch("./data/site.json");
    if (!response.ok) throw new Error("Failed to load data");
    const data = await response.json();
    renderItems("gamesGrid", data.games, "Open Game", { linkCheck: true });
    renderItems("othersGrid", data.others, "Open Link", { linkCheck: true });
  } catch {
    document.getElementById("gamesGrid").innerHTML = `<div class="empty">Failed to load game links.</div>`;
    document.getElementById("othersGrid").innerHTML = `<div class="empty">Failed to load others.</div>`;
  }
}

let playablesLoaded = false;
let playablesCatalog = [];
let activePlayable = null;
let activePlayableCategory = "";

function playableUrl(game) {
  if (typeof game === "string") {
    const slug = game;
    if (window.__STATIC_MIRROR__) {
      return `${siteOrigin() || window.location.origin}/playables/play/${encodeURIComponent(slug)}`;
    }
    return `/playables/play/${encodeURIComponent(slug)}`;
  }
  const url = game?.play_url || "";
  const mirrorOrigin = siteOrigin() || window.location.origin;
  if (window.__STATIC_MIRROR__ && game?.slug) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.includes("bubbls/youtube-playables")) {
      return url.startsWith("http") ? url : `https://gcore.jsdelivr.net/gh/bubbls/youtube-playables@latest/${game.slug}/index.html`;
    }
  }
  if (url.startsWith("/playables/")) {
    return url;
  }
  if (game?.slug) {
    if (url.includes("bubbls/youtube-playables")) {
      return `/playables/play/${encodeURIComponent(game.slug)}`;
    }
    return `/playables/open/${encodeURIComponent(game.slug)}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/playables/open/${encodeURIComponent(game.slug || "game")}`;
  }
  if (url.startsWith("/")) {
    return url;
  }
  return "";
}

function assignPlayableIds() {
  playablesCatalog.forEach((game, index) => {
    game.numId = index + 1;
  });
}

function getPlayableByNumId(num) {
  const id = Number(num);
  if (!Number.isInteger(id) || id < 1) return null;
  return playablesCatalog[id - 1] || null;
}

function parsePlayableHash() {
  const match = location.hash.match(/^#(\d+)$/);
  return match ? Number(match[1]) : null;
}

function playableShareUrl(numId) {
  return `${window.location.origin}/#${numId}`;
}

function renderLiquidText(text, container, { compact = false } = {}) {
  if (!container) return;
  container.replaceChildren();
  container.classList.add("lg-clock-label-text");
  container.classList.toggle("lg-clock-label-compact", compact);
  for (const ch of String(text || "")) {
    if (ch === " ") {
      const space = document.createElement("span");
      space.className = "lg-clock-space";
      space.setAttribute("aria-hidden", "true");
      container.appendChild(space);
      continue;
    }
    const digit = document.createElement("span");
    digit.className = "lg-digit";
    digit.textContent = ch;
    digit.setAttribute("data-char", ch);
    container.appendChild(digit);
  }
}

function getPlayableSoonMeta(game) {
  if (game?.slug === "kagama") {
    return {
      soon_image: "/playables/kagama-451.jpg",
      soon_label: "451",
    };
  }
  return {
    soon_image: game?.soon_image || "",
    soon_label: game?.soon_label || "Coming Soon",
  };
}

function ensurePlayableSoonDom() {
  const soon = document.getElementById("playables-soon");
  if (!soon) return null;

  let content = soon.querySelector(".playables-soon-content");
  if (!content) {
    content = document.createElement("div");
    content.className = "playables-soon-content";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "20px";
    content.style.maxWidth = "min(720px, 96vw)";
    while (soon.firstChild) {
      content.appendChild(soon.firstChild);
    }
    soon.appendChild(content);
  }

  let soonImage = document.getElementById("playablesSoonImage");
  if (!soonImage) {
    soonImage = document.createElement("img");
    soonImage.id = "playablesSoonImage";
    soonImage.className = "playables-soon-image hidden";
    soonImage.style.display = "none";
    soonImage.style.width = "min(100%, 640px)";
    soonImage.style.height = "auto";
    soonImage.style.borderRadius = "12px";
    const clock =
      document.getElementById("playablesSoonClock") ||
      content.querySelector(".playable-soon-clock");
    if (clock) content.insertBefore(soonImage, clock);
    else content.prepend(soonImage);
  }

  return {
    soon,
    soonImage,
    soonLabel: document.getElementById("playablesSoonLabel"),
    soonClock:
      document.getElementById("playablesSoonClock") ||
      content.querySelector(".playable-soon-clock"),
  };
}

function renderPlayableSoon(game, soonLabel) {
  const meta = getPlayableSoonMeta(game);
  const dom = ensurePlayableSoonDom();
  const soon = dom?.soon || document.getElementById("playables-soon");
  const soonImage = dom?.soonImage || document.getElementById("playablesSoonImage");
  const soonClock = dom?.soonClock || document.getElementById("playablesSoonClock");
  const label = meta.soon_label;

  if (meta.soon_image && soonImage) {
    soonImage.src = meta.soon_image;
    soonImage.alt = label;
    soonImage.classList.remove("hidden");
    soonImage.style.display = "block";
    soon?.classList.add("has-soon-image");
  } else if (soonImage) {
    soonImage.removeAttribute("src");
    soonImage.classList.add("hidden");
    soonImage.style.display = "none";
    soon?.classList.remove("has-soon-image");
  }

  if (soonClock) {
    soonClock.classList.toggle("hidden", !!meta.soon_image && !label);
  }

  renderLiquidText(label, soonLabel, { compact: label.length <= 4 });
}

function openPlayable(game) {
  const player = document.getElementById("playables-player");
  const grid = document.getElementById("playablesGrid");
  const toolbar = document.getElementById("playablesToolbar");
  const frame = document.getElementById("playables-frame");
  const soon = document.getElementById("playables-soon");
  const soonLabel = document.getElementById("playablesSoonLabel");
  const title = document.getElementById("playables-title");
  const fullBtn = document.getElementById("playables-full");
  if (!player || !game?.slug) return;

  activePlayable = game;
  grid?.classList.add("hidden");
  toolbar?.classList.add("hidden");
  player.classList.remove("hidden");
  if (title) title.textContent = game.title || "Game";
  if (fullBtn) fullBtn.classList.toggle("hidden", !!game.coming_soon);

  if (game.coming_soon) {
    frame?.classList.add("hidden");
    soon?.classList.remove("hidden");
    if (frame) {
      frame.removeAttribute("src");
      frame.src = "about:blank";
    }
    renderPlayableSoon(game, soonLabel);
    return;
  }

  soon?.classList.add("hidden");
  frame?.classList.remove("hidden");
  if (!frame) return;

  const url = playableUrl(game);
  frame.removeAttribute("src");
  frame.src = "about:blank";
  requestAnimationFrame(() => {
    frame.src = url.includes("?") ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
  });
}

function closePlayable() {
  const player = document.getElementById("playables-player");
  const grid = document.getElementById("playablesGrid");
  const toolbar = document.getElementById("playablesToolbar");
  const frame = document.getElementById("playables-frame");
  const soon = document.getElementById("playables-soon");
  if (frame) {
    frame.src = "about:blank";
    frame.classList.remove("hidden");
  }
  soon?.classList.add("hidden");
  soon?.classList.remove("has-soon-image");
  const soonImage = document.getElementById("playablesSoonImage");
  if (soonImage) {
    soonImage.removeAttribute("src");
    soonImage.classList.add("hidden");
  }
  document.getElementById("playables-full")?.classList.remove("hidden");
  player?.classList.add("hidden");
  grid?.classList.remove("hidden");
  toolbar?.classList.remove("hidden");
  activePlayable = null;
}

function filterPlayables(query, category = "") {
  const q = String(query || "").trim().toLowerCase();
  const cat = String(category || "").trim();

  return playablesCatalog.filter((game) => {
    if (cat && (game.genre || "") !== cat) return false;
    if (!q) return true;

    const haystack = [
      game.title,
      game.genre,
      game.description,
      game.developer,
      game.publisher,
      game.slug,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function getPlayablesFilters() {
  const search = document.getElementById("playablesSearch");
  return {
    query: search?.value || "",
    category: activePlayableCategory || "",
  };
}

function getPlayablesCategoryCounts() {
  const counts = new Map();
  playablesCatalog.forEach((game) => {
    const genre = game.genre || "Other";
    counts.set(genre, (counts.get(genre) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function setPlayableCategory(genre) {
  activePlayableCategory = genre || "";
  const select = document.getElementById("playablesCategory");
  if (select) select.value = activePlayableCategory;
  renderPlayablesCategoryChips();
  refreshPlayablesGrid();
}

function populatePlayablesCategorySelect() {
  const select = document.getElementById("playablesCategory");
  if (!select) return;

  const current = activePlayableCategory;
  select.innerHTML = `<option value="">All categories (${playablesCatalog.length})</option>`;
  getPlayablesCategoryCounts().forEach(([genre, count]) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = `${genre} (${count})`;
    select.appendChild(option);
  });
  select.value = current;
}

function renderPlayablesCategoryChips() {
  const wrap = document.getElementById("playablesCategories");
  if (!wrap) return;

  wrap.innerHTML = "";
  const categories = getPlayablesCategoryCounts();

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `playables-category-chip${activePlayableCategory ? "" : " active"}`;
  allBtn.textContent = `All (${playablesCatalog.length})`;
  allBtn.addEventListener("click", () => setPlayableCategory(""));
  wrap.appendChild(allBtn);

  categories.forEach(([genre, count]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `playables-category-chip${activePlayableCategory === genre ? " active" : ""}`;
    btn.textContent = `${genre} (${count})`;
    btn.addEventListener("click", () => setPlayableCategory(genre));
    wrap.appendChild(btn);
  });
}

function populatePlayablesCategories() {
  populatePlayablesCategorySelect();
  renderPlayablesCategoryChips();
}

function refreshPlayablesGrid() {
  const { query, category } = getPlayablesFilters();
  renderPlayables(filterPlayables(query, category), query, category);
}

function renderPlayables(games, query = "", category = "") {
  const grid = document.getElementById("playablesGrid");
  const count = document.getElementById("playablesCount");
  if (!grid) return;

  grid.innerHTML = "";

  if (!Array.isArray(games) || games.length === 0) {
    const parts = [];
    if (query.trim()) parts.push(`"${query.trim()}"`);
    if (category) parts.push(category);
    const msg = parts.length
      ? `No games match ${parts.join(" in ")}.`
      : "No games available yet.";
    grid.innerHTML = `<div class="empty">${escapeHtml(msg)}</div>`;
    if (count) {
      count.textContent = parts.length ? "0 results" : "";
    }
    return;
  }

  games.forEach((game) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `playable-card${game.coming_soon ? " is-coming-soon" : ""}`;
    const image = game.image_url
      ? `<img src="${escapeHtml(game.image_url)}" alt="" loading="lazy" />`
      : `<div class="playable-fallback">${escapeHtml((game.title || "?").charAt(0))}</div>`;
    card.innerHTML = `
      <div class="playable-thumb">
        ${image}
      </div>
      <div class="playable-info">
        <strong>${escapeHtml(game.title || "Game")}</strong>
        <span>${escapeHtml(game.genre || "Playable")}</span>
      </div>
    `;
    card.addEventListener("click", () => openPlayable(game));
    if (game.coming_soon) {
      card.setAttribute("aria-label", `${game.title || "Game"} - coming soon`);
    }
    grid.appendChild(card);
  });

  if (count) {
    const total = playablesCatalog.length;
    const hasFilter = query.trim() || category;
    count.textContent = hasFilter
      ? `${games.length} of ${total}`
      : `${total} games`;
  }
}

async function loadPlayables() {
  if (playablesLoaded) return playablesCatalog;
  const grid = document.getElementById("playablesGrid");
  if (!grid) return [];

  try {
    const res = await fetch(`./playables/manifest.json?v=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load games");
    playablesCatalog = await res.json();
    assignPlayableIds();
    playablesLoaded = true;

    populatePlayablesCategories();
    refreshPlayablesGrid();
    return playablesCatalog;
  } catch {
    grid.innerHTML = `<div class="empty">Failed to load games.</div>`;
    return [];
  }
}

async function openPlayableFromHash() {
  const numId = parsePlayableHash();
  if (!numId) return;

  show("playables");
  await loadPlayables();
  const game = getPlayableByNumId(numId);
  if (game) {
    openPlayable(game);
  }
}

function initPlayablesSearch() {
  const search = document.getElementById("playablesSearch");
  const category = document.getElementById("playablesCategory");

  search?.addEventListener("input", () => {
    if (!playablesLoaded) return;
    refreshPlayablesGrid();
  });

  category?.addEventListener("change", () => {
    if (!playablesLoaded) return;
    setPlayableCategory(category.value);
  });
}

const CLOAK_IFRAME_ALLOW =
  "fullscreen; autoplay; gamepad; clipboard-read; clipboard-write";
const CLOAK_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

function cloakIframeMarkup(url, { sandbox = CLOAK_IFRAME_SANDBOX } = {}) {
  const safeUrl = escapeHtml(url);
  return `<iframe src="${safeUrl}" style="width:100vw;height:100vh;border:0;display:block;position:fixed;inset:0;" allow="${CLOAK_IFRAME_ALLOW}" sandbox="${sandbox}"></iframe>`;
}

function cloakMinimalHtml(target, type = window.getCloakXInurlType()) {
  const safeUrl = escapeHtml(target);
  return `<!DOCTYPE html><html><head><meta charset=utf-8>${window.cloakXHeadMarkup(type)}</head><body style="margin:0;overflow:hidden;background:#0a0303"><iframe src="${safeUrl}" style="position:fixed;inset:0;width:100%;height:100%;border:0" allow="${CLOAK_IFRAME_ALLOW}" sandbox="${CLOAK_IFRAME_SANDBOX}"></iframe></body></html>`;
}

function encodeDataHtmlUrl(html) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function buildDataCloakUrl(target) {
  return encodeDataHtmlUrl(cloakMinimalHtml(target));
}

async function copyCloakText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function openDataUrlPasteTab(dataUrl) {
  const win = window.open("about:blank", "_blank");
  if (!win) return;
  const jsonUrl = JSON.stringify(dataUrl);
  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Data URL</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font:15px/1.5 system-ui,sans-serif;background:#0a0303;color:#e8c4c4}
.card{max-width:540px;text-align:center}
h1{font-size:1.25rem;margin:0 0 12px;color:#ffb4b4}
p{margin:0;opacity:.9}
kbd{display:inline-block;padding:2px 8px;border-radius:6px;background:#2a1010;border:1px solid #4a2020;font:12px monospace}
textarea{width:100%;height:88px;margin-top:14px;padding:10px;border-radius:8px;border:1px solid #4a2020;background:#140606;color:#ffb4b4;font:11px/1.4 monospace;resize:none}
</style></head><body><div class="card">
<h1>Paste the data URL</h1>
<p>Click the address bar above, press <kbd>Ctrl+V</kbd>, then <kbd>Enter</kbd>.</p>
<textarea readonly id="cloakDataUrl"></textarea>
</div><script>
var u=${jsonUrl};
var el=document.getElementById("cloakDataUrl");
el.value=u;
el.focus();el.select();
try{navigator.clipboard.writeText(u);}catch(e){}
<\/script></body></html>`);
  win.document.close();
}

function tryOpenDataUrlViaCarrier(html) {
  const carrierHtml = `<!DOCTYPE html><html><head><meta charset=utf-8></head><body><script>
(function(){
  var h=${JSON.stringify(html)};
  var w=window.open("about:blank","_blank");
  if(!w)return;
  w.document.open();
  w.document.write(h);
  w.document.close();
})();
<\/script></body></html>`;
  const carrierUrl = encodeDataHtmlUrl(carrierHtml);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
  frame.src = carrierUrl;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 8000);
}

function scheduleDataUrlPasteFallback(win, dataUrl) {
  window.setTimeout(() => {
    try {
      if (win && !win.closed && String(win.location.href).startsWith("data:")) return;
      if (win && !win.closed) win.close();
    } catch (_) {}
    openDataUrlPasteTab(dataUrl);
  }, 350);
}

async function openDataCloakTab(target) {
  const html = cloakMinimalHtml(target);
  const dataUrl = buildDataCloakUrl(target);

  await copyCloakText(dataUrl);

  let win = null;
  try {
    win = window.open(dataUrl, "_blank");
  } catch (_) {}

  if (win) {
    scheduleDataUrlPasteFallback(win, dataUrl);
    return;
  }

  try {
    win = window.open("about:blank", "_blank");
    if (win) win.location.href = dataUrl;
  } catch (_) {}

  if (win) {
    scheduleDataUrlPasteFallback(win, dataUrl);
    return;
  }

  tryOpenDataUrlViaCarrier(html);
  openDataUrlPasteTab(dataUrl);
}

function cloakDocumentHtml(url, { sandbox = CLOAK_IFRAME_SANDBOX, type = window.getCloakXInurlType() } = {}) {
  return `<!DOCTYPE html>
<html>
<head>${window.cloakXHeadMarkup(type)}</head>
<body style="margin:0;padding:0;background:#0a0303;overflow:hidden;">
${cloakIframeMarkup(url, { sandbox })}
</body>
</html>`;
}

function cloakTargetUrl(input) {
  const raw = String(input ?? window.location.href).trim();
  if (!raw) return window.location.href;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!/^https?:$/i.test(parsed.protocol)) return window.location.href;
    return parsed.href;
  } catch {
    return window.location.href;
  }
}

const CLOAKX_METHODS = [
  {
    id: "about",
    label: "About:Blank",
    hint: "Address bar shows about:blank",
  },
  {
    id: "blob",
    label: "Blob URL",
    hint: "Address bar shows blob:https://…",
  },
  {
    id: "data",
    label: "Data URL",
    hint: "data:text/html;charset=utf-8,… - copied; paste in address bar (Ctrl+V) on Opera/Chrome",
  },
  {
    id: "route",
    label: "Site Route",
    hint: "Address bar shows /cloak/tab on this site",
  },
  {
    id: "hash",
    label: "Popup Hash",
    hint: "Address bar shows this site with #cloakx",
  },
];

function openBlankWindow(type = window.getCloakXInurlType()) {
  const win = window.open("about:blank", "_blank");
  if (!win) return null;
  win.document.title = type.title;
  if (type.favicon) {
    let icon = win.document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = win.document.createElement("link");
      icon.rel = "icon";
      win.document.head.appendChild(icon);
    }
    icon.href = type.favicon;
    if (type.favicon.endsWith(".svg")) icon.type = "image/svg+xml";
  }
  win.document.body.style.margin = "0";
  win.document.body.style.padding = "0";
  win.document.body.style.overflow = "hidden";
  win.document.body.style.background = "#0a0303";
  return win;
}

function openCloaked(url, method = "about") {
  const target = cloakTargetUrl(url);
  const cloakType = window.getCloakXInurlType();
  const html = cloakDocumentHtml(target, { type: cloakType });

  switch (method) {
    case "blob": {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, "_blank");
      if (!win) URL.revokeObjectURL(blobUrl);
      return;
    }
    case "data": {
      openDataCloakTab(target);
      return;
    }
    case "route": {
      let routeUrl = `${window.location.origin}/cloak/tab?to=${encodeURIComponent(target)}&cloak=${encodeURIComponent(cloakType.id)}`;
      if (cloakType.id === "gmail") {
        const email = window.getCloakXUserEmail?.();
        if (email) routeUrl += `&cloakEmail=${encodeURIComponent(email)}`;
      }
      window.open(routeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    case "hash": {
      const popupUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#cloakx`;
      window.open(popupUrl, "_blank", "noopener,noreferrer");
      return;
    }
    case "about":
    default: {
      const win = openBlankWindow(cloakType);
      if (!win) return;
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }
}

function bootstrapCloakXHashPopup() {
  if (window.location.hash !== "#cloakx") return;
  const target = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const cloakType = window.getCloakXInurlType();
  document.title = cloakType.title;
  document.open();
  document.write(`<!DOCTYPE html>
<html>
<head>${window.cloakXHeadMarkup(cloakType)}</head>
<body style="margin:0;padding:0;background:#0a0303;overflow:hidden;">
<iframe src="${target.replace(/"/g, "&quot;")}" style="width:100vw;height:100vh;border:0;display:block;position:fixed;inset:0;" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"></iframe>
</body>
</html>`);
  document.close();
}
bootstrapCloakXHashPopup();

function saveCloakXInurlType() {
  const typeSelect = document.getElementById("cloakxInurlType");
  if (!typeSelect) return;
  localStorage.setItem(window.CLOAKX_INURL_TYPE_KEY, typeSelect.value);
  void window.refreshCloakXUserEmail?.().then(() => {
    window.applyInurlCloakToDocument(window.getCloakXInurlType(typeSelect.value));
  });
}

function initCloakX() {
  const typeSelect = document.getElementById("cloakxInurlType");
  if (typeSelect) {
    typeSelect.innerHTML = window.CLOAKX_INURL_TYPES.map(
      (entry) =>
        `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`
    ).join("");
    typeSelect.value = window.getCloakXInurlType().id;
    document.getElementById("cloakxInurlSave")?.addEventListener("click", saveCloakXInurlType);
  }

  const methodsWrap = document.getElementById("cloakxMethods");
  if (!methodsWrap) return;

  methodsWrap.innerHTML = CLOAKX_METHODS.map((method, index) => {
    const primary = index === 0 ? "" : " cloak-btn-secondary";
    return `<button type="button" class="cloak-btn${primary}" data-cloak-method="${escapeHtml(method.id)}" title="${escapeHtml(method.hint)}">${escapeHtml(method.label)}</button>`;
  }).join("");

  methodsWrap.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cloak-method]");
    if (!btn) return;
    const method = CLOAKX_METHODS.find((entry) => entry.id === btn.dataset.cloakMethod);
    if (!method) return;
    if (method.confirm && !window.confirm(method.confirm)) return;
    openCloaked(window.location.href, method.id);
  });
}

const DEFAULT_BG_RGB = { r: 18, g: 6, b: 6 };
const DEFAULT_BG_HEX = `#${[DEFAULT_BG_RGB.r, DEFAULT_BG_RGB.g, DEFAULT_BG_RGB.b]
  .map((channel) => channel.toString(16).padStart(2, "0"))
  .join("")}`;

function initSettings() {
  const savedBg = localStorage.getItem("bgColor");
  if (savedBg) document.body.style.background = savedBg;

  const bgColorPicker = document.getElementById("bgColorPicker");
  if (bgColorPicker) {
    bgColorPicker.value = savedBg || DEFAULT_BG_HEX;
    bgColorPicker.addEventListener("input", (e) => {
      document.body.style.background = e.target.value;
      localStorage.setItem("bgColor", e.target.value);
    });
  }

  document.getElementById("bgColorDefaultBtn")?.addEventListener("click", () => {
    localStorage.removeItem("bgColor");
    document.body.style.background = "";
    if (bgColorPicker) bgColorPicker.value = DEFAULT_BG_HEX;
  });

  initCloakX();

  const adsOpenBtn = document.getElementById("adsOpenBtn");
  if (adsOpenBtn) {
    adsOpenBtn.addEventListener("click", () => {
      openCloaked(`${window.location.origin}/ads.html`);
    });
  }

  const playablesBack = document.getElementById("playables-back");
  if (playablesBack) {
    playablesBack.addEventListener("click", closePlayable);
  }

  const playablesFull = document.getElementById("playables-full");
  if (playablesFull) {
    playablesFull.addEventListener("click", () => {
      if (!activePlayable) return;
      const path = playableUrl(activePlayable);
      const gameUrl = path.startsWith("http") ? path : `${window.location.origin}${path}`;
      openCloaked(gameUrl);
    });
  }

  const suggestSubmit = document.getElementById("suggestSubmit");
  if (suggestSubmit) {
    suggestSubmit.addEventListener("click", async () => {
      const text = document.getElementById("suggestArea").value.trim();
      const status = document.getElementById("suggestStatus");
      if (!text) {
        status.textContent = "Please type a suggestion first.";
        return;
      }
      status.textContent = "Sending...";
      try {
        const res = await fetch("https://c00lkiddtech.live/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error("Failed");
        status.textContent = "Suggestion sent, thanks!";
        document.getElementById("suggestArea").value = "";
      } catch {
        status.textContent = "Failed to send, try again.";
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("home")?.classList.contains("active")) {
    if (typeof window.initHomeTab === "function") window.initHomeTab();
  }

  initSettings();
  initPlayablesSearch();
  initGlFilterControls();
  loadData();
  loadPartners();
  loadAnnouncement();
  loadInvite();

  document.getElementById("checkAllLinks")?.addEventListener("click", () => {
    void checkAllLinksInTab();
  });

  document.getElementById("linkCheckerRun")?.addEventListener("click", () => {
    void checkStandaloneLink();
  });

  document.getElementById("linkCheckerUrl")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void checkStandaloneLink();
  });

  if (parsePlayableHash()) {
    openPlayableFromHash();
  }

  window.addEventListener("hashchange", () => {
    const numId = parsePlayableHash();
    if (numId) openPlayableFromHash();
  });
});
