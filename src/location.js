const restaurantRadiusMeters = 1200;

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

function titleCase(value) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function getCoordinates(element) {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

function getExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function toRestaurant(element, origin) {
  const coordinates = getCoordinates(element);
  const tags = element.tags ?? {};
  if (!coordinates || !tags.name) return null;

  const distanceMeters = Math.round(getDistanceMeters(origin, coordinates));
  const address = tags['addr:full']
    || [
      [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
      tags['addr:postcode'],
      tags['addr:city'],
    ].filter(Boolean).join(', ')
    || '';
  const cuisine = (tags.cuisine ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(titleCase);
  const route = [
    `${origin.latitude},${origin.longitude}`,
    `${coordinates.latitude},${coordinates.longitude}`,
  ].join(';');

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name,
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceMeters,
    walkingTimeMinutes: Math.max(1, Math.ceil((distanceMeters * 1.3) / 80)),
    cuisine,
    typicalLunchPriceSek: null,
    vegetarian: ['yes', 'only'].includes(tags['diet:vegetarian']),
    vegan: ['yes', 'only'].includes(tags['diet:vegan']),
    takeaway: tags.takeaway === 'yes' || tags['takeaway:yes'] === 'yes',
    menuUrl: getExternalUrl(tags.menu ?? tags['contact:menu']),
    directionsUrl: `https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=${encodeURIComponent(route)}`,
  };
}

export function mapNearbyRestaurants(elements, origin) {
  return elements
    .map((element) => toRestaurant(element, origin))
    .filter(Boolean)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function findNearbyRestaurants(origin) {
  const query = [
    '[out:json][timeout:25];',
    '(',
    `nwr(around:${restaurantRadiusMeters},${origin.latitude},${origin.longitude})["amenity"~"^(restaurant|fast_food|cafe|food_court)$"]["name"];`,
    ');',
    'out tags center;',
  ].join('\n');
  const requestUrl = new URL('https://overpass.openstreetmap.fr/api/interpreter');
  requestUrl.searchParams.set('data', query);
  const response = await fetch(requestUrl);
  if (!response.ok) throw new Error('Nearby restaurant request failed');

  const payload = await response.json();
  return mapNearbyRestaurants(payload.elements ?? [], origin);
}

export function getDirectionsUrl(restaurant, origin) {
  if (restaurant.directionsUrl) return restaurant.directionsUrl;

  const route = [
    `${origin.latitude},${origin.longitude}`,
    `${restaurant.latitude},${restaurant.longitude}`,
  ].join(';');
  return `https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=${encodeURIComponent(route)}`;
}
