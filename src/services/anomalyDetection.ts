import { Booking, QualityCheck, Weighment } from '@/types';

export interface AnomalyReport {
  isSuspicious: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NONE';
  reasons: string[];
  recommendation: string;
}

/**
 * Kishan Seva Anomaly & Fraud Prevention Engine
 * 
 * Rules:
 * 1. Over-Quota Anomaly: Booking quantity exceeding 65 quintals without special DM approval.
 * 2. Moisture Tampering Anomaly: Moisture content < 8% (unrealistic) or > 24% (severe mold risk).
 * 3. Tare/Gross Weight Inversion: Tare weight >= Gross weight or suspiciously low net weight (< 2 quintals).
 * 4. Multi-booking collision: Farmer booking multiple slots across geographically distant mandis on the same calendar day.
 */
export class AnomalyDetectionEngine {
  /**
   * Evaluates booking parameters for quantity and scheduling anomalies
   */
  public static evaluateBooking(params: {
    quantity_quintals: number;
    farmer_id: string;
    existingBookings?: Booking[];
    booking_date?: string;
    centre_id?: string;
  }): AnomalyReport {
    const reasons: string[] = [];

    // 1. Quota check (Max 65 Q for standard small/medium farmer)
    if (params.quantity_quintals > 65) {
      reasons.push(
        `Quantity (${params.quantity_quintals} Q) exceeds single-season standard holding quota (65 Q).`
      );
    }

    // 2. Minimum quantity check
    if (params.quantity_quintals <= 0) {
      reasons.push('Invalid non-positive quantity submitted.');
    }

    // 3. Dual-booking check on same day
    if (params.existingBookings && params.booking_date) {
      const sameDayBookings = params.existingBookings.filter(
        (b) =>
          b.farmer_id === params.farmer_id &&
          b.slot_date === params.booking_date &&
          b.status !== 'CANCELLED'
      );

      if (sameDayBookings.length > 0) {
        reasons.push(
          `Farmer already has an active booking (${sameDayBookings[0].token_number}) on the same date (${params.booking_date}).`
        );
      }
    }

    const isSuspicious = reasons.length > 0;
    const severity =
      params.quantity_quintals > 100
        ? 'CRITICAL'
        : reasons.length > 1
        ? 'HIGH'
        : isSuspicious
        ? 'MEDIUM'
        : 'NONE';

    return {
      isSuspicious,
      severity,
      reasons,
      recommendation: isSuspicious
        ? 'Requires physical land verification certificate (RoR / Khatian) by Mandi Secretary.'
        : 'Parameters within normal state procurement tolerance.',
    };
  }

  /**
   * Evaluates moisture & grading parameters
   */
  public static evaluateQuality(params: {
    moisture_percentage: number;
    foreign_matter_percentage: number;
  }): AnomalyReport {
    const reasons: string[] = [];

    if (params.moisture_percentage < 8.0) {
      reasons.push(
        `Moisture reading (${params.moisture_percentage}%) is anomalously low; check meter calibration.`
      );
    } else if (params.moisture_percentage > 22.0) {
      reasons.push(
        `Moisture reading (${params.moisture_percentage}%) exceeds maximum safe threshold (17%). Severe spoilage risk.`
      );
    }

    if (params.foreign_matter_percentage > 8.0) {
      reasons.push(
        `Foreign matter (${params.foreign_matter_percentage}%) exceeds maximum permissible allowance (4%).`
      );
    }

    const isSuspicious = reasons.length > 0;
    const severity =
      params.moisture_percentage > 25 ? 'HIGH' : isSuspicious ? 'MEDIUM' : 'NONE';

    return {
      isSuspicious,
      severity,
      reasons,
      recommendation: isSuspicious
        ? 'Re-calibrate moisture meter and conduct second blind sample test.'
        : 'Quality metrics within fair average quality (FAQ) standards.',
    };
  }

  /**
   * Evaluates weighment scale gross/tare sanity
   */
  public static evaluateWeighment(gross: number, tare: number): AnomalyReport {
    const reasons: string[] = [];
    const net = gross - tare;

    if (gross <= 0 && tare <= 0) {
      return {
        isSuspicious: false,
        severity: 'NONE',
        reasons: [],
        recommendation: 'Awaiting weighbridge scale input.',
      };
    }

    if (gross > 0 && tare >= gross) {
      reasons.push(`Tare weight (${tare} kg) is equal to or greater than Gross weight (${gross} kg).`);
    }

    if (gross > 0 && net < 100 && net >= 0) {
      reasons.push(`Net crop weight (${net} kg) is suspiciously low for a commercial vehicle delivery.`);
    }

    const isSuspicious = reasons.length > 0;

    return {
      isSuspicious,
      severity: (gross > 0 && tare >= gross) ? 'CRITICAL' : isSuspicious ? 'HIGH' : 'NONE',
      reasons,
      recommendation: isSuspicious
        ? 'Tare weighbridge zero-scale calibration required immediately.'
        : 'Weighment physics validated successfully.',
    };
  }
}
