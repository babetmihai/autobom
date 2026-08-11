# Autobom

Furniture catalog → AI analysis → 3D GLB → SketchUp.

Autobom turns product listing URLs and room photos into a searchable furniture catalog with AI-generated 3D models, then matches scene crops to catalog items via CLIP embeddings so you can import GLBs into SketchUp.

**Who this is for:** a developer standing up the stack, enabling pipeline workers, or extending the UI / SketchUp plugin.

---

## Scope

| Capability | What it does |
| --- | --- |
| Catalog | Authenticated users import products from store URLs; workers scrape, tag, embed, and generate GLBs |
| Scene analyzer | Upload a room image; detect furniture crops; match each crop to catalog products |
| Cart / BOM | Collect matched or catalog products for import |
| SketchUp plugin | HtmlDialog UI + native `definitions.import` of Storage GLB (or Colada zip / SKP) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Clients                                                                │
│  • autobom_ui (Vite/React/Redux) — browser or SketchUp HtmlDialog      │
│  • autobom_skp (Ruby) — Plugins menu → dialog → native GLB/SKP import  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ Firebase Auth + Firestore + Storage
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Firebase                                                               │
│  • Auth (email/password)                                                │
│  • Firestore: versions/{VITE_APP_VERSION}/products|scenes               │
│  • Storage: images/, scenes/, models/{productId}.glb                    │
│  • Hosting (optional): autobom_ui dist                                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ Admin SDK (service account)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  server (Node/tsx ticker)                                               │
│  Polls status.* PENDING → PROCESSING → COMPLETED|FAILED                 │
│  Calls Docker ML microservices over HTTP                                │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  services/* (Docker)                                                    │
│  trellis :5000          image → GLB (GPU, TRELLIS_LOW_VRAM)             │
│  image_analyzer :5001   CLIP tags + color                               │
│  colada :5002           GLB → textured COLLADA zip                      │
│  text_analyzer :5003    LLM tags/dimensions + store scrape              │
│  scene_analyzer :5004   furniture detect + crops                        │
│  embedding_analyzer :5005  CLIP vectors                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Components

| Path | Role |
| --- | --- |
| `autobom_ui` | React/Redux UI — catalog, product, cart, scene analyzer. Talks to Firebase only (no Express API for domain data). |
| `server` | Cron workers. Reads/writes Firestore via Admin SDK; calls ML services; uploads GLBs/bundles to Storage. |
| `autobom_skp` | SketchUp extension. Opens the UI in an HtmlDialog; downloads models and runs native `definitions.import`. |
| `services/*` | Stateless HTTP ML services, one Docker Compose stack each. |
| `scripts/` | `server:up` (compose + cron), `package:extension` (`.rbz`). |

### Data & versioning

- UI and server share `VITE_APP_VERSION` (e.g. `v5`). All product/scene docs live under `versions/{version}/…`.
- Ownership: Firestore rules require `createdBy == auth.uid` for client reads/writes. The server uses the Admin SDK and bypasses rules.
- Storage writes for `models/**` are server-only (client rules deny write). Clients upload scene/product images under `images/` and `scenes/`.

### Status machine

Pipeline progress is stored on each document as `status.*` with values `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`.

**Product** (`status`):

| Field | Worker | Prerequisite |
| --- | --- | --- |
| `scrape` | `product_scraper` | URL import (`source: URL`) |
| `image` | `image_analyzer` | Scrape not pending; needs `imageUrl` |
| `text` | `text_analyzer` | Scrape not pending |
| `embedding` | `embedding_index` | `status.image` COMPLETED |
| `trellis` | `trellis_converter` | `status.image` + `status.text` COMPLETED |
| `colada` | `colada_converter` | `status.trellis` COMPLETED + `hasGlb` |

**Scene** (`status`):

| Field | Worker | Prerequisite |
| --- | --- | --- |
| `detection` | `scene_crops` | Scene created with image `url` |
| `matching` | `scene_embeddings` | `status.detection` COMPLETED |

Enable workers with `SERVICES_ENABLED` (comma-separated). Empty = start none.

---

## Business flows

### 1. Catalog product (URL import)

1. User signs in → Catalog → paste a product page URL.
2. UI creates a product with `source: URL`, `sourceUrl`, and `status` all `PENDING` (including `scrape`).
3. **product_scraper** picks it up → calls text analyzer `POST /extract-product` → title, price, primary image uploaded to Storage → `status.scrape` COMPLETED.
4. **image_analyzer** → tags + color on the product image.
5. **text_analyzer** → LLM tags / dimensions from listing text.
6. **embedding_index** → CLIP vector on the product image (for scene matching).
7. **trellis_converter** → image → GLB → Storage `models/{productId}.glb` → sets `modelGlbUrl`, `hasGlb`.
8. **colada_converter** (optional) → GLB → COLLADA zip → `modelBundleUrl`, `hasBundle`.

Manual / non-URL products can skip scrape (`status.scrape` already COMPLETED) and enter at image/text analysis.

### 2. Scene match

1. User opens Scene Analyzer → uploads a room image → scene doc with `status.detection` PENDING.
2. **scene_crops** → scene analyzer detects furniture → crop JPGs + bboxes in Storage → `crops[]`.
3. **scene_embeddings** → CLIP each crop → nearest catalog products (`findSimilarProducts`) → `matches[]`.
4. UI shows crops and matches; user can add products to cart / import to SketchUp.

### 3. SketchUp import

1. Install `.rbz` (or load `autobom_skp` in the Ruby console for dev).
2. Plugins → Autobom opens HtmlDialog pointing at `AUTOBOM_HTML_DIALOG_URL` (dev) or packaged remote URL.
3. User browses catalog / cart; import downloads the Firebase Storage GLB (or SKP / Colada zip) and runs SketchUp `definitions.import` — no mesh work in Ruby.

---

## Setup requirements

### Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 20+ | Root, `autobom_ui`, and `server` |
| npm | Used throughout |
| Docker + Docker Compose | ML services |
| NVIDIA GPU + NVIDIA Container Toolkit | **Required for Trellis** (target: RTX 4090 Mobile 16GB with `TRELLIS_LOW_VRAM=true`) |
| Firebase project | Auth, Firestore, Storage; Hosting optional |
| SketchUp | For the plugin (HtmlDialog; older Chromium — UI builds for Chrome 61 / Safari 11) |

CPU-only services (image/text/scene/embedding analyzers, Colada) can run without a GPU. Full catalog → GLB needs Trellis + GPU.

### Firebase credentials (gitignored — do not commit)

1. Copy env template:

```bash
cp .env.example .env
```

2. Create two JSON files at the repo root (paths relative to root):

| File | Source |
| --- | --- |
| `firebaseConfig.json` | Firebase console → Project settings → Your apps → web config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) |
| `serviceAccountKey.json` | Project settings → Service accounts → Generate new private key |

3. Point `.env` at them:

```
FIREBASE_CONFIG=firebaseConfig.json
FIREBASE_SERVICE_ACCOUNT=serviceAccountKey.json
VITE_APP_VERSION=v5
```

4. Enable **Email/Password** Auth in the Firebase console.

5. Deploy rules/indexes when the project is new or rules change:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Configure Firebase CLI project/targets via `.firebaserc` (or pass `--project`).

### Install

```bash
npm run install:all
```

Installs root, `autobom_ui`, and `server` dependencies.

### Text analyzer model (once)

If you use scrape or text analysis:

```bash
npm run text-analyzer:docker
docker exec text-analyzer-ollama ollama pull llama3.2:3b
```

---

## Running locally

### Minimal: UI only

Useful for UI work against an existing Firebase project (no local workers).

```bash
# .env: FIREBASE_CONFIG + VITE_APP_VERSION set
npm run dev
```

- Catalog: `http://localhost:5173/#/`
- Scene Analyzer: `http://localhost:5173/#/scene-analyzer`
- Login required (Firebase Auth)

### Workers + matching Docker stacks

Set `SERVICES_ENABLED` in `.env` to the ticker workers you need, then:

```bash
npm run server:up
```

This starts the Docker Compose stacks required by those workers, then `npm run server`. Mapping:

| `SERVICES_ENABLED` value | Docker stack(s) |
| --- | --- |
| `product_scraper` | `text_analyzer` |
| `text_analyzer` | `text_analyzer` |
| `image_analyzer` | `image_analyzer` |
| `embedding_index` | `embedding_analyzer` |
| `scene_embeddings` | `embedding_analyzer` |
| `scene_crops` | `scene_analyzer` |
| `trellis_converter` | `trellis` |
| `colada_converter` | `colada` |

Example full local pipeline:

```
SERVICES_ENABLED=product_scraper,image_analyzer,text_analyzer,embedding_index,trellis_converter,colada_converter,scene_crops,scene_embeddings
```

Or start stacks / cron separately:

```bash
npm run image-analyzer:docker   # etc.
npm run server                  # crons only; Docker must already be up
```

### SketchUp plugin

**Dev**

1. Set `AUTOBOM_HTML_DIALOG_URL=http://localhost:5173` in `.env`.
2. `npm run package:extension` (or load `autobom_skp/loader.rb` from the SketchUp Ruby console).
3. Run `npm run dev` so the dialog can load the UI.

**Release `.rbz`**

```bash
# AUTOBOM_HTML_DIALOG_URL = hosted UI URL (e.g. Firebase Hosting)
npm run package:extension
```

Produces `autobom_skp.rbz` at the repo root. Install via SketchUp → Extension Manager → Install Extension.

### Deploy UI hosting

```bash
npm run deploy:hosting
```

Builds with `vite --mode hosting` (`base: "/"`) and deploys the `autobom` hosting target.

---

## Configuration reference

Root `.env` (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_APP_VERSION` | Firestore version doc id (`versions/{version}`) |
| `FIREBASE_CONFIG` | Path to web config JSON |
| `FIREBASE_SERVICE_ACCOUNT` | Path to Admin SDK JSON |
| `SERVICES_ENABLED` | Comma-separated ticker workers |
| `*_URL` | ML service base URLs (`TRELLIS_URL`, `IMAGE_ANALYZER_URL`, …) |
| `TICKER_INTERVAL_SECONDS` | Interval between sequential service cycles |
| `TRELLIS_LOW_VRAM` | Trellis container: `true` for 16GB-class GPUs |
| `AUTOBOM_HTML_DIALOG_URL` | URL the SketchUp dialog loads |

**Trellis quality** is not env-driven. Edit `PROCESS_PARAMS` in `server/lib/trellis.ts` (resolution, steps, texture size, etc.). Target hardware: RTX 4090 Mobile 16GB with `TRELLIS_LOW_VRAM=true` — OOM is expected if you raise settings carelessly.

---

## Commands

| Command | What |
| --- | --- |
| `npm run install:all` | Install all Node packages |
| `npm run dev` | UI dev server |
| `npm run build` | UI build for SketchUp / local (`base: "./"`) |
| `npm run deploy:hosting` | Hosting build + Firebase deploy |
| `npm run server` | Cron server only |
| `npm run server:up` | Docker for enabled services + cron server |
| `npm run *-analyzer:docker` / `trellis:docker` / `colada:docker` | Individual containers |
| `npm run package:extension` | Build `autobom_skp.rbz` |
| `npm run reset:failed` | Reset FAILED pipeline steps (server script) |

---

## Repo map (where to change things)

| Concern | Location |
| --- | --- |
| Product pipeline status defaults | `server/lib/status.ts` |
| Product fields / tags | `server/lib/products.ts` |
| Trellis params | `server/lib/trellis.ts` → `PROCESS_PARAMS` |
| Cron worker entry | `server/index.ts` + `server/services/*` |
| UI domain logic | `autobom_ui/src/lib/{products,scenes,cart,auth}.js` |
| Redux store | `autobom_ui/src/lib/store/` |
| Routes | `autobom_ui/src/App.jsx` |
| SketchUp import | `autobom_skp/browser_dialog.rb` |
| Firestore / Storage rules | `firestore.rules`, `storage.rules` |

### UI conventions (short)

- Redux via `actions` / selectors from `lib/store`; domain modules: selectors → fetchers → mutators.
- Imports from `src/` as `lib/`, `pages/`, `components/`.
- Firebase client config is injected at build time from `FIREBASE_CONFIG` (`vite.config.js` → `__FIREBASE_CONFIG__`).

### Server conventions (short)

- Env loaded from repo-root `.env`.
- One ticker cycles enabled services sequentially (`server/index.ts`); skips if a cycle is still running. Each service exports `{ run }`, one recoverable try/catch per tick, claim work via `status.*` PENDING → PROCESSING.

---

## Typical first-time checklist

1. `cp .env.example .env` and fill Firebase paths + `VITE_APP_VERSION`.
2. Place `firebaseConfig.json` and `serviceAccountKey.json` at repo root.
3. `npm run install:all`.
4. Enable Email/Password Auth; deploy Firestore/Storage rules.
5. `npm run dev` → create a user → confirm catalog loads.
6. Set a small `SERVICES_ENABLED` (e.g. `product_scraper,image_analyzer,text_analyzer`) and `npm run server:up`.
7. Import a product URL; watch server logs and Firestore `status.*`.
8. When ready for GLBs: enable `trellis_converter`, ensure GPU Docker works, keep `TRELLIS_LOW_VRAM=true`.
9. For SketchUp: set `AUTOBOM_HTML_DIALOG_URL`, `npm run package:extension`, install `.rbz`.
