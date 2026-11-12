const restaurantRadiusMeters = 1200;
const permanentlyClosedRestaurantNames = new Set(['drottningholms pizzeria']);
const fallbackRestaurantImages = {
  asian: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
  cafe: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
  indian: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80',
  italian: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
  mexican: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=80',
  salad: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1200&q=80',
  thai: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
};

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

export function getCuisineFallbackImage(cuisine, amenity) {
  const cuisineText = cuisine.join(' ').toLowerCase();
  if (cuisineText.includes('japanese') || cuisineText.includes('sushi')) return fallbackRestaurantImages.japanese;
  if (cuisineText.includes('indian')) return fallbackRestaurantImages.indian;
  if (cuisineText.includes('thai')) return fallbackRestaurantImages.thai;
  if (cuisineText.includes('mexican') || cuisineText.includes('taco')) return fallbackRestaurantImages.mexican;
  if (/asian|chinese|korean|vietnamese/.test(cuisineText)) return fallbackRestaurantImages.asian;
  if (cuisineText.includes('italian') || cuisineText.includes('pizza')) return fallbackRestaurantImages.italian;
  if (/burger|american|fast food/.test(cuisineText)) return fallbackRestaurantImages.burger;
  if (cuisineText.includes('salad') || cuisineText.includes('mediterranean')) return fallbackRestaurantImages.salad;
  if (amenity === 'cafe' || cuisineText.includes('cafe')) return fallbackRestaurantImages.cafe;
  return fallbackRestaurantImages.default;
}

function getRestaurantImage(tags, cuisine) {
  const image = getExternalUrl(tags.image);
  if (image) return image;

  const commonsImage = tags.wikimedia_commons;
  if (commonsImage) {
    const filename = commonsImage.replace(/^File:/i, '');
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  }

  return getCuisineFallbackImage(cuisine, tags.amenity);
}

function inferCuisine(name, tags) {
  const nameText = name.toLowerCase();
  if (/sushi|japanese|ramen/.test(nameText)) return ['Japanese'];
  if (/thai/.test(nameText)) return ['Thai'];
  if (/indian|goa|curry/.test(nameText)) return ['Indian'];
  if (/mexican|taco|burrito/.test(nameText)) return ['Mexican'];
  if (/pizza|pizzeria/.test(nameText)) return ['Pizza'];
  if (/burger|hamburger/.test(nameText)) return ['American'];
  if (/chinese|wok/.test(nameText)) return ['Asian'];
  if (tags.amenity === 'cafe') return ['Cafe'];
  if (tags.amenity === 'fast_food') return ['Fast food'];
  if (tags.amenity === 'food_court') return ['Food court'];
  return [];
}

function getLunchPrice(tags, amenity, cuisine) {
  const taggedPrice = String(tags['price:meal'] ?? tags.price_range ?? tags.charge ?? '')
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value) => Number(value.replace(',', '.')))
    .filter(Number.isFinite);
  if (taggedPrice?.length) {
    return Math.round(taggedPrice.reduce((total, price) => total + price, 0) / taggedPrice.length);
  }

  const cuisineText = cuisine.join(' ').toLowerCase();
  if (cuisineText.includes('sushi') || cuisineText.includes('japanese')) return 145;
  if (cuisineText.includes('pizza') || amenity === 'fast_food') return 120;
  if (amenity === 'cafe') return 125;
  if (cuisineText.includes('indian') || cuisineText.includes('thai') || cuisineText.includes('asian')) return 130;
  return 135;
}

