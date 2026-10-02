import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Printer,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { QRScannerModal } from '@/components/operator/QRScannerModal';
import { AnomalyDetectionEngine } from '@/services/anomalyDetection';
import { NotificationService } from '@/services/notificationService';
import { SmsGateway } from '@/services/smsGateway';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Booking } from '@/types';
import { useSupabase } from '@/context/SupabaseContext';
import { useOperator } from '@/hooks/useOperator';
import { useRef } from 'react';
import { useGSAP, gsap } from '@/lib/gsap';
import { generateReceiptPdf } from '@/services/receiptGenerator';
import { Download } from 'lucide-react';

const weighmentSchema = z
  .object({
    gross: z.coerce.number().min(0.1, 'Gross weight must be greater than 0'),
    tare: z.coerce.number().min(0.1, 'Tare weight must be greater than 0'),
  })
  .refine((data) => data.gross > data.tare, {
    message: 'Gross weight must be greater than Tare weight',
    path: ['tare'],
  });

type WeighmentFormData = z.infer<typeof weighmentSchema>;

export default function Weighment() {
  const navigate = useNavigate();
  const store = useKishanData();
  const { clerkUser } = useSupabase();
  const { operatorCentreId } = useOperator();

  const bookings = store
    .getBookings()
    .filter((b) => b.centre_id === operatorCentreId && b.status !== 'COMPLETED' && b.status !== 'CANCELLED');

  const [selectedTokenId, setSelectedTokenId] = useState<string>(bookings[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const selectedBooking = bookings.find((b) => b.id === selectedTokenId) || bookings[0];

  useGSAP(() => {
    if (completedBooking) {
      // Animate the checkmark path drawing
      gsap.fromTo(".receipt-check-path",
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 0.8, ease: "power2.out", delay: 0.3 }
      );
      // Animate the receipt scaling in
      gsap.fromTo(".receipt-card",
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }
      );
    }
  }, { scope: container, dependencies: [completedBooking] });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WeighmentFormData>({
    resolver: zodResolver(weighmentSchema),
    defaultValues: {
      gross: 62.5,
      tare: 17.5,
    },
  });

  const grossVal = watch('gross') || 0;
  const tareVal = watch('tare') || 0;

  const net = Math.max(0, parseFloat((grossVal - tareVal).toFixed(2)));
  const mspRate =
    OFFICIAL_MSP_RATES.find((m) => m.crop === selectedBooking?.crop_name)?.rate_per_quintal ||
    2320;

  const handlingCharge = 450;
  const grossPayable = net * mspRate;
  const netPayable = Math.max(0, grossPayable - handlingCharge);

  // Run anomaly check on entered weights
  const anomalyReport = AnomalyDetectionEngine.evaluateWeighment(grossVal * 100, tareVal * 100);

  const handleScanSuccess = (booking: Booking) => {
    setSelectedTokenId(booking.id);
    toast.success(`Loaded booking data for Token ${booking.token_number}`);
  };

  const onSubmit = async (data: WeighmentFormData) => {
    if (!selectedBooking) return;

    setLoading(true);
    try {
      const slipNum = `J-FORM-KSP-${Math.floor(1000 + Math.random() * 9000)}`;
      const dbtRef = `DBT/RBI/${Date.now().toString().slice(-8)}`;

      // Recalculate from validated form data to avoid stale values
      const actualNet = Math.max(0, parseFloat((data.gross - data.tare).toFixed(2)));
      const actualGrossPayable = actualNet * mspRate;
      const actualNetPayable = Math.max(0, actualGrossPayable - handlingCharge);

      await SupabaseDataService.updateBookingStatus(
        selectedBooking.id,
        'COMPLETED',
        selectedBooking.quality_data || {
          booking_id: selectedBooking.id,
          moisture_percent: 13.8,
          foreign_matter_percent: 1.1,
          broken_grain_percent: 2.0,
          grade: 'Grade A',
          inspector_name: clerkUser?.fullName || 'Operator',
          timestamp: new Date().toISOString(),
          certificate_id: 'QC-KSP-2026-AUTO',
        },
        {
          booking_id: selectedBooking.id,
          gross_weight_q: data.gross,
          tare_weight_q: data.tare,
          net_weight_q: actualNet,
          msp_rate_per_q: mspRate,
          gross_amount: actualGrossPayable,
          moisture_deduction: 0,
          handling_charge: handlingCharge,
          net_payable: actualNetPayable,
          slip_number: slipNum,
          weighbridge_operator: clerkUser?.fullName || 'Operator',
          timestamp: new Date().toISOString(),
          dbt_status: 'DISBURSED',
          transaction_ref: dbtRef,
        }
      );

      const updated = store.getBookings().find((b) => b.id === selectedBooking.id);
      if (updated) {
        setCompletedBooking(updated);

        // Multi-channel notifications
        NotificationService.notifyWeighmentCertified({
          farmer_name: updated.farmer_name,
          phone: updated.farmer_phone || '',
          token_number: updated.token_number,
          net_weight: actualNet,
          net_payable: actualNetPayable,
          slip_number: slipNum,
        });

        NotificationService.notifyDBTDisbursed({
          farmer_name: updated.farmer_name,
          phone: updated.farmer_phone || '',
          amount: actualNetPayable,
          dbt_ref: dbtRef,
        });

        SmsGateway.sendSmsNotification(
          updated.farmer_phone || '',
          `[Simulated SMS] Kishan Seva: Weighment complete. Net weight: ${actualNet} Q. Rs ${actualNetPayable.toLocaleString('en-IN')} will be credited via PFMS.`
        );
      }
      setLoading(false);
      toast.success('e-J-Form generated and DBT Payout Dispatched!');
    } catch {
      toast.error('Failed to generate e-J-Form');
      setLoading(false);
    }
  };

  return (
    <div ref={container} className="max-w-[1400px] mx-auto w-full p-4 md:p-6 text-slate-900 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 border-b-2 border-slate-900 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-900 text-white px-2 py-0.5 mb-2 inline-block">
            Mandi Weighbridge Console
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight uppercase">
            Electronic Weighbridge &amp; e-J-Form
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-mono uppercase tracking-widest">
            Automated gross/tare scale recording, QR optical scanning, and DBT payment dispatch.
          </p>
        </div>

        <button
          onClick={() => setIsQRScannerOpen(true)}
          className="bg-emerald-50 text-emerald-900 border-2 border-emerald-900 hover:bg-emerald-100 font-bold h-12 px-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-colors"
        >
          <QrCode className="w-4 h-4" /> SCAN MANDI GATE PASS
        </button>
      </div>

      {completedBooking && completedBooking.weighment_data ? (
        /* Official Electronic J-Form (Receipt) */
        <div className="duration-300">
          <div className="receipt-card p-0 border-2 border-slate-900 bg-white max-w-2xl mx-auto shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="p-6 bg-emerald-900 text-white text-center border-b-2 border-slate-900">
              <div className="w-14 h-14 bg-white text-emerald-900 rounded-none border-2 border-slate-900 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="w-8 h-8">
                  <path className="receipt-check-path" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path className="receipt-check-path" d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-800 border-2 border-emerald-950 px-3 py-1 text-emerald-100">
                Procurement &amp; Weighment Certified
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-4 tracking-tight uppercase">Official e-J-Form Generated</h2>
              <p className="text-xs text-emerald-100 font-mono mt-1 font-bold">
                RECEIPT #{completedBooking.weighment_data.slip_number}
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Slip Content */}
              <div className="bg-white p-5 sm:p-6 border-2 border-slate-900 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.svg"
                      alt="Kishan Seva"
                      className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0"
                    />
                    <div>
                      <p className="font-black text-slate-900 uppercase tracking-widest text-sm">
                        Govt. of India
                      </p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                        Dept of Food &amp; Public Distribution
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 text-[10px] block mb-1">
                      {(completedBooking.weighment_data.timestamp || new Date().toISOString()).split('T')[0]}
                    </span>
                    <span className="text-[10px] text-white bg-emerald-700 px-2 py-0.5 font-bold uppercase tracking-widest border border-emerald-900">DBT DISBURSED</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-slate-900 uppercase tracking-widest text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Farmer</span>
                    <strong className="text-slate-900 text-xs">{completedBooking.farmer_name}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Token</span>
                    <strong className="text-slate-900 text-xs">{completedBooking.token_number}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Centre</span>
                    <strong className="text-slate-900 text-xs">{completedBooking.centre_name}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Crop</span>
                    <strong className="text-emerald-900 text-xs">{completedBooking.crop_name}</strong>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Gross Wt.</span>
                    <strong className="text-slate-900 text-xs">{completedBooking.weighment_data.gross_weight_q} Q</strong>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-1">Tare Wt.</span>
                    <strong className="text-slate-900 text-xs">{completedBooking.weighment_data.tare_weight_q} Q</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-100 border-2 border-slate-900 flex justify-between items-center text-sm font-black text-slate-900 uppercase tracking-widest mt-4">
                  <span>Net Accepted Produce:</span>
                  <span className="text-base">{completedBooking.weighment_data.net_weight_q.toFixed(2)} Q</span>
                </div>

                <div className="space-y-2 pt-4 text-xs font-bold uppercase tracking-widest">
                  <div className="flex justify-between text-slate-600">
                    <span>MSP Rate:</span>
                    <span className="text-slate-900">
                      ₹{completedBooking.weighment_data.msp_rate_per_q} / Q
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Mandi Deduction:</span>
                    <span className="text-slate-900">-₹{completedBooking.weighment_data.handling_charge}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-slate-900 text-base font-black text-slate-900 mt-4">
                    <span>Net Disbursed:</span>
                    <span className="text-emerald-800 text-xl">
                      ₹{completedBooking.weighment_data.net_payable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 text-[9px] text-slate-500 flex justify-between border-t-2 border-slate-900 font-bold uppercase tracking-widest">
                  <span>REF: {completedBooking.weighment_data.transaction_ref}</span>
                  <span>OP: {completedBooking.weighment_data.weighbridge_operator}</span>
                </div>
              </div>

              {/* Slip Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-100 h-12 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" /> PRINT SLIP
                </button>
                <button
                  onClick={async () => {
                    const paymentData = {
                      rate_per_q: completedBooking.weighment_data?.msp_rate_per_q,
                      total_amount: completedBooking.weighment_data?.net_payable,
                      dbt_reference: completedBooking.weighment_data?.transaction_ref
                    };
                    toast.promise(
                      generateReceiptPdf(completedBooking, completedBooking.weighment_data, paymentData),
                      {
                        loading: 'Generating PDF receipt...',
                        success: 'Receipt downloaded successfully!',
                        error: 'Failed to generate receipt'
                      }
                    );
                  }}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white border-2 border-emerald-950 h-12 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> DOWNLOAD PDF
                </button>
                <button
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-950 h-12 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors"
                  onClick={() => {
                    setCompletedBooking(null);
                    navigate('/operator/queue');
                  }}
                >
                  CALL NEXT <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Weighbridge Recording Form */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Token & Farmer Specs */}
          <div className="md:col-span-1 space-y-6">
            <div className="p-6 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block">Select Weighed Token</Label>
                <button
                  type="button"
                  onClick={() => setIsQRScannerOpen(true)}
                  className="text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 flex items-center gap-1 border-2 border-transparent hover:border-emerald-700 transition-colors"
                >
                  <QrCode className="w-3 h-3" /> SCAN
                </button>
              </div>

              <select
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(e.target.value)}
                className="w-full h-12 px-3 bg-white border-2 border-slate-900 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 mb-6"
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.token_number} — {b.farmer_name}
                  </option>
                ))}
              </select>

              {selectedBooking && (
                <div className="p-4 bg-slate-100 border-2 border-slate-900 text-[10px] font-bold uppercase tracking-widest space-y-3">
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-0.5">Token</span>
                    <span className="font-black text-slate-900 text-xs">{selectedBooking.token_number}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-0.5">Farmer</span>
                    <span className="font-black text-slate-900 text-xs">{selectedBooking.farmer_name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-0.5">Crop</span>
                    <span className="font-black text-emerald-900 text-xs">{selectedBooking.crop_name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 mb-0.5">Vehicle</span>
                    <span className="font-black text-slate-900 text-xs">{selectedBooking.vehicle_number}</span>
                  </div>
                  <div className="flex flex-col pt-3 border-t-2 border-slate-900">
                    <span className="text-slate-500 mb-0.5">QC Status</span>
                    <span className="text-emerald-700 font-black text-xs">
                      ● {selectedBooking.quality_data?.grade || 'GRADE A'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-2 border-blue-900 bg-blue-50 text-blue-900 shadow-[4px_4px_0px_rgba(30,58,138,1)]">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-900" /> CALIBRATION NOTICE
              </p>
              <p className="text-[10px] text-blue-900 font-bold uppercase tracking-widest leading-relaxed">
                Platform Scale #1 calibrated and certified by Dept. of Legal Metrology. CCTV recording active.
              </p>
            </div>
          </div>

          {/* Right: Electronic Weight Capture */}
          <div className="md:col-span-2">
            <div className="p-6 sm:p-8 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-slate-900">
                <div className="w-12 h-12 bg-emerald-900 text-white rounded-none flex items-center justify-center border-2 border-slate-900">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Electronic Scale Recording</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Capture Gross (Loaded) and Tare (Empty) weights</p>
                </div>
              </div>

              {/* Anomaly Detection Banner — color-coded by severity */}
              {anomalyReport.isSuspicious && (
                <div className={`mb-6 p-4 flex items-start gap-3 border-2 ${anomalyReport.severity === 'CRITICAL'
                    ? 'bg-red-50 border-red-900'
                    : 'bg-amber-50 border-amber-900'
                  }`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${anomalyReport.severity === 'CRITICAL' ? 'text-red-900' : 'text-amber-900'
                    }`} />
                  <div>
                    <strong className={`block text-[10px] font-black uppercase tracking-widest ${anomalyReport.severity === 'CRITICAL' ? 'text-red-900' : 'text-amber-900'
                      }`}>
                      {anomalyReport.severity === 'CRITICAL'
                        ? '🚫 CRITICAL — WEIGHBRIDGE ANOMALY: BLOCKED'
                        : `⚠️ ${anomalyReport.severity} — SCALE ANOMALY DETECTED`}
                    </strong>
                    <ul className={`list-disc list-inside mt-2 space-y-1 text-[10px] font-bold uppercase tracking-widest ${anomalyReport.severity === 'CRITICAL' ? 'text-red-900' : 'text-amber-900'
                      }`}>
                      {anomalyReport.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    <p className={`text-[10px] mt-2 font-black uppercase tracking-widest ${anomalyReport.severity === 'CRITICAL' ? 'text-red-900' : 'text-amber-900'
                      }`}>{anomalyReport.recommendation}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Gross Weight (Loaded in Q)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      {...register('gross')}
                      placeholder="e.g. 62.5"
                      className={`h-12 rounded-none border-2 border-slate-900 bg-slate-50 text-sm font-black focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${errors.gross ? 'border-red-900 bg-red-50 text-red-900' : ''}`}
                    />
                    {errors.gross && <p className="text-red-900 font-bold uppercase tracking-widest text-[10px]">{errors.gross.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Tare Weight (Empty in Q)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      {...register('tare')}
                      placeholder="e.g. 17.5"
                      className={`h-12 rounded-none border-2 border-slate-900 bg-slate-50 text-sm font-black focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${errors.tare ? 'border-red-900 bg-red-50 text-red-900' : ''}`}
                    />
                    {errors.tare && <p className="text-red-900 font-bold uppercase tracking-widest text-[10px]">{errors.tare.message}</p>}
                  </div>
                </div>

                {/* Net Produce Computed Banner */}
                <div className="p-4 bg-slate-100 border-2 border-slate-900 flex justify-between items-center mt-6">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Computed Net Produce</span>
                    <p
                      className={`text-3xl font-black mt-1 ${errors.tare ? 'text-red-900' : 'text-slate-900'
                        }`}
                    >
                      {net.toFixed(2)} <span className="text-sm font-bold text-slate-600">Q</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">MSP Rate</span>
                    <p className="text-xl font-black text-emerald-900">₹{mspRate}/Q</p>
                  </div>
                </div>

                {/* Financial Payout Breakdown */}
                <div className="p-5 bg-emerald-50 border-2 border-emerald-900 space-y-3 text-[10px] font-bold uppercase tracking-widest mt-6">
                  <div className="flex justify-between text-emerald-900">
                    <span>Gross Value ({net} Q × ₹{mspRate}):</span>
                    <span className="font-black text-xs">₹{grossPayable.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Mandi Handling Charge:</span>
                    <span>-₹{handlingCharge}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-emerald-900 font-black text-sm text-emerald-900">
                    <span>Net DBT Disbursable:</span>
                    <span className="text-base text-emerald-900">
                      ₹{netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-8 border-t-2 border-slate-900">
                  <button
                    type="submit"
                    disabled={loading || !selectedBooking || net <= 0 || !!errors.tare || !!errors.gross || anomalyReport.severity === 'CRITICAL'}
                    className="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-black h-14 text-xs uppercase tracking-widest border-2 border-emerald-950 flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900 focus-visible:ring-offset-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {anomalyReport.severity === 'CRITICAL' ? 'SUBMISSION BLOCKED — RESOLVE ANOMALY FIRST' : 'CONFIRM WEIGHT & ISSUE OFFICIAL E-J-FORM SLIP'} <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
