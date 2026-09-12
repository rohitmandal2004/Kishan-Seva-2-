import { ProcurementCentre } from '@/types';

export interface MSPRate {
  crop: string;
  crop_hi: string;
  crop_bn?: string;
  season: string;
  rate_per_quintal: number;
  prev_rate: number;
  change_percent: number;
}

export const OFFICIAL_MSP_RATES: MSPRate[] = [
  { crop: 'Paddy (Grade A)', crop_hi: 'धान (ग्रेड ए)', crop_bn: 'ধান (গ্রেড এ)', season: 'Kharif 2026', rate_per_quintal: 2183, prev_rate: 2060, change_percent: 5.97 },
  { crop: 'Common Paddy', crop_hi: 'सामान्य धान', crop_bn: 'সাধারণ ধান', season: 'Kharif 2026', rate_per_quintal: 2163, prev_rate: 2040, change_percent: 6.03 },
  { crop: 'Wheat', crop_hi: 'गेहूं', crop_bn: 'গম', season: 'Rabi 2026', rate_per_quintal: 2275, prev_rate: 2125, change_percent: 7.06 },
  { crop: 'Mustard', crop_hi: 'सरसों', crop_bn: 'সরিষা', season: 'Rabi 2026', rate_per_quintal: 5650, prev_rate: 5450, change_percent: 3.67 },
  { crop: 'Maize', crop_hi: 'मक्का', crop_bn: 'ভুট্টা', season: 'Kharif 2026', rate_per_quintal: 2090, prev_rate: 1962, change_percent: 6.52 },
  { crop: 'Gram (Chana)', crop_hi: 'चना', crop_bn: 'ছোলা', season: 'Rabi 2026', rate_per_quintal: 5440, prev_rate: 5335, change_percent: 1.97 },
  { crop: 'Jute', crop_hi: 'जूट', crop_bn: 'পাট', season: 'Kharif 2026', rate_per_quintal: 5050, prev_rate: 4750, change_percent: 6.32 },
  { crop: 'Lentil (Masur)', crop_hi: 'मसूर', crop_bn: 'মসুর ডাল', season: 'Rabi 2026', rate_per_quintal: 6425, prev_rate: 6000, change_percent: 7.08 }
];

export const SEED_CENTRES: ProcurementCentre[] = []; // Used as fallback temporarily if needed.
