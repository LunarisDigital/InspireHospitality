# Inspire Hospitality — Asset Map & Production Structure

**Companion to:** `../ASSET-AUDIT.md` (the audit) · `docs/move-manifest.csv` (every file's old→new path)
**Generated:** 2026-06-08 · **Status:** assets reorganized; this maps where each approved asset is used across the 3-page site.

This document is the single source of truth for *which image goes where*. The reorganization is complete and reversible — nothing was deleted; rejected/duplicate files live under `_archive/` and can be restored from `docs/move-manifest.csv`.

---

## 0 · Production folder structure

```
InspireHospitality/
├── index.html              ← Home (BUILT — nav: Home · Portfolio · Contact)
├── portfolio.html          ← Portfolio (BUILT — filterable gallery + lightbox, 17 projects)
├── contact.html            ← Contact Us (BUILT — inquiry form + details)
├── about.html              ← About Us (PRESERVED but UNLINKED — no inbound nav/footer links;
│                             superseded by portfolio.html, kept on disk for reuse)
├── brand-kit.html          ← Brand system reference (Nightfall Dawn) — use for colour/type
├── assets/
│   ├── css/styles.css       ← core "Nightfall Dawn" system (moved from ./styles.css)
│   ├── css/pages.css        ← page components: subhero, work, story, team, gallery, form
│   ├── js/script.js         ← carousel, nav, scroll-reveal, contact-form mailto (moved)
│   ├── video/               ← brand films (5; optimise before ship — see §6)
│   └── img/
│       ├── brand/           (13)  IH logos, favicon, Lunaris stamp
│       ├── partners/        (14)  partner / investor / school / hotel logos
│       ├── clients/         (10)  client1–10.avif — the live "Partners" logo row
│       ├── home/            (3)   verified Home featured selects
│       │   └── banner/      (3)   Home hero carousel (image1, image3, image5)
│       ├── about/           (6)   verified About selects (forum, team, workshop)
│       ├── contact/         (1)   verified Contact banner select
│       ├── gallery/
│       │   ├── projects/    (151) property & cultural-project interiors (draw-from pool)
│       │   ├── events/      (65)  forums, seminars, training, team events (pool)
│       │   ├── rooms/       (3)   guest-room interiors (pool)
│       │   └── team/        (40)  team / leadership portraits (YZM photoshoot + Murat/June)
│       └── shared/          (0)   reserved for cross-page reusable imagery
├── _archive/
│   ├── duplicates/          (124) exact-duplicate redundant copies
│   ├── rejected/            (82)  UI scraps, placeholders, low-res, off-brand, dead logos
│   └── source-files/        (3)   .ai vectors + .docx copy doc (not web-ready)
└── docs/
    └── move-manifest.csv    full old→new path record (524 moves)
```

**Counts:** 317 approved files under `assets/` · 209 archived · brand-kit/audit docs unchanged.

> **Design reference:** build `about.html` / `contact.html` from `index.html`'s structure and `brand-kit.html`'s **"Nightfall Dawn"** system — deep-ink stages (`#0B0810`/`#0F0C18`), the signature gradient (lavender `#D1A9F2` → blush → peach → cream `#FFF9C5`), plum accent `#5B3A6B`, champagne cream `#FBF3E2`; type = Cormorant Garamond (display/italic) + Manrope (UI) + JetBrains Mono (metadata). One full gradient moment per page.

---

## 1 · HOME (`index.html`)

| # | Section | Asset(s) | Folder | Role |
|---|---|---|---|---|
| 1 | **Hero** | CSS aurora/bloom (no image needed) — *optional* full-bleed `image5.jpg` | `img/home/banner/` | Atmospheric backdrop behind H1 "To inspire hospitality *in others.*" |
| 2 | Positioning "Since 2018…" | — (whitespace, no image) | — | Editorial restraint |
| 3 | **Editorial banner carousel** | `image1.jpg`, `image3.jpg`, `image5.jpg` | `img/home/banner/` | 3-slide carousel: *A sense of place* (forum panel) → *Considered hospitality* (team in lobby) → *Quiet luxury, made daily* (wellness-resort render). **image2 (boxing) & image4 (logo) removed → `_archive/rejected/`.** |
| 4 | Track record (stats) | — | — | Numbers carry it |
| 5 | **Featured projects** (3–4 cards) | `museum.jpg` · `三楼-漆画馆.jpg` · `悦目私家经典花园房 (5).JPG` · +1 from `gallery/projects/` | `img/home/` + `gallery/projects/` | 6 Museum · lacquer-painting gallery · heritage courtyard room |
| 6 | Partners | `client1–10.avif` | `img/clients/` | Live logo row (already wired) |
| 7 | Platform (dark) | — (optional low-opacity interior from `gallery/projects/`) | — | Four capabilities |
| 8 | CTA (gradient ×1) | — | — | "Explore the Platform" |

**Home picks — ratings (Q / Visual-Impact / Brand-Relevance):**
`image5.jpg` 8/9/10 · `museum.jpg` 8/9/8 · `悦目私家经典花园房 (5).JPG` 9/8/9 · `三楼-漆画馆.jpg` 8/8/8 · `image1.jpg` 8/8/9 · `image3.jpg` 7/7/8.

---

## 2 · ABOUT US (`about.html` — to build)

| # | Section | Asset(s) | Folder | Role |
|---|---|---|---|---|
| 1 | **Page hero** | `INS001182.jpg` | `img/about/` | "Women in Hospitality Forum" — lavender decor mirrors the brand gradient. Best "who we are" image. **9/9/10** |
| 2 | Brand story (advisory → owner) | `195acda952c3cd20348a50e77873c89.jpg` | `img/about/` | Seminar / advisory practice in action. **8/7/9** |
| 3 | **Team — group** | `t1.jpg` | `img/about/` | Warm international team group. **8/8/9** |
| 4 | **Leadership headshots** | `Murat Askin.jpg`, `June.jpg` + `YZM####_w####.JPG` series | `img/about/` + `gallery/team/` | Clean studio portraits; pair with bios. Pull additional faces from the 40-image `gallery/team/` photoshoot. **9/7/9** |
| 5 | Workshops / education | `FeastCon.jpg` + `gallery/events/` (PCCA, Ardor Gardens Training, dated `IMG_`/`20190xxx` series) | `img/about/` + `gallery/events/` | Training & forum documentation |
| 6 | Timeline / milestones | `gallery/projects/` (`三楼-*` build series) + dated `gallery/events/` | gallery | Milestones since 2018 |
| 7 | Values | — | — | Care / Knowledge / Passion / Integrity |

---

## 3 · CONTACT US (`contact.html` — to build)

| # | Section | Asset(s) | Folder | Role |
|---|---|---|---|---|
| 1 | **Quiet banner** | `悦艺至尊私家花园套房 (2).JPG` | `img/contact/` | Calm full-bleed interior under "Begin a conversation". **8/7/8** |
| 2 | Consultation imagery | `195acda….jpg` *(reuse from About)* | `img/about/` | Real consultation/seminar setting |
| 3 | Office / location | reuse `image5.jpg` or a `gallery/rooms/` interior | `img/home/banner/` · `gallery/rooms/` | Sense of place beside contact details |
| 4 | Footer (dark) | `Logo.avif` | `img/brand/` | Brand mark + contact |

> Contact intentionally reuses Home/About hero imagery rather than introducing new heavy photography — keeps the page calm and form-focused.

---

## 4 · CROSS-PAGE / GENERAL ASSETS

### `img/brand/` (13) — used site-wide
`Logo.avif` (favicon + nav + footer, **in use**) · `inspire-logo.png` · `logo-02.png` · `logo-06.png` · `logo-white.png` (dark-surface footers/CTA) · `IH logo1-02.png` / `IH logo-02.png` / `IH logo (1)-02-02/03.png` (wordmark variants) · `Forum Logo purple.png` (events) · `Lunaris Digital logo design.png` (brand-kit stamp).
*Action: pick one canonical primary + one reversed (white) wordmark; retire the rest to avoid drift.*

### `img/partners/` (14) — "Partners / Accreditation" rows (Home + About)
Glion · EHL *(export `EHL_BLUE_Logo_simple.ai` → SVG first)* · École Ducasse · Les Roches · Huazhu Hotels Group · Wills (color + white) · Crystal Orange · K11 MUSEA · Equinox / L Catterton (investment) · ESCCA · Guilin Hospitality College · UCF · Yangzhou University · Avantgarde.

### `img/clients/` (10) — the live `.avif` logo strip already on Home.

---

## 5 · GALLERY POOLS (draw-from libraries)

These hold the de-duplicated, usable photography that isn't a hero/featured pick. Pages pull from them as needed; treat each as a curated pool, not a fixed slot.

| Pool | Count | Feeds | Verified key picks |
|---|---|---|---|
| `gallery/projects/` | 151 | Home featured · About timeline · Contact location | `museum`*(→home)*, `三楼-匾额馆/雀替馆/漆画箱馆`, `微信图片_2020*` property shots, Crystal Orange / Avantgarde / Six Arts / PCCA project covers |
| `gallery/events/` | 102 | About (forums/workshops) · Home (optional) | `YZM####_w####` **Ignite & Inspire Forum** set (lavender-lit, on-brand), `image1`, `INS*`, `FeastCon`*(→about)*, `PCCA 1/3/5/6`, `Ardor Gardens Training 2`, `20190722/26 · 20190805 · 20191017 IMG_*` |
| `gallery/team/` | 3 | About leadership grid | `Murat Askin`, `June` (real portraits). *Correction: the `YZM####` series was reclassified from `team/` → `events/` after visual review — they are forum stage/audience photos, not headshots.* |
| `gallery/rooms/` | 3 | Home service · Contact | `悦尔复式欢聚房 (1)`, `悦艺至尊私家花园套房 (5)`, `悦啡咖吧` (café/bar) |

*Note: most `gallery/projects/` files carry hash filenames (download artifacts) with no semantic hint; they're genuine 1620×1080 property/interior photos suitable as a featured-grid / timeline pool. Rename on selection (see §7).*

---

## 6 · `assets/video/` (5) — needs optimisation before any embed
`Inspire Hospitality.mp4` (86 MB) · `Inspire Forum (1).mp4` (85 MB) · `_Ignite & Inspire Forum 1min Video.mp4` (64 MB) · `Ignite & Inspire Forum 1min _cut.mp4` (59 MB) · `video.mp4` (25 MB).
**Before use:** pick **one** master brand film, re-encode to web 1080p H.264 **+** WebM (~5–10 MB) or host on Vimeo/YouTube. The Ignite "Video" vs "_cut" pair are near-duplicate cuts — keep one. Never inline-load the raw 60–86 MB files. *(Off-brand `waves…background video.mp4` already moved to `_archive/rejected/`.)*

---

## 7 · Follow-up actions before/with the build

1. **Rename on selection** to a semantic convention as assets enter a page, e.g.
   `home-hero-resort.jpg` ← `image5.jpg` · `project-6museum.jpg` ← `museum.jpg` · `about-forum-women.jpg` ← `INS001182.jpg` · `team-murat-askin.jpg` ← `Murat Askin.jpg`. Kill hash names, `(1)` copies, `_edited` chains.
2. **Generate responsive derivatives** — many masters are 3000–8000 px / 5–15 MB. Produce `srcset` widths (480/960/1600/2400) as **AVIF/WebP** with `.jpg` fallback.
3. **Export vectors** — `_archive/source-files/EHL_BLUE_Logo_simple.ai` & `越秀YIHA LOGO.ai` → SVG/PNG if those partners are shown.
4. **Real `alt` text** on every `<img>` (Home carousel alts were filled during this pass; gallery images still need descriptions on use).
5. **Watermark caution** — `img/about/INS001182.jpg`, `t1.jpg`, `195acda….jpg`, `img/home/banner/image1.jpg` carry baked-in partner/event logo overlays. Fine as event documentation; **don't** use as clean hero backgrounds where a logo-free frame exists.
6. **Consolidate brand wordmarks** (see §4) to one primary + one reversed.

---

## 8 · Archive summary (`_archive/`, recoverable)

| Folder | Count | What |
|---|---|---|
| `duplicates/` | 124 | Exact-duplicate copies (hash-suffixed downloads, `(1)` copies). Keep-rule favoured cleanest name + highest res. |
| `rejected/` | 82 | UI export scraps (`Website_IH_*`, `kv_new-*`, `1600_900-0x`, `безымянный-*`), placeholders (`placeholder-image`, `gray-gradient`, `desktop`), low-res `_edited` chains (`Home_edited…`), off-brand banner slides (`image2` boxing, `image4` ARTUS logo), off-brand stock video. |
| `source-files/` | 3 | `EHL_BLUE_Logo_simple.ai`, `越秀YIHA LOGO.ai`, `IH Website Our Initiatives rev EE 20220222.docx`. |

*Full file-level old→new mapping: `docs/move-manifest.csv`.*
