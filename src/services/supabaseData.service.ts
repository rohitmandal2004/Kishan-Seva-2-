import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from './mockStore';
import { ProcurementCentre, Booking, QualityCheck, Weighment, BookingStatus, QueuePrediction } from '@/types';

/**
 * Kishan Seva Data Service — v2 (Optimized Backend)
 *
 * Architecture:
 * 1. Database-first: All heavy logic (geo-spatial, queue aggregation,
 * atomic transactions) is executed server-side via Supabase RPCs/Views.
 * 2. Client fallback: When Supabase is not configured or VITE_ENABLE_DEMO_DATA
 * is enabled, the mockStore provides local data.
 * 3. Scoped real-time: Subscriptions are filtered by role (farmer_id / centre_id)
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
 if (!error && data && data.length > 0) {
 return data as ProcurementCentre[];
 }
 } catch (err) {
 console.warn('Supabase getCentres error:', err);
 }
 }
 return mockStore.getCentres();
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
 console.warn('Supabase findNearestCentres RPC error, falling back to client-side:', err);
 }
 }
 // Fallback: return all centres from mockStore (client will score them)
 return mockStore.getCentres().map(c => ({
 ...c,
 distance_km: c.distance_km ?? 5,
 travel_time_mins: Math.round((c.distance_km || 5) / 25 * 60)
 }));
 },

 /** Toggle centre active/maintenance status. */
 toggleCentreStatus: async (centreId: string): Promise<void> => {
 mockStore.toggleCentreStatus(centreId);

 if (isSupabaseConfigured()) {
 try {
 const centre = mockStore.getCentreById(centreId);
 if (centre) {
 await supabase
 .from('procurement_centres')
 .update({ status: centre.status, updated_at: new Date().toISOString() })
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
 if (!error && data && data.length > 0) {
 const normalized: Booking[] = data.map((b: any) => {
 const qc = Array.isArray(b.quality_checks) ? b.quality_checks[0] : b.quality_checks;
 const wm = Array.isArray(b.weighments) ? b.weighments[0] : b.weighments;
 return {
 ...b,
 quality_data: qc || b.quality_data,
 weighment_data: wm || b.weighment_data,
 };
 });
 mockStore.syncBookings(normalized);
 return normalized;
 }
 } catch (err) {
 console.warn('Supabase getBookings error:', err);
 }
 }
 return mockStore.getBookings();
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
 const localBooking = mockStore.createBooking({
 ...params,
 farmerId: params.farmer_id || 'unknown',
 farmerName: params.farmer_name || 'Farmer',
 farmerPhone: params.farmer_phone || '',
 farmerEmail: params.farmer_email,
 farmerCode: params.farmer_code,
 clerkUserId: params.clerk_user_id,
 });

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

 // Only call Supabase RPC if we have a valid UUID or fallback UUID
 const finalFarmerId = (resolvedFarmerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedFarmerId))
 ? resolvedFarmerId
 : 'f1111111-1111-1111-1111-111111111111';

 const { data, error } = await supabase.rpc('create_booking', {
 p_farmer_id: finalFarmerId,
 p_centre_id: params.centre_id,
 p_crop_name: params.crop_name,
 p_expected_quantity: params.expected_quantity_q,
 p_slot_date: params.slot_date,
 p_slot_time: params.slot_time,
 p_vehicle_number: params.vehicle_number || 'WB 25 B 4821',
 p_vehicle_type: params.vehicle_type || 'Tractor Trolley',
 });

 if (!error && data) {
 const remoteBooking = data as Booking;
 mockStore.syncBookings([remoteBooking]);
 return remoteBooking;
 } else if (error) {
 console.warn('Supabase create_booking RPC error, using local booking:', error.message);
 }
 } catch (err) {
 console.warn('Supabase create_booking RPC exception, using local booking:', err);
 }
 }

 return localBooking;
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
 // 1. Update local reactive store
 mockStore.updateBookingStatus(bookingId, status, qualityData, weighmentData);

 // 2. Sync to Supabase if configured
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
 // If error code is PGRST202 (parameter mismatch because p_rejection_reason isn't on remote DB), retry without it
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
 const updated = mockStore.advanceBooking(bookingId);
 if (isSupabaseConfigured() && updated) {
 try {
 await SupabaseDataService.updateBookingStatus(
 bookingId,
 updated.status,
 updated.quality_data,
 updated.weighment_data
 );
 } catch (err) {
 console.warn('Supabase advanceBooking error:', err);
 }
 }
 return updated;
 },

 // ─── Scoped Real-time Subscriptions ──────────────────────────────────

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
