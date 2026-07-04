# c00lkiddtech (static)

Static mirror of [c00lkiddtech.live](https://c00lkiddtech.live) — **no login, no chat, no Jetstream**.

Games, game links, shows catalog, CloakX settings, and legal pages. Link checker calls the live API.

## Live site (GitHub Pages)

**https://flxselfbot.github.io/c00lkiddtech/**

Open that URL in a browser — it is the full static site, not just raw files on GitHub.

## jsDelivr (CDN / embed)

Use jsDelivr when you need a CDN URL or iframe embed (serves HTML as plain text if opened directly — use GitHub Pages for browsing):

| Resource | URL |
|----------|-----|
| **Site (index)** | `https://cdn.jsdelivr.net/gh/flxselfbot/c00lkiddtech@main/index.html` |
| **CSS** | `https://cdn.jsdelivr.net/gh/flxselfbot/c00lkiddtech@main/style.css` |
| **Script** | `https://cdn.jsdelivr.net/gh/flxselfbot/c00lkiddtech@main/script.js` |
| **Games manifest** | `https://cdn.jsdelivr.net/gh/flxselfbot/c00lkiddtech@main/playables/manifest.json` |

Pin a release with `@main`, `@v1.0.0`, or a commit hash.

### Example embed

```html
<iframe
  src="https://cdn.jsdelivr.net/gh/flxselfbot/c00lkiddtech@main/index.html"
  title="c00lkiddtech"
  allow="fullscreen; autoplay; gamepad"
  style="width:100%;height:100vh;border:0"
></iframe>
```

## Local preview

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

## Full site

Chat, Jetstream, accounts, and live APIs: [https://c00lkiddtech.live](https://c00lkiddtech.live)
