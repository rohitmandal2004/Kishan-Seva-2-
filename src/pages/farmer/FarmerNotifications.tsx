import { Card } from '@/components/ui/card';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { Bell, CheckCircle2, Info, AlertCircle, Banknote, CalendarCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/services/i18n';

const notifIcon = (type: string) => {
  switch (type) {
    case 'BOOKING_CONFIRMED': return <CalendarCheck className="w-5 h-5" />;
    case 'PAYMENT_UPDATED':
    case 'PROCUREMENT_COMPLETED': return <Banknote className="w-5 h-5" />;
    case 'TURN_APPROACHING':
    case 'QUEUE_UPDATED': return <AlertCircle className="w-5 h-5" />;
    default: return <Bell className="w-5 h-5" />;
  }
};

const notifColor = (type: string, read: boolean) => {
  if (read) return 'bg-zinc-100 text-zinc-500';
  switch (type) {
    case 'BOOKING_CONFIRMED': return 'bg-emerald-100 text-emerald-700';
    case 'PAYMENT_UPDATED':
    case 'PROCUREMENT_COMPLETED': return 'bg-blue-100 text-blue-700';
    case 'TURN_APPROACHING': return 'bg-amber-100 text-amber-700';
    default: return 'bg-emerald-100 text-emerald-700';
  }
};

export default function FarmerNotifications() {
  const store = useKishanData();
  const { farmer, user } = useSupabase();
  const { t } = useLanguage();
  const notifications = store.getNotificationsForFarmer(farmer?.id, user?.email);

  const getRelativeTime = (created_at?: string) => {
    if (!created_at) return t('just_now');
    try {
      return formatDistanceToNow(new Date(created_at), { addSuffix: true });
    } catch {
      return t('just_now');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t('notifications')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('notifications_subtitle')}</p>
        </div>
        <button
          onClick={() => store.markAllNotificationsRead(farmer?.id, user?.email)}
          className="text-emerald-700 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" /> {t('mark_all_read')}
        </button>
      </div>

      <Card className="border border-zinc-200 rounded-lg overflow-hidden shadow-sm bg-white">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
              <Bell className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-medium text-zinc-700">{t('no_notifications')}</p>
            <p className="text-xs text-zinc-400 mt-1">{t('notifications_empty_sub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => store.markNotificationAsRead(n.id)}
                className={`p-4 md:p-5 flex items-start gap-4 transition-colors cursor-pointer ${!n.read ? 'bg-emerald-50/40' : 'hover:bg-zinc-50'}`}
              >
                <div className={`p-2 rounded-full mt-1 shrink-0 ${notifColor(n.type, n.read)}`}>
                  {notifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className={`text-sm leading-snug ${!n.read ? 'font-semibold text-emerald-950' : 'font-medium text-zinc-800'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap shrink-0">
                      {getRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">{n.message}</p>
                  {!n.read && (
                    <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {notifications.length > 0 && (
        <p className="text-center text-[11px] text-zinc-400">
          <Info className="w-3 h-3 inline mr-1 -mt-0.5" />
          {t('notifications_footer')}
        </p>
      )}
    </div>
  );
}
