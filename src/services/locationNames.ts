import { Language } from './i18n';

// Dictionary of District names
export const DISTRICT_NAMES: Record<string, Record<Language, string>> = {
 'North 24 Parganas': {
 en: 'North 24 Parganas',
 hi: 'उत्तर 24 परगना',
 bn: 'উত্তর ২৪ পরগনা',
 },
 'South 24 Parganas': {
 en: 'South 24 Parganas',
 hi: 'दक्षिण 24 परगना',
 bn: 'দক্ষিণ ২৪ পরগনা',
 },
 'Hooghly': {
 en: 'Hooghly',
 hi: 'हुगली',
 bn: 'হুগলি',
 },
 'Nadia': {
 en: 'Nadia',
 hi: 'नादिया',
 bn: 'নদীয়া',
 },
 'Burdwan (East)': {
 en: 'Burdwan (East)',
 hi: 'पूर्व बर्दवान',
 bn: 'পূর্ব বর্ধমান',
 },
 'Murshidabad': {
 en: 'Murshidabad',
 hi: 'मुर्शिदाबाद',
 bn: 'মুর্শিদাবাদ',
 }
};

// Dictionary of Centre/City names
export const LOCATION_NAMES: Record<string, Record<Language, string>> = {
 'Barasat': {
 en: 'Barasat',
 hi: 'बारासात',
 bn: 'বারাসাত',
 },
 'Basirhat': {
 en: 'Basirhat',
 hi: 'बसीरहाट',
 bn: 'বসিরহাট',
 },
 'Diamond Harbour': {
 en: 'Diamond Harbour',
 hi: 'डायमंड हार्बर',
 bn: 'ডায়মন্ড হারবার',
 },
 'Bongaon': {
 en: 'Bongaon',
 hi: 'बनगांव',
 bn: 'বনগাঁ',
 },
 'Burdwan': {
 en: 'Burdwan',
 hi: 'बर्दवान',
 bn: 'বর্ধমান',
 },
 'Kalyani': {
 en: 'Kalyani',
 hi: 'कल्याणी',
 bn: 'কল্যাণী',
 },
 'Dankuni': {
 en: 'Dankuni',
 hi: 'दानकुनी',
 bn: 'ডানকুনি',
 },
 'Habra': {
 en: 'Habra',
 hi: 'हाबड़ा',
 bn: 'হাবড়া',
 },
 'Baruipur': {
 en: 'Baruipur',
 hi: 'बारुईपुर',
 bn: 'বারুইপুর',
 },
 'Canning': {
 en: 'Canning',
 hi: 'कैनिंग',
 bn: 'ক্যানিং',
 },
 'Singur': {
 en: 'Singur',
 hi: 'सिंगूर',
 bn: 'সিঙ্গুর',
 },
 'Arambagh': {
 en: 'Arambagh',
 hi: 'आरामबाग',
 bn: 'আরামবাগ',
 },
 'Ranaghat': {
 en: 'Ranaghat',
 hi: 'राणाघाट',
 bn: 'রানাঘাট',
 },
 'Krishnanagar': {
 en: 'Krishnanagar',
 hi: 'कृष्णनगर',
 bn: 'কৃষ্ণনগর',
 }
};

/**
 * Known coordinates for West Bengal agricultural villages, blocks, and sub-divisions.
 * Tied directly to West Bengal mandi coordinates for seamless distance calculations.
 */
export interface VillageLocationInfo {
 name: string;
 district: string;
 latitude: number;
 longitude: number;
 pincode?: string;
}

