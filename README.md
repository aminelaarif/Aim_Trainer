# Aim Range – Free Online Aim Trainer

Aim Range is a free, browser-based **aim trainer** for competitive FPS players. Practise flicking, tracking,
precision and reaction time for Valorant, Counter-Strike 2, Apex Legends, Overwatch 2 and other shooters —
no download, no account.

## Modes

| Mode | Trains |
| --- | --- |
| Gridshot | Speed and target switching |
| Flick | Flick shots |
| Precision | Micro-adjustment |
| Tracking | Smooth tracking |
| Reaction | Reaction time |

Also included: a five-minute warm-up routine, personal bests per mode / target size / round length,
custom crosshairs, and a cm/360 + eDPI sensitivity calculator.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (Netlify)

`netlify.toml` already sets the build (`npm run build`, publish `dist`). Netlify passes the site's address
in the `URL` variable, which the build uses for the canonical link, social preview tags, `robots.txt` and
`sitemap.xml`. If you build locally and upload `dist` by hand, run `SITE_URL=https://your-site.netlify.app npm run build`.

## SEO checklist after deploying

1. Add the site to [Google Search Console](https://search.google.com/search-console) and submit `/sitemap.xml`.
2. Check the structured data with the [Rich Results Test](https://search.google.com/test/rich-results).
3. Share the link (Reddit, Discord, your GitHub profile) — links from other sites are what move rankings.
