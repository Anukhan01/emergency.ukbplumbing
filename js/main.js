/* ==========================================================================
   UKB Plumbing — interactions
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Header state on scroll ---------------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile navigation ---------------- */
  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("mainNav");
  var backdrop = null;

  if (toggle && nav) {
    backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function closeMenu() {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      backdrop.classList.remove("show");
      header.classList.remove("menu-open");
      document.body.style.overflow = "";
    }
    function openMenu() {
      nav.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      backdrop.classList.add("show");
      header.classList.add("menu-open");
      document.body.style.overflow = "hidden";
    }

    toggle.addEventListener("click", function () {
      nav.classList.contains("open") ? closeMenu() : openMenu();
    });
    backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) closeMenu();
    });

    // Close after clicking any in-page link inside the nav
    nav.querySelectorAll("a[href^='#']").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 960 && nav.classList.contains("open")) closeMenu();
    });
  }

  /* ---------------- Active nav highlighting ---------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            var active = link.getAttribute("href") === "#" + entry.target.id;
            link.classList.toggle("active", active);
          });
        });
      },
      { rootMargin: "-38% 0px -55% 0px" }
    );
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------------- Forms ---------------- */
  var BACKEND_ENDPOINT = ""; // EDIT: set your form endpoint (e.g. Formspree/Netlify/server route). Empty = graceful no-backend mode.

  function validateField(input) {
    var field = input.closest(".field");
    var err = field ? field.querySelector("[data-err]") : null;
    var msg = "";

    if (input.hasAttribute("required") && !input.value.trim()) {
      msg = "This field is required.";
    } else if (input.type === "email" && input.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
      msg = "Please enter a valid email address.";
    } else if (input.type === "tel" && input.value.trim() && !/^[+()0-9\s-]{7,20}$/.test(input.value.trim())) {
      msg = "Please enter a valid phone number.";
    }

    field.classList.toggle("invalid", Boolean(msg));
    if (err) err.textContent = msg;
    return !msg;
  }

  function setupForm(form) {
    if (!form) return;
    var inputs = form.querySelectorAll("input, select, textarea");
    var note = form.querySelector(".form-note");
    var submitBtn = form.querySelector(".btn-submit");

    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("invalid")) validateField(input);
      });
      input.addEventListener("change", function () {
        if (input.closest(".field").classList.contains("invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      inputs.forEach(function (input) { if (!validateField(input)) ok = false; });
      if (!ok) {
        var firstInvalid = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstInvalid) firstInvalid.focus();
        if (note) {
          note.className = "form-note err-note show";
          note.textContent = "Please check the highlighted fields and try again.";
        }
        return;
      }

      var data = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        service: form.elements.service.value,
        message: form.elements.message.value.trim(),
        source: form.id,
        submittedAt: new Date().toISOString()
      };

      if (submitBtn) submitBtn.classList.add("loading");
      if (note) { note.className = "form-note show"; note.textContent = "Sending your enquiry…"; }

      // No backend configured yet: fall back to a prefilled email draft so the
      // enquiry genuinely reaches UKB Plumbing through the visitor's mail app.
      if (!BACKEND_ENDPOINT) {
        var subject = "Website enquiry: " + (data.service || "General enquiry");
        var bodyLines = [
          "Name: " + data.name,
          "Phone: " + data.phone,
          "Email: " + data.email,
          "Service: " + data.service,
          "",
          "Message:",
          data.message,
          "",
          "— Sent from the UKB Plumbing website (" + data.source + ")"
        ];
        var mailto = "mailto:info@ukbplumbing.co.uk" +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(bodyLines.join("\n"));

        window.setTimeout(function () {
          if (submitBtn) submitBtn.classList.remove("loading");
          if (note) {
            note.className = "form-note info show";
            note.innerHTML = "";
            var opener = document.createElement("button");
            opener.type = "button";
            opener.textContent = "Open your email app";
            opener.addEventListener("click", function () { window.location.href = mailto; });
            note.appendChild(document.createTextNode("Direct submission isn't set up yet — "));
            note.appendChild(opener);
            note.appendChild(document.createTextNode(" to send this enquiry to info@ukbplumbing.co.uk, or call 07359 605766."));
          }
          form.reset();
        }, 550);
        return;
      }

      // Backend configured: POST the enquiry and report the true outcome.
      fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed with status " + res.status);
          if (submitBtn) submitBtn.classList.remove("loading");
          if (note) {
            note.className = "form-note ok show";
            note.textContent = "Thank you — your enquiry has been sent. We'll be in touch as soon as we can.";
          }
          form.reset();
        })
        .catch(function () {
          if (submitBtn) submitBtn.classList.remove("loading");
          if (note) {
            note.className = "form-note err-note show";
            note.textContent = "Sorry — something went wrong and your enquiry may not have been sent. Please call 07359 605766 or email info@ukbplumbing.co.uk.";
          }
        });
    });
  }

  setupForm(document.getElementById("heroForm"));
  setupForm(document.getElementById("contactForm"));

  /* ---------------- FAQ accordion (single-open, animated) ---------------- */
  var faqs = document.querySelectorAll("#faqAccordion .faq");
  faqs.forEach(function (details) {
    var summary = details.querySelector("summary");
    var body = details.querySelector(".faq-body");

    if (details.open) body.style.maxHeight = body.scrollHeight + "px";

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (details.open) {
        body.style.maxHeight = body.scrollHeight + "px";
        requestAnimationFrame(function () {
          body.style.maxHeight = "0px";
          body.style.opacity = "0";
        });
        details.open = false;
      } else {
        details.open = true;
        body.style.maxHeight = "0px";
        body.style.opacity = "0";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            body.style.maxHeight = body.scrollHeight + "px";
            body.style.opacity = "1";
          });
        });
        faqs.forEach(function (other) {
          if (other !== details && other.open) {
            var otherBody = other.querySelector(".faq-body");
            otherBody.style.maxHeight = otherBody.scrollHeight + "px";
            requestAnimationFrame(function () {
              otherBody.style.maxHeight = "0px";
              otherBody.style.opacity = "0";
            });
            other.open = false;
          }
        });
      }
    });

    // Keyboard: Enter/Space handled natively via summary; ensure it stays focusable
    summary.setAttribute("role", "button");
    summary.setAttribute("tabindex", "0");
  });

  /* ---------------- Testimonial carousel ---------------- */
  var track = document.getElementById("carouselTrack");
  if (track) {
    var cards = track.children;
    var dotsWrap = document.getElementById("carDots");
    var prevBtn = document.getElementById("carPrev");
    var nextBtn = document.getElementById("carNext");
    var index = 0;
    var dots = [];

    function go(i) {
      index = (i + cards.length) % cards.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (d, di) { d.classList.toggle("active", di === index); });
    }

    for (var i = 0; i < cards.length; i++) {
      var dot = document.createElement("button");
      dot.className = "car-dot";
      dot.setAttribute("aria-label", "Show testimonial " + (i + 1));
      (function (n) {
        dot.addEventListener("click", function () { go(n); });
      })(i);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }

    prevBtn.addEventListener("click", function () { go(index - 1); });
    nextBtn.addEventListener("click", function () { go(index + 1); });

    // Touch / swipe
    var startX = null;
    track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });

    // Autoplay, paused on hover and for reduced motion
    if (!prefersReducedMotion) {
      var timer = window.setInterval(function () { go(index + 1); }, 7000);
      track.addEventListener("mouseenter", function () { window.clearInterval(timer); });
      track.addEventListener("mouseleave", function () {
        window.clearInterval(timer);
        timer = window.setInterval(function () { go(index + 1); }, 7000);
      });
    }

    go(0);
  }

  /* ---------------- Work gallery lightbox ---------------- */
  var workCards = document.querySelectorAll(".work-card");
  if (workCards.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Project image viewer");
    lb.innerHTML =
      '<button class="lb-btn" aria-label="Close viewer">&times;</button>' +
      '<button class="lb-nav lb-prev" aria-label="Previous image"><svg class="ico"><use href="#i-chev-l"/></svg></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-nav lb-next" aria-label="Next image"><svg class="ico"><use href="#i-chev-r"/></svg></button>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector("img");
    var lbCap = lb.querySelector("figcaption");
    var lbIndex = 0;
    var lastFocus = null;

    function renderLb() {
      var card = workCards[lbIndex];
      var img = card.querySelector("img");
      lbImg.src = img.src.replace(/w=\d+/, "w=1600");
      lbImg.alt = img.alt;
      lbCap.textContent = card.querySelector("h3") ? card.querySelector("h3").textContent : "";
    }
    function openLb(i) {
      lbIndex = i;
      renderLb();
      lastFocus = document.activeElement;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      lb.querySelector(".lb-btn").focus();
    }
    function closeLb() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    function stepLb(dir) {
      lbIndex = (lbIndex + dir + workCards.length) % workCards.length;
      renderLb();
    }

    workCards.forEach(function (card, i) {
      card.addEventListener("click", function () { openLb(i); });
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(i); }
      });
    });

    lb.querySelector(".lb-btn").addEventListener("click", closeLb);
    lb.querySelector(".lb-prev").addEventListener("click", function () { stepLb(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { stepLb(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") stepLb(-1);
      if (e.key === "ArrowRight") stepLb(1);
    });
  }

  /* ---------------- Footer year ---------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