export const VILLAGE_COORDINATES: Record<string, VillageLocationInfo> = {
 'basirhat': {
 name: 'Basirhat',
 district: 'North 24 Parganas',
 latitude: 22.6582,
 longitude: 88.8643,
 pincode: '743411',
 },
 'diamond harbour': {
 name: 'Diamond Harbour',
 district: 'South 24 Parganas',
 latitude: 22.1982,
 longitude: 88.2015,
 pincode: '743331',
 },
 'diamond': {
 name: 'Diamond Harbour',
 district: 'South 24 Parganas',
 latitude: 22.1982,
 longitude: 88.2015,
 pincode: '743331',
 },
 'barasat': {
 name: 'Barasat',
 district: 'North 24 Parganas',
 latitude: 22.7231,
 longitude: 88.4812,
 pincode: '700124',
 },
 'habra': {
 name: 'Habra',
 district: 'North 24 Parganas',
 latitude: 22.8402,
 longitude: 88.6321,
 pincode: '743263',
 },
 'bongaon': {
 name: 'Bongaon',
 district: 'North 24 Parganas',
 latitude: 23.0425,
 longitude: 88.8284,
 pincode: '743235',
 },
 'madhyamgram': {
 name: 'Madhyamgram',
 district: 'North 24 Parganas',
 latitude: 22.6987,
 longitude: 88.4521,
 pincode: '700129',
 },
 'baruipur': {
 name: 'Baruipur',
 district: 'South 24 Parganas',
 latitude: 22.3654,
 longitude: 88.4321,
 pincode: '700144',
 },
 'canning': {
 name: 'Canning',
 district: 'South 24 Parganas',
 latitude: 22.3123,
 longitude: 88.6654,
 pincode: '743329',
 },
 'kakdwip': {
 name: 'Kakdwip',
 district: 'South 24 Parganas',
 latitude: 21.8764,
 longitude: 88.1873,
 pincode: '743347',
 },
 'singur': {
 name: 'Singur',
 district: 'Hooghly',
 latitude: 22.8123,
 longitude: 88.2345,
 pincode: '712409',
 },
 'arambagh': {
 name: 'Arambagh',
 district: 'Hooghly',
 latitude: 22.8845,
 longitude: 87.7845,
 pincode: '712601',
 },
 'kalna': {
 name: 'Kalna',
 district: 'Burdwan (East)',
 latitude: 23.2185,
 longitude: 88.3652,
 pincode: '713409',
 },
 'memari': {
 name: 'Memari',
 district: 'Burdwan (East)',
 latitude: 23.1845,
 longitude: 88.1123,
 pincode: '713146',
 },
 'burdwan': {
 name: 'Burdwan',
 district: 'Burdwan (East)',
 latitude: 23.2324,
 longitude: 87.8615,
 pincode: '713101',
 },
 'kalyani': {
 name: 'Kalyani',
 district: 'Nadia',
 latitude: 22.9750,
 longitude: 88.4344,
 pincode: '741235',
 },
 'ranaghat': {
 name: 'Ranaghat',
 district: 'Nadia',
 latitude: 23.1812,
 longitude: 88.5821,
 pincode: '741201',
 },
 'krishnanagar': {
 name: 'Krishnanagar',
 district: 'Nadia',
 latitude: 23.4012,
 longitude: 88.4987,
 pincode: '741101',
 },
 'berhampore': {
 name: 'Berhampore',
 district: 'Murshidabad',
 latitude: 24.0987,
 longitude: 88.2564,
 pincode: '742101',
 },
 'dankuni': {
 name: 'Dankuni',
 district: 'Hooghly',
 latitude: 22.6845,
 longitude: 88.2985,
 pincode: '712311',
 },
 'rajarhat': {
 name: 'Rajarhat',
 district: 'North 24 Parganas',
 latitude: 22.6152,
 longitude: 88.4651,
 pincode: '700135',
 },
 'kolkata': {
 name: 'Kolkata',
 district: 'Kolkata',
 latitude: 22.5726,
 longitude: 88.3639,
 pincode: '700001',
 }
};

/**
 * Popular West Bengal agricultural villages for quick selection chips
 */
export const POPULAR_VILLAGES: VillageLocationInfo[] = [
 VILLAGE_COORDINATES['basirhat'],
 VILLAGE_COORDINATES['diamond harbour'],
 VILLAGE_COORDINATES['barasat'],
 VILLAGE_COORDINATES['habra'],
 VILLAGE_COORDINATES['bongaon'],
 VILLAGE_COORDINATES['baruipur'],
 VILLAGE_COORDINATES['canning'],
 VILLAGE_COORDINATES['singur'],
 VILLAGE_COORDINATES['arambagh'],
 VILLAGE_COORDINATES['kalna'],
 VILLAGE_COORDINATES['krishnanagar'],
];

