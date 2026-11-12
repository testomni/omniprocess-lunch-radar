import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Gauge,
  Leaf,
  MapPin,
  Sparkles,
  Sun,
  Utensils,
  Vegan,
  Wind,
} from 'lucide-react';
import restaurantData from './data/restaurants.json';
import omniProcessLogo from './assets/omniprocess-logo.png';
import RestaurantMap from './RestaurantMap.jsx';
import { getCuisineName, getRestaurantName, translations } from './translations.js';
import { officeCoordinates } from './config.js';
import { findNearbyRestaurants, getDirectionsUrl } from './location.js';
import { getHungerLevel, getLocalDateKey } from './hunger.js';
import { fetchNearbyGooglePlaces, matchGooglePlace } from './googlePlaces.js';

const priceOptions = ['', '100', '125', '150', '175', '200', '250'];
const googlePlacesApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? '';

function formatDate(value, options, locale) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, options);
}

function getRadarPosition(restaurant, location) {
  const metersPerDegree = 111_320;
  const eastMeters = (restaurant.longitude - location.longitude)
    * metersPerDegree * Math.cos((location.latitude * Math.PI) / 180);
  const northMeters = (restaurant.latitude - location.latitude) * metersPerDegree;
  const position = (meters) => Math.min(94, Math.max(6, 50 + (meters / 1200) * 44));
  return { left: `${position(eastMeters)}%`, top: `${position(-northMeters)}%` };
}

