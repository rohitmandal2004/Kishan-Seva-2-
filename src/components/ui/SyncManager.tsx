import { useState, useEffect } from 'react';
import { CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { processOfflineQueue } from '@/context/DataContext';

export function SyncManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Back online! Syncing offline data...', { icon: '☁️' });
      setIsSyncing(true);
      const syncedCount = await processOfflineQueue();
      setIsSyncing(false);
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} pending actions to server.`);
      } else {
        toast.info('No pending offline actions to sync.');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Actions will be saved locally.', { icon: '☁️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !isSyncing) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-white shadow-lg transition-all ${
      isOnline ? 'bg-blue-600' : 'bg-red-600 animate-pulse'
    }`}>
      {isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" /> Syncing with Server...
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4" /> Offline Mode (Saving Locally)
        </>
      )}
    </div>
  );
}
