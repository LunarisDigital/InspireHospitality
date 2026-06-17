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

  // ---- Contact form: compose a mailto (static-site friendly) ----------
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const org = (data.get("organisation") || "").toString().trim();
      const type = (data.get("type") || "Inquiry").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!name || !email || !message) {
        if (status) status.textContent = "Please add your name, email and a short message.";
        return;
      }

      const subject = `Inquiry: ${type}${org ? ", " + org : ""}`;
      const body =
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        (org ? `Organisation: ${org}\n` : "") +
        `Nature of inquiry: ${type}\n\n` +
        `${message}\n`;
      const href =
        "mailto:hello@inspirehospitality.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = href;
      if (status) {
        status.textContent =
          "Opening your email client… if nothing happens, write to hello@inspirehospitality.com.";
      }
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
        eyebrow: "Hotel Operations · Ningbo, China",
        title: "Avantgarde: Porsche Carrera Cup Asia",
        body: "Avantgarde is a global brand experience agency entrusted to create the Porsche Carrera Cup Asia and lead the logistics for hosting Porsche VIP clients, drivers and vendors. We provided support and training for the hotel operations teams, worked with culinary and F&B teams for menus, food tastings and service, handled VIP rooms and guest logistics between the hotel and the race track to ensure an exceptional guest experience.",
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
        body: "The Six Arts Culture Park is a top-ranked 4A tourist destination in Lili Ancient Town (Suzhou, China) that encompasses a 10,000sqm museum, 50 room boutique hotel, 100-seat restaurant and franchised outlets. We supported the owners with managing the daily operations, providing on-site support and training, establishing standard operating procedures, recruitment and onboarding, operational budgets, and sales and marketing.",
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

    // ---- Project overlay ----
    const projectGrid = document.getElementById("project-grid");
    let projectLastFocus = null;

    const projectClose = () => {
      if (!projectEl) return;
      projectEl.classList.remove("is-open");
      projectEl.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (projectLastFocus) projectLastFocus.focus();
    };
    const projectOpen = (key) => {
      const data = projects[key];
      if (!projectEl || !data) return;
      document.getElementById("project-eyebrow").textContent = data.eyebrow;
      document.getElementById("project-title").textContent = data.title;
      document.getElementById("project-body").textContent = data.body;
      projectGrid.innerHTML = "";
      data.images.forEach((im, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("aria-label", "Enlarge image");
        const img = document.createElement("img");
        img.src = im.src;
        img.alt = im.alt || "";
        img.loading = "lazy";
        btn.appendChild(img);
        btn.addEventListener("click", () =>
          lbOpen(
            data.images.map((x) => ({ src: x.src, alt: x.alt, tag: data.eyebrow, title: data.title })),
            i
          )
        );
        projectGrid.appendChild(btn);
      });
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
        if (e.key !== "Escape") return;
        if (!projectEl.classList.contains("is-open")) return;
        if (lb && lb.classList.contains("is-open")) return; // lightbox handles its own Esc
        projectClose();
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
