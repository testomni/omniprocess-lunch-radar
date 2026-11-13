import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchDrivingTimes, isWithinDrivingTimeLimit } from '../src/routing.js';

test('gets free OSRM driving times and preserves routes that cannot be found', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({ code: 'Ok', durations: [[60.1, null, 600]] }),
    };
  };

  try {
    const times = await fetchDrivingTimes(
      { latitude: 59.35, longitude: 18.06 },
      [
        { latitude: 59.351, longitude: 18.061 },
        { latitude: 59.352, longitude: 18.062 },
        { latitude: 59.353, longitude: 18.063 },
      ],
    );

    assert.deepEqual(times, [2, null, 10]);
    assert.equal(requestUrl.hostname, 'router.project-osrm.org');
    assert.equal(requestUrl.searchParams.get('sources'), '0');
    assert.equal(requestUrl.searchParams.get('destinations'), '1;2;3');
    assert.equal(isWithinDrivingTimeLimit(10), true);
    assert.equal(isWithinDrivingTimeLimit(11), false);
    assert.equal(isWithinDrivingTimeLimit(null), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports unsuccessful OSRM requests rather than returning an empty route list', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 429 });

  try {
    await assert.rejects(
      fetchDrivingTimes(
        { latitude: 59.35, longitude: 18.06 },
        [{ latitude: 59.351, longitude: 18.061 }],
      ),
      /OSRM driving-time request failed with status 429/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
