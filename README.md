# Ashnimator Studios — cinematic redesign

Static site (HTML + one CSS file + one JS file). **No build step.** GSAP and fonts are vendored in `assets/`, so nothing loads from a CDN except YouTube video/thumbnails.

## Preview locally
```bash
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```
(The enquiry form only delivers on Netlify; locally it shows the WhatsApp/email fallback message.)

## Deploy safely (live site stays untouched until you approve)
1. Push this `redesign` branch to GitHub (`git push -u origin redesign`).
2. Netlify → Site configuration → Build & deploy → Branches → enable **Branch deploys** (or open a Pull Request to get a **Deploy Preview**). Review the preview URL.
3. Happy? Merge `redesign` into `main` — Netlify publishes it. Not happy? Close the PR; nothing changed live.
4. After first deploy: Netlify → Forms → `enquiry` → *Form notifications* → add an email notification so enquiries reach ashnimator.studios@gmail.com.

## Structure
- `index.html`, `about.html`, `client.html`, `healtv.html` — same URLs as before. `thanks.html` (form fallback), `404.html`.
- `assets/css/main.css` — design tokens at the top (`--amber`, `--bg`…).
- `assets/js/main.js` — all behaviour; `assets/js/vendor/` — GSAP + ScrollTrigger.
- `images/` — your original assets, untouched. `assets/img/` — optimised WebP copies + favicon + share image.
- `netlify.toml` — headers, caching, redirects.

## Editing notes
- Nav/footer/contact blocks are repeated in each HTML file (as before); edit all four.
- Video thumbnails load from YouTube (`i.ytimg.com`). To use your own stills, change the `<img src>` in the work cards.
- Social links: only YouTube/WhatsApp/email are real. Add Instagram/Facebook/X at the marked comment in the contact block.
- Canonical/OG URLs use `https://ashnimatorstudios.netlify.app`; update if you add a custom domain.