function getRestaurantAddress(tags) {
  const fullAddress = tags['addr:full'] ?? tags['contact:address'] ?? tags['contact:addr'];
  if (fullAddress?.trim()) return fullAddress.trim();

  const houseNumber = tags['addr:housenumber'] ?? tags['contact:housenumber'] ?? '';
  const street = tags['addr:street'] ?? tags['contact:street'] ?? tags.street ?? '';
  const place = tags['addr:place'] ?? tags['contact:place'] ?? '';
  const postalCode = tags['addr:postcode'] ?? tags['contact:postcode'] ?? '';
  const locality = tags['addr:city']
    ?? tags['addr:town']
    ?? tags['addr:village']
    ?? tags['addr:suburb']
    ?? tags['addr:municipality']
    ?? tags['contact:city']
    ?? '';
  const addressLine = street
    ? [houseNumber, street].filter(Boolean).join(' ')
    : place;

  return [
    addressLine,
    postalCode,
    locality,
  ].filter(Boolean).join(', ');
}

function toRestaurant(element, origin) {
  const coordinates = getCoordinates(element);
  const tags = element.tags ?? {};
  if (!coordinates || !tags.name || isInactiveRestaurant(tags, tags.name)) return null;

  const distanceMeters = Math.round(getDistanceMeters(origin, coordinates));
  const address = getRestaurantAddress(tags);
  const taggedCuisine = (tags.cuisine ?? tags['cuisine:en'] ?? tags['cuisine:sv'] ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(titleCase);
  const cuisine = taggedCuisine.length ? taggedCuisine : inferCuisine(tags.name, tags);
  const imageUrl = getRestaurantImage(tags, cuisine);

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name,
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceMeters,
    walkingTimeMinutes: Math.max(1, Math.ceil((distanceMeters * 1.3) / 80)),
    cuisine,
    typicalLunchPriceSek: getLunchPrice(tags, tags.amenity, cuisine),
    imageUrl,
    vegetarian: ['yes', 'only'].includes(tags['diet:vegetarian']),
    vegan: ['yes', 'only'].includes(tags['diet:vegan']),
    takeaway: tags.takeaway === 'yes' || tags['takeaway:yes'] === 'yes',
    menuUrl: getExternalUrl(tags.menu)
      ?? getExternalUrl(tags['menu:url'])
      ?? getExternalUrl(tags['contact:menu']),
    websiteUrl: getExternalUrl(tags.website ?? tags['contact:website'] ?? tags.url),
  };
}

function isInactiveRestaurant(tags, name) {
  const isAffirmative = (value) => ['yes', 'true', '1', 'temporary', 'permanent', 'closed', 'permanently_closed', 'temporarily_closed']
    .includes(String(value ?? '').toLowerCase());
  const hasLifecycleAmenity = ['disused:amenity', 'abandoned:amenity', 'closed:amenity']
    .some((key) => Boolean(tags[key]));
  const normalizedName = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  return [...permanentlyClosedRestaurantNames].some((closedName) => normalizedName.includes(closedName))
    || hasLifecycleAmenity
    || ['disused', 'abandoned', 'closed'].some((key) => isAffirmative(tags[key]));
}

export function mapNearbyRestaurants(elements, origin) {
  return elements
    .map((element) => toRestaurant(element, origin))
    .filter(Boolean)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function getMenuSearchUrl(restaurant) {
  const search = new URL('https://www.google.com/search');
  search.searchParams.set('q', `${restaurant.name} ${restaurant.address ?? ''} menu`);
  return search.href;
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
  const directionsUrl = new URL('https://www.google.com/maps/dir/');
  directionsUrl.searchParams.set('api', '1');
  if (Number.isFinite(origin?.latitude) && Number.isFinite(origin?.longitude)) {
    directionsUrl.searchParams.set('origin', `${origin.latitude},${origin.longitude}`);
  }
  const destination = Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude)
    ? `${restaurant.latitude},${restaurant.longitude}`
    : [restaurant.name, restaurant.address].filter(Boolean).join(', ');
  directionsUrl.searchParams.set('destination', destination);
  directionsUrl.searchParams.set('travelmode', 'walking');
  if (restaurant.googlePlace?.id) {
    directionsUrl.searchParams.set('destination_place_id', restaurant.googlePlace.id);
  }
  return directionsUrl.href;
}
