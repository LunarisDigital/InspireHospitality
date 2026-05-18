(() => {
  "use strict";

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

    // Only auto-advance while the banner is in view — saves resources
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

  // ---- Scroll reveal --------------------------------------------------
  const targets = document.querySelectorAll(
    ".positioning .positioning__inner, " +
      ".track .section-head, .stat, " +
      ".clients .section-head, .logos li, " +
      ".platform .section-head, .capability, " +
      ".values .section-head, .value, " +
      ".cta__inner"
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
})();
