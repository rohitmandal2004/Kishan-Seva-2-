import { useEffect, useRef } from 'react';
import { BookingRecord } from './mockStore';

const SESSION_KEY = 'kishan_push_scheduled';

/**
 * usePushNotifications
 *
 * Schedules a browser Notification 2 hours before the active booking slot.
 * Works 100% client-side (no server push subscription required).
 * Requests permission on first invocation if not already granted.
 */
export function usePushNotifications(activeBooking: BookingRecord | null | undefined) {
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeBooking || !('Notification' in window)) return;

    // Don't re-schedule if we already scheduled for this token
    const scheduled = sessionStorage.getItem(SESSION_KEY);
    if (scheduled === activeBooking.token_number) return;

    const requestAndSchedule = async () => {
      let permission = Notification.permission;

      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
        } catch {
          return;
        }
      }

      if (permission !== 'granted') return;

      // Calculate ms until 2h before the slot
      const slotDateStr = activeBooking.slot_date; // e.g. "2026-09-15"
      const slotTimeStr = activeBooking.slot_time?.split(' – ')[0] || activeBooking.slot_time?.split(' - ')[0] || '09:00 AM';

      try {
        const slotDateTime = new Date(`${slotDateStr} ${slotTimeStr}`);
        if (isNaN(slotDateTime.getTime())) return;

        const reminderTime = slotDateTime.getTime() - 2 * 60 * 60 * 1000; // 2h before
        const msUntilReminder = reminderTime - Date.now();

        if (msUntilReminder <= 0) return; // Already past

        sessionStorage.setItem(SESSION_KEY, activeBooking.token_number);

        scheduledRef.current = setTimeout(() => {
          new Notification('🌾 Kishan Seva — Slot Reminder', {
            body: `Your procurement slot at ${activeBooking.centre_name} is in 2 hours.\nToken: ${activeBooking.token_number} | Slot: ${activeBooking.slot_time}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `kishan-slot-${activeBooking.token_number}`,
          });
        }, msUntilReminder);
      } catch {
        // Graceful fail — don't crash the app
      }
    };

    requestAndSchedule();

    return () => {
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current);
      }
    };
  }, [activeBooking?.token_number]);
}

/**
 * Returns whether Notifications are currently blocked, default, or granted.
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  return Notification.permission;
}
