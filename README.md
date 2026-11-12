# OmniLunchRadar

A responsive lunch finder built with React and Vite. With browser location access, the app finds nearby lunch spots from OpenStreetMap within 1.2 km, and uses the same location for the weather forecast and map. If location access is unavailable, it falls back to the OmniProcess office in Bromma and its curated restaurant list in [`src/data/restaurants.json`](src/data/restaurants.json). Nearby restaurant data is provided by the [OpenStreetMap Overpass API](https://overpass.openstreetmap.fr/); please verify opening hours and restaurant details before visiting.

Distances are straight-line estimates and walking times are approximate. Prices use OpenStreetMap details when available and otherwise show a cuisine-based estimate. Photos use restaurant imagery when available and otherwise use cuisine-matched illustrative images. When configured, Google Places provides current ratings, review excerpts, website links, and restaurant photos. Google data is fetched at runtime and is not stored. Browser location access requires permission and a secure connection. With permission, coordinates are sent to the weather and OpenStreetMap services; coordinates are also sent to Google Maps Platform when Google reviews are enabled.

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

## Google Places reviews and photos

Enable the Google Maps JavaScript API and Places API (New) with billing in Google Cloud. Create a browser API key restricted to the deployed site’s HTTP referrers and to those APIs. For local development, copy `.env.example` to `.env.local` and set `VITE_GOOGLE_PLACES_API_KEY`. For GitHub Pages, add a repository Actions secret named `GOOGLE_PLACES_API_KEY`; the deployment workflow injects it at build time. Then run the “Deploy to GitHub Pages” workflow again. Browser keys are visible to site visitors, so restrict them and set appropriate usage quotas.

The app makes one nearby-place request per location and receives up to 20 results. Requests that include reviews and photos use Google’s higher-billing fields. Review results are limited to the reviews Google returns; places that cannot be confidently matched are shown without Google review data.

## GitHub Pages

The GitHub Actions workflow builds and deploys `main` to GitHub Pages at <https://jonatanbrihage.github.io/omniprocess-lunch-radar/>. The page includes a `noindex` hint to discourage search engines. It is an unlisted public site, not password-protected: anyone with the URL can visit it. This separate GitHub Pages address does not change `omniprocess.se`.
