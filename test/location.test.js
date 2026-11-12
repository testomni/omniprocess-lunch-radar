import assert from 'node:assert/strict';
import test from 'node:test';
import { findNearbyRestaurants, mapNearbyRestaurants } from '../src/location.js';

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
    imageUrl: 'https://example.com/cafe.jpg',
    directionsUrl: `https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=${encodeURIComponent('59.35,18.06;59.3501,18.06')}`,
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
