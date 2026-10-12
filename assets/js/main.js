/* ==========================================================================
   Ashnimator Studios — site behaviour
   - Everything works without JavaScript (links go to YouTube, form posts to
     Netlify, accordions are open). JS + GSAP only enhance.
   - GSAP + ScrollTrigger are loaded (deferred) before this file.
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const saveData = () => !!(navigator.connection && navigator.connection.saveData);
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const YT_ID = /^[\w-]{11}$/;

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  /** Wrap every word of an element in a masked span so it can slide up. */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
            } else {
              const outer = document.createElement("span");
              outer.className = "split-word";
              const inner = document.createElement("span");
              inner.textContent = part;
              outer.appendChild(inner);
              frag.appendChild(outer);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    return $$(".split-word > span", el);
  }

  /**
   * Resolve once a YouTube iframe (enablejsapi=1) reports it is playing.
   * Falls back after `fallbackMs` so a missed message never leaves a blank frame.
   */
  function whenPlaying(iframe, callback, fallbackMs) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      callback();
    };
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (_) {
          return;
        }
      }
      if (!data) return;
      if (
        (data.event === "onStateChange" && data.info === 1) ||
        (data.event === "infoDelivery" && data.info && data.info.playerState === 1)
      ) {
        finish();
      }
    };
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", () => {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      } catch (_) {
        /* ignore */
      }
      setTimeout(finish, fallbackMs);
    });
    return () => {
      done = true;
      window.removeEventListener("message", onMessage);
    };
  }

  function ytCommand(iframe, func) {
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
    } catch (_) {
      /* ignore */
    }
  }

  function embedUrl(id, params) {
    const q = new URLSearchParams(params).toString();
    return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
  }

  /* ------------------------------------------------------------------ *
   * Navigation + mobile menu
   * ------------------------------------------------------------------ */
  function initNav() {
    const nav = $("[data-nav]");
    if (!nav) return;
    const toggle = $(".nav__toggle", nav);
    const menu = $("#menu");
    const inertTargets = $$("main, footer");
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 24);
      const goingDown = y > lastY + 6;
      const goingUp = y < lastY - 6;
      if (!root.classList.contains("menu-lock")) {
        if (goingDown && y > 640) nav.classList.add("is-hidden");
        else if (goingUp || y < 640) nav.classList.remove("is-hidden");
      }
      if (goingDown || goingUp) lastY = y;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));
    onScroll();

    if (!toggle || !menu) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      root.classList.toggle("menu-lock", open);
      nav.classList.remove("is-hidden");
      inertTargets.forEach((el) => (el.inert = open));
      if (open) {
        const first = $("nav a", menu);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
      }
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 1081px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------ *
   * Lightbox (accessible <dialog>) — opens any [data-video] link
   * ------------------------------------------------------------------ */
  function initLightbox() {
    const dialog = $("#lightbox");
    if (!dialog || typeof dialog.showModal !== "function") return; // links fall back to YouTube
    const frame = $(".lightbox__frame", dialog);

    const open = (id) => {
      frame.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl(id, { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 });
      iframe.title = "Video player";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      dialog.showModal();
    };

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-video]");
      if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      const id = trigger.dataset.video;
      if (!YT_ID.test(id)) return;
      e.preventDefault();
      open(id);
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    $(".lightbox__close", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      frame.innerHTML = ""; // stops playback
    });
  }

  /* ------------------------------------------------------------------ *
   * Hero background video (muted loop) — loaded after first paint
   * ------------------------------------------------------------------ */
  function initHeroVideo() {
    const holder = $("[data-hero-video]");
    if (!holder || reduceMotion.matches || saveData()) return;
    const id = holder.dataset.heroVideo;
    if (!YT_ID.test(id)) return;

    const start = () => {
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl(id, {
        autoplay: 1,
        mute: 1,
        loop: 1,
        playlist: id,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        disablekb: 1,
        iv_load_policy: 3,
        fs: 0,
        enablejsapi: 1,
      });
      iframe.title = "Studio showreel background video";
      iframe.allow = "autoplay; encrypted-media";
      iframe.tabIndex = -1;
      iframe.setAttribute("aria-hidden", "true");
      whenPlaying(iframe, () => holder.classList.add("is-playing"), 4500);
      holder.appendChild(iframe);

      // Pause the loop while the hero is off-screen to save CPU / battery.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          ([entry]) => ytCommand(iframe, entry.isIntersecting ? "playVideo" : "pauseVideo"),
          { threshold: 0.05 }
        ).observe($(".hero"));
      }
    };

    const kickoff = () => ("requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200));
    if (document.readyState === "complete") kickoff();
    else window.addEventListener("load", kickoff, { once: true });
  }

  /* ------------------------------------------------------------------ *
   * Portfolio: hover previews + category filter
   * ------------------------------------------------------------------ */
  function initWork() {
    const cards = $$(".work-card");
    if (!cards.length) return;

    // Poster fallback: maxres thumbnails don't exist for every video.
    $$("img[data-yt]").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const fallback = `https://i.ytimg.com/vi/${img.dataset.yt}/hqdefault.jpg`;
          if (img.src !== fallback) img.src = fallback;
        },
        { once: true }
      );
      // YouTube returns a 120px placeholder (HTTP 200) when maxres is missing.
      img.addEventListener("load", () => {
        if (img.naturalWidth && img.naturalWidth <= 120) img.src = `https://i.ytimg.com/vi/${img.dataset.yt}/hqdefault.jpg`;
      });
    });

    // Hover → muted looping preview (fine pointers only, never on reduced motion / data saver)
    let active = null;
    const stop = (media) => {
      const box = $(".work-card__preview", media);
      clearTimeout(media._timer);
      if (!box) return;
      box.classList.remove("is-live");
      setTimeout(() => {
        if (!box.classList.contains("is-live")) box.textContent = "";
      }, 700);
      if (active === media) active = null;
    };
    const play = (media) => {
      const id = media.dataset.video;
      const box = $(".work-card__preview", media);
      if (!box || !YT_ID.test(id)) return;
      if (active && active !== media) stop(active);
      active = media;
      media._timer = setTimeout(() => {
        box.textContent = "";
        const iframe = document.createElement("iframe");
        iframe.src = embedUrl(id, {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: id,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          iv_load_policy: 3,
          fs: 0,
          enablejsapi: 1,
        });
        iframe.title = "";
        iframe.tabIndex = -1;
        iframe.setAttribute("aria-hidden", "true");
        iframe.allow = "autoplay; encrypted-media";
        whenPlaying(iframe, () => box.classList.add("is-live"), 3500);
        box.appendChild(iframe);
      }, 450);
    };
    if (finePointer.matches && !reduceMotion.matches && !saveData()) {
      $$(".work-card__media").forEach((media) => {
        media.addEventListener("pointerenter", () => play(media));
        media.addEventListener("pointerleave", () => stop(media));
      });
    }

    // Filter
    const buttons = $$("[data-filter]");
    const grid = $(".work__grid");
    if (!buttons.length || !grid) return;
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.filter;
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        const visible = [];
        cards.forEach((card) => {
          const show = key === "all" || card.dataset.cat.split(" ").includes(key);
          card.hidden = !show;
          if (show) visible.push(card);
        });
        grid.classList.toggle("is-filtered", key !== "all");
        if (hasGSAP && !reduceMotion.matches) {
          gsap.fromTo(visible, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", overwrite: true });
          ScrollTrigger.refresh();
        } else {
          visible.forEach((c) => (c.style.opacity = 1));
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Training: course category filter
   * ------------------------------------------------------------------ */
  function initTrainingCourses() {
    const buttons = $$("[data-course-filter]");
    const cards = $$(".course-card");
    const grid = $(".course-grid");
    if (!buttons.length || !cards.length || !grid) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.courseFilter;
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        const visible = [];
        cards.forEach((card) => {
          const cat = card.dataset.category || "";
          const show = key === "all" || cat.split(" ").includes(key);
          card.hidden = !show;
          if (show) visible.push(card);
        });
        if (hasGSAP && !reduceMotion.matches) {
          gsap.fromTo(visible, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: "power3.out", overwrite: true });
          ScrollTrigger.refresh();
        } else {
          visible.forEach((c) => (c.style.opacity = 1));
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Services accordion
   * ------------------------------------------------------------------ */
  function initServices() {
    const items = $$(".svc");
    items.forEach((item) => {
      const head = $(".svc__head", item);
      head.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        item.classList.toggle("is-open", open);
        head.setAttribute("aria-expanded", String(open));
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 760);
      });
    });
  }

  /** Cursor-following amber glow on interactive rows/cards. */
  function initGlow() {
    if (!finePointer.matches) return;
    $$(".svc, .glow").forEach((el) => {
      el.addEventListener(
        "pointermove",
        (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
        },
        { passive: true }
      );
    });
  }

  /* ------------------------------------------------------------------ *
   * Enquiry form (Netlify Forms, progressively enhanced)
   * ------------------------------------------------------------------ */
  function initForms() {
    $$("[data-enquiry]").forEach((wrap) => {
      const form = $("form", wrap);
      const status = $(".form__status", wrap);
      const success = $(".form__success", wrap);
      if (!form) return;

      form.addEventListener("submit", async (e) => {
        if (!form.checkValidity()) return; // let the browser show validation UI
        e.preventDefault();
        wrap.classList.add("is-sending");
        status.dataset.state = "";
        status.textContent = "Sending your enquiry…";
        try {
          const body = new URLSearchParams(new FormData(form)).toString();
          const res = await fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          form.reset();
          status.textContent = "";
          wrap.classList.add("is-sent");
          if (success) success.focus();
        } catch (err) {
          status.dataset.state = "error";
          status.innerHTML =
            'We couldn’t send that just now. Please try again, or reach us on ' +
            '<a href="https://wa.me/message/O3S5UYP75ULZI1" target="_blank" rel="noopener">WhatsApp</a> or at ' +
            '<a href="mailto:ashnimator.studios@gmail.com">ashnimator.studios@gmail.com</a>.';
        } finally {
          wrap.classList.remove("is-sending");
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Motion (GSAP). Skipped entirely for reduced-motion users.
   * ------------------------------------------------------------------ */
  function initMotion() {
    const splits = $$("[data-split]");

    // No GSAP or reduced motion: show everything in its final state.
    if (!hasGSAP || reduceMotion.matches) {
      splits.forEach((el) => el.classList.add("is-split"));
      $$("[data-intro]").forEach((el) => (el.style.opacity = 1));
      const curtain = $(".curtain");
      if (curtain) curtain.classList.add("is-done");
      window.__motionReady = true;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    window.__motionReady = true;
    gsap.defaults({ ease: "power3.out" });

    // --- Split headings (hidden until split so nothing flashes)
    const introWords = [];
    splits.forEach((el) => {
      const words = splitWords(el);
      gsap.set(words, { yPercent: 118 });
      el.classList.add("is-split");
      if (el.dataset.split === "intro") {
        introWords.push(...words);
      } else {
        ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          once: true,
          onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.15, stagger: 0.045, ease: "power4.out" }),
        });
      }
    });

    // --- Page intro (curtain → headline → supporting content)
    const curtain = $(".curtain");
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    let t = 0.05;
    if (curtain) {
      tl.to(".curtain__top", { yPercent: -101, duration: 1.15, ease: "power4.inOut" }, t)
        .to(".curtain__bottom", { yPercent: 101, duration: 1.15, ease: "power4.inOut" }, t)
        .add(() => curtain.classList.add("is-done"), t + 1.2);
      t = 0.55;
    }
    tl.from("[data-nav]", { yPercent: -100, opacity: 0, duration: 1, clearProps: "transform,opacity" }, t);
    if (introWords.length) tl.to(introWords, { yPercent: 0, duration: 1.3, stagger: 0.09, ease: "power4.out" }, t + 0.1);
    const intro = $$("[data-intro]");
    if (intro.length) tl.to(intro, { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, t + 0.55);
    const hero = $(".hero");
    if (hero) {
      tl.from(".hero__media", { scale: 1.12, duration: 2.6, ease: "power2.out" }, 0);
    }

    // --- Hero: media drifts slower than the page, copy fades as you leave
    if (hero) {
      gsap.to(".hero__media", {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero__inner", {
        y: -70,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "35% top", end: "bottom 15%", scrub: true },
      });
    }

    // --- Scroll reveals
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, overwrite: true }),
    });
    $$("[data-stagger]").forEach((group) => {
      ScrollTrigger.create({
        trigger: group,
        start: "top 86%",
        once: true,
        onEnter: () => gsap.to(group.children, { opacity: 1, y: 0, duration: 1, stagger: 0.12 }),
      });
    });

    // --- Layered parallax
    $$("[data-parallax]").forEach((el) => {
      const amount = parseFloat(el.dataset.parallax) || 6;
      gsap.fromTo(
        el,
        { yPercent: -amount },
        {
          yPercent: amount,
          ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: 0.6 },
        }
      );
    });
    $$("[data-drift]").forEach((el) => {
      const amount = parseFloat(el.dataset.drift) || 40;
      gsap.fromTo(
        el,
        { y: amount },
        { y: -amount, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } }
      );
    });

    // --- Animated statistics
    $$("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const state = { v: 0 };
      el.textContent = `0${suffix}`;
      ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        once: true,
        onEnter: () => {
          gsap.to(state, {
            v: end,
            duration: 2.4,
            ease: "power2.out",
            onUpdate: () => (el.textContent = `${Math.round(state.v)}${suffix}`),
            onComplete: () => (el.textContent = `${end}${suffix}`),
          });
          const stat = el.closest(".stat");
          if (stat) gsap.to(stat, { "--p": 1, duration: 1.8, ease: "power2.out" });
        },
      });
    });

    // --- Scroll progress hairline
    const bar = $(".nav__progress");
    if (bar) {
      gsap.to(bar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
      });
    }

    // Layout shifts (fonts, lazy images) → recalc trigger positions
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  initNav();
  initLightbox();
  initServices();
  initGlow();
  initForms();
  initWork();
  initTrainingCourses();
  initHeroVideo();
  initMotion();
})();
