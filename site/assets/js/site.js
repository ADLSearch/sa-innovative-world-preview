/* SA Innovative World — vanilla JS: menu, header state, reveals, hours, filters, lazy map, analytics events. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  /* Mobile menu */
  var toggle = document.querySelector("[data-menu-toggle]");
  var drawer = document.getElementById("drawer");
  if (toggle && drawer) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
      drawer.hidden = !open;
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
    });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1080) setOpen(false); });
  }

  /* Header state */
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Scroll reveals — never leave content stuck at opacity 0:
     visible-on-load elements show immediately, everything is forced visible after 1.2s,
     and no IntersectionObserver / reduced motion = show all. */
  var reveals = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var show = function (el) { el.classList.add("is-in"); };
  if (!("IntersectionObserver" in window) || reduce) {
    reveals.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: "80px 0px 80px 0px", threshold: 0.01 });
    reveals.forEach(function (el) {
      io.observe(el);
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 80 && r.bottom > -80) show(el);
    });
    window.setTimeout(function () { reveals.forEach(show); }, 1200);
  }

  /* Hours: highlight today + open/closed status in Los Angeles time */
  function laNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      return { day: map[o.weekday], mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  }
  function toMin(t) { var a = t.split(":"); return +a[0] * 60 + +a[1]; }
  function fmt(t) { var a = t.split(":"), h = +a[0], m = a[1]; return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }
  var names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var now = laNow();
  if (now) {
    document.querySelectorAll('.day[data-dayidx="' + now.day + '"]').forEach(function (d) { d.classList.add("is-today"); });
  }
  document.querySelectorAll("[data-hours]").forEach(function (wrap) {
    var hours;
    try { hours = JSON.parse(wrap.getAttribute("data-hours")); } catch (e) { return; }
    if (!now) return;
    var row = wrap.querySelector('tr[data-day="' + now.day + '"]');
    if (row) row.classList.add("today");
    var status = wrap.querySelector("[data-open-status]");
    if (!status) return;
    var today = hours[now.day], msg = "", open = false;
    if (today[0] && now.mins >= toMin(today[0]) && now.mins < toMin(today[1])) {
      open = true; msg = "Open now · until " + fmt(today[1]);
    } else {
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7, h = hours[d];
        if (!h[0]) continue;
        if (i === 0 && now.mins >= toMin(h[0])) continue;
        msg = "Closed now · opens " + (i === 0 ? "today" : i === 1 ? "tomorrow" : names[d]) + " at " + fmt(h[0]);
        break;
      }
    }
    status.innerHTML = '<span class="dot" aria-hidden="true"></span>' + msg;
    status.classList.toggle("is-open", open);
  });

  /* Body-type filter tabs (progressive enhancement: all cards visible without JS) */
  document.querySelectorAll("[data-filter]").forEach(function (group) {
    var target = group.parentElement.querySelector("[data-filter-target]");
    if (!target) return;
    group.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-f]");
      if (!b) return;
      var f = b.getAttribute("data-f");
      group.querySelectorAll("button[data-f]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      target.querySelectorAll("[data-body]").forEach(function (c) {
        c.hidden = !(f === "all" || c.getAttribute("data-body") === f);
        if (!c.hidden) c.classList.add("is-in");
      });
    });
  });

  /* Lazy Google Map: load iframe only when near the viewport */
  var maps = document.querySelectorAll("iframe[data-src]");
  if (maps.length) {
    var load = function (f) { if (!f.src) f.src = f.getAttribute("data-src"); };
    if ("IntersectionObserver" in window) {
      var mo = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { load(x.target); mo.unobserve(x.target); } });
      }, { rootMargin: "300px" });
      maps.forEach(function (f) { mo.observe(f); });
    } else { maps.forEach(load); }
  }

  /* Analytics events (ready for GA4/GTM/Cloudflare; no-op if none installed) */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-event]");
    if (!a) return;
    var p = { event: a.getAttribute("data-event"), cta_text: (a.textContent || "").trim().slice(0, 60), cta_location: a.getAttribute("data-cta") || "", page_path: location.pathname };
    window.dataLayer = window.dataLayer || [];
    if (p.event === "apply_click") window.dataLayer.push({ event: "primary_cta_click", cta_text: p.cta_text, cta_location: p.cta_location, page_path: p.page_path });
    window.dataLayer.push(p);
    if (typeof window.gtag === "function") window.gtag("event", p.event, p);
  });
})();

