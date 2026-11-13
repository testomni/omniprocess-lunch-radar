import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchDrivingTimes,
  fetchNearbyGooglePlaces,
  isGooglePlaceClosed,
  isWithinDrivingTimeLimit,
  matchGooglePlace,
} from '../src/googlePlaces.js';

test('includes routes up to 10 minutes and excludes longer or unavailable routes', () => {
  assert.equal(isWithinDrivingTimeLimit(9), true);
  assert.equal(isWithinDrivingTimeLimit(10), true);
  assert.equal(isWithinDrivingTimeLimit(11), false);
  assert.equal(isWithinDrivingTimeLimit(null), false);
});

test('computes driving times with the Google Routes matrix and marks unreachable places', async () => {
  const originalWindow = globalThis.window;
  let routeRequest;
  globalThis.window = {
    google: {
      maps: {
        importLibrary: async (libraryName) => {
          assert.equal(libraryName, 'routes');
          return {
            RouteMatrix: {
              computeRouteMatrix: async (request) => {
                routeRequest = request;
                return {
                  matrix: {
                    rows: [{
                      items: [
                        { condition: 'ROUTE_EXISTS', durationMillis: 60_001 },
                        { condition: 'ROUTE_NOT_FOUND', durationMillis: undefined },
                      ],
                    }],
                  },
                };
              },
            },
          };
        },
      },
    },
  };

  try {
    const times = await fetchDrivingTimes(
      { latitude: 59.35, longitude: 18.06 },
      [
        { latitude: 59.351, longitude: 18.061 },
        { latitude: 59.352, longitude: 18.062 },
      ],
      'restricted-test-key',
    );

    assert.deepEqual(times, [2, null]);
    assert.deepEqual(routeRequest.origins, [{ lat: 59.35, lng: 18.06 }]);
    assert.equal(routeRequest.travelMode, 'DRIVING');
    assert.equal(routeRequest.fields.includes('durationMillis'), true);
    assert.equal(routeRequest.destinations.length, 2);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('matches Google Places by name and proximity, not name alone', () => {
  const restaurant = {
    name: 'Neko Wok',
    latitude: 59.3559663,
    longitude: 17.9547679,
  };
  const nearbyMatch = {
    displayName: { text: 'Neko Wok Restaurant' },
    location: { latitude: 59.356, longitude: 17.9548 },
  };
  const similarlyNamedPlaceFarAway = {
    displayName: { text: 'Neko Wok' },
    location: { latitude: 59.36, longitude: 17.96 },
  };
  const unrelatedNearbyPlace = {
    displayName: { text: 'Sushi Yama' },
    location: { latitude: 59.356, longitude: 17.9548 },
  };

  assert.equal(
    matchGooglePlace(restaurant, [similarlyNamedPlaceFarAway, unrelatedNearbyPlace, nearbyMatch]),
    nearbyMatch,
  );
});

test('requests and maps nearby Google reviews and operational status', async () => {
  const originalWindow = globalThis.window;
  let searchRequest;
  globalThis.window = {
    google: {
      maps: {
        importLibrary: async (libraryName) => {
          assert.equal(libraryName, 'places');
          return {
            Place: {
              searchNearby: async (request) => {
                searchRequest = request;
                return {
                  places: [{
                    id: 'google-place-1',
                    displayName: 'Test Restaurant',
                    formattedAddress: '1 Main Street, Stockholm',
                    location: { lat: () => 59.35, lng: () => 18.06 },
                    rating: 4.5,
                    userRatingCount: 123,
                    reviews: [{ text: 'Great lunch.' }],
                    googleMapsURI: 'https://maps.google.com/?cid=123',
                    websiteURI: 'https://example.com/',
                    businessStatus: 'OPERATIONAL',
                    primaryType: 'thai_restaurant',
                    primaryTypeDisplayName: 'Restaurant',
                    types: ['restaurant'],
                  }],
                };
              },
            },
          };
        },
      },
    },
  };

  try {
    const places = await fetchNearbyGooglePlaces(
      { latitude: 59.35, longitude: 18.06 },
      'restricted-test-key',
    );

    assert.equal(searchRequest.maxResultCount, 20);
    assert.equal(searchRequest.locationRestriction.radius, 1200);
    assert.ok(searchRequest.fields.includes('reviews'));
    assert.ok(searchRequest.fields.includes('businessStatus'));
    assert.ok(searchRequest.fields.includes('formattedAddress'));
    assert.equal(places[0].rating, 4.5);
    assert.equal(places[0].formattedAddress, '1 Main Street, Stockholm');
    assert.equal(places[0].businessStatus, 'OPERATIONAL');
    assert.equal(places[0].primaryType, 'thai_restaurant');
    assert.equal(isGooglePlaceClosed(places[0]), false);
    assert.equal(isGooglePlaceClosed({ businessStatus: 'CLOSED_PERMANENTLY' }), true);
    assert.equal(isGooglePlaceClosed({ businessStatus: 'CLOSED_TEMPORARILY' }), true);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
