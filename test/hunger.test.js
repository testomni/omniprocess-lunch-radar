import assert from 'node:assert/strict';
import test from 'node:test';
import { getHungerLevel, getHungerPhase, getLocalDateKey } from '../src/hunger.js';

test('hunger starts at zero at midnight and remains zero until 07:00', () => {
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 0, 0)), 0);
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 6, 59)), 0);
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 7, 0)), 0);
});

test('hunger rises from 07:00 to 100 percent at 13:00', () => {
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 10, 0)), 50);
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 13, 0)), 100);
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 15, 59)), 100);
});

test('hunger resets at 16:00 and stays reset for the rest of the day', () => {
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 16, 0)), 0);
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 23, 59)), 0);
});

test('barometer phase text changes before opening, during lunch, and after 16:00', () => {
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 6, 59)), 'beforeStart');
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 7, 0)), 'active');
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 12, 0)), 'active');
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 16, 0)), 'afterLunch');
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 12, 0), true), 'lunchDone');
  assert.equal(getHungerPhase(new Date(2026, 10, 12, 16, 0), true), 'afterLunch');
});

test('recording lunch eaten resets hunger for that day', () => {
  assert.equal(getHungerLevel(new Date(2026, 10, 12, 12, 30), true), 0);
});

test('date key uses the local calendar date', () => {
  assert.equal(getLocalDateKey(new Date(2026, 10, 12, 23, 59)), '2026-11-12');
});
