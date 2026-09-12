import { QueuePrediction, Booking } from '@/types';
import { SupabaseDataService } from './supabaseData.service';

/**
 * Queue Prediction Engine — v2 (Database-first)
 *
 * Primary path: Calls the `get_queue_prediction` Supabase RPC which executes
 * a SQL view aggregation on the server. The client receives a tiny summary
 * object instead of downloading all booking rows.
 *
 * Fallback path: When Supabase is unavailable, performs the same calculation
 * client-side from locally cached bookings.
 */
export async function calculateQueuePredictionAsync(
 centreId: string,
 bookings: Booking[],
 averageProcessingTimeMins: number = 4.5,
 noShowRatePercent: number = 5
): Promise<QueuePrediction> {
  // 1. Try ML Service (FastAPI)
  try {
    const queueState = calculateQueuePrediction(centreId, bookings, averageProcessingTimeMins, noShowRatePercent);
    const date = new Date();
    
    // In production, URL would be loaded from env. Using localhost for SIH demo.
    const response = await fetch('http://localhost:8000/predict_wait_time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: centreId,
        day_of_week: date.getDay(),
        hour_of_day: date.getHours(),
        current_queue_length: queueState.current_queue,
        active_counters: 2, // Mocked for now
        avg_quantity_qtl: 30, // Mocked for now
        avg_service_time_min: averageProcessingTimeMins,
        no_show_count: Math.round(queueState.prebooked_tokens * (noShowRatePercent / 100)),
        weather_condition: 'Clear' // Mocked for now, in a real app would be from weather service
      }),
    });

    if (response.ok) {
      const mlData = await response.json();
      return {
        ...queueState,
        predicted_wait_mins: mlData.predicted_wait_mins,
        confidence: mlData.fallback_used ? 'MEDIUM' : 'HIGH'
      };
    }
  } catch (err) {
    console.warn('ML Prediction service unavailable. Falling back to Supabase/Heuristic:', err);
  }

  // 2. Try database-first heuristic
  try {
    const dbResult = await SupabaseDataService.getQueuePrediction(centreId);
    if (dbResult) {
      return dbResult;
    }
  } catch (err) {
    console.warn('Database queue prediction failed, using client-side fallback:', err);
  }

 // Fallback: client-side calculation
 return calculateQueuePrediction(centreId, bookings, averageProcessingTimeMins, noShowRatePercent);
}

/**
 * Client-side Queue Prediction (Fallback)
 *
 * Mathematical waiting time forecast model based on:
 * - Current checked-in queue
 * - Pre-booked tokens for the current slot window
 * - Rolling average processing time per vehicle (default 4.5 mins)
 * - Historical no-show rate adjustment (default ~5%)
 * - Weighbridge & moisture assay throughput
 */
export function calculateQueuePrediction(
 centreId: string,
 bookings: Booking[],
 averageProcessingTimeMins: number = 4.5,
 noShowRatePercent: number = 5
): QueuePrediction {
 const centreBookings = bookings.filter((b) => b.centre_id === centreId);

 const checkedIn = centreBookings.filter(
 (b) => b.status === 'CHECKED_IN' || b.status === 'WAITING'
 ).length;

 const currentlyProcessing = centreBookings.filter(
 (b) => b.status === 'QUALITY_TESTING' || b.status === 'WEIGHMENT'
 ).length;

 const prebooked = centreBookings.filter(
 (b) => b.status === 'BOOKED'
 ).length;

 // Expected arrivals in the immediate hour adjusted for no-show probability
 const expectedArrivals = Math.round(prebooked * (1 - noShowRatePercent / 100));

 // Total active workload
 const effectiveQueue = checkedIn + currentlyProcessing + Math.round(expectedArrivals * 0.4);

 // Predicted wait calculation in minutes
 const predictedWaitMins = Math.max(5, Math.round(effectiveQueue * averageProcessingTimeMins));

 // Processing rate per hour
 const processingRatePerHour = Math.round(60 / averageProcessingTimeMins);

 // Confidence tier
 let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
 if (prebooked > 20) {
 confidence = 'MEDIUM';
 }
 if (centreBookings.length < 3) {
 confidence = 'LOW';
 }

 return {
 centre_id: centreId,
 current_queue: checkedIn + currentlyProcessing,
 prebooked_tokens: prebooked,
 checked_in_farmers: checkedIn,
 currently_processing: currentlyProcessing,
 expected_next_hour: expectedArrivals,
 predicted_wait_mins: predictedWaitMins,
 confidence,
 processing_rate_per_hour: processingRatePerHour,
 };
}
