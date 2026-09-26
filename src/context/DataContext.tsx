import { create } from 'zustand';
import { Booking, ProcurementCentre, QualityCheck, Weighment, BookingStatus } from '@/types';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { toast } from 'sonner';
import localforage from 'localforage';
import React, { ReactNode, useEffect } from 'react';

// --- OFFLINE DB CONFIG ---
const offlineQueueDB = localforage.createInstance({ name: 'kishan-offline-queue' });
const cacheDB = localforage.createInstance({ name: 'kishan-cache' });

interface QueuedMutation {
  id: string;
  type: 'UPDATE_STATUS' | 'ADVANCE_BOOKING' | 'CREATE_BOOKING';
  payload: any;
  timestamp: number;
}

export const getOfflineQueue = async (): Promise<QueuedMutation[]> => {
  try {
    const q: QueuedMutation[] | null = await offlineQueueDB.getItem('queue');
    return q || [];
  } catch {
    return [];
  }
};

const addToOfflineQueue = async (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => {
  const queue = await getOfflineQueue();
  queue.push({
    ...mutation,
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now()
  });
  await offlineQueueDB.setItem('queue', queue);
};

export const processOfflineQueue = async (): Promise<number> => {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;
  for (const item of queue) {
    try {
      if (item.type === 'UPDATE_STATUS') {
        const { bookingId, status, qualityData, weighmentData } = item.payload;
        await SupabaseDataService.updateBookingStatus(bookingId, status, qualityData, weighmentData);
      } else if (item.type === 'ADVANCE_BOOKING') {
        await SupabaseDataService.advanceBooking(item.payload.bookingId);
      } else if (item.type === 'CREATE_BOOKING') {
        const payload = { ...item.payload };
        delete payload.id; // Exclude local mock ID
        await SupabaseDataService.createBooking(payload);
      }
      successCount++;
    } catch (error) {
      console.error('Failed to sync offline mutation:', item, error);
    }
  }

  // Clear queue after processing
  await offlineQueueDB.setItem('queue', []);
  return successCount;
};

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

export const useKishanData = create<AppStore>((set, get) => ({
  bookings: [],
  centres: [],
  isLoading: true,
  error: null,

  refreshData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [fetchedBookings, fetchedCentres] = await Promise.all([
        SupabaseDataService.getBookings(),
        SupabaseDataService.getCentres()
      ]);
      
      let allBookings = fetchedBookings || [];
      
      if (import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false') {
        const demoBookingsStr = localStorage.getItem('kishan_demo_bookings');
        const customDemoBookings = demoBookingsStr ? JSON.parse(demoBookingsStr) : [];
        
        const pastCompletedBooking: Booking = {
          id: 'demo-completed-1',
          farmer_id: 'demo-farmer-001',
          farmer_name: 'Demo Farmer (Ramesh Kumar)',
          farmer_code: 'KIS-FMR-DEMO01',
          centre_id: 'centre-1',
          centre_name: 'Memari Kishan Mandi',
          crop_name: 'Paddy (Grade A)',
          expected_quantity_q: 45,
          slot_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          slot_time: '10:00 AM - 11:00 AM',
          token_number: 'DEMO-8492',
          status: 'COMPLETED',
          farmer_phone: '9876543210',
          vehicle_number: 'WB-00-DEMO-1234',
          vehicle_type: 'Tractor',
          booked_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          weighment_data: {
            booking_id: 'demo-completed-1',
            gross_weight_q: 45.2,
            tare_weight_q: 0.2,
            net_weight_q: 45.0,
            msp_rate_per_q: 2203,
            gross_amount: 99135,
            handling_charge: 0,
            moisture_deduction: 0,
            net_payable: 99135,
            slip_number: 'WS-DEMO-1',
            weighbridge_operator: 'Demo Operator',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            dbt_status: 'DISBURSED',
            transaction_ref: 'DBT-DEMO-94827361'
          }
        };
        
        allBookings = [...customDemoBookings, pastCompletedBooking, ...allBookings];
      }

      set({ bookings: allBookings, centres: fetchedCentres || [], isLoading: false });

      // Cache for offline support using localforage
      await cacheDB.setItem('cached_bookings', allBookings);
      await cacheDB.setItem('cached_centres', fetchedCentres || []);

    } catch (err: any) {
      console.warn("Network offline, loading from cache", err);
      // Fallback to offline cache via localforage
      const cachedBookings: any = await cacheDB.getItem('cached_bookings');
      const cachedCentres: any = await cacheDB.getItem('cached_centres');
      
      if (cachedBookings) set({ bookings: cachedBookings });
      if (cachedCentres) set({ centres: cachedCentres });
      
      if (!cachedBookings && !cachedCentres) {
          set({ error: err.message || 'Failed to fetch data' });
      } else {
          toast.info('You are offline. Showing cached J-Form & Gate Pass data.');
      }
      set({ isLoading: false });
    }
  },

  createBooking: async (params: any) => {
    const centres = get().centres;
    if (params.farmer_id === 'demo-farmer-001' || import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false') {
      const mockBooking: Booking = {
        id: 'demo-booking-' + Date.now(),
        farmer_id: params.farmer_id || 'demo-farmer-001',
        farmer_name: params.farmer_name || 'Demo Farmer',
        farmer_phone: params.farmer_phone || '9876543210',
        farmer_email: params.farmer_email,
        farmer_code: params.farmer_code || 'KIS-FMR-DEMO01',
        clerk_user_id: params.clerk_user_id,
        centre_id: params.centre_id,
        centre_name: centres.find((c: any) => c.id === params.centre_id)?.name || 'Demo Centre',
        crop_name: params.crop_name,
        expected_quantity_q: params.expected_quantity_q,
        slot_date: params.slot_date,
        slot_time: params.slot_time,
        token_number: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'BOOKED',
        vehicle_number: params.vehicle_number,
        vehicle_type: params.vehicle_type,
        booked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const demoBookingsStr = localStorage.getItem('kishan_demo_bookings');
      const demoBookings = demoBookingsStr ? JSON.parse(demoBookingsStr) : [];
      demoBookings.unshift(mockBooking);
      localStorage.setItem('kishan_demo_bookings', JSON.stringify(demoBookings));
      
      set(state => ({ bookings: [mockBooking, ...state.bookings] }));
      return mockBooking;
    }

    if (!navigator.onLine) {
      const mockBooking: Booking = {
        id: 'offline-booking-' + Date.now(),
        farmer_id: params.farmer_id || 'demo-farmer-001',
        farmer_name: params.farmer_name || 'Demo Farmer',
        farmer_phone: params.farmer_phone || '9876543210',
        farmer_email: params.farmer_email,
        farmer_code: params.farmer_code || 'KIS-FMR-DEMO01',
        clerk_user_id: params.clerk_user_id,
        centre_id: params.centre_id,
        centre_name: centres.find((c: any) => c.id === params.centre_id)?.name || 'Demo Centre',
        crop_name: params.crop_name,
        expected_quantity_q: params.expected_quantity_q,
        slot_date: params.slot_date,
        slot_time: params.slot_time,
        token_number: `OFF-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'BOOKED',
        vehicle_number: params.vehicle_number,
        vehicle_type: params.vehicle_type,
        booked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await addToOfflineQueue({ type: 'CREATE_BOOKING', payload: mockBooking });
      toast.info('You are offline. Booking saved locally and will sync when online.');
      set(state => ({ bookings: [mockBooking, ...state.bookings] }));
      
      const offlineBookingsStr = localStorage.getItem('kishan_offline_created');
      const offlineBookings = offlineBookingsStr ? JSON.parse(offlineBookingsStr) : [];
      offlineBookings.push(mockBooking);
      localStorage.setItem('kishan_offline_created', JSON.stringify(offlineBookings));
      
      return mockBooking;
    }

    try {
        const booking = await SupabaseDataService.createBooking(params);
        await get().refreshData();
        return booking;
    } catch (err: any) {
        toast.error('Network failed during booking, please try again.');
        throw err;
    }
  },

  updateBookingStatus: async (bookingId, status, qualityData, weighmentData) => {
    if (!navigator.onLine) {
      await addToOfflineQueue({ type: 'UPDATE_STATUS', payload: { bookingId, status, qualityData, weighmentData } });
      toast.error('Offline Mode: Booking update queued.');
      
      set(state => ({
        bookings: state.bookings.map(b => b.id === bookingId ? { ...b, status, quality_data: qualityData, weighment_data: weighmentData } : b)
      }));
      return;
    }
    await SupabaseDataService.updateBookingStatus(bookingId, status, qualityData, weighmentData);
    await get().refreshData();
  },

  postponeBooking: async (bookingId) => {
    await SupabaseDataService.postponeBooking(bookingId);
    await get().refreshData();
  },

  rescheduleBooking: async (bookingId, newCentreId, newSlotDate, newSlotTime) => {
    const updated = await SupabaseDataService.rescheduleBooking(bookingId, newCentreId, newSlotDate, newSlotTime);
    await get().refreshData();
    return updated;
  },

  advanceBooking: async (bookingId) => {
    if (!navigator.onLine) {
      await addToOfflineQueue({ type: 'ADVANCE_BOOKING', payload: { bookingId } });
      toast.error('Offline Mode: Booking advance queued.');
      
      let nextStatusRet = undefined;
      set(state => ({
        bookings: state.bookings.map(b => {
          if (b.id !== bookingId) return b;
          let nextStatus = b.status;
          if (b.status === 'BOOKED') nextStatus = 'CHECKED_IN';
          else if (b.status === 'CHECKED_IN') nextStatus = 'QUALITY_TESTING';
          else if (b.status === 'QUALITY_TESTING') nextStatus = 'WEIGHMENT';
          else if (b.status === 'WEIGHMENT') nextStatus = 'COMPLETED';
          nextStatusRet = { ...b, status: nextStatus };
          return nextStatusRet as any;
        })
      }));
      return nextStatusRet;
    }
    const updated = await SupabaseDataService.advanceBooking(bookingId);
    await get().refreshData();
    return updated;
  },

  getCentreById: (id) => get().centres.find((c: any) => c.id === id),
  getBookingsByCentre: (centreId) => get().bookings.filter((b: any) => b.centre_id === centreId),
  getBookingsByFarmer: (farmerId) => get().bookings.filter((b: any) => b.farmer_id === farmerId),
  
  getActiveFarmerBookingForFarmer: (farmerId?, email?) => {
    if (!farmerId && !email) return undefined;
    return get().bookings.find((b: any) => {
      const isActive = ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'PROCESSING', 'QUALITY_TESTING', 'WEIGHMENT'].includes(b.status);
      const isPostponed = b.status === 'CANCELLED' && b.reschedule_deadline && new Date(b.reschedule_deadline) > new Date();
      return (isActive || isPostponed) && ((farmerId && b.farmer_id === farmerId) || (email && b.farmer_email === email));
    });
  },

  getFarmerBookingsForFarmer: (farmerId?, email?) => {
    if (!farmerId && !email) return [];
    return get().bookings.filter((b: any) => (farmerId && b.farmer_id === farmerId) || (email && b.farmer_email === email));
  },

  getNotificationsForFarmer: () => [],
  markAllNotificationsRead: () => {},
  markNotificationAsRead: () => {},
  getCentres: () => get().centres,
  getBookings: () => get().bookings,
  getWeighments: () => [],
  
  getStats: () => {
    const bookings = get().bookings;
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter((b: any) => b.slot_date === today);
    return {
      totalBookings: todayBookings.length,
      completedBookings: todayBookings.filter((b: any) => b.status === 'COMPLETED').length,
      inQueueCount: bookings.filter((b: any) => ['CHECKED_IN', 'WAITING', 'CALLED', 'WEIGHMENT', 'QUALITY_TESTING'].includes(b.status)).length,
      totalProcuredQuintals: todayBookings.filter((b: any) => b.status === 'COMPLETED').reduce((sum: number, b: any) => sum + (b.expected_quantity_q || 0), 0)
    };
  },
  
  updateCentre: async () => {},
  addCentre: async () => {},
  toggleCentreStatus: async (centreId) => {
    await SupabaseDataService.toggleCentreStatus(centreId);
    await get().refreshData();
  }
}));

// We keep KishanDataProvider as a simple wrapper to trigger the initial fetch and realtime subscription
export function KishanDataProvider({ children }: { children: ReactNode }) {
  const refreshData = useKishanData(s => s.refreshData);

  useEffect(() => {
    refreshData();
    
    const unsubscribe = SupabaseDataService.subscribeRealtime(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshData]);

  return <>{children}</>;
}
