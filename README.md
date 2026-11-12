# OmniLunchRadar

A responsive lunch finder built with React and Vite. With browser location access, the app finds nearby lunch spots from OpenStreetMap within 1.2 km, and uses the same location for the weather forecast and map. If location access is unavailable, it falls back to the OmniProcess office in Bromma and its curated restaurant list in [`src/data/restaurants.json`](src/data/restaurants.json). Nearby restaurant data is provided by the [OpenStreetMap Overpass API](https://overpass.openstreetmap.fr/); please verify opening hours and restaurant details before visiting.

Distances are straight-line estimates and walking times are approximate. Prices use OpenStreetMap details when available and otherwise show a cuisine-based estimate; photos use restaurant-provided imagery when available and otherwise show a cuisine-matched illustrative image. Dietary details are shown when available in the map data. Browser location access requires permission and a secure connection. With permission, coordinates are sent to the weather and OpenStreetMap services to retrieve local forecasts and restaurant results.

## Run locally

```sh
npm install
npm run dev
```

To check the production build:

```sh
npm run build
npm run preview
```

## GitHub Pages

The GitHub Actions workflow builds and deploys `main` to GitHub Pages at <https://jonatanbrihage.github.io/omniprocess-lunch-radar/>. The page includes a `noindex` hint to discourage search engines. It is an unlisted public site, not password-protected: anyone with the URL can visit it. This separate GitHub Pages address does not change `omniprocess.se`.
