import { toast } from 'sonner';

export class SmsGateway {
  static async sendSmsNotification(phone: string, message: string): Promise<boolean> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    console.log(`[SMS Gateway] Sending SMS to ${phone}: ${message}`);
    
    // Simulate Twilio or edge function success by displaying a toast
    toast.success(`📱 SMS Sent to ${phone}`, {
      description: message,
      duration: 6000,
    });
    
    return true;
  }
}