/* Inventory filters (progressive enhancement: all cards render without JS; ?make=&body=&max=&q=&sort= prefill) */
(function () {
  "use strict";
  var form = document.querySelector("[data-inv-filter]");
  var grid = document.querySelector("[data-inv-grid]");
  if (!form || !grid) return;
  var cards = [].slice.call(grid.querySelectorAll(".vcard"));
  var original = cards.slice();
  var count = document.querySelector("[data-inv-count]");
  var empty = document.querySelector("[data-inv-empty]");
  var params = new URLSearchParams(location.search);
  ["q", "make", "body", "max", "sort"].forEach(function (k) {
    var el = form.elements[k], v = params.get(k);
    if (el && v) { el.value = v; }
  });
  function apply() {
    var q = (form.elements.q.value || "").trim().toLowerCase();
    var mk = form.elements.make.value, bd = form.elements.body.value, mx = +form.elements.max.value || 0, so = form.elements.sort.value;
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!q || c.getAttribute("data-text").indexOf(q) > -1) &&
        (!mk || c.getAttribute("data-make") === mk) && (!bd || c.getAttribute("data-body") === bd) &&
        (!mx || (+c.getAttribute("data-price") > 0 && +c.getAttribute("data-price") <= mx));
      c.hidden = !ok; if (ok) { shown++; c.classList.add("is-in"); }
    });
    var list = original.slice();
    var key = { price_asc: ["data-price", 1], price_desc: ["data-price", -1], miles_asc: ["data-miles", 1], year_desc: ["data-year", -1], year_asc: ["data-year", 1] }[so];
    if (key) list.sort(function (a, b) {
      var x = +a.getAttribute(key[0]), y = +b.getAttribute(key[0]);
      if (key[0] === "data-price") { if (!x) x = key[1] > 0 ? 1e9 : -1; if (!y) y = key[1] > 0 ? 1e9 : -1; }
      return (x - y) * key[1];
    });
    list.forEach(function (c) { grid.appendChild(c); });
    if (count) count.textContent = shown === cards.length ? "Showing all " + cards.length + " vehicles" : "Showing " + shown + " of " + cards.length + " vehicles";
    if (empty) empty.hidden = shown !== 0;
  }
  form.addEventListener("input", apply);
  form.addEventListener("change", apply);
  form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
  form.addEventListener("reset", function () { setTimeout(apply, 0); });
  apply();
})();

/* Vehicle gallery: thumbnails swap the main image (links open the full image without JS) */
(function () {
  "use strict";
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var main = g.querySelector(".g-main-img");
    if (!main) return;
    g.addEventListener("click", function (e) {
      var a = e.target.closest("[data-gallery-thumb]");
      if (!a) return;
      e.preventDefault();
      main.removeAttribute("srcset");
      main.src = a.getAttribute("data-full");
      main.width = +a.getAttribute("data-w"); main.height = +a.getAttribute("data-h");
      main.alt = a.querySelector("img").alt;
      g.querySelectorAll("[data-gallery-thumb]").forEach(function (x) { x.removeAttribute("aria-current"); });
      a.setAttribute("aria-current", "true");
    });
  });
})();

/* Payment calculator (estimate only; nothing is sent anywhere) */
(function () {
  "use strict";
  document.querySelectorAll("[data-calc]").forEach(function (box) {
    var f = box.querySelector("form"), out = box.querySelector("[data-calc-out]");
    function calc() {
      var p = +f.elements.price.value || 0, d = +f.elements.down.value || 0, r = parseFloat(f.elements.apr.value), n = Math.round(+f.elements.term.value || 0);
      var L = p - d;
      if (!p) { out.textContent = "Enter the vehicle price to see an estimate."; return; }
      if (isNaN(r)) { out.textContent = "Enter a rate to see an estimate."; return; }
      if (L <= 0 || n <= 0 || r < 0 || r > 100) { out.textContent = "Check the numbers: down payment must be less than the price, and the term at least 1 month."; return; }
      var i = r / 1200, m = i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n));
      out.innerHTML = "Estimated payment: <b>$" + m.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b> /month for " + n + " months";
    }
    f.addEventListener("input", calc);
    calc();
  });
})();
