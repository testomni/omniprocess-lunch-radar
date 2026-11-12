# OmniLunchRadar

A responsive, static lunch finder built with React and Vite. The restaurant listings in [`src/data/restaurants.json`](src/data/restaurants.json) are the 10 closest mapped lunch spots to the office pin in Mariehäll, Stockholm. Names, locations, and available tags are sourced from [OpenStreetMap](https://www.openstreetmap.org/copyright); please verify opening hours and restaurant details before visiting.

Distances are straight-line estimates and walking times are approximate. Price and dietary details are left unspecified when they are not available in the map data.

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