/**
 * District fallback center coordinates
 */
export const DISTRICT_CENTERS: Record<string, { latitude: number; longitude: number }> = {
 'north 24 parganas': { latitude: 22.7231, longitude: 88.4812 },
 'south 24 parganas': { latitude: 22.1982, longitude: 88.2015 },
 'hooghly': { latitude: 22.8123, longitude: 88.2345 },
 'burdwan (east)': { latitude: 23.2324, longitude: 87.8615 },
 'nadia': { latitude: 23.4012, longitude: 88.4987 },
 'murshidabad': { latitude: 24.0987, longitude: 88.2564 },
};

/**
 * Resolves precise coordinates for a given village or district name.
 * Uses fuzzy matching to handle partial inputs like "Basirhat rural" or "Diamond".
 */
export function getCoordinatesForVillage(
 village?: string,
 district?: string
): { latitude: number; longitude: number; district: string; village: string } {
 const cleanVillage = (village || '').trim().toLowerCase();
 const cleanDistrict = (district || '').trim().toLowerCase();

 // 1. Exact match on village
 if (cleanVillage && VILLAGE_COORDINATES[cleanVillage]) {
 const info = VILLAGE_COORDINATES[cleanVillage];
 return {
 latitude: info.latitude,
 longitude: info.longitude,
 district: info.district,
 village: info.name,
 };
 }

 // 2. Fuzzy substring match on village
 if (cleanVillage) {
 const matchedKey = Object.keys(VILLAGE_COORDINATES).find(
 key => cleanVillage.includes(key) || key.includes(cleanVillage)
 );
 if (matchedKey) {
 const info = VILLAGE_COORDINATES[matchedKey];
 return {
 latitude: info.latitude,
 longitude: info.longitude,
 district: info.district,
 village: info.name,
 };
 }
 }

 // 3. Fallback to district center if district known
 if (cleanDistrict) {
 const matchedDistrictKey = Object.keys(DISTRICT_CENTERS).find(
 d => cleanDistrict.includes(d) || d.includes(cleanDistrict)
 );
 if (matchedDistrictKey) {
 const coords = DISTRICT_CENTERS[matchedDistrictKey];
 return {
 latitude: coords.latitude,
 longitude: coords.longitude,
 district: district || 'West Bengal',
 village: village || 'Center',
 };
 }
 }

 // 4. Default fallback: Basirhat (North 24 Parganas)
 return {
 latitude: 22.6582,
 longitude: 88.8643,
 district: 'North 24 Parganas',
 village: 'Basirhat',
 };
}

/**
 * Returns the matching district for a village name if known.
 */
export function getDistrictForVillage(village: string): string | undefined {
 const clean = village.trim().toLowerCase();
 if (VILLAGE_COORDINATES[clean]) {
 return VILLAGE_COORDINATES[clean].district;
 }
 const matchedKey = Object.keys(VILLAGE_COORDINATES).find(
 k => clean.includes(k) || k.includes(clean)
 );
 return matchedKey ? VILLAGE_COORDINATES[matchedKey].district : undefined;
}

/**
 * Helper to translate a location/district name safely.
 * Falls back to the original string if not found in the dictionary.
 */
export function tLocation(name: string, lang: Language, type: 'district' | 'city' = 'city'): string {
 const dict = type === 'district' ? DISTRICT_NAMES : LOCATION_NAMES;
 // If the exact match exists
 if (dict[name] && dict[name][lang]) {
 return dict[name][lang];
 }
 
 // Try case-insensitive matching
 const key = Object.keys(dict).find(k => k.toLowerCase() === name.toLowerCase());
 if (key && dict[key][lang]) {
 return dict[key][lang];
 }

 // Fallback to original string
 return name;
}
