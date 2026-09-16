import { format, addDays } from 'date-fns';

export interface WeatherCondition {
  temp: number;
  condition: string;
  humidity: number;
  isGoodForHarvest: boolean;
  message: string;
  icon: 'sun' | 'cloud' | 'rain' | 'cloud-rain';
  date: Date;
}

/**
 * Fetch 3-day weather forecast from Open-Meteo (Free tier, no API key required).
 * Uses geocoding API first to find coordinates.
 */
export async function getLiveWeatherForecast(locationName: string): Promise<WeatherCondition[]> {
  try {
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&format=json`);
    const geoData = await geoResponse.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('Location not found');
    }
    
    const { latitude, longitude } = geoData.results[0];
    
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max&timezone=auto&forecast_days=3`);
    const weatherData = await weatherResponse.json();
    
    const daily = weatherData.daily;
    const forecast: WeatherCondition[] = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      const code = daily.weather_code[i];
      const tempMax = daily.temperature_2m_max[i];
      const tempMin = daily.temperature_2m_min[i];
      const temp = Math.round((tempMax + tempMin) / 2);
      const humidity = Math.round(daily.relative_humidity_2m_max[i] || 60);

      let condition = 'Clear Sky';
      let icon: 'sun' | 'cloud' | 'rain' | 'cloud-rain' = 'sun';
      let isGoodForHarvest = true;
      let message = 'Perfect weather for transporting crops.';

      if (code >= 61 && code <= 99) {
        condition = code >= 80 ? 'Heavy Rain' : 'Rain';
        icon = 'cloud-rain';
        isGoodForHarvest = false;
        message = 'Warning: Rain expected. Protect your crops with tarpaulins.';
      } else if (code >= 51 && code <= 57) {
        condition = 'Light Showers';
        icon = 'rain';
        isGoodForHarvest = false;
        message = 'Light showers expected. Moisture levels might rise slightly.';
      } else if (code >= 1 && code <= 3) {
        condition = 'Partly Cloudy';
        icon = 'cloud';
        message = 'Good weather. No rain expected.';
      }

      if (humidity > 80 && isGoodForHarvest) {
        message = 'High humidity. Ensure crops are properly dried before bringing to Mandi.';
      }

      forecast.push({
        temp,
        condition,
        humidity,
        isGoodForHarvest,
        message,
        icon,
        date: addDays(today, i)
      });
    }

    return forecast;
  } catch (err) {
    console.error('Failed to fetch live weather, falling back to deterministic:', err);
    const today = new Date();
    return [
      getDeterministicWeather(locationName, today),
      getDeterministicWeather(locationName, addDays(today, 1)),
      getDeterministicWeather(locationName, addDays(today, 2)),
    ];
  }
}

/**
 * Fallback deterministic weather (simulated).
 */
export function getDeterministicWeather(locationName: string, date: Date): WeatherCondition {
  const dateStr = format(date, 'yyyy-MM-dd');
  const seedString = `${locationName}-${dateStr}`;
  
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const positiveHash = Math.abs(hash);
  const temp = 22 + (positiveHash % 17);
  const humidity = 30 + ((positiveHash * 13) % 56);
  const conditionSeed = (positiveHash * 7) % 100;
  
  let condition = 'Clear Sky';
  let icon: 'sun' | 'cloud' | 'rain' | 'cloud-rain' = 'sun';
  let isGoodForHarvest = true;
  let message = 'Perfect weather for transporting crops.';

  if (conditionSeed < 20) {
    condition = 'Heavy Rain';
    icon = 'cloud-rain';
    isGoodForHarvest = false;
    message = 'Warning: Heavy rain expected. Protect your crops with tarpaulins.';
  } else if (conditionSeed < 40) {
    condition = 'Light Showers';
    icon = 'rain';
    isGoodForHarvest = false;
    message = 'Light showers expected. Moisture levels might rise slightly.';
  } else if (conditionSeed < 60) {
    condition = 'Partly Cloudy';
    icon = 'cloud';
    message = 'Good weather. No rain expected.';
  }

  if (humidity > 80 && isGoodForHarvest) {
    message = 'High humidity. Ensure crops are properly dried before bringing to Mandi.';
  }

  return { temp, condition, humidity, isGoodForHarvest, message, icon, date };
}
