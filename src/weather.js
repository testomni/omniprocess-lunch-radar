export function getLunchWeatherAdvice(symbolCode, temperature, windSpeed) {
  const conditions = String(symbolCode ?? '').toLowerCase();
  if (/rain|sleet|snow|thunder/.test(conditions)) return 'umbrella';
  if (/fog/.test(conditions) || temperature < 5 || temperature > 25 || windSpeed > 10) {
    return 'notIdeal';
  }
  return 'good';
}
