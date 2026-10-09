import { toast } from 'sonner';

/**
 * SmsGateway — SIMULATED for demo purposes.
 *
 * This class does NOT send real SMS messages. It simulates delivery via a
 * toast notification and a console log. To enable real SMS, integrate with
 * a provider such as Twilio, MSG91, or TextLocal and replace the body of
 * sendSmsNotification with a real API call (ideally via a Supabase Edge Function
 * so API credentials stay server-side).
 */
export class SmsGateway {
  static async sendSmsNotification(phone: string, message: string): Promise<boolean> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL or Key not found for SMS');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ phone, message }),
      });

      if (!response.ok) {
        throw new Error(`Edge function failed: ${response.statusText}`);
      }

      console.log(`[Kishan Seva SMS Gateway] Sent SMS to ${phone}`);

      // We still show a toast so the UI operator knows it went through
      toast.success(`📱 SMS Sent to ${phone}`, {
        description: message,
        duration: 4000,
      });

      return true;
    } catch (error) {
      console.error('[Kishan Seva SMS Gateway] Failed to send SMS:', error);
      toast.error('Failed to send SMS notification');
      return false;
    }
  }
}
