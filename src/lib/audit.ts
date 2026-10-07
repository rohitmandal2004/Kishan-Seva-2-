import { supabase } from './supabase';

type AuditAction = 'OPERATOR_APPROVED' | 'OPERATOR_REJECTED' | 'PAYMENT_PROCESSED' | 'BOOKING_CREATED' | 'CENTRE_UPDATED';
type EntityType = 'operator_profile' | 'farmer_profile' | 'procurement_centre' | 'booking' | 'payment';

export async function logAudit(
  actorId: string,
  actorRole: 'ADMIN' | 'OPERATOR' | 'FARMER',
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata
    });
    if (error) {
      console.error('[Audit Logger] Failed to log action:', error);
    }
  } catch (err) {
    console.error('[Audit Logger] Exception:', err);
  }
}

export async function sendNotification(
  userId: string | undefined, // mapped to public.users or string identifier
  type: string,
  title: string,
  message: string,
  phone?: string
) {
  if (!userId && !phone) return; // Need at least one way to contact
  
  try {
    // In a real system, you'd integrate with AWS SES, SendGrid, Twilio, etc.
    // For now we just insert into our notifications table.
    
    // Check if the user exists in public.users to satisfy foreign key constraints
    let validUserId = null;
    if (userId) {
      const { data } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
      if (data) validUserId = data.id;
    }
    
    const { error } = await supabase.from('notifications').insert({
      user_id: validUserId, // Can be null if sending SMS
      phone: phone,
      type,
      title,
      message,
    });
    
    if (error) {
      console.error('[Notification Service] Failed to send notification:', error);
    }
  } catch (err) {
    console.error('[Notification Service] Exception:', err);
  }
}
