import { useEffect, useMemo } from 'react';
import { divIcon, latLngBounds } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { officeCoordinates } from './config.js';
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

function MapBounds({ restaurants }) {
  const map = useMap();

  useEffect(() => {
    if (!restaurants.length) return;

    const bounds = latLngBounds([
      [officeCoordinates.latitude, officeCoordinates.longitude],
      ...restaurants.map((restaurant) => [restaurant.latitude, restaurant.longitude]),
    ]);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
  }, [map, restaurants]);

  return null;
}

function getDirectionsUrl(restaurant) {
  if (restaurant.directionsUrl) return restaurant.directionsUrl;

  const route = [
    `${officeCoordinates.latitude},${officeCoordinates.longitude}`,
    `${restaurant.latitude},${restaurant.longitude}`,
  ].join(';');

  return `https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=${encodeURIComponent(route)}`;
}

function RestaurantMap({
  highlightedRestaurantId,
  language,
  onHighlightChange,
  restaurants,
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
            : text.noCoordinates}
        </span>
      </div>

      <div className="map-frame">
        <MapContainer
          aria-label={text.ariaLabel}
          center={[officeCoordinates.latitude, officeCoordinates.longitude]}
          scrollWheelZoom={false}
          zoom={15}
        >
          <TileLayer
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
          />
          <MapBounds restaurants={mappedRestaurants} />
          <Marker
            icon={officeMarkerIcon}
            position={[officeCoordinates.latitude, officeCoordinates.longitude]}
            title={`${text.officeTitle}, ${text.approximate.toLowerCase()}`}
          >
            <Popup>
              <div className="map-popup">
                <strong>{text.officeTitle}</strong>
                <span>{text.approximate}</span>
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
              icon={highlightedRestaurantId === restaurant.id
                ? highlightedRestaurantMarkerIcon
                : restaurantMarkerIcon}
              key={restaurant.id}
              position={[restaurant.latitude, restaurant.longitude]}
              title={restaurant.name}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{getRestaurantName(restaurant, translations[language])}</strong>
                  <span>{restaurant.walkingTimeMinutes == null
                    ? text.walkingUnknown
                    : text.walkingMinutes(restaurant.walkingTimeMinutes)}</span>
                  <a href={getDirectionsUrl(restaurant)} rel="noreferrer" target="_blank">
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