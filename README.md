# BIKE RENT PRO SYSTEMS

Dashboard operasional untuk manajemen armada rental sepeda, status unit, dan audit keuangan harian.

## Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React
- GitHub Pages untuk deployment statis

## Struktur Repo

```text
.
├── public/.nojekyll
├── src
│   ├── components
│   │   ├── EmptyState.jsx
│   │   ├── KpiCard.jsx
│   │   └── StatusBadge.jsx
│   ├── data/seed.js
│   ├── lib
│   │   ├── dateFilters.js
│   │   ├── formatters.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Menjalankan Lokal

```bash
npm install
npm run dev
```

## Build Produksi

```bash
npm run build
npm run preview
```

## Deploy GitHub Pages

Project ini dipublish dari branch `gh-pages`.

```bash
npm run deploy
```
