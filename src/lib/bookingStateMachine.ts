import { BookingStatus } from '@/types';

export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  BOOKED: ['CHECKED_IN', 'CANCELLED', 'EXPIRED'],
  CHECKED_IN: ['WAITING', 'CANCELLED', 'NO_SHOW'],
  WAITING: ['CALLED', 'CANCELLED', 'NO_SHOW'],
  CALLED: ['QUALITY_TESTING', 'NO_SHOW'],
  QUALITY_TESTING: ['WEIGHMENT', 'REJECTED'],
  WEIGHMENT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  REJECTED: [],
  NO_SHOW: [],
};

export function getNextBookingStatus(currentStatus: BookingStatus): BookingStatus | null {
  const allowed = BOOKING_TRANSITIONS[currentStatus];
  if (!allowed || allowed.length === 0) return null;
  // By default, the next logical sequential step is always the first one in the array
  // assuming the array is ordered with the happy path first
  return allowed[0] as BookingStatus;
}
