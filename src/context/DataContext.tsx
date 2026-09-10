import React, { createContext, useContext, ReactNode } from 'react';
import { mockStore } from '@/services/mockStore';
import type { AppStore, BookingRecord, ProcurementCentre } from '@/services/mockStore';
import { useKishanData as useMockData } from '@/services/useMockStore';

export const DataContext = createContext<AppStore | undefined>(undefined);

export function KishanDataProvider({ children }: { children: ReactNode }) {
  // Subscribe at the provider level too so the context tree invalidates on mutation
  useMockData();

  return (
    <DataContext.Provider value={mockStore as AppStore}>
      {children}
    </DataContext.Provider>
  );
}

export type ExtendedStore = AppStore & {
  bookings: BookingRecord[];
  centres: ProcurementCentre[];
};

export function useKishanData(): ExtendedStore {
  // Each consumer subscribes independently — this is the key fix.
  // React will re-render this component every time the store version bumps.
  useMockData();

  return new Proxy(mockStore as any, {
    get(target, prop) {
      if (prop === 'bookings') return target.getBookings();
      if (prop === 'centres') return target.getCentres();
      const value = target[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  }) as ExtendedStore;
}
