import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
   FileCheck,
   Loader2,
   ArrowRight,
   CheckCircle2,
   XCircle,
   ShieldCheck,
   QrCode,
   AlertTriangle,
   Camera,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { QRScannerModal } from '@/components/operator/QRScannerModal';
import { AnomalyDetectionEngine } from '@/services/anomalyDetection';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useOperator } from '@/hooks/useOperator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Booking } from '@/types';

const qualityCheckSchema = z
   .object({
      moisture: z.coerce
         .number()
         .min(0, 'Cannot be negative')
         .max(100, 'Cannot exceed 100%'),
      foreignMatter: z.coerce
         .number()
         .min(0, 'Cannot be negative')
         .max(100, 'Cannot exceed 100%'),
      brokenGrain: z.coerce
         .number()
         .min(0, 'Cannot be negative')
         .max(100, 'Cannot exceed 100%'),
      rejectionReason: z.string().optional(),
      inspectorName: z.string().min(3, 'Inspector name must be at least 3 characters'),
   })
   .refine(
      (data) => {
         if (data.moisture > 17.0 && !data.rejectionReason) {
            return false;
         }
         return true;
      },
      {
         message: 'Rejection reason is required when moisture > 17.0%',
         path: ['rejectionReason'],
      }
   );

type QualityCheckFormData = z.infer<typeof qualityCheckSchema>;

