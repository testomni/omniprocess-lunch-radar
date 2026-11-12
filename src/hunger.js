export function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getHungerPhase(date, lunchEatenToday = false) {
  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();
  if (minutesSinceMidnight >= 16 * 60) return 'afterLunch';
  if (lunchEatenToday) return 'lunchDone';
  if (minutesSinceMidnight < 7 * 60) return 'beforeStart';
  return 'active';
}

export function getHungerLevel(date, lunchEatenToday = false) {
  if (getHungerPhase(date, lunchEatenToday) !== 'active') return 0;
  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();
  const rampStart = 7 * 60;
  const fullHunger = 13 * 60;
  return Math.min(100, Math.max(0, Math.round(
    ((minutesSinceMidnight - rampStart) / (fullHunger - rampStart)) * 100,
  )));
}
