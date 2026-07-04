(function () {
  let clockTimer = null;
  let userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let locationLabel = "";

  function $(id) {
    return document.getElementById(id);
  }

  function getTimeOfDay(hour) {
    if (hour >= 5 && hour < 12) return { label: "Good morning", period: "morning" };
    if (hour >= 12 && hour < 17) return { label: "Good afternoon", period: "afternoon" };
    if (hour >= 17 && hour < 21) return { label: "Good evening", period: "evening" };
    return { label: "Good night", period: "night" };
  }

  function renderLiquidClock(now) {
    const timeEl = $("homeTime");
    const ampmEl = $("homeAmPm");
    if (!timeEl) return;

    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: userTimeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(now);

    let hour = "";
    let minute = "";
    let dayPeriod = "";
    for (const part of parts) {
      if (part.type === "hour") hour = part.value;
      if (part.type === "minute") minute = part.value;
      if (part.type === "dayPeriod") dayPeriod = part.value;
    }

    const display = `${Number(hour)}:${minute.padStart(2, "0")}`;
    timeEl.replaceChildren();

    for (const ch of display) {
      if (ch === ":") {
        const colon = document.createElement("span");
        colon.className = "lg-colon";
        colon.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 2; i++) {
          const dot = document.createElement("span");
          dot.className = "lg-colon-dot";
          colon.appendChild(dot);
        }
        timeEl.appendChild(colon);
        continue;
      }

      const digit = document.createElement("span");
      digit.className = "lg-digit";
      digit.textContent = ch;
      digit.setAttribute("data-char", ch);
      timeEl.appendChild(digit);
    }

    if (ampmEl) ampmEl.textContent = dayPeriod;
  }

  function formatClock(now) {
    const greetingEl = $("homeGreeting");
    const dateEl = $("homeDate");
    const locationEl = $("homeLocation");
    const wrap = document.querySelector(".home-wrap");
    if (!greetingEl || !dateEl) return;

    const hour = Number(
      new Intl.DateTimeFormat(undefined, {
        timeZone: userTimeZone,
        hour: "numeric",
        hour12: false,
      }).format(now)
    );
    const { label, period } = getTimeOfDay(hour);

    greetingEl.textContent = label;
    if (wrap) wrap.dataset.period = period;

    renderLiquidClock(now);

    dateEl.textContent = new Intl.DateTimeFormat(undefined, {
      timeZone: userTimeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now);

    if (locationEl) {
      const parts = [locationLabel, userTimeZone.replace(/_/g, " ")].filter(Boolean);
      locationEl.textContent = parts.join(" · ");
    }
  }

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    formatClock(new Date());
    clockTimer = setInterval(() => formatClock(new Date()), 1000);
  }

  async function fetchTimezoneFromCoords(lat, lng) {
    try {
      const res = await fetch(
        `https://timeapi.io/api/TimeZone/coordinate?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`
      );
      if (!res.ok) throw new Error("timezone lookup failed");
      const data = await res.json();
      if (data.timeZone) userTimeZone = data.timeZone;
    } catch {}
    formatClock(new Date());
  }

  async function fetchLocationLabel(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=10`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const a = data.address || {};
      locationLabel =
        [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country]
          .filter(Boolean)
          .slice(0, 2)
          .join(", ") ||
        data.display_name?.split(",").slice(0, 2).join(",").trim() ||
        "";
      formatClock(new Date());
    } catch {}
  }

  function initGeolocation() {
    const locationEl = $("homeLocation");
    startClock();
    if (locationEl) locationEl.textContent = "Detecting your timezone…";

    if (!navigator.geolocation) {
      if (locationEl) locationEl.textContent = "Using your browser timezone";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        void fetchTimezoneFromCoords(latitude, longitude);
        void fetchLocationLabel(latitude, longitude);
      },
      () => {
        if (locationEl) locationEl.textContent = "Using your browser timezone";
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  }

  window.initHomeTab = function initHomeTab() {
    initGeolocation();
  };
})();
