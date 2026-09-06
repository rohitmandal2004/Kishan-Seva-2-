import { format, addDays } from 'date-fns';

export interface WeatherCondition {
 temp: number;
 condition: string;
 humidity: number;
 isGoodForHarvest: boolean;
 message: string;
 icon: 'sun' | 'cloud' | 'rain' | 'cloud-rain';
}

/**
 * A mock weather service that provides deterministic weather
 * based on the location (string) and date to simulate real conditions.
 */
export function getDeterministicWeather(locationName: string, date: Date): WeatherCondition {
 // Use a simple hash of the location string and date string to create deterministic "randomness"
 const dateStr = format(date, 'yyyy-MM-dd');
 const seedString = `${locationName}-${dateStr}`;
 
 let hash = 0;
 for (let i = 0; i < seedString.length; i++) {
 const char = seedString.charCodeAt(i);
 hash = ((hash << 5) - hash) + char;
 hash = hash & hash; // Convert to 32bit integer
 }
 
 // Make hash positive
 const positiveHash = Math.abs(hash);
 
 // 1. Temperature between 22 and 38
 const temp = 22 + (positiveHash % 17);
 
 // 2. Humidity between 30 and 85
 const humidity = 30 + ((positiveHash * 13) % 56);
 
 // 3. Condition based on another prime multiplier
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

 // Override if humidity is very high
 if (humidity > 80 && isGoodForHarvest) {
 message = 'High humidity. Ensure crops are properly dried before bringing to Mandi.';
 }

 return {
 temp,
 condition,
 humidity,
 isGoodForHarvest,
 message,
 icon,
 };
}
