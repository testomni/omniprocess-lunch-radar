import assert from 'node:assert/strict';
import test from 'node:test';
import { getLunchWeatherAdvice } from '../src/weather.js';

test('gives condition-specific advice for rain, sleet, snow, and thunderstorms', () => {
  assert.equal(getLunchWeatherAdvice('rainshowers_day', 14, 2), 'rain');
  assert.equal(getLunchWeatherAdvice('sleet', 1, 2), 'sleet');
  assert.equal(getLunchWeatherAdvice('snow', 1, 2), 'snow');
  assert.equal(getLunchWeatherAdvice('heavyrainandthunder', 14, 2), 'thunder');
});

test('gives specific advice for fog, cold, heat, and strong winds', () => {
  assert.equal(getLunchWeatherAdvice('fog', 16, 2), 'fog');
  assert.equal(getLunchWeatherAdvice('cloudy', 2, 2), 'cold');
  assert.equal(getLunchWeatherAdvice('clearsky_day', 28, 2), 'hot');
  assert.equal(getLunchWeatherAdvice('partlycloudy_day', 16, 12), 'windy');
});

test('describes suitable sunny and cloudy lunch-walk weather', () => {
  assert.equal(getLunchWeatherAdvice('clearsky_day', 18, 2), 'sunny');
  assert.equal(getLunchWeatherAdvice('cloudy', 14, 2), 'cloudy');
});
