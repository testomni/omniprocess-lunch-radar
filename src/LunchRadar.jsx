import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
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
  Search,
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

const priceOptions = ['', '100', '125', '150', '175', '200', '250'];
const radarContactPositions = [
  [34, 29],
  [66, 38],
  [47, 57],
  [72, 70],
  [28, 73],
  [57, 21],
];

function formatDate(value, options, locale) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, options);
}

function getHungerLevel(date) {
  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();
  const rampStart = 8 * 60;
  const fullHunger = 12 * 60 + 45;
  return Math.min(100, Math.max(0, Math.round(
    ((minutesSinceMidnight - rampStart) / (fullHunger - rampStart)) * 100,
  )));
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

const latestVerifiedDate = restaurantData.restaurants
  .map((restaurant) => restaurant.lastVerified)
  .filter(Boolean)
  .sort()
  .at(-1) ?? null;

function DietFilter({ checked, label, onChange, icon: Icon }) {
  return (
    <label className={`diet-filter${checked ? ' is-active' : ''}`}>
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span className="diet-icon"><Icon size={15} strokeWidth={2} /></span>
      <span>{label}</span>
    </label>
  );
}

function RestaurantCard({ restaurant, picked, highlighted, onHighlightChange, text }) {
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
        <p className="price-note">{/^Placeholder address \d+$/.test(restaurant.address) ? text.unavailableAddress : restaurant.address}</p>

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

        <div className="card-footer">
          <span className="verified-date">{restaurant.lastVerified ? text.verified(formatDate(restaurant.lastVerified, {
            day: 'numeric', month: 'short', year: 'numeric',
          }, text.locale)) : text.unverified}</span>
          <div className="card-links">
            {restaurant.menuUrl ? (
              <a href={restaurant.menuUrl} rel="noreferrer" target="_blank">{text.menu} <ArrowUpRight size={14} /></a>
            ) : <span className="link-unavailable">{text.menuUnavailable}</span>}
            {restaurant.directionsUrl ? (
              <a href={restaurant.directionsUrl} rel="noreferrer" target="_blank"><MapPin size={14} /> {text.directions}</a>
            ) : <span className="link-unavailable">{text.directionsUnavailable}</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

function LunchRadar() {
  const [language, setLanguage] = useState('sv');
  const [query, setQuery] = useState('');
  const [maxWalkingTime, setMaxWalkingTime] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [takeawayOnly, setTakeawayOnly] = useState(false);
  const [pickedId, setPickedId] = useState(null);
  const [highlightedRestaurantId, setHighlightedRestaurantId] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const text = translations[language];
  const hungerLevel = getHungerLevel(currentTime);
  const isDangerous = currentTime.getHours() >= 13;
  const radarTime = currentTime.toLocaleTimeString(text.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    let ignore = false;

    async function loadWeather() {
      try {
        const response = await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.35&lon=17.94');
        if (!response.ok) throw new Error('Weather request failed');

        const payload = await response.json();
        const timeseries = payload.properties?.timeseries ?? [];
        const currentEntry = timeseries.find((entry) => new Date(entry.time) >= new Date()) ?? timeseries[0];

        if (!currentEntry?.data?.instant?.details) {
          throw new Error('No weather data available');
        }

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
            updatedAt: currentEntry.time,
            isRainy: /rain|shower|snow|sleet|thunder|fog/.test(String(symbolCode)),
          });
          setWeatherError('');
        }
      } catch (error) {
        if (!ignore) {
          setWeatherError(text.weatherUnavailable);
        }
      }
    }

    loadWeather();
    const timer = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [text.weatherUnavailable]);

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
    const choice = restaurantData.restaurants.find((restaurant) => restaurant.id === pickedId);
    if (!choice) return '';

    const details = [
      choice.typicalLunchPriceSek == null ? null : `~${choice.typicalLunchPriceSek} kr`,
      choice.walkingTimeMinutes == null ? null : text.walkingMinutes(choice.walkingTimeMinutes),
    ].filter(Boolean).join(text.pickConjunction);

    return text.announcement(getRestaurantName(choice, text), details);
  }, [pickedId, text]);

  const cuisines = useMemo(
    () => [...new Set(restaurantData.restaurants.flatMap((restaurant) => restaurant.cuisine))].sort(),
    [],
  );

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return restaurantData.restaurants
      .filter((restaurant) => {
        const cuisineText = restaurant.cuisine.join(' ');
        const localizedCuisine = restaurant.cuisine
          .map((item) => getCuisineName(item, text))
          .join(' ');
        const localizedName = getRestaurantName(restaurant, text);
        const matchesQuery = !normalizedQuery
          || `${restaurant.name} ${localizedName} ${cuisineText} ${localizedCuisine}`.toLowerCase().includes(normalizedQuery);
        const matchesWalkingTime = !maxWalkingTime
          || (restaurant.walkingTimeMinutes != null && restaurant.walkingTimeMinutes <= Number(maxWalkingTime));
        const matchesPrice = !maxPrice
          || (restaurant.typicalLunchPriceSek != null && restaurant.typicalLunchPriceSek <= Number(maxPrice));
        const matchesCuisine = !cuisine || restaurant.cuisine.includes(cuisine);
        const matchesVegetarian = !vegetarianOnly || restaurant.vegetarian === true;
        const matchesVegan = !veganOnly || restaurant.vegan === true;
        const matchesTakeaway = !takeawayOnly || restaurant.takeaway === true;

        return matchesQuery && matchesWalkingTime && matchesPrice && matchesCuisine
          && matchesVegetarian && matchesVegan && matchesTakeaway;
      })
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }, [cuisine, language, maxPrice, maxWalkingTime, query, takeawayOnly, veganOnly, vegetarianOnly]);

  const hasFilters = Boolean(
    query || maxWalkingTime || maxPrice || cuisine || vegetarianOnly || veganOnly || takeawayOnly,
  );

  function clearFilters() {
    setQuery('');
    setMaxWalkingTime('');
    setMaxPrice('');
    setCuisine('');
    setVegetarianOnly(false);
    setVeganOnly(false);
    setTakeawayOnly(false);
    setPickedId(null);
  }

  function pickLunch() {
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
            </div>
            <div className="hero-action">
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
                <p aria-live="polite">{isDangerous ? text.dangerMessage : text.hungerStatus(hungerLevel)}</p>
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
            <div aria-label={text.instrumentationLabel} className="instrument-strip" role="group">
              <div className="instrument-unit"><Activity aria-hidden="true" size={15} /><span>{text.flowMeasurement}</span></div>
              <div className="instrument-unit"><Wind aria-hidden="true" size={15} /><span>{text.gasAnalysis}</span></div>
              <div className="instrument-unit"><Gauge aria-hidden="true" size={15} /><span>{text.pressureMeasurement}</span></div>
            </div>
            <div aria-hidden="true" className="radar-screen">
              <div className="radar-sweep" />
              <span className="radar-crosshair radar-crosshair-horizontal" />
              <span className="radar-crosshair radar-crosshair-vertical" />
              {filteredRestaurants.slice(0, radarContactPositions.length).map((restaurant, index) => (
                <span
                  className={`radar-contact radar-contact-${index + 1}`}
                  key={restaurant.id}
                  style={{
                    left: `${radarContactPositions[index][0]}%`,
                    top: `${radarContactPositions[index][1]}%`,
                  }}
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
                <div className="weather-empty">{weatherError}</div>
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
                </>
              ) : (
                <div className="weather-empty">{text.weatherLoading}</div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section aria-label={text.filterLabel} className="filter-panel">
        <div className="filter-top-row">
          <label className="search-box">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">{text.searchLabel}</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.searchLabel}
              type="search"
              value={query}
            />
            {query && (
              <button aria-label={text.clearSearch} className="clear-search" onClick={() => setQuery('')} type="button">
                ×
              </button>
            )}
          </label>

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
        </div>

        <div className="filter-bottom-row">
          <div className="dietary-controls" aria-label={text.dietaryLabel}>
            <DietFilter checked={vegetarianOnly} icon={Leaf} label={text.vegetarian} onChange={(event) => setVegetarianOnly(event.target.checked)} />
            <DietFilter checked={veganOnly} icon={Vegan} label={text.vegan} onChange={(event) => setVeganOnly(event.target.checked)} />
            <DietFilter checked={takeawayOnly} icon={Check} label={text.takeaway} onChange={(event) => setTakeawayOnly(event.target.checked)} />
          </div>

          <div className="select-controls">
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
          </div>
        </div>
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
                    highlighted={highlightedRestaurantId === restaurant.id}
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
              <span className="empty-icon"><Search size={22} /></span>
              <h3>{text.noMatches}</h3>
              <p>{text.adjustFilters}</p>
              <button className="clear-filters" onClick={clearFilters} type="button">{text.clearAllFilters}</button>
            </div>
          )}
        </section>
        <RestaurantMap
          highlightedRestaurantId={highlightedRestaurantId}
          language={language}
          onHighlightChange={setHighlightedRestaurantId}
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