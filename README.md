# GG Partner Globe Widget

An interactive 3D globe (Three.js) that plots GG partner organisations as pins.
Hover a pin for an info box; click it to open the partner's website. Side buttons
recentre the globe on a region; on-screen arrows and click-drag rotate it.

Originally a single Cvent-embedded HTML file, now split into maintainable files.

## Structure

```
index.html        # Markup, font/asset preconnects, script includes
css/styles.css    # All styling (Montserrat applied throughout)
js/partners.js    # Partner pin data (lat/lon + info)
js/globe.js       # Three.js scene, pins, interaction, controls
js/tracker.js     # Once-per-session interaction tracking + iframe height
```

## Running locally

It's all static files. Serve the folder (so the relative `js/`/`css/` paths and
remote textures load cleanly):

```bash
# Python
python -m http.server 8000
# or Node
npx serve .
```

Then open http://localhost:8000.

## Adding / editing partners

Edit `js/partners.js` — add an object with `lat`, `lon`, `name`, `description`,
`website`, and `logo`. No other file needs to change.

## Notes on performance

Behaviour and design are unchanged from the original, with a few load/runtime
improvements:

- **Shared pin texture** — the pin PNG and its material are loaded once and
  reused across all pins (the original re-loaded the same image once per pin).
- **Render-on-demand** — the scene renders only when something changes (rotate,
  recentre, resize, texture load) instead of an endless `requestAnimationFrame`
  loop, so the widget is idle when nothing is happening.
- **Preconnect + `defer`** — fonts, textures and the Three.js CDN start
  connecting early, and scripts no longer block HTML parsing.
- **Capped device pixel ratio** — avoids over-rendering on high-DPI displays.
- Removed the artificial 1s startup delay; init runs as soon as the DOM is ready.

## Tracking

`js/tracker.js` fires once per browser session on the first interaction with the
widget (drag, pin click, region button, or arrow). It does an IP/geo lookup via
ipapi.co, then GETs the shared Apps Script web app, which appends a row to the
**2026Registration** tab with `button = PartnerPageGlobeWidget`. Same deployment
and convention as the FAQ / pricing-page widgets. No per-partner detail is
logged — it only records that someone engaged.

## Embedding

The widget is designed to be dropped into a page via iframe. It reports its
height to the parent (`postMessage` with `ggWidgetHeight`), so the iframe can
auto-size — full height on desktop, collapsing on mobile where the globe hides.

```html
<iframe
  id="gg-widget"
  src="https://gg-partner-globe-widget.vercel.app"
  width="100%"
  height="450"
  style="border:none;display:block;overflow:hidden;"
  scrolling="no"
  title="GG Partner Globe"
  loading="lazy"
></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.ggWidgetHeight) {
      document.getElementById("gg-widget").height = e.data.ggWidgetHeight;
    }
  });
</script>
```

If you don't want auto-height, drop the `<script>` and the `id` — the fixed
`height="450"` works on its own.

## Embedding in Cvent

Cvent's custom-code blocks expect a single HTML payload. For that use case,
inline the contents of `css/styles.css`, `js/partners.js` and `js/globe.js` back
into `index.html`, or host these files and reference them by URL.

Deployment test: 2026-06-15.
