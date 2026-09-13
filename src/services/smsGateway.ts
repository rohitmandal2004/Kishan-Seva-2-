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
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log(`[SMS Gateway — SIMULATED] Sending SMS to ${phone}: ${message}`);

    // Simulated delivery toast (not a real SMS)
    toast.success(`📱 SMS Sent to ${phone} [Simulated]`, {
      description: message,
      duration: 6000,
    });

    return true;
  }
}
