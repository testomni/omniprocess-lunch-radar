import assert from 'node:assert/strict';
import test from 'node:test';
import { getLunchWeatherAdvice } from '../src/weather.js';

test('only recommends an umbrella when precipitation is forecast', () => {
  assert.equal(getLunchWeatherAdvice('cloudy', 14, 2), 'good');
  assert.equal(getLunchWeatherAdvice('rainshowers_day', 14, 2), 'umbrella');
  assert.equal(getLunchWeatherAdvice('snow', 1, 2), 'umbrella');
});

test('describes cold or windy weather without suggesting an umbrella', () => {
  assert.equal(getLunchWeatherAdvice('cloudy', 2, 2), 'notIdeal');
  assert.equal(getLunchWeatherAdvice('partlycloudy_day', 16, 12), 'notIdeal');
  assert.equal(getLunchWeatherAdvice('fog', 16, 2), 'notIdeal');
});