export default function QualityCheck() {
   const navigate = useNavigate();
   const store = useKishanData();
   const { clerkUser } = useSupabase();
   const { operatorCentreId } = useOperator();

   const bookings = store
      .getBookings()
      .filter((b) => b.centre_id === operatorCentreId && b.status !== 'COMPLETED' && b.status !== 'CANCELLED');

   const [selectedTokenId, setSelectedTokenId] = useState<string>(bookings[0]?.id || '');
   const [loading, setLoading] = useState(false);
   const [success, setSuccess] = useState(false);
   const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
   const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

   const selectedBooking = bookings.find((b) => b.id === selectedTokenId) || bookings[0];

   const {
      control,
      register,
      handleSubmit,
      watch,
      formState: { errors },
   } = useForm<QualityCheckFormData>({
      resolver: zodResolver(qualityCheckSchema),
      defaultValues: {
         moisture: 13.8,
         foreignMatter: 1.1,
         brokenGrain: 2.0,
         rejectionReason: '',
         inspectorName: clerkUser?.fullName || clerkUser?.firstName || 'Operator',
      },
   });

   const moistureVal = watch('moisture') || 0;
   const foreignMatterVal = watch('foreignMatter') || 0;

   const grade: 'Grade A' | 'Common' | 'Rejected' =
      moistureVal <= 14.0 ? 'Grade A' : moistureVal <= 17.0 ? 'Common' : 'Rejected';

   // Evaluate quality anomalies
   const anomalyReport = AnomalyDetectionEngine.evaluateQuality({
      moisture_percentage: moistureVal,
      foreign_matter_percentage: foreignMatterVal,
   });

   const handleScanSuccess = (booking: Booking) => {
      setSelectedTokenId(booking.id);
      toast.success(`Loaded QC record for Token ${booking.token_number}`);
   };

   const onSubmit = async (data: QualityCheckFormData) => {
      if (!selectedBooking) return;

      if (grade === 'Rejected' && !evidencePhoto) {
         toast.error('Photo evidence is required for all rejected crops.');
         return;
      }

      setLoading(true);
      try {
         let evidencePhotoUrl = undefined;
         if (evidencePhoto && isSupabaseConfigured()) {
            const fileExt = evidencePhoto.name.split('.').pop();
            const fileName = `qc-evidence-${Date.now()}.${fileExt}`;
            const { data: uploadData, error } = await supabase.storage
               .from('qc-evidence')
               .upload(`rejections/${fileName}`, evidencePhoto);
            if (!error && uploadData) {
               evidencePhotoUrl = uploadData.path;
            } else if (error) {
               console.error('Evidence upload error:', error);
               toast.warning('Evidence upload failed, but proceeding with rejection.');
            }
         }

         const nextStatus = grade === 'Rejected' ? 'CANCELLED' : 'WEIGHMENT';
         await SupabaseDataService.updateBookingStatus(selectedBooking.id, nextStatus, {
            booking_id: selectedBooking.id,
            moisture_percent: data.moisture,
            foreign_matter_percent: data.foreignMatter,
            broken_grain_percent: data.brokenGrain,
            grade,
            inspector_name: data.inspectorName,
            certificate_id: `QC-KSP-${Math.floor(1000 + Math.random() * 9000)}`,
            rejection_reason: grade === 'Rejected' ? data.rejectionReason : undefined,
            evidence_photo_url: evidencePhotoUrl,
         });

         setLoading(false);
         setSuccess(true);
         if (grade === 'Rejected') {
            toast.error('Produce batch marked as Rejected');
         } else {
            toast.success('Quality Certificate issued successfully!');
         }
         setTimeout(() => {
            if (grade === 'Rejected') {
               navigate('/operator/queue');
            } else {
               navigate('/operator/weighment');
            }
         }, 1200);
      } catch {
         toast.error('Failed to issue certificate');
         setLoading(false);
      }
   };

   return (
      <div className="max-w-[1400px] mx-auto w-full font-sans text-slate-900 pb-12 p-4 md:p-6">
         {/* TOP: Command Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-slate-900 pb-4 mb-8">
            <div>
               <span className="inline-block bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mb-2">
                  Quality Control Unit
               </span>
               <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  DIGITAL GRAIN ASSAY
               </h2>
               <p className="text-xs text-slate-600 font-mono mt-1">
                  Automated moisture assay, foreign matter inspection, and official Grade certification.
               </p>
            </div>

            <button
               onClick={() => setIsQRScannerOpen(true)}
               className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 border-2 border-transparent focus-visible:ring-2 focus-visible:ring-slate-900 flex items-center gap-2"
            >
               <QrCode className="w-4 h-4" /> SCAN MANDI PASS [S]
            </button>
         </div>

         {success ? (
            <div
               className={`p-12 border-2 text-center bg-white ${grade === 'Rejected'
                     ? 'border-red-600 border-l-8'
                     : 'border-emerald-600 border-l-8'
                  }`}
            >
               <div
                  className={`w-20 h-20 text-white flex items-center justify-center mx-auto mb-5 ${grade === 'Rejected'
                        ? 'bg-red-600'
                        : 'bg-emerald-600'
                     }`}
               >
                  {grade === 'Rejected' ? <XCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
               </div>
               <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 font-mono ${grade === 'Rejected' ? 'bg-red-100 text-red-900 border border-red-900' : 'bg-emerald-100 text-emerald-900 border border-emerald-900'
                     }`}
               >
                  CERTIFICATION: {grade}
               </span>
               <h3
                  className={`text-3xl font-black mt-4 mb-2 tracking-tighter uppercase ${grade === 'Rejected' ? 'text-red-950' : 'text-emerald-900'
                     }`}
               >
                  {grade === 'Rejected' ? 'PRODUCE REJECTED' : 'QUALITY APPROVED'}
               </h3>
               <p className={`text-sm font-mono font-bold ${grade === 'Rejected' ? 'text-red-700' : 'text-emerald-700'}`}>
                  {grade === 'Rejected'
                     ? 'Notification dispatched to farmer.'
                     : 'Forwarding to Weighbridge Queue...'}
               </p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-slate-900">
               {/* Left Column: Token Selector & Govt Norms */}
               <div className="md:col-span-1 space-y-0 bg-white border-b-2 md:border-b-0 md:border-r-2 border-slate-900">
                  <div className="p-6 h-full">
                     <div className="flex items-center justify-between mb-4">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Target Token</Label>
                        <button
                           type="button"
                           onClick={() => setIsQRScannerOpen(true)}
                           className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-widest hover:bg-slate-200 border border-slate-900"
                        >
                           [ SCAN ]
                        </button>
                     </div>

                     <select
                        value={selectedTokenId}
                        onChange={(e) => setSelectedTokenId(e.target.value)}
                        className="w-full h-12 px-3 bg-white border-2 border-slate-900 text-sm font-bold font-mono focus:outline-none mb-6 rounded-none"
                     >
                        {bookings.map((b) => (
                           <option key={b.id} value={b.id}>
                              {b.token_number} — {b.farmer_name}
                           </option>
                        ))}
                     </select>

                     {selectedBooking && (
                        <div className="p-4 bg-slate-50 border-2 border-slate-900 text-xs space-y-3 font-mono">
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500 uppercase">Token:</span>
                              <span className="font-bold text-slate-900">{selectedBooking.token_number}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500 uppercase">Farmer:</span>
                              <span className="font-bold text-slate-800">{selectedBooking.farmer_name}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500 uppercase">Crop:</span>
                              <span className="font-bold text-slate-900">{selectedBooking.crop_name}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500 uppercase">Expected:</span>
                              <span className="font-bold">{selectedBooking.expected_quantity_q} Q</span>
                           </div>
                           <div className="flex justify-between pt-1">
                              <span className="text-slate-500 uppercase">Vehicle:</span>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="p-6 bg-amber-50/70 border-b-2 md:border-b-0 md:border-r-2 border-slate-900 border-t-2 md:border-t-0">
                     <div className="flex gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[10px] font-mono">
                           <p className="font-bold mb-1 uppercase tracking-widest text-amber-900">Official FCI Standards</p>
                           <ul className="space-y-1 text-amber-800/90 font-bold">
                              <li>
                                 • Moisture &le; 14.0%: <span className="bg-emerald-200 px-1 text-emerald-900">Grade A (Full MSP)</span>
                              </li>
                              <li>
                                 • Moisture 14.1% - 17.0%: <span className="bg-amber-200 px-1 text-amber-900">Common Grade</span>
                              </li>
                              <li>
                                 • Moisture &gt; 17.0%: <span className="bg-red-200 px-1 text-red-900">Rejected / Dryer</span>
                              </li>
                              <li>
                                 • Foreign Matter Max: 1.5%
                              </li>
                           </ul>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column: Lab Form & Live Grade Meter */}
               <div className="md:col-span-2 bg-white">
                  <div className="p-6 md:p-8">
                     <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-slate-900">
                        <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center">
                           <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Lab Moisture &amp; Assay Entry</h3>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Record certified sensor readings</p>
                        </div>
                     </div>

                     {/* Anomaly banner */}
                     {anomalyReport.isSuspicious && (
                        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 flex items-start gap-3">
                           <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                           <div className="text-xs text-amber-900 font-mono">
                              <strong className="block font-bold uppercase tracking-widest">Lab Sensor Alert:</strong>
                              <ul className="list-square list-inside mt-2 space-y-1 text-[10px] text-amber-800 font-bold uppercase">
                                 {anomalyReport.reasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                 ))}
                              </ul>
                           </div>
                        </div>
                     )}

                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Live Moisture Slider & Visual Meter Gauge */}
                        <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-900">
                           <div className="flex justify-between items-center">
                              <div>
                                 <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                    Moisture Content (%) / अनाज में नमी
                                 </Label>
                                 <p className="text-[10px] text-slate-500 font-mono font-bold">
                                    GOVT FAQ: &le; 14.0% FOR GRADE A
                                 </p>
                              </div>
                              <span className="text-3xl font-black font-mono tracking-tighter text-slate-900">
                                 {moistureVal.toFixed(1)}%
                              </span>
                           </div>

                           {/* Visual Color-Coded Gauge Bar */}
                           <div className="space-y-2">
                              <div className="h-4 w-full bg-slate-200 overflow-hidden flex relative border border-slate-900">
                                 <div className="bg-emerald-500 w-[40%]" title="10-14%: Grade A"></div>
                                 <div className="bg-amber-400 w-[30%]" title="14-17%: Common"></div>
                                 <div className="bg-red-500 w-[30%]" title=">17%: Rejection"></div>
                              </div>
                              <div className="flex justify-between text-[10px] font-bold font-mono uppercase tracking-widest">
                                 <span className="text-emerald-700">🟢 &le;14.0% (A)</span>
                                 <span className="text-amber-700">🟡 14.1-17.0%</span>
                                 <span className="text-red-700">🔴 &gt;17.0%</span>
                              </div>
                           </div>

                           <Controller
                              control={control}
                              name="moisture"
                              render={({ field }) => (
                                 <input
                                    type="range"
                                    min="10.0"
                                    max="22.0"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    className="w-full h-4 bg-slate-200 border border-slate-900 appearance-none cursor-pointer accent-slate-900"
                                 />
                              )}
                           />
                           {errors.moisture && (
                              <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">{errors.moisture.message}</p>
                           )}

                           {/* Dynamic Grade Result Pill */}
                           <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                 Auto Grade Assessment:
                              </span>
                              <span
                                 className={`text-[10px] font-black font-mono tracking-widest uppercase px-3 py-1 border-2 ${grade === 'Grade A'
                                       ? 'bg-emerald-100 text-emerald-900 border-emerald-900'
                                       : grade === 'Common'
                                          ? 'bg-amber-100 text-amber-900 border-amber-900'
                                          : 'bg-red-100 text-red-900 border-red-900'
                                    }`}
                              >
                                 {grade === 'Grade A'
                                    ? 'GRADE A (MSP ₹2320)'
                                    : grade === 'Common'
                                       ? 'COMMON GRADE'
                                       : 'REJECTED (HIGH MOISTURE)'}
                              </span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                 Foreign Matter / अपद्रव्य %
                              </Label>
                              <Input
                                 type="number"
                                 step="0.1"
                                 {...register('foreignMatter')}
                                 className={`h-12 rounded-none border-2 text-sm font-bold font-mono focus-visible:ring-slate-900 ${errors.foreignMatter ? 'border-red-500' : 'border-slate-900'}`}
                              />
                              {errors.foreignMatter && (
                                 <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">{errors.foreignMatter.message}</p>
                              )}
                           </div>

                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                 Broken Grain / खंडित दाना %
                              </Label>
                              <Input
                                 type="number"
                                 step="0.1"
                                 {...register('brokenGrain')}
                                 className={`h-12 rounded-none border-2 text-sm font-bold font-mono focus-visible:ring-slate-900 ${errors.brokenGrain ? 'border-red-500' : 'border-slate-900'}`}
                              />
                              {errors.brokenGrain && (
                                 <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">{errors.brokenGrain.message}</p>
                              )}
                           </div>
                        </div>

                        {grade === 'Rejected' && (
                           <div className="space-y-4 p-4 bg-red-50 border-2 border-red-500">
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Rejection Reason Required</Label>
                                 <Input
                                    type="text"
                                    {...register('rejectionReason')}
                                    placeholder="SPECIFY REASON FOR REJECTION..."
                                    className={`h-12 rounded-none font-mono text-xs font-bold uppercase border-2 bg-white ${errors.rejectionReason ? 'border-red-600 focus-visible:ring-red-600' : 'border-red-500 focus-visible:ring-red-500'
                                       }`}
                                 />
                                 {errors.rejectionReason && (
                                    <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">{errors.rejectionReason.message}</p>
                                 )}
                              </div>
                              <div className="space-y-2 border-t border-red-200 pt-4 mt-2">
                                 <Label className="text-[10px] font-bold text-red-900 uppercase tracking-widest flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5" /> Mandatory Photo Evidence
                                 </Label>
                                 <div className="flex items-center gap-3">
                                    <Input 
                                       type="file" 
                                       accept="image/*" 
                                       capture="environment"
                                       onChange={(e) => {
                                          if (e.target.files?.[0]) setEvidencePhoto(e.target.files[0]);
                                       }}
                                       className="rounded-none border-2 border-red-500 bg-white file:bg-red-100 file:border-0 file:text-red-900 file:font-bold file:uppercase file:text-[10px] file:mr-4 file:px-4 file:py-1 hover:file:bg-red-200 h-12"
                                    />
                                 </div>
                                 {!evidencePhoto && <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">A photo of the rejected crop must be uploaded.</p>}
                              </div>
                           </div>
                        )}

                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Certifying Lab Officer</Label>
                           <Input
                              type="text"
                              {...register('inspectorName')}
                              className={`h-12 rounded-none border-2 text-sm font-bold font-mono focus-visible:ring-slate-900 ${errors.inspectorName ? 'border-red-500' : 'border-slate-900'}`}
                           />
                           {errors.inspectorName && (
                              <p className="text-red-600 font-mono text-[10px] font-bold uppercase tracking-widest">{errors.inspectorName.message}</p>
                           )}
                        </div>

                        <div className="pt-4 border-t-2 border-slate-900">
                           <button
                              type="submit"
                              disabled={loading || !selectedBooking}
                              className={`w-full font-bold h-14 text-sm tracking-widest uppercase flex items-center justify-center gap-3 text-white border-2 border-transparent focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors ${grade === 'Rejected' ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600' : 'bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900'
                                 }`}
                           >
                              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                              {grade === 'Rejected'
                                 ? 'CONFIRM REJECTION'
                                 : 'ISSUE CERTIFICATE & SEND TO WEIGHBRIDGE'}
                              {!loading && <ArrowRight className="w-5 h-5" />}
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
