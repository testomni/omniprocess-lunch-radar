let googlePlacesLibraryPromise;

function loadGooglePlacesLibrary(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return window.google.maps.importLibrary('places');
  }
  if (googlePlacesLibraryPromise) return googlePlacesLibraryPromise;

  googlePlacesLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const scriptUrl = new URL('https://maps.googleapis.com/maps/api/js');
    scriptUrl.searchParams.set('key', apiKey);
    scriptUrl.searchParams.set('v', 'weekly');
    scriptUrl.searchParams.set('libraries', 'places');
    script.src = scriptUrl.href;
    script.async = true;
    script.addEventListener('load', () => {
      window.google.maps.importLibrary('places').then(resolve, reject);
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Maps JavaScript API could not be loaded.')), {
      once: true,
    });
    document.head.append(script);
  }).catch((error) => {
    googlePlacesLibraryPromise = null;
    throw error;
  });

  return googlePlacesLibraryPromise;
}

function getDistanceMeters(origin, destination) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destination.latitude - origin.latitude);
  const longitudeDifference = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
      * Math.sin(longitudeDifference / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getNameSimilarity(first, second) {
  const ignoredWords = new Set(['cafe', 'restaurant', 'the', 'and']);
  const firstWords = new Set(normalizeName(first).split(' ').filter((word) => word.length > 2 && !ignoredWords.has(word)));
  const secondWords = new Set(normalizeName(second).split(' ').filter((word) => word.length > 2 && !ignoredWords.has(word)));
  if (!firstWords.size || !secondWords.size) return 0;

  const sharedWords = [...firstWords].filter((word) => secondWords.has(word)).length;
  return sharedWords / Math.max(firstWords.size, secondWords.size);
}

export async function fetchNearbyGooglePlaces(location, apiKey) {
  const { Place } = await loadGooglePlacesLibrary(apiKey);
  const { places = [] } = await Place.searchNearby({
    fields: [
      'id',
      'displayName',
      'location',
      'rating',
      'userRatingCount',
      'reviews',
      'googleMapsURI',
      'websiteURI',
      'businessStatus',
      'primaryType',
      'primaryTypeDisplayName',
      'types',
    ],
    includedTypes: ['restaurant', 'cafe', 'fast_food_restaurant', 'food_court'],
    maxResultCount: 20,
    locationRestriction: {
      center: { lat: location.latitude, lng: location.longitude },
      radius: 1200,
    },
    rankPreference: 'DISTANCE',
  });

  return places.map((place) => ({
    id: place.id,
    displayName: { text: place.displayName ?? '' },
    location: place.location ? {
      latitude: typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat,
      longitude: typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng,
    } : null,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    reviews: place.reviews ?? [],
    googleMapsUri: place.googleMapsURI,
    websiteUri: place.websiteURI,
    businessStatus: place.businessStatus,
    primaryType: place.primaryType,
    primaryTypeDisplayName: { text: place.primaryTypeDisplayName ?? '' },
    types: place.types ?? [],
  }));
}

export function isGooglePlaceClosed(place) {
  return ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY'].includes(place?.businessStatus);
}

export function matchGooglePlace(restaurant, places) {
  let bestMatch = null;
  let bestScore = 0;

  for (const place of places) {
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const distanceMeters = getDistanceMeters(restaurant, { latitude, longitude });
    if (distanceMeters > 350) continue;

    const nameSimilarity = getNameSimilarity(restaurant.name, place.displayName?.text ?? '');
    const score = nameSimilarity - distanceMeters / 100_000;
    if (nameSimilarity >= 0.5 && score > bestScore) {
      bestMatch = place;
      bestScore = score;
    }
  }

  return bestMatch;
}
