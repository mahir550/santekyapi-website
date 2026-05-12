# santekyapi-website

Corporate website for **Santek Endüstri ve Yapı Malzemeleri Ltd. Şti.** — hosted on Cloudflare Pages with a Workers API and D1 database.

---

## Architecture

```
GitHub (main branch)
  → Cloudflare Pages  (auto-deploy on push)
      serves: public/index.html, public/admin.html, public/_redirects, favicon, robots.txt, sitemap.xml
  → Cloudflare Worker  "santekyapi-forms-api"
      route: www.santekyapi.com.tr/api/*
      binds: Cloudflare D1 database "santekyapi-db"
```

### Live URLs
| Resource | URL |
|---|---|
| Website | https://www.santekyapi.com.tr |
| Admin panel | https://www.santekyapi.com.tr/admin.html |
| Worker (direct) | https://santekyapi-forms-api.mahir-371.workers.dev |

---

## Repository Structure

```
public/
  index.html          Main SPA (all pages in one file, JS router)
  admin.html          Admin dashboard (form submissions viewer)
  _redirects          Cloudflare Pages SPA routing rules
  favicon.svg
  favicon.png
  robots.txt
  sitemap.xml

workers/forms-api/
  src/index.js        Cloudflare Worker source
  wrangler.toml       Worker config (D1 binding, route)
  schema.sql          D1 database schema
  deploy.sh           One-shot deploy script
```

---

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| POST | `/api/contact` | Submit contact form |
| POST | `/api/bayilik` | Submit dealership application |

### Admin (Bearer token required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/contact` | List contact submissions (pagination, search) |
| GET | `/api/admin/bayilik` | List dealership applications (pagination, search, status filter) |
| PATCH | `/api/admin/bayilik/:id` | Update application status (`new` / `reviewing` / `approved` / `rejected`) |

---

## Cloudflare Resources

| Type | Name | ID |
|---|---|---|
| Pages project | santekyapi-website | — |
| Worker | santekyapi-forms-api | — |
| D1 database | santekyapi-db | `717516d2-398f-4bf2-b125-e39136ced991` |
| Account | — | `37176d2570a10d27217e5676338c1dd1` |

---

## Deploy

### Prerequisites
- Node.js at `/tmp/node/bin/node` (or any Node.js in `$PATH`)
- Wrangler installed: `npm install -g wrangler` or already at `/tmp/node_modules/.bin/wrangler`
- A Cloudflare API token with **Edit Workers** permission — create one at dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare Workers" template

### Deploy the Worker
```bash
cd workers/forms-api
CLOUDFLARE_API_TOKEN="your_token" /tmp/node/bin/node /tmp/node_modules/.bin/wrangler deploy
```

### Set / rotate the admin panel password
```bash
cd workers/forms-api
echo "your_new_password" | CLOUDFLARE_API_TOKEN="your_token" /tmp/node/bin/node /tmp/node_modules/.bin/wrangler secret put ADMIN_TOKEN
```

### Apply DB schema (first-time setup or new tables)
```bash
cd workers/forms-api
CLOUDFLARE_API_TOKEN="your_token" /tmp/node/bin/node /tmp/node_modules/.bin/wrangler d1 execute santekyapi-db --file=schema.sql
```

### Static site (Cloudflare Pages)
Push to `main` — Pages auto-deploys from the `public/` directory. No build step.

---

## Local Development

The Worker can be tested locally with wrangler dev:
```bash
cd workers/forms-api
CLOUDFLARE_API_TOKEN="your_token" /tmp/node/bin/node /tmp/node_modules/.bin/wrangler dev
```

For the static site, any static file server works:
```bash
cd public && python3 -m http.server 8080
```

---

## Phase 2 — Deferred (R2 Asset Migration)

The 19 Verge3D 3D product configurators in `APP_PACK/` (~7.6 GB) are currently served from the legacy Apache server. The plan is to migrate them to Cloudflare R2.

### Steps when ready
1. Create R2 bucket: `wrangler r2 bucket create santekyapi-configurators`
2. Enable public access on the bucket and set custom domain `cdn.santekyapi.com.tr`
3. Upload via rclone (exclude Blender source files):
   ```bash
   rclone copy APP_PACK/ r2:santekyapi-configurators/APP_PACK \
     --exclude "*.blend" --exclude "*.blend1" \
     --exclude "v3d_app_data/**" --exclude "visual_logic.xml" \
     --transfers 20 --progress
   ```
4. Also retrieve `APP_PACK/css/loader.css` and `APP_PACK/css/styles.css` from the Apache server — these are referenced by all 19 configurator HTML files but are not in this repo.
5. Update the `base` URL in `public/index.html` (line ~1257) to point to `https://cdn.santekyapi.com.tr/APP_PACK/`
6. Push → Pages auto-deploys

### Before uploading
Audit configurator network requests in browser DevTools to check whether `.gltf+.bin` or `.glb` is loaded at runtime — you can skip uploading the unused format to save ~50% R2 storage per app.

---

## Notes

- The site is a single-page application. All routing is handled client-side by a JS router in `index.html`. The `_redirects` file makes Cloudflare Pages return `index.html` for all routes so deep links work.
- The admin panel (`admin.html`) is protected only by the `ADMIN_TOKEN` Bearer token. It is not listed anywhere on the site.
- `APP_PACK/` is in `.gitignore` — the 3D configurators are not tracked in git.
