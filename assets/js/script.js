(() => {
  "use strict";

  // ---- Intro / splash screen (home page, first visit per session) -----
  const intro = document.getElementById("intro");
  if (intro && document.documentElement.classList.contains("intro-active")) {
    let dismissed = false;

    const reduceMotionIntro =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      try { sessionStorage.setItem("ih_intro_seen", "1"); } catch (e) {}

      // --- Shared-element move: fly the splash logo into the navbar logo.
      //     Measure BEFORE adding exit classes so positions are accurate.
      let fly = null;
      const navLogo = document.querySelector(".nav__logo");
      const introLogo = intro.querySelector(".intro__logo");
      if (!reduceMotionIntro && navLogo && introLogo) {
        const from = introLogo.getBoundingClientRect();
        const to = navLogo.getBoundingClientRect();
        if (from.width && to.width) {
          fly = introLogo.cloneNode(true);
          fly.className = "intro-logo-fly";
          fly.removeAttribute("id");
          fly.style.left = from.left + "px";
          fly.style.top = from.top + "px";
          fly.style.width = from.width + "px";
          fly.style.height = "auto";
          fly.style.transform = "translate(0, 0) scale(1)";
          document.body.appendChild(fly);

          // Hide the real nav logo until the clone lands exactly on it.
          navLogo.style.opacity = "0";

          const scale = to.width / from.width;
          const dx = to.left - from.left;
          const dy = to.top - from.top;
          // Two rAFs so the start transform is committed before we transition.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              fly.classList.add("is-flying");
              fly.style.transform =
                "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")";
            });
          });
        }
      }

      // Animate the page in behind the lifting splash.
      document.body.classList.add("intro-revealing");
      intro.classList.add("is-exiting");

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.documentElement.classList.remove("intro-active"); // unlock scroll + hide
        intro.setAttribute("aria-hidden", "true");
        document.body.classList.remove("intro-revealing");
        if (fly && fly.parentNode) fly.parentNode.removeChild(fly);
        // Reveal the real nav logo (the clone landed precisely here).
        if (navLogo) navLogo.style.opacity = "";
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      };
      // The curtain fade (0.95s) outlasts the logo flight (0.85s), so finishing
      // on its animationend guarantees the logo has already landed.
      intro.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, 1200); // fallback if animationend doesn't fire
    };

    // Dismiss on any meaningful interaction
    intro.addEventListener("click", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchmove", dismiss, { passive: true });
    window.addEventListener(
      "keydown",
      (e) => {
        // ignore lone modifier keys
        if (["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) return;
        dismiss();
      },
      { once: false }
    );

    // Focus the enter cue for keyboard users
    const enterBtn = document.getElementById("intro-enter");
    if (enterBtn) {
      try { enterBtn.focus({ preventScroll: true }); } catch (e) { enterBtn.focus(); }
    }
  }

  // ---- Year stamp -----------------------------------------------------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Nav: scrolled state -------------------------------------------
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 48);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- Nav: mobile toggle --------------------------------------------
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    };
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", closeMenu)
    );
  }

  // ---- Editorial banner carousel -------------------------------------
  const banner = document.getElementById("banner");
  if (banner) {
    const track = banner.querySelector(".banner__track");
    const slides = Array.from(banner.querySelectorAll(".banner__slide"));
    const dots = Array.from(banner.querySelectorAll(".banner__dot"));
    const prev = banner.querySelector(".banner__nav--prev");
    const next = banner.querySelector(".banner__nav--next");
    const counter = banner.querySelector(".banner__counter-current");
    const caption = banner.querySelector(".banner__caption-text");
    const progressBar = banner.querySelector(".banner__progress-bar");

    const interval = parseInt(banner.getAttribute("data-interval"), 10) || 6000;
    const total = slides.length;
    let index = 0;
    let timer = null;
    let captionTimer = null;

    const pad = (n) => String(n).padStart(2, "0");

    function setProgress(running) {
      if (!progressBar) return;
      // Reset width with no transition, then animate to 100%
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";
      // Force reflow so the next transition starts fresh
      void progressBar.offsetWidth;
      if (running) {
        progressBar.style.transition = `width ${interval}ms linear`;
        progressBar.style.width = "100%";
      }
    }

    function updateCaption(newText) {
      if (!caption) return;
      clearTimeout(captionTimer);
      banner.classList.add("is-transitioning");
      captionTimer = setTimeout(() => {
        caption.textContent = newText;
        if (counter) counter.textContent = pad(index + 1);
        // Next frame, restore
        requestAnimationFrame(() => {
          banner.classList.remove("is-transitioning");
        });
      }, 300);
    }

    function goTo(i, opts = {}) {
      const userInitiated = opts.user === true;
      const newIndex = ((i % total) + total) % total;
      if (newIndex === index && !opts.force) return;
      index = newIndex;

      track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      slides.forEach((s, idx) => s.classList.toggle("is-active", idx === index));
      dots.forEach((d, idx) => {
        d.classList.toggle("is-active", idx === index);
        d.setAttribute("aria-selected", idx === index ? "true" : "false");
      });

      const cap = slides[index].getAttribute("data-caption") || "";
      updateCaption(cap);

      if (userInitiated) restartAuto();
      else setProgress(timer !== null);
    }

    function nextSlide() { goTo(index + 1); }
    function prevSlide() { goTo(index - 1); }

    function startAuto() {
      stopAuto();
      timer = setInterval(nextSlide, interval);
      banner.classList.remove("is-paused");
      setProgress(true);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      banner.classList.add("is-paused");
      if (progressBar) {
        // Freeze progress at its current visual width
        const computedWidth = getComputedStyle(progressBar).width;
        progressBar.style.transition = "none";
        progressBar.style.width = computedWidth;
      }
    }
    function restartAuto() {
      if (timer) startAuto();
    }

    // Controls
    if (prev) prev.addEventListener("click", () => goTo(index - 1, { user: true }));
    if (next) next.addEventListener("click", () => goTo(index + 1, { user: true }));
    dots.forEach((d, i) => d.addEventListener("click", () => goTo(i, { user: true })));

    // Click on viewport: left half = prev, right half = next
    const viewport = banner.querySelector(".banner__viewport");
    let suppressClick = false;
    if (viewport) {
      viewport.addEventListener("click", (e) => {
        if (suppressClick) return;
        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) goTo(index - 1, { user: true });
        else goTo(index + 1, { user: true });
      });
    }

    // Keyboard arrows when banner is focused
    banner.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1, { user: true }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1, { user: true }); }
    });

    // Hover pause / resume (desktop)
    banner.addEventListener("mouseenter", stopAuto);
    banner.addEventListener("mouseleave", startAuto);

    // Touch swipe
    let touchStartX = 0;
    let touchStartY = 0;
    let touching = false;
    banner.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touching = true;
      stopAuto();
    }, { passive: true });
    banner.addEventListener("touchend", (e) => {
      if (!touching) return;
      touching = false;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // Treat as horizontal swipe only if x-motion dominates
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        // Prevent the synthesized click from also navigating
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 350);
        if (dx < 0) goTo(index + 1, { user: true });
        else goTo(index - 1, { user: true });
      } else {
        startAuto();
      }
    });

    // Only auto-advance while the banner is in view (saves resources)
    if ("IntersectionObserver" in window) {
      const bio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) startAuto();
            else stopAuto();
          });
        },
        { threshold: 0.25 }
      );
      bio.observe(banner);
    } else {
      startAuto();
    }

    // Initialize counter total + first caption
    const totalEl = banner.querySelector(".banner__counter-total");
    if (totalEl) totalEl.textContent = pad(total);
    if (counter) counter.textContent = pad(index + 1);
  }

  // ---- Disciplines: interactive accordion (home, "What We Do") --------
  const disciplines = document.getElementById("disciplines");
  if (disciplines) {
    const items = Array.from(disciplines.querySelectorAll(".discipline"));
    const triggers = items.map((it) => it.querySelector(".discipline__trigger"));

    const setOpen = (item, open) => {
      item.classList.toggle("is-open", open);
      const t = item.querySelector(".discipline__trigger");
      if (t) t.setAttribute("aria-expanded", open ? "true" : "false");
    };

    triggers.forEach((trigger, i) => {
      if (!trigger) return;

      // Single-open accordion: opening one closes the others; an open row can
      // be collapsed again by re-selecting it.
      trigger.addEventListener("click", () => {
        const item = items[i];
        const willOpen = !item.classList.contains("is-open");
        items.forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });

      // Roving keyboard navigation between the headers
      trigger.addEventListener("keydown", (e) => {
        let next = -1;
        if (e.key === "ArrowDown") next = (i + 1) % triggers.length;
        else if (e.key === "ArrowUp") next = (i - 1 + triggers.length) % triggers.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = triggers.length - 1;
        if (next >= 0 && triggers[next]) { e.preventDefault(); triggers[next].focus(); }
      });
    });
  }

  // ---- Who We Are: interactive story timeline (home) ------------------
  const journey = document.getElementById("journey");
  if (journey) {
    const nodes = Array.from(journey.querySelectorAll(".journey__node"));
    const slides = Array.from(journey.querySelectorAll(".journey__slide"));
    const panels = Array.from(journey.querySelectorAll(".journey__panel"));
    const fill = journey.querySelector(".journey__rail-fill");
    const prevBtn = journey.querySelector(".journey__arrow--prev");
    const nextBtn = journey.querySelector(".journey__arrow--next");
    const countCur = journey.querySelector(".journey__count-current");
    const countTotal = journey.querySelector(".journey__count-total");

    const total = nodes.length;
    const interval = parseInt(journey.getAttribute("data-interval"), 10) || 7000;
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = (n) => String(n).padStart(2, "0");

    let index = 0;
    let timer = null;

    if (countTotal) countTotal.textContent = pad(total);

    function goTo(i, opts = {}) {
      const next = ((i % total) + total) % total;
      if (next === index && !opts.force) return;
      index = next;

      nodes.forEach((n, idx) => {
        const on = idx === index;
        n.classList.toggle("is-active", on);
        n.setAttribute("aria-selected", on ? "true" : "false");
        n.setAttribute("tabindex", on ? "0" : "-1");
      });
      slides.forEach((s, idx) => s.classList.toggle("is-active", idx === index));
      panels.forEach((p, idx) => p.classList.toggle("is-active", idx === index));

      if (fill) {
        // Width spans the track between the first and last dot centres.
        fill.style.width = (total > 1 ? (index / (total - 1)) * 100 : 0) + "%";
      }
      if (countCur) countCur.textContent = pad(index + 1);

      if (opts.user) restartAuto();
    }

    function startAuto() {
      if (reduceMotion || total < 2) return;
      stopAuto();
      timer = setInterval(() => goTo(index + 1), interval);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function restartAuto() {
      if (timer) startAuto();
    }

    // Rail nodes + arrows
    nodes.forEach((n, i) =>
      n.addEventListener("click", () => goTo(i, { user: true }))
    );
    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1, { user: true }));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1, { user: true }));

    // Roving keyboard navigation across the rail (WAI-ARIA tablist)
    journey.querySelector(".journey__rail").addEventListener("keydown", (e) => {
      let to = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") to = (index + 1) % total;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = (index - 1 + total) % total;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = total - 1;
      if (to >= 0) {
        e.preventDefault();
        goTo(to, { user: true });
        nodes[to].focus();
      }
    });

    // Pause auto-advance on hover / focus within the stage
    journey.addEventListener("mouseenter", stopAuto);
    journey.addEventListener("mouseleave", startAuto);
    journey.addEventListener("focusin", stopAuto);
    journey.addEventListener("focusout", (e) => {
      if (!journey.contains(e.relatedTarget)) startAuto();
    });

    // Only auto-advance while the section is in view
    if ("IntersectionObserver" in window) {
      const jio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) startAuto();
            else stopAuto();
          });
        },
        { threshold: 0.3 }
      );
      jio.observe(journey);
    } else {
      startAuto();
    }

    goTo(0, { force: true });
  }

  // ---- Scroll reveal --------------------------------------------------
  const targets = document.querySelectorAll(
    ".positioning .positioning__inner, " +
      ".track .section-head, .stat, " +
      ".clients .section-head, .logos li, " +
      ".platform .section-head, .discipline, " +
      ".values .section-head, .value, " +
      ".cta__inner, " +
      ".section .section-head, [data-reveal]"
  );

  targets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const parent = entry.target.parentElement;
            const siblings = parent
              ? Array.from(parent.children).filter((c) => c.classList.contains("reveal"))
              : [];
            const idx = siblings.indexOf(entry.target);
            const delay = idx >= 0 ? Math.min(idx * 80, 320) : 0;
            setTimeout(() => entry.target.classList.add("is-visible"), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("is-visible"));
  }

  // ---- Inquiry form + optional consultation calendar -----------------
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    /* ===================== CONFIG — fill these in =====================
       1. appsScriptUrl  → deploy the Google Apps Script (see BOOKING-SETUP.md)
                           as a Web app ("Anyone"), paste the /exec URL here.
                           Leave "" to disable availability greying + logging.
       2. emailjs        → keys from your EmailJS dashboard. Leave any "" and
                           the form falls back to opening the visitor's mail
                           client (mailto) so it still works.                */
    const BOOKING_CONFIG = {
      appsScriptUrl: "",
      emailjs: { publicKey: "", serviceId: "", templateId: "" },
      notifyEmail: "hello@inspirehospitality.com",

      // Slot rules
      businessDays: [1, 2, 3, 4, 5], // 0=Sun … 6=Sat  → Mon–Fri
      startHour: 10, // 10:00
      endHour: 17, //   17:00 (last 30-min slot starts 16:30)
      slotMinutes: 30,
      maxDaysAhead: 60, // how far ahead the calendar lets people book
      timezoneLabel: "UTC +08:00 · China Standard Time",
    };
    /* ================================================================= */

    const C = BOOKING_CONFIG;
    const $ = (id) => document.getElementById(id);
    const optin = $("booking-optin");
    const optionalEl = $("booking-optional");
    const tzEl = $("booking-tz");
    const calMonthEl = $("cal-month");
    const calDowEl = $("cal-dow");
    const calDaysEl = $("cal-days");
    const prevBtn = $("cal-prev");
    const nextBtn = $("cal-next");
    const slotsEl = $("booking-slots");
    const dateLabelEl = $("booking-date-label");
    const selectedEl = $("booking-selected");
    const statusEl = $("booking-status");
    const submitBtn = $("booking-submit");
    const submitLabel = $("booking-submit-label");

    const pad2 = (n) => String(n).padStart(2, "0");
    const sameDay = (a, b) =>
      !!a && !!b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const dateKey = (d) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const formatLong = (d) =>
      d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const to12h = (hhmm) => {
      let [h, m] = hhmm.split(":").map(Number);
      const ampm = h >= 12 ? "pm" : "am";
      h = h % 12 || 12;
      return `${h}:${pad2(m)} ${ampm}`;
    };
    const emailjsReady = () =>
      typeof window.emailjs !== "undefined" &&
      C.emailjs.publicKey && C.emailjs.serviceId && C.emailjs.templateId;

    function generateSlots() {
      const out = [];
      const end = C.endHour * 60;
      for (let m = C.startHour * 60; m + C.slotMinutes <= end; m += C.slotMinutes) {
        out.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
      }
      return out;
    }
    const SLOTS = generateSlots();

    // Bookable window: tomorrow … maxDaysAhead days out.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 1);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + C.maxDaysAhead);
    const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
    const isSelectable = (d) =>
      d >= minDate && d <= maxDate && C.businessDays.includes(d.getDay());

    const bookedCache = {}; // { 'YYYY-MM-DD': Set(['10:00', …]) }
    let viewYear = minDate.getFullYear();
    let viewMonth = minDate.getMonth();
    let selectedDate = null;
    let selectedSlot = null;
    let calBuilt = false;

    if (tzEl) tzEl.textContent = C.timezoneLabel;

    // ---- Availability from the Sheet (graceful if not configured) ----
    async function fetchBooked(key) {
      if (bookedCache[key]) return bookedCache[key];
      const set = new Set();
      bookedCache[key] = set;
      if (!C.appsScriptUrl) return set;
      try {
        const res = await fetch(`${C.appsScriptUrl}?date=${encodeURIComponent(key)}`);
        const data = await res.json();
        (data.booked || data.slots || []).forEach((t) => set.add(t));
      } catch (err) {
        console.warn("Booking availability lookup failed:", err);
      }
      return set;
    }

    // ---- Calendar ----------------------------------------------------
    function buildDow() {
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
        const s = document.createElement("span");
        s.textContent = d;
        calDowEl.appendChild(s);
      });
    }

    function renderCalendar() {
      const first = new Date(viewYear, viewMonth, 1);
      calMonthEl.textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      prevBtn.disabled = monthStart(first) <= monthStart(minDate);
      nextBtn.disabled = monthStart(first) >= monthStart(maxDate);

      calDaysEl.innerHTML = "";
      const offset = (first.getDay() + 6) % 7; // Mon-first leading blanks
      for (let i = 0; i < offset; i++) {
        const blank = document.createElement("span");
        blank.className = "booking__cal-blank";
        calDaysEl.appendChild(blank);
      }
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(viewYear, viewMonth, day);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking__cal-day";
        btn.textContent = String(day);
        if (sameDay(d, today)) btn.classList.add("booking__cal-day--today");
        if (isSelectable(d)) {
          btn.setAttribute("aria-selected", sameDay(d, selectedDate) ? "true" : "false");
          btn.addEventListener("click", () => selectDate(d));
        } else {
          btn.disabled = true;
        }
        calDaysEl.appendChild(btn);
      }
    }

    function renderSlots(bookedSet) {
      slotsEl.innerHTML = "";
      SLOTS.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "booking__slot";
        btn.textContent = to12h(t);
        btn.dataset.time = t;
        btn.setAttribute("aria-pressed", "false");
        if (bookedSet.has(t)) {
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
          btn.title = "This time has already been requested";
        } else {
          btn.addEventListener("click", () => selectSlot(t, btn));
        }
        slotsEl.appendChild(btn);
      });
    }

    async function selectDate(d) {
      selectedDate = d;
      selectedSlot = null;
      selectedEl.innerHTML = "";
      submitLabel.textContent = "Send Inquiry";
      renderCalendar(); // refresh the selected-day highlight
      dateLabelEl.textContent = formatLong(d);
      if (statusEl) statusEl.textContent = "";
      slotsEl.innerHTML = '<p class="booking__slots-empty">Loading times…</p>';
      const booked = await fetchBooked(dateKey(d));
      if (!sameDay(selectedDate, d)) return; // a newer click won the race
      renderSlots(booked);
    }

    function selectSlot(t, btn) {
      selectedSlot = t;
      Array.from(slotsEl.children).forEach((c) =>
        c.setAttribute && c.setAttribute("aria-pressed", c === btn ? "true" : "false")
      );
      selectedEl.innerHTML =
        `Holding <strong>${selectedDate.toLocaleDateString("en-US", { weekday: "long" })}, ` +
        `${formatLong(selectedDate)} · ${to12h(t)}</strong> pending confirmation.`;
      submitLabel.textContent = "Send Inquiry & Hold Time";
    }

    // First bookable day (tomorrow, or the next business day after it).
    function firstSelectableDate() {
      const d = new Date(minDate);
      while (!isSelectable(d)) d.setDate(d.getDate() + 1);
      return d;
    }

    // ---- Optional toggle + month navigation --------------------------
    optin.addEventListener("change", () => {
      if (optin.checked) {
        optionalEl.hidden = false;
        if (!calBuilt) {
          buildDow();
          calBuilt = true;
        }
        // Open with the first available date already chosen, so the times
        // pane is populated rather than empty.
        if (selectedDate) renderCalendar();
        else selectDate(firstSelectableDate());
      } else {
        optionalEl.hidden = true;
        selectedDate = null;
        selectedSlot = null;
        selectedEl.innerHTML = "";
        submitLabel.textContent = "Send Inquiry";
      }
    });
    prevBtn.addEventListener("click", () => {
      if (viewMonth === 0) { viewMonth = 11; viewYear--; } else { viewMonth--; }
      renderCalendar();
    });
    nextBtn.addEventListener("click", () => {
      if (viewMonth === 11) { viewMonth = 0; viewYear++; } else { viewMonth++; }
      renderCalendar();
    });

    // ---- Submit: inquiry required; consultation time optional --------
    function buildMailto(p) {
      const subject = `Inquiry: ${p.type}${p.organisation ? ", " + p.organisation : ""}`;
      let body =
        `Name: ${p.name}\n` +
        `Email: ${p.email}\n` +
        (p.organisation ? `Organisation: ${p.organisation}\n` : "") +
        (p.phone ? `Phone: ${p.phone}\n` : "") +
        `Nature of inquiry: ${p.type}\n`;
      if (p.bookingRequested === "Yes") {
        body += `\nRequested consultation: ${p.weekday}, ${p.dateLabel} at ${p.timeLabel} (${p.timezone})\n`;
      }
      body += `\n${p.message}\n`;
      return "mailto:" + C.notifyEmail +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    }

    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      if (!name || !email || !message) {
        statusEl.style.color = "var(--rose)";
        statusEl.textContent = "Please add your name, email and a short message.";
        return;
      }
      const booking = optin.checked;
      if (booking && (!selectedDate || !selectedSlot)) {
        statusEl.style.color = "var(--rose)";
        statusEl.textContent = "Please choose a date and time, or untick the consultation option.";
        return;
      }

      const key = booking ? dateKey(selectedDate) : "";
      const payload = {
        name,
        email,
        organisation: (data.get("organisation") || "").toString().trim(),
        phone: (data.get("phone") || "").toString().trim(),
        type: (data.get("type") || "Inquiry").toString().trim(),
        message,
        to_email: C.notifyEmail,
        bookingRequested: booking ? "Yes" : "No",
        date: booking ? key : "",
        dateLabel: booking ? formatLong(selectedDate) : "",
        weekday: booking ? selectedDate.toLocaleDateString("en-US", { weekday: "long" }) : "",
        time: booking ? selectedSlot : "",
        timeLabel: booking ? to12h(selectedSlot) : "",
        timezone: booking ? C.timezoneLabel : "",
      };

      submitBtn.disabled = true;
      statusEl.style.color = "";
      statusEl.textContent = "Sending your inquiry…";

      // 1) Reserve the slot in the Sheet (only when a time was chosen)
      let recorded = false;
      if (booking && C.appsScriptUrl) {
        try {
          await fetch(C.appsScriptUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
          });
          recorded = true;
        } catch (err) {
          console.warn("Sheet write failed:", err);
        }
      }

      // 2) Send the email — EmailJS if configured, else mailto compose
      let emailed = false;
      let mailtoUsed = false;
      if (emailjsReady()) {
        try {
          await window.emailjs.send(
            C.emailjs.serviceId,
            C.emailjs.templateId,
            payload,
            { publicKey: C.emailjs.publicKey }
          );
          emailed = true;
        } catch (err) {
          console.warn("EmailJS send failed:", err);
        }
      } else {
        window.location.href = buildMailto(payload);
        emailed = true;
        mailtoUsed = true;
      }

      submitBtn.disabled = false;

      if (!emailed && !recorded) {
        statusEl.style.color = "var(--rose)";
        statusEl.textContent =
          "Something went wrong. Please email hello@inspirehospitality.com.";
        return;
      }

      // Grey out the held slot immediately for everyone.
      if (booking) {
        bookedCache[key] && bookedCache[key].add(selectedSlot);
        const slotBtn = slotsEl.querySelector(`[data-time="${selectedSlot}"]`);
        if (slotBtn) {
          slotBtn.disabled = true;
          slotBtn.setAttribute("aria-disabled", "true");
          slotBtn.setAttribute("aria-pressed", "false");
        }
      }

      // Reset the form back to its inquiry-only state.
      bookingForm.reset();
      optin.checked = false;
      optionalEl.hidden = true;
      selectedEl.innerHTML = "";
      selectedDate = null;
      selectedSlot = null;
      submitLabel.textContent = "Send Inquiry";

      statusEl.style.color = "var(--peach)";
      statusEl.textContent = mailtoUsed
        ? "Opening your email client… if nothing happens, write to hello@inspirehospitality.com."
        : booking
          ? "Thank you — your inquiry and preferred time have been sent. We’ll reply to confirm."
          : "Thank you — your inquiry has been sent. We’ll reply within two business days.";
    });
  }

  // ---- Portfolio: filter, project gallery + lightbox ------------------
  const folioGrid = document.getElementById("folio-grid");
  if (folioGrid) {
    const items = Array.from(folioGrid.querySelectorAll(".folio-item"));
    const filterBtns = Array.from(document.querySelectorAll(".folio-filter__btn"));
    const emptyMsg = document.querySelector(".folio-empty");

    const applyFilter = (cat) => {
      let shown = 0;
      items.forEach((it) => {
        const match = cat === "all" || it.getAttribute("data-cat") === cat;
        it.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (emptyMsg) emptyMsg.style.display = shown ? "none" : "block";
    };

    filterBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        applyFilter(btn.getAttribute("data-filter") || "all");
      })
    );

    // ---- Project galleries: a single tile opens a description + image set ----
    const projects = {
      avantgarde: {
        eyebrow: "VIP Hotel Operations, Porsche Carrera Cup Asia",
        title: "Avantgarde",
        body: "Avantgarde is a global brand experience agency entrusted to create the Porsche Carrera Cup Asia and lead the logistics for hosting Porsche VIP clients, drivers and vendors. We provided on-site support and training for the hotel operations teams, worked with culinary and F&B teams for menus, food tastings and service, handled VIP rooms and guest logistics between the hotel and the race track to ensure an exceptional guest experience.",
        images: [
          { src: "assets/img/gallery/events/PCCA 8.jpg", alt: "Hotel service team in red Porsche-branded shirts at distanced rooftop terrace tables before the event" },
          { src: "assets/img/gallery/events/PCCA 7.jpg", alt: "Hotel leadership and Porsche partners giving a thumbs up in the hotel lobby" },
          { src: "assets/img/gallery/events/PCCA 9.jpg", alt: "Hotel operations team in a service training briefing before the Porsche Carrera Cup" },
          { src: "assets/img/gallery/events/PCCA 6.jpg", alt: "The hotel operations team posing together with a bell cart in the lobby" },
          { src: "assets/img/gallery/events/PCCA 10.jpg", alt: "The full service team in red shirts giving a thumbs up on the rooftop deck" },
          { src: "assets/img/gallery/events/PCCA 4.jpg", alt: "Porsche Carrera Cup Asia flags outside the host hotel against a bamboo backdrop" },
          { src: "assets/img/gallery/events/PCCA 3.jpg", alt: "Guests at a red-lit evening reception beside a Porsche 911 race car" },
          { src: "assets/img/gallery/events/PCCA 5.jpg", alt: "A glowing red Porsche Carrera Cup Asia neon sign in the event lounge" },
          { src: "assets/img/gallery/events/PCCA 2.jpg", alt: "The Dream Spirit, Porsche Carrera Cup Asia signage illuminated at the evening event" },
        ],
      },
      sixarts: {
        eyebrow: "Property Management · Boutique Hotel & Museum · Lili Ancient Town, Suzhou, China",
        title: "Six Arts Culture Park",
        body: "The Six Arts Culture Park is a top-ranked 4A tourist destination in Lili Ancient Town (Suzhou, China) that encompasses a 10,000sqm museum, 50 room boutique hotel, 100-seat restaurant and franchised outlets. We supported the owners with managing the daily operations, on-site support and training, establishing standard operating procedures, recruitment and onboarding, operational budgets, and sales and marketing.",
        images: [
          { src: "assets/img/gallery/projects/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20200905153336.jpg", alt: "Ornate gilded and lacquered traditional Chinese pavilion ceiling with stained-glass panels" },
          { src: "assets/img/gallery/projects/%E4%B8%89%E6%A5%BC-%E5%8C%BE%E9%A2%9D%E9%A6%86.jpg", alt: "Pink-walled gallery of antique carved plaques around a grey-brick archway in the Plaque Hall" },
          { src: "assets/img/gallery/rooms/%E6%82%A6%E8%89%BA%E8%87%B3%E5%B0%8A%E7%A7%81%E5%AE%B6%E8%8A%B1%E5%9B%AD%E5%A5%97%E6%88%BF%20(5).JPG", alt: "Boutique hotel garden suite with a green velvet sofa, chandelier and carved timber bed" },
          { src: "assets/img/home/%E4%B8%89%E6%A5%BC-%E6%BC%86%E7%94%BB%E9%A6%86.jpg", alt: "White-walled gallery hung with rows of framed antique lacquer paintings" },
          { src: "assets/img/gallery/projects/%E4%B8%89%E6%A5%BC-%E6%BC%86%E7%94%BB%E7%AE%B1%E9%A6%86.jpg", alt: "Painted red lacquer chests displayed on white shelves against a turquoise wall" },
          { src: "assets/img/gallery/projects/%E4%B8%89%E6%A5%BC-%E9%9B%80%E6%9B%BF%E9%A6%86.jpg", alt: "Carved timber bracket sets mounted on a purple gallery wall" },
          { src: "assets/img/gallery/projects/museum%202.jpg", alt: "A curved stone wall of blue-lit arched niches, each holding a small figurine" },
          { src: "assets/img/home/museum.jpg", alt: "The Six Arts Museum facade with colourful panels and a traditional pavilion gate" },
          { src: "assets/img/gallery/projects/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20200905153432.jpg", alt: "Stone-brick heritage courtyard buildings with traditional tiled rooflines under a blue sky" },
        ],
      },
      ardor: {
        eyebrow: "Pre-Opening · Luxury Senior Living Lifestyle Resort · Qingpu, Shanghai, China",
        title: "Ardor Gardens by Lendlease",
        body: "Lendlease is a publically traded Australian real estate development company with a vision to be China's leader in senior lifestyle resort living with their inaugural senior-living resort, Ardor Gardens, located in Qingpu, Shanghai. We created the Ardor Gardens service culture that was integrated into their regional brand positioning and human resources training material. We created and delivered leadership and new employee orientation training collateral to instill and reinforce the service culture for the pre-opening team.",
        images: [
          { src: "assets/img/gallery/projects/0ec56d5efa9febf24e8428fad58aa01.jpg", alt: "An elderly couple chatting warmly under string lights at sunset at Ardor Gardens" },
          { src: "assets/img/gallery/projects/3e3df723f3f75c770e2e2a5b4cda4be.jpg", alt: "The Ardor Gardens team enjoying a picnic on the resort lawn, giving a thumbs up" },
          { src: "assets/img/gallery/projects/1111.jpg", alt: "The pre-opening team in white uniforms practising tai chi poses on the resort courtyard" },
          { src: "assets/img/gallery/projects/b644a25638f2b11cbd9c1309361d756.jpg", alt: "Ardor Gardens staff in branded team vests during a pre-opening session" },
          { src: "assets/img/gallery/projects/d845257844c507e76d776f431d228e5.jpg", alt: "The team holding orange balloons at the 'We Are One Team' scavenger hunt" },
          { src: "assets/img/gallery/projects/542fdc39f1f8fd128ebd39fc3ac749a.jpg", alt: "Staff in red Ardor Gardens shirts gathered around a model home in the lounge" },
          { src: "assets/img/gallery/projects/7cb1d18df37e791d83aaa508bac7403.jpg", alt: "A row of crystal 'Best Team' star trophies at Ardor Gardens" },
          { src: "assets/img/gallery/projects/9a882c6b65536e4a2cc92e26ab0d738.jpg", alt: "The full pre-opening team gathered for a group photo in the ballroom" },
          { src: "assets/img/gallery/events/Ardor%20Gardens%20Training%202.jpg", alt: "The Ardor Gardens pre-opening team in white uniforms making a salute on the resort lawn" },
        ],
      },
      k11artus: {
        eyebrow: "Pre-Opening · Luxury Residences · Victoria Dockside, Hong Kong",
        title: "K11 ARTUS",
        body: "The K11 luxury flagship residences at Victoria Dockside in Hong Kong. We were entrusted to create the brand service culture and standards, training plans and facilitate the pre-opening simulations to prepare for the arrival of their discerning residents and guests.",
        images: [
          { src: "assets/img/gallery/projects/Photo22.jpg", alt: "Team members holding painted artist palettes at an easel painting session" },
          { src: "assets/img/gallery/projects/photo1.jpg", alt: "A facilitator leading the K11 ARTUS service manifesto and 'Principles of Our Art' exercise" },
          { src: "assets/img/gallery/projects/Photo%2014.jpg", alt: "The team holding up yellow name cards and giving a thumbs up" },
          { src: "assets/img/gallery/projects/003.jpg", alt: "Staff in white artisan coats on stage during a pre-opening simulation" },
          { src: "assets/img/gallery/projects/007.jpg", alt: "The team cheering during a Rooms Concierge service simulation" },
          { src: "assets/img/gallery/projects/006.jpg", alt: "Team members gathered closely around a hands-on training task" },
          { src: "assets/img/gallery/projects/002.jpg", alt: "The K11 ARTUS team beneath the Visualize Your Masterpiece wall" },
          { src: "assets/img/gallery/projects/004.jpg", alt: "Staff raising department signs and cheering at a pre-opening rally" },
          { src: "assets/img/gallery/projects/005.jpg", alt: "The pre-opening team with hands raised in a service culture session" },
        ],
      },
      k11musea: {
        eyebrow: "Pre-Opening · Luxury Retail · Victoria Dockside, Hong Kong",
        title: "K11 MUSEA",
        body: "A pioneer in the luxury cultural retail concept. As part of the pre-opening preparations for this flagship location, we were selected to elevate and train service standards and customer touchpoints to reflect a luxury retail experience.",
        images: [
          { src: "assets/img/gallery/events/20190805_IMG_7680.JPG", alt: "The K11 MUSEA pre-opening team gathered in their harbour-view office during training" },
          { src: "assets/img/gallery/events/20190805_IMG_7672.JPG", alt: "The full K11 MUSEA team around a light cube in the office, with the Hong Kong skyline behind" },
          { src: "assets/img/gallery/events/20190726_IMG_7518.JPG", alt: "The K11 MUSEA team seated together by the floor-to-ceiling office windows" },
          { src: "assets/img/gallery/events/20190805_IMG_7674.JPG", alt: "Team members building a marshmallow structure in a hands-on training exercise" },
          { src: "assets/img/gallery/projects/56c49d2ba43d66cfbc1997eeb9decab.jpg", alt: "The team celebrating their completed Castles in the Sky marshmallow tower" },
          { src: "assets/img/gallery/events/20190722_IMG_7305.JPG", alt: "A team member illustrating a K11 MUSEA Fashion brand vision board" },
        ],
      },
      huazhu: {
        eyebrow: "Brand & Design Consultancy · Crystal Orange Brand Concept · Shanghai, China",
        title: "Huazhu Hotels",
        body: "One of China's largest publicly traded hotel management companies with a vision to elevate their brand portfolio to international standards and strategically re-branding their domestic presence. We were selected to create and consult on the design of a whiskey bar concept for the rebranding of their Crystal Orange Hotels. In addition, we provided consultancy for their corporate design team for OS&E, FF&E and vendors, and provided service implementation and training for their corporate operations team.",
        images: [
          { src: "assets/img/gallery/HuazhuHotels/e6ee80_80b2672c39e940a58f4f1e090b48cd03~mv2.avif", alt: "Crystal Orange Hotels whiskey bar brand concept design" },
          { src: "assets/img/gallery/HuazhuHotels/e6ee80_413f55257fda4c64a6f5aee82cb19915~mv2.avif", alt: "Crystal Orange Hotels rebranding design concept" },
          { src: "assets/img/gallery/HuazhuHotels/e6ee80_0138429bc870498690a02cdb4bbee0b9~mv2.avif", alt: "Crystal Orange Hotels interior design and brand concept" },
        ],
      },
      simonli: {
        eyebrow: "Service Training · Shanghai, China",
        title: "Simon Li Furniture",
        body: "A global furniture manufacturing company that combines Danish design with Chinese craftsmanship based in Shanghai, China. We were selected to provide elevated service and hospitality training for the operations teams that interface with clients, vendors and government representatives.",
        images: [
          { src: "assets/img/gallery/SimonLiFurniture/graduation-group.jpg", alt: "The Simon Li Furniture team in graduation caps celebrating their service training completion outdoors" },
          { src: "assets/img/gallery/SimonLiFurniture/reception-briefing.jpeg", alt: "An Inspire Hospitality trainer briefing the team at the Simon Li Furniture reception desk" },
          { src: "assets/img/gallery/SimonLiFurniture/training-room.jpeg", alt: "The Simon Li Furniture team seated for a service training session beside a wall of framed photos" },
          { src: "assets/img/gallery/SimonLiFurniture/service-tasting.jpeg", alt: "A trainer leading a hands-on service standards exercise with the Simon Li Furniture team" },
          { src: "assets/img/gallery/SimonLiFurniture/script-practice.jpeg", alt: "Simon Li Furniture team members practising standard service scripts from printed guides" },
          { src: "assets/img/gallery/SimonLiFurniture/standards-presentation.jpeg", alt: "An Inspire Hospitality trainer presenting standard service verbiage on screen" },
          { src: "assets/img/gallery/SimonLiFurniture/hands-on-1.jpeg", alt: "The Simon Li Furniture team gathered around a table for a hands-on training activity" },
          { src: "assets/img/gallery/SimonLiFurniture/hands-on-2.jpeg", alt: "Close-up of Simon Li Furniture team members during a hands-on service training task" },
        ],
      },
      lcatterton: {
        eyebrow: "Service Training · Will’s VIP Fitness · Shanghai, China",
        title: "L’Catterton Private Equity Firm",
        body: "China’s leading fitness brand to L’Catterton, an LVMH-backed private equity firm. We were chosen to support with restructuring the service operations, creating training plans and delivering service training for the Will’s VIP brand with the aim of becoming the market leader in the luxury fitness sector in China.",
        images: [
          { src: "assets/img/gallery/WillsVIPFitness/e6ee80_33fae67d6b844093b01c547935356462~mv2.avif", alt: "The Will’s VIP team applauding during a service training session in a glass-walled office" },
          { src: "assets/img/gallery/WillsVIPFitness/reception-team.jpg", alt: "The Will’s Fitness team gathered at reception holding Will’s and VIP brand signs" },
          { src: "assets/img/gallery/WillsVIPFitness/fitness-team.jpg", alt: "The Will’s VIP Fitness team in athletic and business attire after their service training" },
          { src: "assets/img/gallery/WillsVIPFitness/training-session.jpg", alt: "An Inspire Hospitality trainer leading a Will’s VIP service training session" },
          { src: "assets/img/gallery/WillsVIPFitness/e6ee80_5123d6a5116f46ec85b55c6d819f2601~mv2.avif", alt: "Will’s VIP team members reviewing branded service materials over coffee" },
          { src: "assets/img/gallery/WillsVIPFitness/vip-amenities.jpg", alt: "Will’s VIP branded boxing gloves, gift bags and kettlebell amenities" },
          { src: "assets/img/gallery/WillsVIPFitness/e6ee80_585b5193452945d09b9e1dc6c5239102~mv2.avif", alt: "The Will’s VIP team during a hands-on service training activity" },
          { src: "assets/img/gallery/WillsVIPFitness/e6ee80_aecbd488c27b4eac934193312ede94e0~mv2.avif", alt: "The full Will’s VIP Fitness team in a group photo during training" },
          { src: "assets/img/gallery/WillsVIPFitness/team-break.jpg", alt: "Two Will’s VIP Fitness team members smiling during a training break" },
        ],
      },
      stayinspired: {
        eyebrow: "Interview Series · In partnership with Sommet Education · 2020–2021",
        title: "Stay Inspired Interview Series",
        body: "In partnership with Sommet Education, the Stay Inspired Interview Series explores the many industries and career paths that require a hospitality skillset. Through career exploration, learning and networking, it is our mission to keep hospitality professionals inspired and proud to work in our industry.",
        images: [
          { src: "assets/img/gallery/StayInspired/e6ee80_0f7a6a44354741e1a18f4506c9860f5d~mv2.avif", alt: "A Stay Inspired Interview Series session in partnership with Sommet Education" },
          { src: "assets/img/gallery/StayInspired/e6ee80_185167a09c714821a1cdb620ad8082af~mv2.avif", alt: "A guest speaker being interviewed at the Stay Inspired Interview Series" },
          { src: "assets/img/gallery/StayInspired/e6ee80_2622505855384f528724fbc74addac3c~mv2.avif", alt: "The Stay Inspired Interview Series stage with the series branding" },
          { src: "assets/img/gallery/StayInspired/e6ee80_56e68429c06a45748bb4325184a5d26f~mv2.avif", alt: "Speakers and guests at a Stay Inspired Interview Series event" },
          { src: "assets/img/gallery/StayInspired/e6ee80_8e85a438c27d4099ad89dba46664fb8d~mv2.avif", alt: "An interview being recorded during the Stay Inspired Interview Series" },
          { src: "assets/img/gallery/StayInspired/e6ee80_96626120b5a54ea8bc4ef4c4668b1a47~mv2.avif", alt: "Attendees gathered for a Stay Inspired Interview Series group photo" },
          { src: "assets/img/gallery/StayInspired/e6ee80_e01b770687d24cfea3838dee89016689~mv2.avif", alt: "Hospitality professionals networking at the Stay Inspired Interview Series" },
          { src: "assets/img/gallery/StayInspired/e6ee80_f8ba0234c8244c489b0cd5c79fba3af2~mv2.avif", alt: "An on-stage interview during the Stay Inspired Interview Series" },
          { src: "assets/img/gallery/StayInspired/e6ee80_fb6ce414e4ae412faa1f8bc9b6dd3c65~mv2.avif", alt: "The Stay Inspired Interview Series venue set up in partnership with Sommet Education" },
        ],
      },
      igniteinspire: {
        eyebrow: "Hospitality Leadership Forum · Shanghai, China · 2021",
        title: "Ignite & Inspire Forum",
        body: "Shanghai’s largest Hospitality Leadership Forum that brings industry and aspiring leaders together, inspires them to be motivated to continue to grow in their careers, and helps them develop the skills they need to develop the future leaders within their teams. Attendees include approximately 150 to 200 mid-level managers, department heads, division heads, entrepreneurs, senior leaders, executives, educators and students in the hospitality & tourism industry.",
        images: [
          { src: "assets/img/gallery/IgniteInspire/01-mentor-keynote.jpg", alt: "A keynote on stage with a ‘Why do we need a mentor?’ slide at the Ignite & Inspire Forum" },
          { src: "assets/img/gallery/IgniteInspire/02-networking.jpg", alt: "Attendees networking in the foyer at the Ignite & Inspire Forum" },
          { src: "assets/img/gallery/IgniteInspire/03-networking.jpg", alt: "Guests chatting over drinks at the Ignite & Inspire Forum reception" },
          { src: "assets/img/gallery/IgniteInspire/04-group-photo.jpg", alt: "The full group of attendees in front of the Ignite & Inspire, The Confidence to Lead backdrop" },
          { src: "assets/img/gallery/IgniteInspire/05-forum-room.jpg", alt: "The Ignite & Inspire Forum ballroom with a panel on stage beneath an ornate gold ceiling" },
          { src: "assets/img/gallery/IgniteInspire/06-panel.jpg", alt: "The speaker panel seated on stage at the Ignite & Inspire Hospitality Forum" },
          { src: "assets/img/gallery/IgniteInspire/07-keynote-gsk.jpg", alt: "A keynote speaker presenting ‘I am proud to work for GSK for 22 years’ at the forum" },
          { src: "assets/img/gallery/IgniteInspire/08-networking.jpg", alt: "Two guests in conversation during the Ignite & Inspire Forum reception" },
          { src: "assets/img/gallery/IgniteInspire/09-objectives-keynote.jpg", alt: "A speaker presenting the forum objectives on stage at the Ignite & Inspire Forum" },
        ],
      },
      womeninhospitality: {
        eyebrow: "Women’s Leadership Forum · Shanghai, China · 2019",
        title: "Inspire Women in Hospitality Forum",
        body: "The IWH Forum was hosted to bring female hospitality leaders and entrepreneurs together for learning, networking and strengthening leadership skills.",
        images: [
          { src: "assets/img/gallery/WomenInHospitality/01-group-photo.jpg", alt: "The full group of attendees in front of the Inspire Women in Hospitality Forum balloon backdrop" },
          { src: "assets/img/gallery/WomenInHospitality/02-panel-moderator.jpg", alt: "A moderator leading the panel discussion at the Inspire Women in Hospitality Forum" },
          { src: "assets/img/gallery/WomenInHospitality/03-forum-room.jpg", alt: "The Inspire Women in Hospitality Forum ballroom with the stage and audience" },
          { src: "assets/img/gallery/WomenInHospitality/04-panel-speaker.jpg", alt: "A panellist speaking during a discussion at the Inspire Women in Hospitality Forum" },
          { src: "assets/img/gallery/WomenInHospitality/05-audience.jpg", alt: "Attendees listening in the audience at the Inspire Women in Hospitality Forum" },
          { src: "assets/img/gallery/WomenInHospitality/06-podium-speaker.jpg", alt: "A speaker addressing the room from the podium at the Inspire Women in Hospitality Forum" },
          { src: "assets/img/gallery/WomenInHospitality/07-ballroom.jpg", alt: "The Inspire Women in Hospitality Forum ballroom set up before the event" },
          { src: "assets/img/gallery/WomenInHospitality/08-students.jpg", alt: "Hospitality students applauding in the audience at the Inspire Women in Hospitality Forum" },
          { src: "assets/img/gallery/WomenInHospitality/09-networking.jpg", alt: "Guests networking at the Inspire Women in Hospitality Forum reception" },
        ],
      },
      conferenceslectures: {
        eyebrow: "Conferences & Lectures · 2018–2022",
        title: "Hospitality Conferences & Lectures",
        body: "",
        images: [
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_0b7dd9e56566478ba7f3e05e4bb73a5d~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_1616f81b95d44a5ba3b6ac6a98164576~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_34d998c0970040ff8aa119272b6d365a~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_89362f00ea6c4a38a3c56c79d7678dd2~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_aa00ea913f1f49fdb979504a066c75a7~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/e6ee80_cebacd50bf624cc89e0663d7c586cd99~mv2.avif", alt: "A hospitality conference or guest lecture session" },
          { src: "assets/img/gallery/ConferencesLectures/04-yhs-delegates.jpg", alt: "Delegates with the Young Hoteliers Summit Asia-Pacific 2019 banner" },
          { src: "assets/img/gallery/ConferencesLectures/05-school-group.jpg", alt: "A group photo at GL International Hospitality Management school" },
          { src: "assets/img/gallery/ConferencesLectures/06-university-lecture.jpg", alt: "A guest lecture to hospitality students in a university classroom" },
          { src: "assets/img/gallery/ConferencesLectures/08-lecture-hall.jpg", alt: "Students at a packed university lecture hall during a guest lecture" },
        ],
        // NOTE: 02-yhs-stage.jpg removed — flagged as a different event.
      },
    };

    // ---- Lightbox (operates on a normalised pool of {src, alt, tag, title}) ----
    const lb = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightbox-img");
    const lbCap = document.getElementById("lightbox-cap");
    const projectEl = document.getElementById("project");
    let lbPool = [];
    let lbPos = 0;
    let lbLastFocus = null;

    const lbRender = () => {
      const it = lbPool[lbPos];
      if (!it) return;
      lbImg.src = it.src;
      lbImg.alt = it.alt || "";
      if (lbCap) lbCap.innerHTML = `<span>${it.tag || ""}</span>` + (it.title || "");
    };
    const lbOpen = (poolData, index) => {
      if (!lb || !lbImg) return;
      lbPool = poolData;
      lbPos = Math.max(0, index);
      lbLastFocus = document.activeElement;
      lbRender();
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    const lbClose = () => {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      // Keep the scroll lock if the project overlay is still open underneath.
      if (!projectEl || !projectEl.classList.contains("is-open")) {
        document.body.style.overflow = "";
      }
      if (lbLastFocus) lbLastFocus.focus();
    };
    const lbStep = (d) => { lbPos = (lbPos + d + lbPool.length) % lbPool.length; lbRender(); };

    if (lb && lbImg) {
      lb.querySelectorAll("[data-lb-close]").forEach((b) => b.addEventListener("click", lbClose));
      const prevBtn = lb.querySelector(".lightbox__btn--prev");
      const nextBtn = lb.querySelector(".lightbox__btn--next");
      if (prevBtn) prevBtn.addEventListener("click", () => lbStep(-1));
      if (nextBtn) nextBtn.addEventListener("click", () => lbStep(1));
      lb.addEventListener("click", (e) => { if (e.target === lb) lbClose(); });
      document.addEventListener("keydown", (e) => {
        if (!lb.classList.contains("is-open")) return;
        if (e.key === "Escape") lbClose();
        else if (e.key === "ArrowRight") lbStep(1);
        else if (e.key === "ArrowLeft") lbStep(-1);
      });
    }

    // ---- Project overlay (cinematic carousel) ----
    const projectGrid = document.getElementById("project-grid");
    let projectLastFocus = null;
    let projectCarousel = null; // { step(d) } — exposed for keyboard nav

    const projectClose = () => {
      if (!projectEl) return;
      projectEl.classList.remove("is-open");
      projectEl.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      projectCarousel = null;
      if (projectLastFocus) projectLastFocus.focus();
    };

    const carArrow = (d) =>
      `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const projectOpen = (key) => {
      const data = projects[key];
      if (!projectEl || !data) return;
      document.getElementById("project-eyebrow").textContent = data.eyebrow;
      document.getElementById("project-title").textContent = data.title;
      document.getElementById("project-body").textContent = data.body;

      const imgs = data.images;
      const pool = imgs.map((x) => ({ src: x.src, alt: x.alt, tag: data.eyebrow, title: data.title }));

      projectGrid.className = "project__gallery";
      projectGrid.innerHTML = "";

      // --- Stage: feature image, arrows, counter ---
      const stage = document.createElement("div");
      stage.className = "pcar__stage";
      const track = document.createElement("div");
      track.className = "pcar__track";

      let dragged = false;
      imgs.forEach((im, i) => {
        const slide = document.createElement("button");
        slide.type = "button";
        slide.className = "pcar__slide";
        slide.setAttribute("aria-label", "Enlarge image");
        const img = document.createElement("img");
        img.src = im.src;
        img.alt = im.alt || "";
        img.loading = i === 0 ? "eager" : "lazy";
        img.draggable = false;
        slide.appendChild(img);
        slide.addEventListener("click", () => { if (!dragged) lbOpen(pool, i); });
        track.appendChild(slide);
      });

      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "pcar__nav pcar__nav--prev";
      prev.setAttribute("aria-label", "Previous image");
      prev.innerHTML = carArrow("M9 1L3 7L9 13");

      const next = document.createElement("button");
      next.type = "button";
      next.className = "pcar__nav pcar__nav--next";
      next.setAttribute("aria-label", "Next image");
      next.innerHTML = carArrow("M5 1L11 7L5 13");

      const counter = document.createElement("div");
      counter.className = "pcar__counter";

      stage.append(prev, track, next, counter);

      // --- Progress bar ---
      const progress = document.createElement("div");
      progress.className = "pcar__progress";
      const bar = document.createElement("span");
      bar.className = "pcar__bar";
      progress.appendChild(bar);

      // --- Thumbnail filmstrip ---
      const thumbs = document.createElement("div");
      thumbs.className = "pcar__thumbs";
      imgs.forEach((im, i) => {
        const t = document.createElement("button");
        t.type = "button";
        t.className = "pcar__thumb";
        t.setAttribute("aria-label", "Go to image " + (i + 1));
        const ti = document.createElement("img");
        ti.src = im.src;
        ti.alt = "";
        ti.loading = "lazy";
        ti.draggable = false;
        t.appendChild(ti);
        t.addEventListener("click", () => goTo(i));
        thumbs.appendChild(t);
      });

      projectGrid.append(stage, progress, thumbs);

      // --- State + render ---
      const total = imgs.length;
      const thumbEls = Array.from(thumbs.children);
      let index = 0;

      const render = () => {
        track.style.transform = "translateX(" + (-index * 100) + "%)";
        counter.textContent =
          String(index + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
        bar.style.width = ((index + 1) / total) * 100 + "%";
        thumbEls.forEach((el, i) => el.classList.toggle("is-active", i === index));
        const active = thumbEls[index];
        if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      };
      const goTo = (i) => { index = (i + total) % total; render(); };

      prev.addEventListener("click", () => goTo(index - 1));
      next.addEventListener("click", () => goTo(index + 1));
      // keep arrow clicks from starting a drag
      [prev, next].forEach((b) => b.addEventListener("pointerdown", (e) => e.stopPropagation()));

      if (total <= 1) {
        prev.style.display = "none";
        next.style.display = "none";
        progress.style.display = "none";
        thumbs.style.display = "none";
      }

      // --- Drag / swipe (document listeners attached only during a drag) ---
      let startX = 0, dx = 0, dragging = false;
      const onMove = (e) => {
        if (!dragging) return;
        dx = e.clientX - startX;
        if (Math.abs(dx) > 6) dragged = true;
        track.style.transform = "translateX(calc(" + (-index * 100) + "% + " + dx + "px))";
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        track.style.transition = "";
        if (dx < -50) goTo(index + 1);
        else if (dx > 50) goTo(index - 1);
        else render();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      stage.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        dragging = true; dragged = false; startX = e.clientX; dx = 0;
        track.style.transition = "none";
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      });

      render();
      projectCarousel = { step: (d) => goTo(index + d) };

      projectLastFocus = document.activeElement;
      projectEl.classList.add("is-open");
      projectEl.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      const closeBtn = projectEl.querySelector(".project__close");
      if (closeBtn) closeBtn.focus();
    };

    if (projectEl) {
      projectEl.querySelectorAll("[data-project-close]").forEach((b) =>
        b.addEventListener("click", projectClose)
      );
      document.addEventListener("keydown", (e) => {
        if (!projectEl.classList.contains("is-open")) return;
        if (lb && lb.classList.contains("is-open")) return; // lightbox handles its own keys
        if (e.key === "Escape") projectClose();
        else if (e.key === "ArrowRight" && projectCarousel) projectCarousel.step(1);
        else if (e.key === "ArrowLeft" && projectCarousel) projectCarousel.step(-1);
      });
    }

    // ---- Tile clicks: project tiles open a gallery; others open the lightbox ----
    items.forEach((it) => {
      it.addEventListener("click", () => {
        const proj = it.getAttribute("data-project");
        if (proj && projects[proj]) {
          projectOpen(proj);
          return;
        }
        const visible = items.filter(
          (i) => !i.classList.contains("is-hidden") && !i.getAttribute("data-project")
        );
        const pool = visible.map((el) => {
          const img = el.querySelector("img");
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") || "",
            tag: el.getAttribute("data-tag") || "",
            title: el.getAttribute("data-title") || "",
          };
        });
        lbOpen(pool, Math.max(0, visible.indexOf(it)));
      });
    });
  }
})();
