// Interaction tracking + iframe height reporting.
// Matches the pattern used by the GG FAQ / pricing widgets: a single GET to the
// shared Apps Script web app, fired once per browser session, with IP-based geo
// looked up from ipapi.co. The Apps Script appends a row to the 2026Registration
// tab (timestamp, button, ip, country, state, city, sponsor).
(function () {
  // ── Click tracking (once per session) ───────────────────
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxq8HofSFbnFxS7HeKQKZVhyuPIqpu_7NAWhvOzAXBzyxfatdeJu8hfGCRCahOINshA/exec';
  var TRACK_KEY  = 'ggGlobeTracked';

  async function trackInteraction() {
    if (sessionStorage.getItem(TRACK_KEY)) return;
    sessionStorage.setItem(TRACK_KEY, '1');

    var params = new URLSearchParams({
      sheet:  '2026Registration',
      button: 'PartnerPageGlobeWidget'
    });

    try {
      var ctrl  = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 3000);
      var geo   = await fetch('https://ipapi.co/json/', { signal: ctrl.signal }).then(function (r) { return r.json(); });
      clearTimeout(timer);
      if (geo.ip)           params.set('ip',      geo.ip);
      if (geo.country_name) params.set('country', geo.country_name);
      if (geo.region)       params.set('state',   geo.region);
      if (geo.city)         params.set('city',    geo.city);
    } catch (_) {}

    fetch(SCRIPT_URL + '?' + params.toString(), { mode: 'no-cors' }).catch(function () {});
  }

  // Any real interaction with the widget (drag, pin click, region button,
  // arrow) starts with a pointerdown on the page. One fire per session.
  document.addEventListener('pointerdown', trackInteraction, { once: true });

  // ── Height reporting ─────────────────────────────────────
  // Lets the embedding page auto-size the iframe: full height on desktop,
  // collapses to ~0 on mobile where the globe is hidden by the media query.
  function reportHeight() {
    var el = document.getElementById('globeContainer');
    var h  = el ? el.offsetHeight : 0;
    if (window.parent !== window) {
      window.parent.postMessage({ ggWidgetHeight: h + 2 }, '*');
    }
  }

  if (window.ResizeObserver) {
    window.addEventListener('DOMContentLoaded', function () {
      var el = document.getElementById('globeContainer');
      if (el) new ResizeObserver(reportHeight).observe(el);
    });
  }
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
})();
