import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findNearbyRestaurants,
  drivingSearchRadiusMeters,
  getCuisineFallbackImage,
  getDirectionsUrl,
  getMenuSearchUrl,
  mapNearbyRestaurants,
} from '../src/location.js';

const origin = { latitude: 59.35, longitude: 18.06 };

test('maps named OSM restaurants and sorts them by distance', () => {
  const restaurants = mapNearbyRestaurants([
    {
      type: 'way',
      id: 2,
      center: { lat: 59.351, lon: 18.06 },
      tags: { amenity: 'restaurant', name: 'Farther place', menu: 'javascript:alert(1)' },
    },
    {
      type: 'node',
      id: 1,
      lat: 59.3501,
      lon: 18.06,
      tags: {
        amenity: 'cafe',
        name: 'Nearby cafe',
        cuisine: 'coffee_shop;italian',
        'addr:street': 'Main Street',
        'addr:housenumber': '5',
        'diet:vegetarian': 'yes',
        'diet:vegan': 'only',
        takeaway: 'yes',
        menu: 'https://example.com/menu',
        image: 'https://example.com/cafe.jpg',
        charge: '100-140 SEK',
      },
    },
    { type: 'node', id: 3, lat: 59.35, lon: 18.06, tags: { amenity: 'restaurant' } },
    { type: 'node', id: 4, tags: { amenity: 'restaurant', name: 'No coordinates' } },
  ], origin);

  assert.deepEqual(restaurants.map(({ name }) => name), ['Nearby cafe', 'Farther place']);
  assert.deepEqual(restaurants[0], {
    id: 'osm-node-1',
    name: 'Nearby cafe',
    address: '5 Main Street',
    latitude: 59.3501,
    longitude: 18.06,
    distanceMeters: 11,
    walkingTimeMinutes: 1,
    cuisine: ['Coffee Shop', 'Italian'],
    typicalLunchPriceSek: 120,
    vegetarian: true,
    vegan: true,
    takeaway: true,
    menuUrl: 'https://example.com/menu',
    websiteUrl: null,
    imageUrl: 'https://example.com/cafe.jpg',
  });
  assert.ok(restaurants[1].distanceMeters > restaurants[0].distanceMeters);
  assert.equal(restaurants[1].menuUrl, null);
});

test('requests named nearby places with tags and center coordinates', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        elements: [{
          type: 'node',
          id: 8,
          lat: 59.3502,
          lon: 18.06,
          tags: { amenity: 'restaurant', name: 'Test restaurant' },
        }],
      }),
    };
  };

  try {
    const restaurants = await findNearbyRestaurants(origin);
    const requestUrl = new URL(request.url);

    assert.equal(requestUrl.origin + requestUrl.pathname, 'https://overpass.openstreetmap.fr/api/interpreter');
    assert.equal(request.options, undefined);
    const query = requestUrl.searchParams.get('data');
    assert.match(query, /nwr\(around:1200,59\.35,18\.06\)/);
    assert.match(query, /out tags center;/);
    assert.equal(restaurants[0].name, 'Test restaurant');
    assert.equal(restaurants[0].typicalLunchPriceSek, 135);
    assert.match(restaurants[0].imageUrl, /^https:\/\/images\.unsplash\.com\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fills missing cuisine from a restaurant name and keeps an official website', () => {
  const [restaurant] = mapNearbyRestaurants([{
    type: 'node',
    id: 9,
    lat: 59.3501,
    lon: 18.06,
    tags: {
      amenity: 'restaurant',
      name: 'Sushi Yama',
      website: 'https://example.com/',
    },
  }], origin);

  assert.deepEqual(restaurant.cuisine, ['Japanese']);
  assert.equal(restaurant.menuUrl, null);
  assert.equal(restaurant.websiteUrl, 'https://example.com/');
  assert.match(restaurant.imageUrl, /photo-1579871494447/);
});

