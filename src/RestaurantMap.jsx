import { useEffect, useMemo } from 'react';
import { divIcon, latLngBounds } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { getDirectionsUrl } from './location.js';
import { getRestaurantName, translations } from './translations.js';
import 'leaflet/dist/leaflet.css';

const officeMarkerIcon = divIcon({
  className: 'office-map-marker',
  html: '<span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const restaurantMarkerIcon = divIcon({
  className: 'restaurant-map-marker',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const highlightedRestaurantMarkerIcon = divIcon({
  className: 'restaurant-map-marker is-highlighted',
  html: '<span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

function hasCoordinates(restaurant) {
  return Number.isFinite(restaurant.latitude)
    && Number.isFinite(restaurant.longitude)
    && Math.abs(restaurant.latitude) <= 90
    && Math.abs(restaurant.longitude) <= 180;
}

function MapBounds({ location, restaurants }) {
  const map = useMap();

  useEffect(() => {
    if (!restaurants.length) {
      map.setView([location.latitude, location.longitude], 15);
      return;
    }

    const bounds = latLngBounds([
      [location.latitude, location.longitude],
      ...restaurants.map((restaurant) => [restaurant.latitude, restaurant.longitude]),
    ]);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
  }, [location.latitude, location.longitude, map, restaurants]);

  return null;
}

function MapFocus({ focusRestaurantId, restaurants }) {
  const map = useMap();

  useEffect(() => {
    const restaurant = restaurants.find((item) => item.id === focusRestaurantId);
    if (restaurant) map.flyTo([restaurant.latitude, restaurant.longitude], Math.max(map.getZoom(), 16));
  }, [focusRestaurantId, map, restaurants]);

  return null;
}

function RestaurantMap({
  focusRestaurantId,
  highlightedRestaurantId,
  language,
  location,
  locationStatus,
  onHighlightChange,
  restaurants,
  travelMode,
}) {
  const text = translations[language].map;
  const mappedRestaurants = useMemo(
    () => restaurants.filter(hasCoordinates),
    [restaurants],
  );

  return (
    <section aria-labelledby="map-heading" className="map-section">
      <div className="map-heading">
        <h2 id="map-heading">{text.title}</h2>
        <span aria-live="polite" className="map-status">
          {mappedRestaurants.length
            ? text.restaurantCount(mappedRestaurants.length)
            : restaurants.length
              ? text.noCoordinates
              : locationStatus === 'locating'
                || locationStatus === 'loadingRestaurants'
                || locationStatus === 'loadingDrivingRoutes'
                || locationStatus === 'calculatingDrivingTimes'
                  ? travelMode === 'drive' ? text.loadingDrivingRoutes : text.loadingRestaurants
                : locationStatus === 'restaurantsUnavailable'
                    || locationStatus === 'drivingUnavailable'
                  ? text.restaurantsUnavailable
                  : locationStatus === 'noNearbyRestaurants'
                    ? text.noNearbyRestaurants
                    : text.restaurantCount(0)}
        </span>
      </div>

      <div className="map-frame">
        <MapContainer
          aria-label={text.ariaLabel}
          center={[location.latitude, location.longitude]}
          scrollWheelZoom={false}
          zoom={15}
        >
          <TileLayer
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
          />
          <MapBounds location={location} restaurants={mappedRestaurants} />
          <MapFocus focusRestaurantId={focusRestaurantId} restaurants={mappedRestaurants} />
          <Marker
            icon={officeMarkerIcon}
            position={[location.latitude, location.longitude]}
            title={text.locationTitle}
          >
            <Popup>
              <div className="map-popup">
                <strong>{text.locationTitle}</strong>
                <span>{text.locationDescription}</span>
              </div>
            </Popup>
          </Marker>
          {mappedRestaurants.map((restaurant) => (
            <Marker
              eventHandlers={{
                blur: () => onHighlightChange(null),
                focus: () => onHighlightChange(restaurant.id),
                mouseout: () => onHighlightChange(null),
                mouseover: () => onHighlightChange(restaurant.id),
              }}
              icon={highlightedRestaurantId === restaurant.id || focusRestaurantId === restaurant.id
                ? highlightedRestaurantMarkerIcon
                : restaurantMarkerIcon}
              key={restaurant.id}
              position={[restaurant.latitude, restaurant.longitude]}
              title={restaurant.name}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{getRestaurantName(restaurant, translations[language])}</strong>
                  {restaurant.typicalLunchPriceSek != null && <span>~{restaurant.typicalLunchPriceSek} kr</span>}
                  <span>{travelMode === 'drive'
                    ? restaurant.drivingTimeMinutes == null
                      ? text.drivingUnknown
                      : text.drivingMinutes(restaurant.drivingTimeMinutes)
                    : restaurant.walkingTimeMinutes == null
                      ? text.walkingUnknown
                      : text.walkingMinutes(restaurant.walkingTimeMinutes)}</span>
                  <a href={getDirectionsUrl(restaurant, location, travelMode)} rel="noreferrer" target="_blank">
                    {text.directions}
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div aria-label={text.legendLabel} className="map-legend">
        <span><i className="legend-office" /> {text.officeLegend}</span>
        <span><i className="legend-restaurant" /> {text.restaurantsLegend}</span>
      </div>
    </section>
  );
}

export default RestaurantMap;