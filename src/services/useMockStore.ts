import { useSyncExternalStore } from 'react';
import { mockStore } from './mockStore';

export function useKishanData() {
  // useSyncExternalStore needs a snapshot that *changes* when the store mutates.
  // We use the version counter so React schedules a re-render on every saveState().
  useSyncExternalStore(
    mockStore.subscribe.bind(mockStore),
    mockStore.getSnapshot.bind(mockStore)
  );

  return mockStore;
}
