(function () {
  let catalog = [];
  let activeMovie = null;
  let activeHls = null;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function movieStreamUrl(movie) {
    return String(movie?.video || movie?.downloadUrl || "").trim();
  }

  function isDirectVideoUrl(url) {
    return /^https?:\/\//i.test(url) && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  }

  function isExternalMovie(movie) {
    if (movie?.videoType === "external") return true;
    const url = movieStreamUrl(movie);
    if (!url) return false;
    if (/^https?:\/\//i.test(url) && !url.startsWith(window.location.origin)) {
      if (/limewire\.com|file\.io|gofile\.|pixeldrain\.|mega\.nz/i.test(url)) return true;
      return !isDirectVideoUrl(url) && !url.includes(".m3u8");
    }
    return false;
  }

  function loadHlsScript() {
    if (window.Hls) return Promise.resolve(window.Hls);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
      s.onload = () => resolve(window.Hls);
      s.onerror = () => reject(new Error("hls.js failed to load"));
      document.head.appendChild(s);
    });
  }

  function destroyPlayer() {
    if (activeHls) {
      activeHls.destroy();
      activeHls = null;
    }
    const video = $("moviePlayer");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }

  function renderCatalog() {
    const root = $("showsCatalog");
    const detail = $("showsDetail");
    const backBtn = $("showsBack");
    if (!root) return;

    root.classList.remove("hidden");
    detail?.classList.remove("active");
    detail && (detail.innerHTML = "");
    backBtn?.classList.remove("visible");

    if (!catalog.length) {
      root.innerHTML = `<div class="shows-empty">No movies yet. Check back soon.</div>`;
      return;
    }

    root.innerHTML = catalog
      .map(
        (m) => `
      <article class="movie-tile" data-id="${escapeHtml(m.id)}" tabindex="0">
        <div class="movie-poster-wrap">
          <img src="${escapeHtml(m.poster)}" alt="${escapeHtml(m.title)}" loading="lazy" />
          ${m.quality ? `<span class="movie-quality">${escapeHtml(m.quality)}</span>` : ""}
        </div>
        <h3>${escapeHtml(m.title)}</h3>
        <div class="movie-year">${escapeHtml(String(m.year || ""))}</div>
      </article>`
      )
      .join("");

    root.querySelectorAll(".movie-tile").forEach((tile) => {
      const open = () => openMovie(tile.dataset.id);
      tile.addEventListener("click", open);
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function showPlayerMessage(wrap, movie, message, extraHtml = "") {
    const url = movieStreamUrl(movie);
    wrap.innerHTML =
      `<p style="padding:1.25rem;color:#ffb4b4;text-align:center;line-height:1.6">${escapeHtml(message)}</p>` +
      extraHtml +
      (url
        ? `<p style="padding:0 1.25rem 1.25rem;text-align:center"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#ffb347">Open hosted file ↗</a></p>`
        : `<p style="padding:0 1.25rem 1.25rem;text-align:center;opacity:0.7">Host link not set yet.</p>`);
  }

  async function fetchStreamStatus(movieId) {
    try {
      const res = await fetch(`/api/movies/stream-status?id=${encodeURIComponent(movieId || "backrooms")}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async function waitForStream(movieId, loadingEl, maxAttempts = 90) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await fetchStreamStatus(movieId);
      if (status?.ready || (status?.segments && status.segments >= 1)) return status;
      if (loadingEl) {
        loadingEl.textContent =
          i < 3 ? "Starting stream…" : "Buffering first few seconds…";
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return null;
  }

  async function startPlayback(movie) {
    const wrap = $("moviePlayerWrap");
    const btn = $("movieWatchBtn");
    if (!wrap || !movie) return;

    destroyPlayer();

    const streamUrl = movieStreamUrl(movie);

    if (isExternalMovie(movie) || (!movie.video && movie.downloadUrl)) {
      btn?.classList.remove("loading");
      if (btn) btn.textContent = streamUrl ? "Open hosted file ↗" : "▶ Watch now";
      if (streamUrl) {
        window.open(streamUrl, "_blank", "noopener,noreferrer");
        showPlayerMessage(
          wrap,
          movie,
          "This movie is hosted externally. Open the link above to watch or download."
        );
      } else {
        showPlayerMessage(
          wrap,
          movie,
          "No host link yet. Upload to LimeWire (or similar) and add the URL to catalog.json."
        );
      }
      return;
    }

    if (!wrap.querySelector("video")) {
      wrap.innerHTML =
        '<div class="player-loading">Starting stream…</div><video id="moviePlayer" controls playsinline preload="auto"></video>';
    }

    const loadingEl = wrap.querySelector(".player-loading");
    const player = $("moviePlayer");
    if (!player) return;

    btn?.classList.add("loading");
    if (btn) btn.textContent = "Loading…";
    if (loadingEl) {
      loadingEl.style.display = "block";
      loadingEl.textContent = "Starting stream…";
    }

    if (streamUrl && isDirectVideoUrl(streamUrl) && !streamUrl.includes(".m3u8")) {
      const onReady = () => {
        player.classList.add("ready");
        if (loadingEl) loadingEl.style.display = "none";
        btn?.classList.remove("loading");
        if (btn) btn.textContent = "▶ Watch now";
        player.play().catch(() => {
          if (loadingEl) {
            loadingEl.style.display = "block";
            loadingEl.textContent = "Tap play on the video controls.";
          }
        });
      };
      const onFail = () => {
        btn?.classList.remove("loading");
        if (btn) btn.textContent = "▶ Watch now";
        showPlayerMessage(
          wrap,
          movie,
          "Could not play this link in-browser. Use the hosted file link instead."
        );
      };
      player.src = streamUrl;
      player.load();
      player.addEventListener("loadeddata", onReady, { once: true });
      player.addEventListener("error", onFail, { once: true });
      return;
    }

    const status = await waitForStream(movie.id, loadingEl);
    if (!status) {
      btn?.classList.remove("loading");
      if (btn) btn.textContent = "▶ Watch now";
      showPlayerMessage(wrap, movie, "Stream is still starting. Try again in a few seconds.");
      return;
    }

    const onReady = () => {
      player.classList.add("ready");
      if (loadingEl) loadingEl.style.display = "none";
      btn?.classList.remove("loading");
      if (btn) btn.textContent = "▶ Watch now";
      player.play().catch(() => {
        if (loadingEl) {
          loadingEl.style.display = "block";
          loadingEl.textContent = "Tap play on the video controls.";
        }
      });
    };

    const onFail = () => {
      btn?.classList.remove("loading");
      if (btn) btn.textContent = "▶ Watch now";
      showPlayerMessage(wrap, movie, "Playback failed in this browser.");
    };

    if (movie.videoType === "hls" || (movie.video && movie.video.endsWith(".m3u8"))) {
      try {
        const Hls = await loadHlsScript();
        if (Hls.isSupported()) {
          activeHls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
          });
          activeHls.loadSource(movie.video);
          activeHls.attachMedia(player);
          activeHls.on(Hls.Events.MANIFEST_PARSED, onReady);
          activeHls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) onFail();
          });
          return;
        }
        if (player.canPlayType("application/vnd.apple.mpegurl")) {
          player.src = movie.video;
          player.addEventListener("loadeddata", onReady, { once: true });
          player.addEventListener("error", onFail, { once: true });
          player.load();
          return;
        }
        onFail();
      } catch {
        onFail();
      }
      return;
    }

    player.src = movie.video;
    player.load();
    player.addEventListener("loadeddata", onReady, { once: true });
    player.addEventListener("error", onFail, { once: true });
  }

  async function openMovie(id) {
    const movie = catalog.find((m) => m.id === id);
    if (!movie) return;
    activeMovie = movie;

    $("showsCatalog")?.classList.add("hidden");
    $("showsBack")?.classList.add("visible");

    const detail = $("showsDetail");
    if (!detail) return;

    const shots = (movie.screenshots || [])
      .map(
        (src) =>
          `<img src="${escapeHtml(src)}" alt="Screenshot" loading="lazy" data-full="${escapeHtml(src)}" />`
      )
      .join("");

    const streamUrl = movieStreamUrl(movie);
    const hasHost = Boolean(streamUrl);
    const external = isExternalMovie(movie);

    const watchControl = external && hasHost
      ? `<a href="${escapeHtml(streamUrl)}" target="_blank" rel="noopener noreferrer" class="movie-watch-btn" id="movieWatchBtn">Watch on LimeWire ↗</a>`
      : `<button type="button" class="movie-watch-btn" id="movieWatchBtn">${hasHost ? "Open hosted file ↗" : "▶ Watch now"}</button>`;

    const playerBlock = external
      ? `<div class="movie-player-wrap movie-host-notice" id="moviePlayerWrap">
          <p>Hosted externally on LimeWire - use the button above to watch or download.</p>
          ${hasHost ? `<a href="${escapeHtml(streamUrl)}" target="_blank" rel="noopener noreferrer" class="movie-watch-btn">Open LimeWire link ↗</a>` : ""}
        </div>`
      : `<div class="movie-player-wrap" id="moviePlayerWrap">
          <div class="player-loading">${hasHost ? "Click the button to open the hosted file." : "No host link yet."}</div>
          <video id="moviePlayer" controls playsinline preload="auto" class="hidden"></video>
        </div>`;

    detail.innerHTML = `
      <div class="movie-hero">
        <div class="movie-hero-poster">
          <img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)}" />
        </div>
        <div class="movie-hero-info">
          <h2>${escapeHtml(movie.title)} <span style="opacity:0.5;font-weight:400">(${escapeHtml(String(movie.year || ""))})</span></h2>
          ${movie.imdb ? `<a class="movie-imdb-link" href="${escapeHtml(movie.imdb)}" target="_blank" rel="noopener noreferrer">IMDb ↗</a>` : ""}
          <div class="movie-release-name">${escapeHtml(movie.releaseName || "")}</div>
          <dl class="movie-meta-grid">
            ${movie.director ? `<div><dt>Director</dt><dd>${escapeHtml(movie.director)}</dd></div>` : ""}
            ${movie.genre ? `<div><dt>Genre</dt><dd>${escapeHtml(movie.genre)}</dd></div>` : ""}
            <div><dt>Size</dt><dd>${escapeHtml(movie.size || "-")}</dd></div>
            <div><dt>Video</dt><dd>${escapeHtml(movie.videoFormat || "-")}</dd></div>
            <div><dt>Audio</dt><dd>${escapeHtml(movie.audio || "-")}</dd></div>
            <div><dt>Runtime</dt><dd>${escapeHtml(movie.runtime || "-")}</dd></div>
            <div><dt>Subtitles</dt><dd>${escapeHtml(movie.subtitles || "-")}</dd></div>
          </dl>
          ${movie.cast ? `<p class="movie-cast"><strong>Cast:</strong> ${escapeHtml(movie.cast)}</p>` : ""}
          ${movie.synopsis ? `<p class="movie-synopsis">${escapeHtml(movie.synopsis)}</p>` : ""}
          ${watchControl}
        </div>
      </div>
      ${playerBlock}
      <div class="movie-shots">
        <h4>Screenshots</h4>
        <div class="movie-shots-row">${shots || '<p class="shows-empty">No screenshots.</p>'}</div>
      </div>`;

    detail.classList.add("active");

    $("movieWatchBtn")?.addEventListener("click", (e) => {
      if (external) return;
      e.preventDefault();
      $("moviePlayerWrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
      startPlayback(movie);
    });

    detail.querySelectorAll(".movie-shots-row img").forEach((img) => {
      img.addEventListener("click", () => {
        window.open(img.dataset.full || img.src, "_blank", "noopener,noreferrer");
      });
    });
  }

  function closeMovie() {
    activeMovie = null;
    destroyPlayer();
    renderCatalog();
  }

  async function loadShowsCatalog() {
    try {
      const res = await fetch("./shows/catalog.json");
      if (!res.ok) throw new Error("catalog fetch failed");
      const data = await res.json();
      catalog = Array.isArray(data.movies) ? data.movies : [];
    } catch {
      catalog = [];
    }
    renderCatalog();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("showsBack")?.addEventListener("click", closeMovie);
    loadShowsCatalog();

    document.querySelector('.nav-btn[data-tab="shows"]')?.addEventListener("click", () => {
      if (!activeMovie) loadShowsCatalog();
    });
  });

  window.loadShowsCatalog = loadShowsCatalog;
})();
