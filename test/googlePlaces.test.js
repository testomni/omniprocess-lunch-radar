import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchNearbyGooglePlaces, matchGooglePlace } from '../src/googlePlaces.js';

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

test('requests and maps nearby Google reviews and attributed photos', async () => {
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
                    location: { lat: () => 59.35, lng: () => 18.06 },
                    rating: 4.5,
                    userRatingCount: 123,
                    reviews: [{ text: 'Great lunch.' }],
                    googleMapsURI: 'https://maps.google.com/?cid=123',
                    websiteURI: 'https://example.com/',
                    primaryTypeDisplayName: 'Restaurant',
                    types: ['restaurant'],
                    photos: [{
                      getURI: ({ maxWidth }) => `https://example.com/photo?w=${maxWidth}`,
                      authorAttributions: [{ displayName: 'Photo Author' }],
                    }],
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
    assert.ok(searchRequest.fields.includes('photos'));
    assert.equal(places[0].rating, 4.5);
    assert.equal(places[0].photos[0].uri, 'https://example.com/photo?w=1200');
    assert.equal(places[0].photos[0].authorAttributions[0].displayName, 'Photo Author');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
