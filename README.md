# OmniLunchRadar

A responsive lunch finder built with React and Vite. With browser location access, the app finds nearby lunch spots from OpenStreetMap within 1.2 km for walking, or within 10 km when searching for places reachable in at most a 10-minute drive. Driving times use the free, public [OSRM routing service](https://project-osrm.org/) and require no API key or billing setup. If location access is unavailable, it searches around the OmniProcess office in Bromma. Nearby restaurant data is provided by the [OpenStreetMap Overpass API](https://overpass.openstreetmap.fr/); please verify opening hours and restaurant details before visiting.

Distances are straight-line estimates, walking times are approximate, and OSRM driving times are estimates without live traffic. The public routing service is best-effort, may log route requests, and may be rate-limited or unavailable. The app batches destinations and spaces multiple requests at least one second apart. Prices use OpenStreetMap details when available and otherwise show a cuisine-based estimate. Photos use restaurant imagery when available and otherwise use cuisine-matched illustrative images. Dietary and takeaway fields not present in OpenStreetMap are shown as unavailable. When configured, Google Places provides current ratings, review excerpts, formatted addresses, website links, cuisine details, and operational status. Google data is fetched at runtime and is not stored. When neither map source provides an address, the restaurant card links to its Google Maps listing; directions follow the selected travel mode. When a direct menu URL is unavailable, the restaurant card links to a menu search. Browser location access requires permission and a secure connection. With permission, coordinates are sent to the weather and OpenStreetMap services, and to the public OSRM routing service when driving search is enabled; coordinates are also sent to Google Maps Platform when Google reviews are enabled.

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

## Google Places reviews and restaurant details

Google Places is optional and is only used for reviews, ratings, formatted addresses, and business-status checks. To enable it, enable the Google Maps JavaScript API and Places API (New) with billing in Google Cloud. Create a browser API key restricted to the deployed site’s HTTP referrers and to the APIs you use. For local development, copy `.env.example` to `.env.local` and set `VITE_GOOGLE_PLACES_API_KEY`. For GitHub Pages, add a repository Actions secret named `GOOGLE_PLACES_API_KEY`; the deployment workflow injects it at build time. Without this secret, Google review and place details are unavailable, but driving search continues to work without Google or billing. Browser keys are visible to site visitors, so restrict them and set appropriate usage quotas.

The app makes one nearby-place request per location and receives up to 20 results. Review requests use Google’s higher-billing fields. Review results are limited to the reviews Google returns; places that cannot be confidently matched are shown without Google review data.

## GitHub Pages

The GitHub Actions workflow builds and deploys `main` to GitHub Pages at <https://testomni.github.io/omni-lunch-radar/>. The page includes a `noindex` hint to discourage search engines. It is an unlisted public site, not password-protected: anyone with the URL can visit it. This separate GitHub Pages address does not change `omniprocess.se`.
