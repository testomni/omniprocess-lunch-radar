const osrmTableEndpoint = 'https://router.project-osrm.org/table/v1/driving';
const destinationsPerRequest = 24;
const minimumRequestIntervalMs = 1000;
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

function waitForRequestSlot(signal) {
  const slot = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    nextRequestAt = Date.now() + minimumRequestIntervalMs;
  });
  requestQueue = slot.catch(() => {});
  return slot;
}

export async function fetchDrivingTimes(origin, restaurants, { signal, onProgress } = {}) {
  if (!restaurants.length) return [];

  const times = [];
  for (let start = 0; start < restaurants.length; start += destinationsPerRequest) {
    const destinations = restaurants.slice(start, start + destinationsPerRequest);
    const coordinates = [
      `${origin.longitude},${origin.latitude}`,
      ...destinations.map(({ longitude, latitude }) => `${longitude},${latitude}`),
    ];
    const url = new URL(`${osrmTableEndpoint}/${coordinates.join(';')}`);
    url.searchParams.set('sources', '0');
    url.searchParams.set(
      'destinations',
      destinations.map((_, index) => String(index + 1)).join(';'),
    );
    url.searchParams.set('annotations', 'duration');
    url.searchParams.set('skip_waypoints', 'true');

    await waitForRequestSlot(signal);
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`OSRM driving-time request failed with status ${response.status}.`);
    }
    const result = await response.json();
    const durations = result.code === 'Ok' ? result.durations?.[0] : null;
    if (!durations || durations.length !== destinations.length) {
      throw new Error('OSRM returned an incomplete driving-time matrix.');
    }

    times.push(...durations.map((seconds) => (
      Number.isFinite(seconds) ? Math.ceil(seconds / 60) : null
    )));
    onProgress?.(times.slice(), { completed: times.length, total: restaurants.length });
  }

  return times;
}

export function isWithinDrivingTimeLimit(minutes) {
  return Number.isFinite(minutes) && minutes <= 10;
}
