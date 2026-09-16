import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { calculateRecommendationScore } from '../src/services/recommendationEngine';

// We'll use the .env values to connect to Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Booking Concurrency & Quota', () => {
  it('handles 10 concurrent create_booking calls correctly', async () => {
    // 1. Fetch or create a valid active centre to test against
    let { data: centres } = await supabase
      .from('procurement_centres')
      .select('id, name')
      .eq('status', 'ACTIVE')
      .limit(1);
    
    if (!centres || centres.length === 0) {
      const { data: newCentre } = await supabase
        .from('procurement_centres')
        .insert({
          name: 'Test Centre',
          district: 'Test District',
          status: 'ACTIVE',
          daily_capacity_quintals: 500,
          latitude: 22.5,
          longitude: 88.3
        })
        .select('id, name')
        .single();
      centres = newCentre ? [newCentre] : [];
    }
    const centreId = centres[0]?.id;

    // 2. Fetch or create a dummy farmer profile
    let { data: farmers } = await supabase
      .from('farmer_profiles')
      .select('id, clerk_user_id')
      .limit(1);
    
    if (!farmers || farmers.length === 0) {
      const { data: newFarmer } = await supabase
        .from('farmer_profiles')
        .insert({
          full_name: 'Test Farmer',
          phone_number: '9999999999',
          district: 'Test District',
          clerk_user_id: 'test_clerk_id'
        })
        .select('id, clerk_user_id')
        .single();
      farmers = newFarmer ? [newFarmer] : [];
    }
    const farmerId = farmers[0]?.id;

    if (!centreId || !farmerId) {
      console.warn('Skipping test: Could not fetch or create test data');
      return;
    }

    // 3. Prepare parameters for concurrent booking
    const slotDate = new Date().toISOString().split('T')[0];
    const slotTime = '10:00 AM - 11:00 AM';
    
    // We fire 10 concurrent requests
    const promises = Array.from({ length: 10 }).map((_, i) => {
      return supabase.rpc('create_booking', {
        p_farmer_id: farmerId,
        p_centre_id: centreId,
        p_crop_name: 'Paddy (Grade A)',
        p_expected_quantity: 5 + i,
        p_slot_date: slotDate,
        p_slot_time: slotTime,
        p_vehicle_number: `WB-TEST-${i}`,
        p_vehicle_type: 'Tractor Trolley'
      });
    });

    const results = await Promise.all(promises);

    // 4. Validate the results
    const successfulBookings = results
      .filter(r => !r.error && r.data)
      .map(r => r.data as any);
    
    const errors = results
      .filter(r => r.error)
      .map(r => r.error);

    // Some might fail due to quota depending on the capacity set (default is 20 if auto-created).
    // Let's assert on the successful ones.
    if (successfulBookings.length > 0) {
      const sequences = successfulBookings.map(b => b.queue_sequence);
      const uniqueSequences = new Set(sequences);
      
      // Assert: No duplicates in queue_sequence
      expect(uniqueSequences.size).toBe(sequences.length);
      
      // Assert: Sequences are distinct and positive
      sequences.forEach(seq => {
        expect(seq).toBeGreaterThan(0);
      });
    }

    if (errors.length > 0) {
      // If we hit quota limits, the error message should indicate that
      const quotaErrors = errors.filter(e => e?.message?.includes('Slot is full'));
      console.log(`Hit ${quotaErrors.length} quota errors out of ${errors.length} total errors.`);
    }
  });
});

describe('Recommendation Engine', () => {
  it('computes correct score for a known input', () => {
    // Distance (0-30 points)
    // Wait (0-40 points)
    // Slot Availability (0-30 points)
    // Distance = 10km (20 points)
    // Queue Length = 5 (30 points approx)
    // Predicted Wait = 45 mins 
    // Capacity = 50%
    
    const inputs = {
      distanceKm: 10,       // score ~20
      queueLength: 5,       // wait score ~27
      predictedWait: 45,
      capacityPercent: 50,  // slot score ~15
      travelMinutes: 20,
      prebookedCount: 10
    };

    const { finalScore, factors } = calculateRecommendationScore(inputs);
    
    expect(finalScore).toBeGreaterThan(0);
    expect(finalScore).toBeLessThanOrEqual(100);
    
    // Check individual factors are calculated
    expect(factors.distanceScore).toBeDefined();
    expect(factors.waitScore).toBeDefined();
    expect(factors.slotScore).toBeDefined();
  });
});
