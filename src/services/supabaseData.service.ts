import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ProcurementCentre, Booking, QualityCheck, Weighment, BookingStatus, QueuePrediction } from '@/types';

/**
 * Kishan Seva Data Service — v2 (Optimized Backend)
 *
 * Architecture:
 * 1. Database-first: All heavy logic (geo-spatial, queue aggregation,
 * atomic transactions) is executed server-side via Supabase RPCs/Views.
 * 2. Scoped real-time: Subscriptions are filtered by role (farmer_id / centre_id)
 * to minimize bandwidth and enforce security.
 */
const isDemoDataEnabled = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

export const SupabaseDataService = {
 // ─── Procurement Centres ─────────────────────────────────────────────

 /** Fetch all active procurement centres. */
 getCentres: async (): Promise<ProcurementCentre[]> => {
 if (isSupabaseConfigured()) {
 try {
 const { data, error } = await supabase
 .from('procurement_centres')
 .select('*')
 .order('name', { ascending: true });
 if (!error && data) {
 return data as ProcurementCentre[];
 }
 } catch (err) {
 console.warn('Supabase getCentres error:', err);
 }
 }
 return [];
 },

 /**
 * PostGIS-powered nearest centre lookup.
 * Executes entirely on the database — returns only the top N results
 * with pre-calculated distance_km and travel_time_mins.
 * Falls back to client-side mockStore if Supabase is unavailable.
 */
 findNearestCentres: async (
 lat: number,
 lon: number,
 cropName?: string,
 limit: number = 10
 ): Promise<(ProcurementCentre & { distance_km: number; travel_time_mins: number })[]> => {
 if (isSupabaseConfigured()) {
 try {
 const { data, error } = await supabase.rpc('find_nearest_centres', {
 p_lat: lat,
 p_lon: lon,
 p_crop_name: cropName || null,
 p_limit: limit,
 });
 if (!error && data && data.length > 0) {
 return data as (ProcurementCentre & { distance_km: number; travel_time_mins: number })[];
 }
 } catch (err) {
 console.warn('Supabase findNearestCentres RPC error:', err);
 }
 }
 return [];
 },

 /** Toggle centre active/maintenance status. */
 toggleCentreStatus: async (centreId: string): Promise<void> => {
 if (isSupabaseConfigured()) {
 try {
 const { data: centre } = await supabase.from('procurement_centres').select('status').eq('id', centreId).single();
 if (centre) {
 const newStatus = centre.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
 await supabase
 .from('procurement_centres')
 .update({ status: newStatus, updated_at: new Date().toISOString() })
 .eq('id', centreId);
 }
 } catch (err) {
 console.warn('Supabase toggleCentreStatus error:', err);
 }
 }
 },

 // ─── Bookings ────────────────────────────────────────────────────────

 /** Fetch all bookings (with normalized joined quality checks & weighments). */
 getBookings: async (): Promise<Booking[]> => {
 if (isSupabaseConfigured()) {
 try {
 const { data, error } = await supabase
 .from('bookings')
 .select('*, quality_checks(*), weighments(*)')
 .order('created_at', { ascending: false });
 if (!error && data) {
 const normalized: Booking[] = data.map((b: any) => {
 const qc = Array.isArray(b.quality_checks) ? b.quality_checks[0] : b.quality_checks;
 const wm = Array.isArray(b.weighments) ? b.weighments[0] : b.weighments;
 return {
 ...b,
 quality_data: qc || b.quality_data,
 weighment_data: wm || b.weighment_data,
 };
 });
 return normalized;
 }
 } catch (err) {
 console.warn('Supabase getBookings error:', err);
 }
 }
 return [];
 },

 /** Create a new procurement booking slot atomically via RPC. */
 createBooking: async (params: {
 farmer_id?: string;
 farmer_name?: string;
 farmer_phone?: string;
 farmer_email?: string;
 farmer_code?: string;
 clerk_user_id?: string;
 centre_id: string;
 crop_name: string;
 expected_quantity_q: number;
 slot_date: string;
 slot_time: string;
 vehicle_number?: string;
 vehicle_type?: string;
 }): Promise<Booking> => {
 if (isSupabaseConfigured()) {
 try {
 // Resolve farmer_id to UUID if needed
 let resolvedFarmerId = params.farmer_id;
 const isUuid = resolvedFarmerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedFarmerId);
 
 if (!isUuid) {
 const identifier = params.clerk_user_id || params.farmer_id;
 if (identifier) {
 const { data: profile } = await supabase
 .from('farmer_profiles')
 .select('id')
 .or(`clerk_user_id.eq.${identifier},email.eq.${params.farmer_email || identifier}`)
 .maybeSingle();
 if (profile?.id) {
 resolvedFarmerId = profile.id;
 }
 }
 }

 // Only call Supabase RPC if we have a valid UUID
 const finalFarmerId = (resolvedFarmerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedFarmerId))
 ? resolvedFarmerId
 : null;

 if (!finalFarmerId) {
 throw new Error('Cannot book slot: Valid farmer profile was not found.');
 }

 const { data, error } = await supabase.rpc('create_booking', {
 p_farmer_id: finalFarmerId,
 p_centre_id: params.centre_id,
 p_crop_name: params.crop_name,
 p_expected_quantity: params.expected_quantity_q,
 p_slot_date: params.slot_date,
 p_slot_time: params.slot_time,
 p_vehicle_number: params.vehicle_number || null,
 p_vehicle_type: params.vehicle_type || 'Tractor Trolley',
 });

 if (!error && data) {
 return data as Booking;
 } else if (error) {
 console.error('Supabase create_booking RPC error:', error.message);
 throw new Error(`Booking failed: ${error.message}`);
 }
 } catch (err: any) {
 console.error('Supabase create_booking RPC exception:', err);
 throw err;
 }
 }

 throw new Error('Database service not configured. Cannot process slot booking.');
 },

 /** Postpone an active booking for rescheduling within 7 days. */
 postponeBooking: async (bookingId: string): Promise<void> => {
 if (isSupabaseConfigured()) {
 const { error } = await supabase.rpc('postpone_booking', {
 p_booking_id: bookingId,
 });
 if (error) {
 console.error('Supabase postpone_booking RPC error:', error.message);
 throw new Error(`Cancellation failed: ${error.message}`);
 }
 }
 },

 /** Reschedule a postponed booking. */
 rescheduleBooking: async (
 bookingId: string,
 newCentreId: string,
 newSlotDate: string,
 newSlotTime: string
 ): Promise<any> => {
 if (isSupabaseConfigured()) {
 const { data, error } = await supabase.rpc('reschedule_booking', {
 p_booking_id: bookingId,
 p_new_centre_id: newCentreId,
 p_new_slot_date: newSlotDate,
 p_new_slot_time: newSlotTime,
 });
 if (error) {
 console.error('Supabase reschedule_booking RPC error:', error.message);
 throw new Error(`Rescheduling failed: ${error.message}`);
 }
 return data;
 }
 },

 // ─── Atomic Transaction RPCs ─────────────────────────────────────────

 /**
 * Atomic status update with optional quality check + weighment data.
 */
 updateBookingStatus: async (
 bookingId: string,
 status: BookingStatus,
 qualityData?: QualityCheck,
 weighmentData?: Weighment
 ): Promise<void> => {
 if (isSupabaseConfigured()) {
 try {
 const payload: Record<string, any> = {
 p_booking_id: bookingId,
 p_status: status,
 // Quality check fields
 p_moisture_percent: qualityData?.moisture_percent ?? null,
 p_foreign_matter_percent: qualityData?.foreign_matter_percent ?? null,
 p_broken_grain_percent: qualityData?.broken_grain_percent ?? null,
 p_grade: qualityData?.grade ?? null,
 p_inspector_name: qualityData?.inspector_name ?? null,
 p_certificate_id: qualityData?.certificate_id ?? null,
 p_rejection_reason: qualityData?.rejection_reason ?? null,
 // Weighment fields
 p_gross_weight_q: weighmentData?.gross_weight_q ?? null,
 p_tare_weight_q: weighmentData?.tare_weight_q ?? null,
 p_net_weight_q: weighmentData?.net_weight_q ?? null,
 p_msp_rate_per_q: weighmentData?.msp_rate_per_q ?? null,
 p_gross_amount: weighmentData?.gross_amount ?? null,
 p_moisture_deduction: weighmentData?.moisture_deduction ?? null,
 p_handling_charge: weighmentData?.handling_charge ?? null,
 p_net_payable: weighmentData?.net_payable ?? null,
 p_slip_number: weighmentData?.slip_number ?? null,
 p_weighbridge_operator: weighmentData?.weighbridge_operator ?? null,
 p_dbt_status: weighmentData?.dbt_status ?? null,
 p_transaction_ref: weighmentData?.transaction_ref ?? null,
 };

 const { error } = await supabase.rpc('submit_weighment_transaction', payload);

 if (error) {
 if (error.code === 'PGRST202') {
 const { p_rejection_reason, ...legacyPayload } = payload;
 const { error: retryErr } = await supabase.rpc('submit_weighment_transaction', legacyPayload);
 if (!retryErr && qualityData?.rejection_reason) {
 await supabase
 .from('quality_checks')
 .update({ rejection_reason: qualityData.rejection_reason })
 .eq('booking_id', bookingId);
 }
 } else {
 console.warn('Supabase submit_weighment_transaction warning:', error.message);
 }
 }
 } catch (err) {
 console.warn('Supabase submit_weighment_transaction error:', err);
 }
 }
 },

 // ─── Queue Prediction (Server-side) ──────────────────────────────────

 /**
 * Fetch queue prediction from the database view/RPC.
 */
 getQueuePrediction: async (centreId: string): Promise<QueuePrediction | null> => {
 if (isSupabaseConfigured()) {
 try {
 const { data, error } = await supabase.rpc('get_queue_prediction', {
 p_centre_id: centreId,
 });
 if (!error && data && data.length > 0) {
 return data[0] as QueuePrediction;
 }
 } catch (err) {
 console.warn('Supabase getQueuePrediction RPC error:', err);
 }
 }
 return null;
 },

 /** Advance booking in the queue state machine. */
 advanceBooking: async (bookingId: string): Promise<Booking | undefined> => {
 if (isSupabaseConfigured()) {
 try {
 const { data: booking } = await supabase.from('bookings').select('status').eq('id', bookingId).single();
 if (booking) {
 const currentStatus = booking.status;
 let nextStatus: BookingStatus | null = null;
 if (currentStatus === 'BOOKED') nextStatus = 'CHECKED_IN';
 else if (currentStatus === 'CHECKED_IN') nextStatus = 'WAITING';
 else if (currentStatus === 'WAITING') nextStatus = 'CALLED';
 else if (currentStatus === 'CALLED') nextStatus = 'QUALITY_TESTING';
 else if (currentStatus === 'QUALITY_TESTING') nextStatus = 'WEIGHMENT';
 else if (currentStatus === 'WEIGHMENT') nextStatus = 'COMPLETED';
 
 if (nextStatus) {
 await SupabaseDataService.updateBookingStatus(bookingId, nextStatus);
 const { data: updatedBooking } = await supabase
 .from('bookings')
 .select('*, quality_checks(*), weighments(*)')
 .eq('id', bookingId)
 .single();
 if (updatedBooking) {
 const qc = Array.isArray(updatedBooking.quality_checks) ? updatedBooking.quality_checks[0] : updatedBooking.quality_checks;
 const wm = Array.isArray(updatedBooking.weighments) ? updatedBooking.weighments[0] : updatedBooking.weighments;
 return {
 ...updatedBooking,
 quality_data: qc || updatedBooking.quality_data,
 weighment_data: wm || updatedBooking.weighment_data,
 } as Booking;
 }
 }
 }
 } catch (err) {
 console.warn('Supabase advanceBooking error:', err);
 }
 }
 return undefined;
 },

  // ─── Scoped Real-time Subscriptions ──────────────────────────────────

  /**
   * Record the outcome of a recommendation vs user choice.
   */
  recordRecommendationOutcome: async (params: {
    farmer_id: string;
    booking_id: string;
    farmer_lat?: number;
    farmer_lon?: number;
    recommended_centre_id: string;
    recommended_journey_score: number;
    chosen_centre_id: string;
    chosen_journey_score: number;
    reason_for_deviation?: string;
  }): Promise<void> => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('recommendation_outcomes').insert({
          farmer_id: params.farmer_id,
          booking_id: params.booking_id,
          farmer_lat: params.farmer_lat,
          farmer_lon: params.farmer_lon,
          recommended_centre_id: params.recommended_centre_id,
          recommended_journey_score: params.recommended_journey_score,
          chosen_centre_id: params.chosen_centre_id,
          chosen_journey_score: params.chosen_journey_score,
          reason_for_deviation: params.reason_for_deviation,
        });
      } catch (err) {
        console.warn('Supabase recordRecommendationOutcome error:', err);
      }
    }
  },

 /**
 * Subscribe to real-time booking changes scoped by role:
 * - Farmers: Only receive updates for their own farmer_id
 * - Operators: Only receive updates for their centre_id
 * - Admins: Receive all booking updates (unfiltered)
 *
 * This replaces the old broad `public-db-changes` channel.
 */
 subscribeRealtime: (
 onUpdate: () => void,
 scope?: { farmerId?: string; centreId?: string; role?: 'FARMER' | 'OPERATOR' | 'ADMIN' }
 ) => {
 if (isSupabaseConfigured()) {
 try {
 const channelName = scope?.farmerId
 ? `bookings-farmer-${scope.farmerId}`
 : scope?.centreId
 ? `bookings-centre-${scope.centreId}`
 : 'bookings-all';

 // Build the filter based on role/scope
 const bookingFilter: Record<string, string> =
 scope?.farmerId
 ? { event: '*', schema: 'public', table: 'bookings', filter: `farmer_id=eq.${scope.farmerId}` }
 : scope?.centreId
 ? { event: '*', schema: 'public', table: 'bookings', filter: `centre_id=eq.${scope.centreId}` }
 : { event: '*', schema: 'public', table: 'bookings' };

 const channel = supabase
 .channel(channelName)
 .on(
 'postgres_changes',
 bookingFilter as any,
 () => onUpdate()
 )
 .on(
 'postgres_changes',
 { event: '*', schema: 'public', table: 'procurement_centres' },
 () => onUpdate()
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 } catch (err) {
 console.warn('Supabase realtime subscription fallback:', err);
 }
 }
 return () => {};
 },
};