test('uses contact and place tags to construct an address', () => {
  const [restaurant] = mapNearbyRestaurants([{
    type: 'node',
    id: 14,
    lat: 59.3501,
    lon: 18.06,
    tags: {
      amenity: 'restaurant',
      name: 'Addressed restaurant',
      'contact:housenumber': '7',
      'contact:street': 'Side Street',
      'addr:postcode': '123 45',
      'addr:city': 'Stockholm',
    },
  }], origin);

  assert.equal(restaurant.address, '7 Side Street, 123 45, Stockholm');
});

test('preserves unknown dietary details and accepts a wider driving search radius', async () => {
  const [restaurant] = mapNearbyRestaurants([{
    type: 'node',
    id: 15,
    lat: 59.3501,
    lon: 18.06,
    tags: { amenity: 'restaurant', name: 'Unknown options restaurant', 'diet:vegetarian': 'no' },
  }], origin);

  assert.equal(restaurant.vegetarian, false);
  assert.equal(restaurant.vegan, null);
  assert.equal(restaurant.takeaway, null);

  const originalFetch = globalThis.fetch;
  let query;
  globalThis.fetch = async (url) => {
    query = new URL(url).searchParams.get('data');
    return { ok: true, json: async () => ({ elements: [] }) };
  };
  try {
    await findNearbyRestaurants(origin, drivingSearchRadiusMeters);
    assert.match(query, /nwr\(around:10000,59\.35,18\.06\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('opens Google Maps walking directions to the restaurant', () => {
  const directionsUrl = new URL(getDirectionsUrl({
    name: 'Test Restaurant',
    latitude: 59.351,
    longitude: 18.061,
    googlePlace: { id: 'google-place-1' },
  }, origin));

  assert.equal(directionsUrl.origin, 'https://www.google.com');
  assert.equal(directionsUrl.pathname, '/maps/dir/');
  assert.equal(directionsUrl.searchParams.get('api'), '1');
  assert.equal(directionsUrl.searchParams.get('origin'), '59.35,18.06');
  assert.equal(directionsUrl.searchParams.get('destination'), '59.351,18.061');
  assert.equal(directionsUrl.searchParams.get('destination_place_id'), 'google-place-1');
  assert.equal(directionsUrl.searchParams.get('travelmode'), 'walking');
});

test('opens Google Maps driving directions when requested', () => {
  const directionsUrl = new URL(getDirectionsUrl({
    name: 'Test Restaurant',
    latitude: 59.351,
    longitude: 18.061,
  }, origin, 'drive'));

  assert.equal(directionsUrl.searchParams.get('travelmode'), 'driving');
});

test('excludes restaurants tagged as closed or disused', () => {
  const restaurants = mapNearbyRestaurants([
    {
      type: 'node',
      id: 10,
      lat: 59.3501,
      lon: 18.06,
      tags: { amenity: 'restaurant', name: 'Closed restaurant', closed: 'yes' },
    },
    {
      type: 'node',
      id: 11,
      lat: 59.3502,
      lon: 18.06,
      tags: { amenity: 'restaurant', name: 'Disused restaurant', disused: 'yes' },
    },
    {
      type: 'node',
      id: 13,
      lat: 59.35025,
      lon: 18.06,
      tags: { amenity: 'restaurant', name: 'Drottningholms Pizzeria' },
    },
    {
      type: 'node',
      id: 12,
      lat: 59.3503,
      lon: 18.06,
      tags: { amenity: 'restaurant', name: 'Open restaurant' },
    },
  ], origin);

  assert.deepEqual(restaurants.map(({ name }) => name), ['Open restaurant']);
});

test('uses cuisine-specific fallback imagery and offers a menu search when no menu is tagged', () => {
  assert.match(getCuisineFallbackImage(['Mexican']), /photo-1552332386-f8dd00dc2f85/);

  const menuSearch = new URL(getMenuSearchUrl({
    name: 'Test Restaurant',
    address: 'Main Street',
  }));
  assert.equal(menuSearch.origin, 'https://www.google.com');
  assert.match(menuSearch.searchParams.get('q'), /Test Restaurant Main Street menu/);
});
