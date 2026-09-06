import { toast } from 'sonner';

export interface DispatchNotification {
 id: string;
 channel: 'SMS' | 'WHATSAPP' | 'SYSTEM';
 recipient_phone: string;
 recipient_name: string;
 title: string;
 message: string;
 timestamp: string;
 status: 'DELIVERED' | 'SENT' | 'FAILED';
 meta?: {
 token_number?: string;
 dbt_ref?: string;
 amount?: number;
 centre_name?: string;
 };
}

type NotificationSubscriber = (notification: DispatchNotification) => void;

class NotificationDispatchService {
 private notifications: DispatchNotification[] = [
 {
 id: 'NOTIF-INIT-1',
 channel: 'WHATSAPP',
 recipient_phone: '+91 98301 23456',
 recipient_name: 'Ananda Ghosh',
 title: '🌾 Slot Booking Confirmed',
 message: 'Kishan Seva: Your slot at Habra Krishak Bazaar is confirmed for 09:00 AM tomorrow. Token: KSP-1040. Bring your RoR Khatian.',
 timestamp: 'Today, 08:30 AM',
 status: 'DELIVERED',
 meta: { token_number: 'KSP-1040', centre_name: 'Habra Krishak Bazaar' }
 },
 {
 id: 'NOTIF-INIT-2',
 channel: 'SMS',
 recipient_phone: '+91 98301 23456',
 recipient_name: 'Ananda Ghosh',
 title: '🚨 Gate Call Alert',
 message: 'Kishan Seva: Token KSP-1040 is next in line at Weighbridge 01. Please proceed inside the depot gate immediately.',
 timestamp: 'Today, 09:25 AM',
 status: 'DELIVERED',
 meta: { token_number: 'KSP-1040' }
 },
 {
 id: 'NOTIF-INIT-3',
 channel: 'SMS',
 recipient_phone: '+91 98301 23456',
 recipient_name: 'Ananda Ghosh',
 title: '💰 DBT Payment Dispatched',
 message: 'Govt of West Bengal: ₹1,08,700 credited towards Paddy MSP procurement. Ref: DBT/RBI/2026/89401.',
 timestamp: 'Today, 10:15 AM',
 status: 'DELIVERED',
 meta: { dbt_ref: 'DBT/RBI/2026/89401', amount: 108700 }
 }
 ];

 private subscribers: NotificationSubscriber[] = [];

 public getNotifications(): DispatchNotification[] {
 return [...this.notifications];
 }

 public subscribe(callback: NotificationSubscriber): () => void {
 this.subscribers.push(callback);
 return () => {
 this.subscribers = this.subscribers.filter((s) => s !== callback);
 };
 }

 private dispatch(notification: Omit<DispatchNotification, 'id' | 'timestamp' | 'status'>) {
 const fullNotification: DispatchNotification = {
 ...notification,
 id: `NOTIF-${Date.now()}`,
 timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
 status: 'DELIVERED',
 };

 this.notifications.unshift(fullNotification);

 // Trigger visual toast
 if (fullNotification.channel === 'WHATSAPP') {
 toast.success(`📲 WhatsApp Alert Delivered to ${fullNotification.recipient_phone}`, {
 description: fullNotification.message,
 });
 } else {
 toast.info(`✉️ SMS Dispatch to ${fullNotification.recipient_phone}`, {
 description: fullNotification.message,
 });
 }

 this.subscribers.forEach((fn) => fn(fullNotification));
 }

 public notifyBookingConfirmed(params: {
 farmer_name: string;
 phone: string;
 token_number: string;
 centre_name: string;
 slot_date: string;
 time_window: string;
 }) {
 this.dispatch({
 channel: 'WHATSAPP',
 recipient_name: params.farmer_name,
 recipient_phone: params.phone,
 title: '🌾 Slot Booking Confirmed',
 message: `Kishan Seva: Your slot at ${params.centre_name} is confirmed for ${params.slot_date} (${params.time_window}). Token: ${params.token_number}.`,
 meta: { token_number: params.token_number, centre_name: params.centre_name }
 });
 }

 public notifyGateCall(params: {
 farmer_name: string;
 phone: string;
 token_number: string;
 vehicles_ahead: number;
 estimated_minutes: number;
 }) {
 this.dispatch({
 channel: 'SMS',
 recipient_name: params.farmer_name,
 recipient_phone: params.phone,
 title: '🚨 Gate Call — Next In Line',
 message: `Token ${params.token_number}: Only ${params.vehicles_ahead} vehicle(s) ahead. Estimated gate call in ~${params.estimated_minutes} min. Please move vehicle to gate.`,
 meta: { token_number: params.token_number }
 });
 }

 public notifyWeighmentCertified(params: {
 farmer_name: string;
 phone: string;
 token_number: string;
 net_weight: number;
 net_payable: number;
 slip_number: string;
 }) {
 this.dispatch({
 channel: 'WHATSAPP',
 recipient_name: params.farmer_name,
 recipient_phone: params.phone,
 title: '⚖️ J-Form Certified & Weighment Completed',
 message: `Token ${params.token_number}: Certified Net Weight ${params.net_weight} Q. Net MSP payable: ₹${params.net_payable.toLocaleString('en-IN')}. J-Form Slip: ${params.slip_number}.`,
 meta: { token_number: params.token_number, amount: params.net_payable }
 });
 }

 public notifyDBTDisbursed(params: {
 farmer_name: string;
 phone: string;
 amount: number;
 dbt_ref: string;
 }) {
 this.dispatch({
 channel: 'SMS',
 recipient_name: params.farmer_name,
 recipient_phone: params.phone,
 title: '💰 DBT Amount Credited',
 message: `Govt of West Bengal Agri Dept: ₹${params.amount.toLocaleString('en-IN')} successfully credited to your Aadhaar-linked bank account via PFMS. Ref: ${params.dbt_ref}.`,
 meta: { dbt_ref: params.dbt_ref, amount: params.amount }
 });
 }
}

export const NotificationService = new NotificationDispatchService();