function getGoogleCuisine(place) {
  const placeTypes = [
    place?.primaryTypeDisplayName?.text,
    ...(place?.types ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  const cuisineTypes = [
    [/sushi|japanese|ramen/, 'Japanese'],
    [/thai/, 'Thai'],
    [/indian/, 'Indian'],
    [/chinese|asian/, 'Asian'],
    [/italian|pizza/, 'Italian'],
    [/mexican/, 'Mexican'],
    [/burger|american/, 'American'],
    [/cafe|coffee/, 'Cafe'],
    [/fast.food/, 'Fast food'],
    [/restaurant|food.court/, 'Restaurant'],
  ];

  return cuisineTypes.find(([pattern]) => pattern.test(placeTypes))?.[1] ?? '';
}

function getGoogleMapsUrl(place) {
  return place.googleMapsUri
    ?? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`;
}

function getWeatherIcon(symbolCode, size = 24) {
  const code = symbolCode ?? 'cloudy';
  if (code.includes('clearsky') || code.includes('fair')) return <Sun size={size} />;
  if (code.includes('partly') || code.includes('sun')) return <CloudSun size={size} />;
  if (code.includes('rain') || code.includes('shower')) return <CloudRain size={size} />;
  if (code.includes('snow') || code.includes('sleet')) return <CloudSnow size={size} />;
  if (code.includes('thunder')) return <CloudLightning size={size} />;
  if (code.includes('fog')) return <CloudFog size={size} />;
  if (code.includes('drizzle')) return <CloudDrizzle size={size} />;
  return <Cloud size={size} />;
}

function getWeatherStatusText(symbolCode, text) {
  const code = symbolCode ?? 'cloudy';
  if (code.includes('clearsky') || code.includes('fair')) return text.weatherClear;
  if (code.includes('cloudy') || code.includes('partly')) return text.weatherCloudy;
  if (code.includes('rain') || code.includes('shower')) return text.weatherRain;
  if (code.includes('snow') || code.includes('sleet')) return text.weatherSnow;
  if (code.includes('thunder')) return text.weatherThunder;
  if (code.includes('fog')) return text.weatherFog;
  return text.weatherCloudy;
}

function DietFilter({ checked, label, onChange, icon: Icon }) {
  return (
    <label className={`diet-filter${checked ? ' is-active' : ''}`}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span className="diet-icon"><Icon size={15} strokeWidth={2} /></span>
      <span>{label}</span>
    </label>
  );
}

function RestaurantCard({ restaurant, location, picked, highlighted, onHighlightChange, text }) {
  const googlePlace = restaurant.googlePlace;
  const googleMapsUrl = googlePlace ? getGoogleMapsUrl(googlePlace) : '';
  return (
    <article
      className={`restaurant-card${picked ? ' is-picked' : ''}${highlighted ? ' is-map-highlighted' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onHighlightChange(null);
      }}
      onFocus={() => onHighlightChange(restaurant.id)}
      onMouseEnter={() => onHighlightChange(restaurant.id)}
      onMouseLeave={() => onHighlightChange(null)}
      tabIndex="0"
    >
      <div className={`restaurant-image${!restaurant.imageUrl ? ' image-unavailable' : ''}`}>
        {restaurant.imageUrl ? (
          <img alt={getRestaurantName(restaurant, text)} loading="lazy" src={restaurant.imageUrl} />
        ) : (
          <span aria-hidden="true" className="image-placeholder"><Utensils size={30} /></span>
        )}
        {restaurant.googlePhotoAttributions?.map((attribution) => (
          <span className="photo-attribution" key={`${attribution.displayName}-${attribution.uri ?? ''}`}>
            {attribution.uri ? (
              <a href={attribution.uri} rel="noreferrer" target="_blank">{attribution.displayName}</a>
            ) : attribution.displayName}
          </span>
        ))}
        <span className="walk-badge"><Clock3 size={14} /> {restaurant.walkingTimeMinutes == null ? text.walkingUnknown : text.walkingMinutes(restaurant.walkingTimeMinutes)}</span>
        {picked && <span className="picked-badge"><Sparkles size={14} /> {text.picked}</span>}
        <span className="cuisine-badge">{restaurant.cuisine.length
          ? restaurant.cuisine.map((item) => getCuisineName(item, text)).join(', ')
          : text.cuisineUnknown}</span>
      </div>

      <div className="restaurant-details">
        <div className="card-heading">
          <h3>{getRestaurantName(restaurant, text)}</h3>
          <span className="price">{restaurant.typicalLunchPriceSek == null ? text.priceUnknown : `~${restaurant.typicalLunchPriceSek} kr`}</span>
        </div>
        <p className="price-note">{!restaurant.address || /^Placeholder address \d+$/.test(restaurant.address) ? text.unavailableAddress : restaurant.address}</p>

        <div className="restaurant-tags" aria-label={text.dietaryLabel}>
          {restaurant.vegetarian && <span className="info-tag"><Leaf size={13} /> {text.vegetarian}</span>}
          {restaurant.vegan && <span className="info-tag"><Vegan size={13} /> {text.vegan}</span>}
          {restaurant.takeaway && (
            <span className="info-tag"><Check size={13} /> {text.takeaway}</span>
          )}
          {!restaurant.vegetarian && !restaurant.vegan && !restaurant.takeaway && (
            <span className="no-options">{text.dietaryUnknown}</span>
          )}
        </div>

        {googlePlace && (
          <div className="google-review-panel">
            <div className="google-review-heading">
              <strong>{googlePlace.rating == null
                ? text.googleRatingUnavailable
                : `★ ${googlePlace.rating.toLocaleString(text.locale, { maximumFractionDigits: 1 })}`}</strong>
              {googlePlace.userRatingCount != null && <span>{text.googleReviewCount(googlePlace.userRatingCount)}</span>}
              <a className="google-maps-attribution" href={googleMapsUrl} rel="noreferrer" target="_blank" translate="no">Google Maps</a>
            </div>
            {googlePlace.reviews?.length > 0 && (
              <details className="google-review-details">
                <summary>{text.googleReviewHighlights(googlePlace.reviews.length)}</summary>
                <div className="google-review-list">
                  {googlePlace.reviews.map((review, index) => (
                    <blockquote key={`${review.authorAttribution?.displayName ?? 'review'}-${index}`}>
                      <p>{typeof review.text === 'string' ? review.text : review.text?.text}</p>
                      <footer>
                        {review.authorAttribution?.uri ? (
                          <a href={review.authorAttribution.uri} rel="noreferrer" target="_blank">
                            {review.authorAttribution.displayName}
                          </a>
                        ) : review.authorAttribution?.displayName}
                        {review.relativePublishTimeDescription && <span> · {review.relativePublishTimeDescription}</span>}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="card-footer">
          <span className="verified-date">{restaurant.lastVerified ? text.verified(formatDate(restaurant.lastVerified, {
            day: 'numeric', month: 'short', year: 'numeric',
          }, text.locale)) : text.unverified}</span>
          <div className="card-links">
            {restaurant.menuUrl ? (
              <a href={restaurant.menuUrl} rel="noreferrer" target="_blank">{text.menu} <ArrowUpRight size={14} /></a>
            ) : null}
            {restaurant.websiteUrl && restaurant.websiteUrl !== restaurant.menuUrl
              ? <a href={restaurant.websiteUrl} rel="noreferrer" target="_blank">{text.website} <ArrowUpRight size={14} /></a>
              : null}
            {!restaurant.menuUrl && !restaurant.websiteUrl && (
              <span className="link-unavailable">{text.menuUnavailable}</span>
            )}
            <a href={getDirectionsUrl(restaurant, location)} rel="noreferrer" target="_blank"><MapPin size={14} /> {text.directions}</a>
          </div>
        </div>
      </div>
    </article>
  );
}

function LunchRadar() {
  const [language, setLanguage] = useState('sv');
  const [maxWalkingTime, setMaxWalkingTime] = useState('10');
  const [maxPrice, setMaxPrice] = useState('');
  const [minimumGoogleRating, setMinimumGoogleRating] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [takeawayOnly, setTakeawayOnly] = useState(false);
  const [pickedId, setPickedId] = useState(null);
  const [highlightedRestaurantId, setHighlightedRestaurantId] = useState(null);
  const [selectedRadarRestaurantId, setSelectedRadarRestaurantId] = useState(null);
  const [lunchEatenDate, setLunchEatenDate] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [location, setLocation] = useState(officeCoordinates);
  const [restaurants, setRestaurants] = useState([]);
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [googleReviewLocation, setGoogleReviewLocation] = useState(null);
  const [googleReviewsStatus, setGoogleReviewsStatus] = useState(googlePlacesApiKey ? 'waiting' : 'unconfigured');
  const [locationStatus, setLocationStatus] = useState('locating');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const text = translations[language];
  const hasEatenLunchToday = lunchEatenDate === getLocalDateKey(currentTime);
  const hungerLevel = getHungerLevel(currentTime, hasEatenLunchToday);
  const isDangerous = hungerLevel === 100;
  const radarTime = currentTime.toLocaleTimeString(text.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    let ignore = false;
    let activeLocation = officeCoordinates;

    async function loadWeather(coordinates) {
      try {
        const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coordinates.latitude}&lon=${coordinates.longitude}`);
        if (!response.ok) throw new Error('Weather request failed');

        const payload = await response.json();
        const timeseries = payload.properties?.timeseries ?? [];
        const now = new Date();
        const currentEntry = timeseries.find((entry) => new Date(entry.time) >= now) ?? timeseries[0];

        if (!currentEntry?.data?.instant?.details) {
          throw new Error('No weather data available');
        }

        const hourlyForecast = [1, 2, 3].flatMap((hoursAhead) => {
          const targetTime = new Date(now);
          targetTime.setMinutes(0, 0, 0);
          targetTime.setHours(targetTime.getHours() + hoursAhead);

          const entry = timeseries.reduce((closest, candidate) => {
            const candidateTime = new Date(candidate.time);
            if (candidateTime < now || !candidate.data?.instant?.details) return closest;
            if (!closest || Math.abs(candidateTime - targetTime) < Math.abs(new Date(closest.time) - targetTime)) {
              return candidate;
            }
            return closest;
          }, null);

          if (!entry || Math.abs(new Date(entry.time) - targetTime) > 30 * 60 * 1000) return [];

          const symbolCode = entry.data.next_1_hours?.summary?.symbol_code
            ?? entry.data.next_6_hours?.summary?.symbol_code
            ?? entry.data.next_12_hours?.summary?.symbol_code
            ?? 'cloudy';

          return [{
            time: entry.time,
            temperature: Number(entry.data.instant.details.air_temperature ?? 0),
            symbolCode,
          }];
        });

        const details = currentEntry.data.instant.details;
        const temperature = Number(details.air_temperature ?? 0);
        const windSpeed = Number(details.wind_speed ?? 0);
        const symbolCode = currentEntry.data.next_1_hours?.summary?.symbol_code
          ?? currentEntry.data.next_6_hours?.summary?.symbol_code
          ?? currentEntry.data.next_12_hours?.summary?.symbol_code
          ?? 'cloudy';

        if (!ignore) {
          setWeather({
            temperature,
            windSpeed,
            symbolCode,
            hourlyForecast,
            updatedAt: currentEntry.time,
            isRainy: /rain|shower|snow|sleet|thunder|fog/.test(String(symbolCode)),
          });
          setWeatherError(false);
        }
      } catch (error) {
        if (!ignore) {
          setWeatherError(true);
        }
      }
    }

    async function loadNearbyRestaurants(coordinates) {
      try {
        const nearbyRestaurants = await findNearbyRestaurants(coordinates);
        if (ignore) return;
        setRestaurants(nearbyRestaurants);
        setLocationStatus(nearbyRestaurants.length ? 'current' : 'noNearbyRestaurants');
      } catch (error) {
        if (!ignore) {
          setRestaurants([]);
          setLocationStatus('restaurantsUnavailable');
        }
      }
    }

    function useOfficeLocation() {
      if (ignore) return;
      activeLocation = officeCoordinates;
      setLocation(officeCoordinates);
      setGoogleReviewLocation(officeCoordinates);
      setRestaurants(restaurantData.restaurants);
      setLocationStatus('officeFallback');
      loadWeather(activeLocation);
    }

    function useCurrentLocation(position) {
      if (ignore) return;
      activeLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(activeLocation);
      setGoogleReviewLocation(activeLocation);
      setLocationStatus('loadingRestaurants');
      loadWeather(activeLocation);
      loadNearbyRestaurants(activeLocation);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        useCurrentLocation,
        useOfficeLocation,
        { maximumAge: 5 * 60 * 1000, timeout: 10_000 },
      );
    } else {
      useOfficeLocation();
    }

    const timer = window.setInterval(() => loadWeather(activeLocation), 10 * 60 * 1000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!googlePlacesApiKey || !googleReviewLocation) return undefined;

    let ignore = false;
    setGooglePlaces([]);
    setGoogleReviewsStatus('loading');
    fetchNearbyGooglePlaces(googleReviewLocation, googlePlacesApiKey)
      .then((places) => {
        if (ignore) return;
        setGooglePlaces(places);
        setGoogleReviewsStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Google Places reviews could not be loaded.', error);
        setGooglePlaces([]);
        setGoogleReviewsStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [googleReviewLocation]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = text.locale;
    document.title = text.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
  }, [text]);

  const pickAnnouncement = useMemo(() => {
    const choice = restaurants.find((restaurant) => restaurant.id === pickedId);
    if (!choice) return '';

    const details = [
      choice.typicalLunchPriceSek == null ? null : `~${choice.typicalLunchPriceSek} kr`,
      choice.walkingTimeMinutes == null ? null : text.walkingMinutes(choice.walkingTimeMinutes),
    ].filter(Boolean).join(text.pickConjunction);

    return text.announcement(getRestaurantName(choice, text), details);
  }, [pickedId, restaurants, text]);

  const restaurantsWithGooglePlaces = useMemo(
    () => restaurants.map((restaurant) => {
      const googlePlace = matchGooglePlace(restaurant, googlePlaces);
      const googleCuisine = getGoogleCuisine(googlePlace);
      const photo = googlePlace?.photos?.[0];
      return {
        ...restaurant,
        cuisine: restaurant.cuisine.length ? restaurant.cuisine : googleCuisine ? [googleCuisine] : restaurant.cuisine,
        websiteUrl: restaurant.websiteUrl ?? googlePlace?.websiteUri,
        googlePlace,
        googlePhotoAttributions: photo?.authorAttributions ?? [],
        imageUrl: photo?.uri
          ? photo.uri
          : restaurant.imageUrl,
      };
    }),
    [googlePlaces, restaurants],
  );

  const cuisines = useMemo(
    () => [...new Set(restaurantsWithGooglePlaces.flatMap((restaurant) => restaurant.cuisine))].sort(),
    [restaurantsWithGooglePlaces],
  );

  const latestVerifiedDate = useMemo(
    () => restaurants
      .map((restaurant) => restaurant.lastVerified)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
    [restaurants],
  );

  const filteredRestaurants = useMemo(() => {
    return restaurantsWithGooglePlaces
      .filter((restaurant) => {
        const matchesWalkingTime = !maxWalkingTime
          || (restaurant.walkingTimeMinutes != null && restaurant.walkingTimeMinutes <= Number(maxWalkingTime));
        const matchesPrice = !maxPrice
          || (restaurant.typicalLunchPriceSek != null && restaurant.typicalLunchPriceSek <= Number(maxPrice));
        const matchesCuisine = !cuisine || restaurant.cuisine.includes(cuisine);
        const matchesVegetarian = !vegetarianOnly || restaurant.vegetarian === true;
        const matchesVegan = !veganOnly || restaurant.vegan === true;
        const matchesTakeaway = !takeawayOnly || restaurant.takeaway === true;
        const matchesGoogleRating = !minimumGoogleRating
          || (restaurant.googlePlace?.rating != null
            && restaurant.googlePlace.rating >= Number(minimumGoogleRating));

        return matchesWalkingTime && matchesPrice && matchesCuisine
          && matchesVegetarian && matchesVegan && matchesTakeaway && matchesGoogleRating;
      })
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }, [cuisine, maxPrice, maxWalkingTime, minimumGoogleRating, restaurantsWithGooglePlaces, takeawayOnly, veganOnly, vegetarianOnly]);

  const hasFilters = Boolean(
    maxWalkingTime || maxPrice || minimumGoogleRating || cuisine || vegetarianOnly || veganOnly || takeawayOnly,
  );

  function clearFilters() {
    setMaxWalkingTime('');
    setMaxPrice('');
    setMinimumGoogleRating('');
    setCuisine('');
    setVegetarianOnly(false);
    setVeganOnly(false);
    setTakeawayOnly(false);
    setPickedId(null);
    setSelectedRadarRestaurantId(null);
  }

  useEffect(() => {
    if (!filteredRestaurants.some((restaurant) => restaurant.id === selectedRadarRestaurantId)) {
      setSelectedRadarRestaurantId(null);
    }
  }, [filteredRestaurants, selectedRadarRestaurantId]);

  function pickLunch() {
    if (!filteredRestaurants.length) return;
    const choice = filteredRestaurants[Math.floor(Math.random() * filteredRestaurants.length)];
    setPickedId(choice.id);
    requestAnimationFrame(() => {
      document.getElementById(`restaurant-${choice.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-lockup">
            <a aria-label={text.brandLabel} className="brand-logo-link" href="#top">
              <img alt="OmniProcess" className="brand-logo" src={omniProcessLogo} />
            </a>
            <span className="brand-product">{text.productName}</span>
          </div>
        </div>
      </header>

      <section className="intro" id="top">
        <div className="hero-inner">
          <div className="hero-copy-column">
            <div className="intro-copy">
              <span className="eyebrow"><MapPin size={15} /> {text.heroEyebrow}</span>
              <h1>{text.heroTitlePrefix}<span className="hero-title-highlight">{text.heroTitleHighlight}</span>{text.heroTitleSuffix}</h1>
              <div className="language-toolbar">
                <div aria-label={text.languageLabel} className="language-toggle" role="group">
                  <button aria-pressed={language === 'sv'} onClick={() => setLanguage('sv')} type="button">Svenska</button>
                  <button aria-pressed={language === 'en'} onClick={() => setLanguage('en')} type="button">English</button>
                </div>
              </div>
              <h2>{text.heroSubtitle}</h2>
              <p>{text.heroDescription}</p>
              <p aria-live="polite" className="location-status">{text.locationStatus[locationStatus]}</p>
            </div>
            <div className="hero-action">
              <div className="hunger-meter-row">
                <div className={`hunger-meter${isDangerous ? ' is-danger' : ''}`}>
                  <div className="hunger-meter-heading">
                    <span><Gauge aria-hidden="true" size={18} /> {text.hungerLabel}</span>
                    <strong>{hungerLevel}%</strong>
                  </div>
                  <div
                    aria-label={text.hungerLabel}
                    aria-valuemax="100"
                    aria-valuemin="0"
                    aria-valuenow={hungerLevel}
                    aria-valuetext={text.hungerValue(hungerLevel)}
                    className="hunger-meter-track"
                    role="progressbar"
                  >
                    <span style={{ width: `${hungerLevel}%` }} />
                  </div>
                  <p aria-live="polite">{hasEatenLunchToday
                    ? text.lunchEatenStatus
                    : isDangerous ? text.dangerMessage : text.hungerStatus(hungerLevel)}</p>
                </div>
                <button
                  aria-pressed={hasEatenLunchToday}
                  className="lunch-eaten-button"
                  onClick={() => setLunchEatenDate(getLocalDateKey(currentTime))}
                  type="button"
                >
                  <Check aria-hidden="true" size={15} />
                  {text.lunchEatenButton}
                </button>
              </div>
              <div className="hero-walk-time">
                <Clock3 size={21} />
                <span><strong>10 {text.minutes}</strong><span>{text.maxWalkShort}</span></span>
              </div>
              <button
                className="pick-button hero-pick-button"
                disabled={!filteredRestaurants.length}
                onClick={pickLunch}
                type="button"
              >
                <Sparkles size={18} /> {text.pickLunch} <ArrowUpRight size={17} />
              </button>
              <span className="hero-pick-note">{text.matchingRestaurants(filteredRestaurants.length)}</span>
            </div>
          </div>
          <aside aria-label={text.radarTitle} className="live-radar">
            <div className="radar-header">
              <div>
                <span className="radar-kicker">{text.radarSystem}</span>
                <h2>{text.radarTitle}</h2>
              </div>
              <span className="radar-live"><span /> {text.radarLive}</span>
            </div>
            <div aria-label={text.radarContactsLabel} className="radar-screen">
              <div className="radar-sweep" />
              <span className="radar-crosshair radar-crosshair-horizontal" />
              <span className="radar-crosshair radar-crosshair-vertical" />
              {filteredRestaurants.map((restaurant) => (
                <button
                  aria-label={text.radarRestaurantLabel(getRestaurantName(restaurant, text))}
                  aria-pressed={selectedRadarRestaurantId === restaurant.id}
                  className={`radar-contact${highlightedRestaurantId === restaurant.id
                    || selectedRadarRestaurantId === restaurant.id ? ' is-highlighted' : ''}`}
                  key={restaurant.id}
                  onClick={() => {
                    const selectedId = selectedRadarRestaurantId === restaurant.id ? null : restaurant.id;
                    setSelectedRadarRestaurantId(selectedId);
                    setHighlightedRestaurantId(selectedId);
                  }}
                  onFocus={() => setHighlightedRestaurantId(restaurant.id)}
                  onMouseEnter={() => setHighlightedRestaurantId(restaurant.id)}
                  onMouseLeave={() => setHighlightedRestaurantId(selectedRadarRestaurantId)}
                  style={getRadarPosition(restaurant, location)}
                  title={getRestaurantName(restaurant, text)}
                  type="button"
                />
              ))}
              <span className="radar-origin" />
            </div>
            <div className="radar-footer">
              <span>{text.radarCount(filteredRestaurants.length)}</span>
              <span>{text.radarUpdated} {radarTime}</span>
            </div>

            <div className="weather-panel" aria-live="polite">
              <div className="weather-header">
                <span className="weather-kicker">{text.weatherTitle}</span>
                <span className="weather-refresh">{weather ? new Date(weather.updatedAt).toLocaleTimeString(text.locale, { hour: '2-digit', minute: '2-digit' }) : text.weatherLoading}</span>
              </div>

              {weatherError ? (
                <div className="weather-empty">{text.weatherUnavailable}</div>
              ) : weather ? (
                <>
                  <div className="weather-main">
                    <div className="weather-icon">{getWeatherIcon(weather.symbolCode, 22)}</div>
                    <div className="weather-reading">
                      <strong>{Math.round(weather.temperature)}°C</strong>
                      <span>{getWeatherStatusText(weather.symbolCode, text)}</span>
                    </div>
                  </div>
                  <div className="weather-meta">
                    <span><Wind size={14} /> {weather.windSpeed.toFixed(1)} m/s</span>
                    <span className={`weather-status ${weather.temperature >= 5 && weather.temperature <= 25 && !weather.isRainy && weather.windSpeed <= 10 ? 'is-good' : 'is-bad'}`}>
                      {weather.temperature >= 5 && weather.temperature <= 25 && !weather.isRainy && weather.windSpeed <= 10 ? text.weatherGood : text.weatherBad}
                    </span>
                  </div>
                  {weather.hourlyForecast.length > 0 && (
                    <div className="weather-forecast">
                      <div className="weather-forecast-title">{text.weatherForecastTitle}</div>
                      <div className="weather-forecast-hours">
                        {weather.hourlyForecast.map((forecast) => (
                          <div className="weather-forecast-hour" key={forecast.time}>
                            <span>{new Date(forecast.time).toLocaleTimeString(text.locale, { hour: '2-digit' })}</span>
                            {getWeatherIcon(forecast.symbolCode, 17)}
                            <strong>{Math.round(forecast.temperature)}°</strong>
                            <span>{getWeatherStatusText(forecast.symbolCode, text)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="weather-empty">{text.weatherLoading}</div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section aria-label={text.filterLabel} className="filter-panel">
        <div className="filter-toolbar">
          <div aria-label={text.maxWalk} className="walking-control" role="group">
            <span className="filter-label"><Clock3 size={16} /> {text.maxWalk}</span>
            <div className="segmented-control">
              {['', '5', '10'].map((value) => (
                <button
                  aria-pressed={maxWalkingTime === value}
                  className={maxWalkingTime === value ? 'is-selected' : ''}
                  key={value || 'any'}
                  onClick={() => setMaxWalkingTime(value)}
                  type="button"
                >
                  {value ? `${value} ${text.minutes}` : text.any}
                </button>
              ))}
            </div>
          </div>
          <div className="dietary-controls" aria-label={text.dietaryLabel}>
            <DietFilter checked={vegetarianOnly} icon={Leaf} label={text.vegetarian} onChange={(event) => setVegetarianOnly(event.target.checked)} />
            <DietFilter checked={veganOnly} icon={Vegan} label={text.vegan} onChange={(event) => setVeganOnly(event.target.checked)} />
            <DietFilter checked={takeawayOnly} icon={Check} label={text.takeaway} onChange={(event) => setTakeawayOnly(event.target.checked)} />
          </div>

          <label className="select-control">
            <span className="filter-label">{text.cuisine}</span>
            <span className="select-wrap">
              <select onChange={(event) => setCuisine(event.target.value)} value={cuisine}>
                <option value="">{text.allCuisines}</option>
                {cuisines.map((item) => <option key={item} value={item}>{getCuisineName(item, text)}</option>)}
              </select>
              <ChevronDown aria-hidden="true" size={14} />
            </span>
          </label>
          <label className="select-control">
            <span className="filter-label">{text.maxPrice}</span>
            <span className="select-wrap">
              <select onChange={(event) => setMaxPrice(event.target.value)} value={maxPrice}>
                <option value="">{text.allPrices}</option>
                {priceOptions.filter(Boolean).map((price) => (
                  <option key={price} value={price}>{text.upTo(price)}</option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={14} />
            </span>
          </label>
          <label className="select-control">
            <span className="filter-label">{text.googleRating}</span>
            <span className="select-wrap">
              <select onChange={(event) => setMinimumGoogleRating(event.target.value)} value={minimumGoogleRating}>
                <option value="">{text.allGoogleRatings}</option>
                {[3, 3.5, 4, 4.5].map((rating) => (
                  <option key={rating} value={rating}>{text.minimumGoogleRating(rating)}</option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={14} />
            </span>
          </label>
        </div>
        {googleReviewsStatus !== 'ready' && googleReviewsStatus !== 'waiting' && (
          <p aria-live="polite" className="google-reviews-status">
            {googleReviewsStatus === 'loading'
              ? text.googleReviewsLoading
              : googleReviewsStatus === 'error'
                ? text.googleReviewsUnavailable
                : text.googleReviewsNotConfigured}
          </p>
        )}
      </section>

      <div className="lunch-results-layout">
        <section aria-labelledby="restaurants-heading" className="results-section">
          <div className="results-heading-row">
            <div className="results-title-group">
              <div className="section-index">01 <span /></div>
              <h2 id="restaurants-heading">{text.restaurants}</h2>
              <p aria-live="polite" className="result-count">
                <span>{String(filteredRestaurants.length).padStart(2, '0')}</span>
                {text.restaurantCount(filteredRestaurants.length)}
              </p>
            </div>
            <div className="results-actions">
              {hasFilters && (
                <button className="clear-filters" onClick={clearFilters} type="button">{text.clearFilters}</button>
              )}
            </div>
          </div>

          <p className="results-meta">
            <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">{text.restaurantSource}</a>
            <span /> {latestVerifiedDate
              ? `${text.lastVerified} ${formatDate(latestVerifiedDate, { day: 'numeric', month: 'long', year: 'numeric' }, text.locale)}`
              : text.noVerifiedInfo}
          </p>

          <p aria-live="polite" className="sr-only">{pickAnnouncement}</p>

          {filteredRestaurants.length ? (
            <div className="restaurant-grid">
              {filteredRestaurants.map((restaurant) => (
                <div id={`restaurant-${restaurant.id}`} key={restaurant.id}>
                  <RestaurantCard
                    highlighted={highlightedRestaurantId === restaurant.id
                      || selectedRadarRestaurantId === restaurant.id}
                    location={location}
                    onHighlightChange={setHighlightedRestaurantId}
                    picked={pickedId === restaurant.id}
                    restaurant={restaurant}
                    text={text}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon"><Utensils size={22} /></span>
              <h3>{locationStatus === 'locating' || locationStatus === 'loadingRestaurants'
                ? text.locationLoading
                : locationStatus === 'noNearbyRestaurants'
                  ? text.noNearbyRestaurants
                  : locationStatus === 'restaurantsUnavailable'
                    ? text.restaurantsUnavailable
                    : text.noMatches}</h3>
              <p>{locationStatus === 'locating' || locationStatus === 'loadingRestaurants'
                ? text.locationPermissionHint
                : locationStatus === 'noNearbyRestaurants' || locationStatus === 'restaurantsUnavailable'
                  ? text.nearbyRestaurantsHint
                  : text.adjustFilters}</p>
              {hasFilters && <button className="clear-filters" onClick={clearFilters} type="button">{text.clearAllFilters}</button>}
            </div>
          )}
        </section>
        <RestaurantMap
          highlightedRestaurantId={highlightedRestaurantId}
          language={language}
          location={location}
          locationStatus={locationStatus}
          onHighlightChange={setHighlightedRestaurantId}
          focusRestaurantId={selectedRadarRestaurantId}
          restaurants={filteredRestaurants}
        />
      </div>

      <footer className="page-footer">
        <a aria-label={text.brandLabel} href="#top">OmniProcess</a>
        <span>{text.footer}</span>
        <span>{text.productName} <ArrowUpRight size={13} /></span>
      </footer>
    </main>
  );
}

export default LunchRadar;