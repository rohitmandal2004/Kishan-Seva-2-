import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Booking, ProcurementCentre, QualityCheck, Weighment, BookingStatus } from '@/types';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { toast } from 'sonner';

// --- OFFLINE SYNC QUEUE ---
const OFFLINE_QUEUE_KEY = 'kishan_offline_queue';

interface QueuedMutation {
  id: string;
  type: 'UPDATE_STATUS' | 'ADVANCE_BOOKING';
  payload: any;
  timestamp: number;
}

export const getOfflineQueue = (): QueuedMutation[] => {
  try {
    const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return q ? JSON.parse(q) : [];
  } catch {
    return [];
  }
};

const addToOfflineQueue = (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => {
  const queue = getOfflineQueue();
  queue.push({
    ...mutation,
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now()
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const processOfflineQueue = async (): Promise<number> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;
  for (const item of queue) {
    try {
      if (item.type === 'UPDATE_STATUS') {
        const { bookingId, status, qualityData, weighmentData } = item.payload;
        await SupabaseDataService.updateBookingStatus(bookingId, status, qualityData, weighmentData);
      } else if (item.type === 'ADVANCE_BOOKING') {
        await SupabaseDataService.advanceBooking(item.payload.bookingId);
      }
      successCount++;
    } catch (error) {
      console.error('Failed to sync offline mutation:', item, error);
    }
  }

  // Clear queue after processing
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  return successCount;
};
// --------------------------

export interface AppStore {
  bookings: Booking[];
  centres: ProcurementCentre[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createBooking: (params: any) => Promise<Booking | null>;
  updateBookingStatus: (bookingId: string, status: BookingStatus, qualityData?: QualityCheck, weighmentData?: Weighment) => Promise<void>;
  postponeBooking: (bookingId: string) => Promise<void>;
  rescheduleBooking: (bookingId: string, newCentreId: string, newSlotDate: string, newSlotTime: string) => Promise<any>;
  advanceBooking: (bookingId: string) => Promise<Booking | undefined>;
  getCentreById: (id: string) => ProcurementCentre | undefined;
  getBookingsByCentre: (centreId: string) => Booking[];
  getBookingsByFarmer: (farmerId: string) => Booking[];
  getActiveFarmerBookingForFarmer: (farmerId?: string, email?: string) => Booking | undefined;
  getFarmerBookingsForFarmer: (farmerId?: string, email?: string) => Booking[];
  getNotificationsForFarmer: (farmerId?: string, email?: string) => any[];
  markAllNotificationsRead: (farmerId?: string, email?: string) => void;
  markNotificationAsRead: (id: string) => void;
  getCentres: () => ProcurementCentre[];
  getBookings: () => Booking[];
  getWeighments: () => any[];
  getStats: () => any;
  updateCentre: (id: string, updates: any) => Promise<void>;
  addCentre: (centre: any) => Promise<void>;
  toggleCentreStatus: (centreId: string) => Promise<void>;
}

export const DataContext = createContext<AppStore | undefined>(undefined);

export function KishanDataProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [centres, setCentres] = useState<ProcurementCentre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedBookings, fetchedCentres] = await Promise.all([
        SupabaseDataService.getBookings(),
        SupabaseDataService.getCentres()
      ]);
      setBookings(fetchedBookings || []);
      setCentres(fetchedCentres || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    
    const unsubscribe = SupabaseDataService.subscribeRealtime(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshData]);

  const createBooking = async (params: any) => {
    const booking = await SupabaseDataService.createBooking(params);
    await refreshData();
    return booking;
  };

  const updateBookingStatus = async (bookingId: string, status: BookingStatus, qualityData?: QualityCheck, weighmentData?: Weighment) => {
    if (!navigator.onLine) {
      addToOfflineQueue({ type: 'UPDATE_STATUS', payload: { bookingId, status, qualityData, weighmentData } });
      toast.error('Offline Mode: Booking update queued.');
      
      // Optimistic UI Update
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status, quality_data: qualityData, weighment_data: weighmentData } : b));
      return;
    }
    await SupabaseDataService.updateBookingStatus(bookingId, status, qualityData, weighmentData);
    await refreshData();
  };

  const postponeBooking = async (bookingId: string) => {
    await SupabaseDataService.postponeBooking(bookingId);
    await refreshData();
  };

  const rescheduleBooking = async (bookingId: string, newCentreId: string, newSlotDate: string, newSlotTime: string) => {
    const updated = await SupabaseDataService.rescheduleBooking(bookingId, newCentreId, newSlotDate, newSlotTime);
    await refreshData();
    return updated;
  };

  const advanceBooking = async (bookingId: string) => {
    if (!navigator.onLine) {
      addToOfflineQueue({ type: 'ADVANCE_BOOKING', payload: { bookingId } });
      toast.error('Offline Mode: Booking advance queued.');
      // Simple Optimistic UI Update (Next status logic)
      setBookings(prev => prev.map(b => {
        if (b.id !== bookingId) return b;
        let nextStatus = b.status;
        if (b.status === 'BOOKED') nextStatus = 'CHECKED_IN';
        else if (b.status === 'CHECKED_IN') nextStatus = 'QUALITY_TESTING';
        else if (b.status === 'QUALITY_TESTING') nextStatus = 'WEIGHMENT';
        else if (b.status === 'WEIGHMENT') nextStatus = 'COMPLETED';
        return { ...b, status: nextStatus };
      }));
      return bookings.find(b => b.id === bookingId);
    }
    const updated = await SupabaseDataService.advanceBooking(bookingId);
    await refreshData();
    return updated;
  };

  const getCentreById = useCallback((id: string) => {
    return centres.find(c => c.id === id);
  }, [centres]);

  const getBookingsByCentre = useCallback((centreId: string) => {
    return bookings.filter(b => b.centre_id === centreId);
  }, [bookings]);

  const getBookingsByFarmer = useCallback((farmerId: string) => {
    return bookings.filter(b => b.farmer_id === farmerId);
  }, [bookings]);

  const getActiveFarmerBookingForFarmer = useCallback((farmerId?: string, email?: string) => {
    if (!farmerId && !email) return undefined;
    return bookings.find(b => {
      const isActive = ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'PROCESSING', 'QUALITY_TESTING', 'WEIGHMENT'].includes(b.status);
      const isPostponed = b.status === 'CANCELLED' && b.reschedule_deadline && new Date(b.reschedule_deadline) > new Date();
      return (isActive || isPostponed) && ((farmerId && b.farmer_id === farmerId) || (email && b.farmer_email === email));
    });
  }, [bookings]);

  const toggleCentreStatus = async (centreId: string) => {
    await SupabaseDataService.toggleCentreStatus(centreId);
    await refreshData();
  };

  // Polyfills for old mockStore calls
  const getCentres = useCallback(() => centres, [centres]);
  const getBookings = useCallback(() => bookings, [bookings]);
  const getFarmerBookingsForFarmer = useCallback((farmerId?: string, email?: string) => {
    if (!farmerId && !email) return [];
    return bookings.filter(b => (farmerId && b.farmer_id === farmerId) || (email && b.farmer_email === email));
  }, [bookings]);
  const getNotificationsForFarmer = useCallback(() => [], []);
  const markAllNotificationsRead = useCallback(() => {}, []);
  const markNotificationAsRead = useCallback(() => {}, []);
  const getWeighments = useCallback(() => [], []);
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.slot_date === today);
    return {
      totalBookings: todayBookings.length,
      completedBookings: todayBookings.filter(b => b.status === 'COMPLETED').length,
      inQueueCount: bookings.filter(b => ['CHECKED_IN', 'WAITING', 'CALLED', 'WEIGHMENT', 'QUALITY_TESTING'].includes(b.status)).length,
      totalProcuredQuintals: todayBookings.filter(b => b.status === 'COMPLETED').reduce((sum, b) => sum + (b.expected_quantity_q || 0), 0)
    };
  }, [bookings]);
  
  const updateCentre = async (id: string, updates: any) => {
    // Stub for now
  };
  
  const addCentre = async (centre: any) => {
    // Stub for now
  };

  const store: AppStore = {
    bookings,
    centres,
    isLoading,
    error,
    refreshData,
    createBooking,
    updateBookingStatus,
    postponeBooking,
    rescheduleBooking,
    advanceBooking,
    getCentreById,
    getBookingsByCentre,
    getBookingsByFarmer,
    getActiveFarmerBookingForFarmer,
    getFarmerBookingsForFarmer,
    getNotificationsForFarmer,
    markAllNotificationsRead,
    markNotificationAsRead,
    getCentres,
    getBookings,
    getWeighments,
    getStats,
    updateCentre,
    addCentre,
    toggleCentreStatus
  };

  return (
    <DataContext.Provider value={store}>
      {children}
    </DataContext.Provider>
  );
}

export function useKishanData(): AppStore {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useKishanData must be used within a KishanDataProvider');
  }
  return context;
}
