export function getLunchWeatherAdvice(symbolCode, temperature, windSpeed) {
  const conditions = String(symbolCode ?? '').toLowerCase();
  if (conditions.includes('thunder')) return 'thunder';
  if (conditions.includes('snow')) return 'snow';
  if (conditions.includes('sleet')) return 'sleet';
  if (/rain|shower|drizzle/.test(conditions)) return 'rain';
  if (conditions.includes('fog')) return 'fog';
  if (temperature < 5) return 'cold';
  if (temperature > 25) return 'hot';
  if (windSpeed > 10) return 'windy';
  if (/clearsky|fair/.test(conditions)) return 'sunny';
  return 'cloudy';
}
