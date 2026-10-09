import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Sprout,
  ArrowRight,
  ShieldCheck,
  Share2,
  TrendingUp,
  AlertTriangle,
  MapPin,
  MessageCircle
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';
import { Booking as BookingRecord } from '@/types';
import { useSupabase } from '@/context/SupabaseContext';
import { useLanguage } from '@/services/i18n';


import { SupabaseDataService } from '@/services/supabaseData.service';
import { evaluateCentreRecommendations } from '@/services/recommendationEngine';
import { getCoordinatesForVillage } from '@/services/locationNames';
import {
  generateWhatsAppShareUrl,
  speakBookingConfirmed,
} from '@/services/soundAndSpeech';
import { AnomalyDetectionEngine } from '@/services/anomalyDetection';
import { NotificationService } from '@/services/notificationService';
import { getDeterministicWeather } from '@/services/weatherService';




export default function SlotBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCentreId = searchParams.get('centre');
  const rescheduleBookingId = searchParams.get('reschedule');

  const { t } = useLanguage();
  const store = useKishanData();
  const { farmer, clerkUser } = useSupabase();
  const centres = store.getCentres();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(rescheduleBookingId ? 2 : 1);
  const [selectedCrop, setSelectedCrop] = useState(farmer?.crop_name || 'Paddy (Grade A)');
  const [quantity, setQuantity] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType] = useState('Tractor Trolley');

  useEffect(() => {
    if (rescheduleBookingId) {
      const existing = store.bookings.find(b => b.id === rescheduleBookingId);
      if (existing) {
        setSelectedCrop(existing.crop_name);
        setQuantity(existing.expected_quantity_q.toString());
      }
    } else if (farmer?.crop_name) {
      setSelectedCrop(farmer.crop_name);
    }
  }, [farmer?.crop_name, rescheduleBookingId, store.bookings]);

  useEffect(() => {
    const handleOnline = async () => {
      const offlineQ = JSON.parse(localStorage.getItem('kishan_offline_bookings') || '[]');
      if (offlineQ.length > 0) {
        toast.info(`Syncing ${offlineQ.length} offline bookings...`);
        let synced = 0;
        for (const item of offlineQ) {
          try {
            if (item.type === 'create') {
              await store.createBooking(item.payload);
            } else if (item.type === 'reschedule') {
              await store.rescheduleBooking(item.bookingId, item.centreId, item.date, item.slot);
            }
            synced++;
          } catch (e) {
            console.error('Failed to sync offline item', e);
          }
        }
        localStorage.removeItem('kishan_offline_bookings');
        if (synced > 0) {
          toast.success(`Successfully synced ${synced} offline bookings!`);
        }
      }
    };
    window.addEventListener('online', handleOnline);
    // Also trigger on mount just in case we came online before mounting
    if (navigator.onLine) {
      handleOnline();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [store]);

  // farmer is guaranteed by RequireRole. We use fallback to satisfy TS.
  const f = farmer || { id: 'fallback', full_name: 'Fallback', phone: '', village: 'Barasat', district: 'North 24 Parganas' } as any;

  const farmerCoords = useMemo(() => {
    if (f.latitude && f.longitude) {
      return { latitude: f.latitude, longitude: f.longitude };
    }
    return getCoordinatesForVillage(f.village, f.district);
  }, [f.latitude, f.longitude, f.village, f.district]);

  const recommendations = useMemo(() => {
    return evaluateCentreRecommendations(
      centres,
      farmerCoords,
      selectedCrop,
      parseFloat(quantity) || 40
    );
  }, [centres, farmerCoords, selectedCrop, quantity]);

  const displayRecommendations = useMemo(() => {
    if (recommendations.length <= 4) return recommendations;
    const top3 = recommendations.slice(0, 3);
    const hasNearest = top3.some(r => r.is_nearest);
    if (hasNearest) {
      return recommendations.slice(0, 4);
    }
    const nearest = recommendations.find(r => r.is_nearest);
    return nearest ? [...top3, nearest] : recommendations.slice(0, 4);
  }, [recommendations]);

  const [selectedCentreId, setSelectedCentreId] = useState<string>(
    preSelectedCentreId || recommendations[0]?.centre.id || centres[0]?.id || 'centre-1'
  );

  useEffect(() => {
    if (!preSelectedCentreId && recommendations.length > 0) {
      // Only reset if current selection is not among top recommendations
      const isCurrentlyRecommended = recommendations.some(r => r.centre.id === selectedCentreId);
      if (!isCurrentlyRecommended) {
        setSelectedCentreId(recommendations[0].centre.id);
      }
    }
  }, [preSelectedCentreId, recommendations, selectedCentreId]);

  const availableDates = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i + 1));
  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM - 11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  const selectedCentre = centres.find((c) => c.id === selectedCentreId) || centres[0];
  const selectedMsp =
    OFFICIAL_MSP_RATES.find((m) => m.crop === selectedCrop) || OFFICIAL_MSP_RATES[0];
  const numQuantity = parseFloat(quantity) || 0;
  const estimatedPayout = numQuantity * selectedMsp.rate_per_quintal;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const weather = useMemo(() => {
    return getDeterministicWeather(selectedCentre.district || selectedCentre.name, selectedDate);
  }, [selectedCentre, selectedDate]);

  const anomalyReport = AnomalyDetectionEngine.evaluateBooking({
    quantity_quintals: numQuantity,
    farmer_id: f.id,
    existingBookings: store.getBookings() as any,
    booking_date: format(selectedDate, 'yyyy-MM-dd'),
    centre_id: selectedCentre.id,
  });

  const slots = [
    { id: 'slot-1', time: '09:00 AM - 10:00 AM', status: 'AVAILABLE', remaining: 15, rushLevel: 'High', waitMins: '55-70' },
    { id: 'slot-2', time: '10:00 AM - 11:00 AM', status: 'FAST_FILLING', remaining: 4, rushLevel: 'Peak', waitMins: '65-80' },
    { id: 'slot-3', time: '11:00 AM - 12:00 PM', status: 'AVAILABLE', remaining: 8, rushLevel: 'Medium', waitMins: '35-45' },
    { id: 'slot-4', time: '01:00 PM - 02:00 PM', status: 'AVAILABLE', remaining: 18, rushLevel: 'Low', waitMins: '15-20', isRecommended: true },
    { id: 'slot-5', time: '02:00 PM - 03:00 PM', status: 'AVAILABLE', remaining: 20, rushLevel: 'Low', waitMins: '15-20', isRecommended: true },
    { id: 'slot-6', time: '03:00 PM - 04:00 PM', status: 'AVAILABLE', remaining: 12, rushLevel: 'Medium', waitMins: '25-35' },
  ];

  const handleCreateBooking = async () => {
    if (numQuantity <= 0) {
      toast.error('Please enter a valid quantity (greater than 0 quintals).');
      return;
    }
    setIsSubmitting(true);
    try {
      let booking;
      if (rescheduleBookingId) {
        if (!navigator.onLine) {
          toast.warning('You are offline. Reschedule saved locally and will sync when internet is back.');
          const offlineQ = JSON.parse(localStorage.getItem('kishan_offline_bookings') || '[]');
          offlineQ.push({ 
            type: 'reschedule', 
            bookingId: rescheduleBookingId, 
            centreId: selectedCentre.id, 
            date: format(selectedDate, 'yyyy-MM-dd'), 
            slot: selectedSlot 
          });
          localStorage.setItem('kishan_offline_bookings', JSON.stringify(offlineQ));
          
          booking = store.bookings.find(b => b.id === rescheduleBookingId);
          if (booking) {
             booking = { ...booking, centre_id: selectedCentre.id, slot_date: format(selectedDate, 'yyyy-MM-dd'), slot_time: selectedSlot };
          }
        } else {
          await store.rescheduleBooking(
            rescheduleBookingId,
            selectedCentre.id,
            format(selectedDate, 'yyyy-MM-dd'),
            selectedSlot
          );
          booking = store.bookings.find(b => b.id === rescheduleBookingId);
        }
        if (!booking) throw new Error('Could not retrieve rescheduled booking');
      } else {
        const payload = {
          farmer_id: f.id || f.clerk_user_id || 'farmer',
          farmer_name: f.full_name,
          farmer_phone: f.phone,
          farmer_email: f.email,
          farmer_code: f.farmer_code,
          clerk_user_id: f.clerk_user_id,
          centre_id: selectedCentre.id,
          crop_name: selectedCrop,
          expected_quantity_q: numQuantity,
          slot_date: format(selectedDate, 'yyyy-MM-dd'),
          slot_time: selectedSlot,
          vehicle_number: vehicleNumber ? vehicleNumber.trim() : undefined,
          vehicle_type: vehicleType,
        };

        if (!navigator.onLine) {
          toast.warning('You are offline. Booking saved locally and will sync when internet is back.');
          const fakeId = `offline-${Date.now()}`;
          booking = {
            ...payload,
            id: fakeId,
            token_number: `OFF-${Math.floor(10000 + Math.random() * 90000)}`,
            status: 'BOOKED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as unknown as BookingRecord;
          
          const offlineQ = JSON.parse(localStorage.getItem('kishan_offline_bookings') || '[]');
          offlineQ.push({ type: 'create', payload, generatedBooking: booking });
          localStorage.setItem('kishan_offline_bookings', JSON.stringify(offlineQ));
        } else {
          booking = await store.createBooking(payload);
        }
      }

      if (!booking) {
        throw new Error("Failed to create or retrieve booking");
      }

      setConfirmedBooking(booking);

      try {
        const topRec = recommendations[0];
        const chosenRec = recommendations.find(r => r.centre.id === selectedCentre.id) || topRec;
        
        await SupabaseDataService.recordRecommendationOutcome({
          farmer_id: f.id || f.clerk_user_id || 'farmer',
          booking_id: booking.id,
          farmer_lat: farmer?.latitude,
          farmer_lon: farmer?.longitude,
          recommended_centre_id: topRec?.centre?.id,
          recommended_journey_score: topRec?.journey_score,
          chosen_centre_id: selectedCentre.id,
          chosen_journey_score: chosenRec?.journey_score,
        });
      } catch {
        // Soft fail — tracking is non-critical
      }

      try {
        localStorage.removeItem('kishan_offline_pass');
        if (f?.id) {
          localStorage.setItem(`kishan_offline_pass_${f.id}`, JSON.stringify(booking));
        }
      } catch {
        // ignore
      }

      setCurrentStep(4);
      toast.custom((_t) => (
        <div className="bg-[#075E54] text-white p-4 rounded-xl shadow-lg w-80 flex gap-3 pointer-events-auto items-start animate-in fade-in slide-in-from-top-2 mx-auto">
          <div className="bg-[#25D366] rounded-full p-2 shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm mb-1">WhatsApp • Kishan Seva</p>
            <p className="text-xs text-[#DCF8C6]">Namaste {f.full_name.split(' ')[0]}, your slot at {selectedCentre.name} is confirmed! Token: <span className="font-bold">{booking.token_number}</span></p>
          </div>
        </div>
      ), { duration: 6000, position: 'top-center' });

      speakBookingConfirmed(booking.token_number, selectedCentre.name, 'bn');

      NotificationService.notifyBookingConfirmed({
        farmer_name: f.full_name,
        phone: clerkUser?.primaryPhoneNumber?.phoneNumber || f.phone || '+91 98301 23456',
        token_number: booking.token_number,
        centre_name: selectedCentre.name,
        slot_date: format(selectedDate, 'dd MMM yyyy'),
        time_window: selectedSlot,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to book slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!farmer) return null;

  return (
    <div className="relative min-h-screen">
      {/* Sleek Gradient Background */}
      <div className="absolute inset-0 bg-slate-50 z-0 pointer-events-none"></div>

      <div className="relative z-10 p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 font-sans">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => currentStep > (rescheduleBookingId ? 2 : 1) && currentStep < 4 ? setCurrentStep((prev) => (prev - 1) as any) : navigate('/farmer/dashboard')}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100 hover:scale-105 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t('book_slot_title')}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Assured MSP • Zero Middlemen</p>
          </div>
        </div>

        {/* Premium Stepper */}
        <div className="flex justify-between items-center mb-10 relative px-2">
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-200 -z-10 transform -translate-y-1/2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 ease-in-out" 
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
          </div>
          {[
            { num: 1, title: t('step_produce') },
            { num: 2, title: t('step_mandi') },
            { num: 3, title: t('step_slot') },
            { num: 4, title: t('step_token') },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-2.5 bg-transparent">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ease-out ${
                  isCurrent ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-4 ring-emerald-50 scale-110' :
                  isDone ? 'bg-emerald-500 text-white shadow-md' :
                  'bg-white text-slate-400 border-2 border-slate-200 shadow-sm'
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  isCurrent ? 'text-emerald-700' : 
                  isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: Produce */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="bg-emerald-100/50 p-2.5 rounded-2xl">
                  <Sprout className="w-6 h-6 text-emerald-600" />
                </div>
                {t('produce_transport')}
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">{t('tell_us_bringing')}</p>
            </div>

            {anomalyReport.isSuspicious && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4 text-amber-900 shadow-sm">
                <div className="bg-amber-100 p-2 rounded-xl shrink-0 h-fit">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-sm">
                  <strong className="block font-bold mb-1 text-amber-800">Notice:</strong>
                  <p className="text-amber-700">{anomalyReport.reasons[0]}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t('select_crop')}</Label>
                <div className="relative">
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full h-14 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 transition-all focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {OFFICIAL_MSP_RATES.map((m, idx) => (
                      <option key={idx} value={m.crop}>{m.crop} ({m.crop_hi})</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <ChevronLeft className="w-4 h-4 text-slate-400 -rotate-90" />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                  <span>{t('expected_qty')}</span>
                  <span className="text-slate-400 font-semibold normal-case">{t('in_quintals')}</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 45"
                  className="h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 px-4"
                />
              </div>

              <div className="space-y-2.5 sm:col-span-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t('vehicle_no')}</Label>
                <Input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. WB 25 B 4821"
                  className="h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 uppercase transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 px-4 placeholder:normal-case"
                />
              </div>
            </div>

            {/* Glassmorphism Live MSP Calculation */}
            <div className="p-8 bg-gradient-to-br from-emerald-600 via-emerald-700 to-[#0A2E1A] rounded-2xl shadow-xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>

              <div className="relative z-10">
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> {t('govt_assured_msp')}
                </p>
                <p className="text-2xl font-bold flex items-baseline gap-1">
                  ₹{selectedMsp.rate_per_quintal.toLocaleString('en-IN')} 
                  <span className="text-sm font-medium text-emerald-200/80">/ {t('per_quintal')}</span>
                </p>
              </div>
              <div className="relative z-10 text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-8">
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-1.5">{t('est_dbt')}</p>
                <p className="text-4xl font-black tracking-tight text-white drop-shadow-sm">₹{estimatedPayout.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button onClick={() => setCurrentStep(2)} className="bg-[#0A2E1A] hover:bg-[#0f4527] text-white rounded-xl h-14 px-10 text-base font-bold shadow-lg transition-transform active:scale-[0.98] gap-3">
                {t('continue_btn')} <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Centre */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-10 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="bg-emerald-100/50 p-2.5 rounded-2xl">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                {t('select_mandi')}
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">{t('smart_recs')}</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {displayRecommendations.map((rec) => {
                const isSelected = selectedCentreId === rec.centre.id;
                return (
                  <div
                    key={rec.centre.id}
                    onClick={() => setSelectedCentreId(rec.centre.id)}
                    className={`relative p-5 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden group ${
                      isSelected
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-[0_8px_30px_rgba(16,185,129,0.15)]'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    {rec.is_optimal && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-emerald-400 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                        {t('ai_top_choice')}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-bold text-lg leading-tight transition-colors ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {rec.centre.name}
                          </h3>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <p className="text-xs text-slate-500 mb-5 max-w-[85%]">{rec.centre.address}</p>

                        <div className="flex flex-wrap gap-5 text-sm">
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="font-bold text-slate-700">{rec.distance_km} km</span>
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isSelected ? 'bg-emerald-100/50 border-emerald-100' : 'bg-emerald-50/50 border-emerald-50'}`}>
                            <Clock className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-emerald-500'}`} />
                            <span className={`font-bold ${isSelected ? 'text-emerald-800' : 'text-emerald-700'}`}>~{rec.predicted_wait_mins}m {t('wait_mins')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1 mt-2 sm:mt-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto border sm:border-0 border-slate-100">
                        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{t('score')}</div>
                        <div className={`text-3xl font-black ${isSelected ? 'text-emerald-600' : 'text-slate-700'}`}>{rec.journey_score}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex justify-between items-center border-t border-slate-100 pt-6">
              <Button variant="ghost" onClick={() => setCurrentStep(rescheduleBookingId ? 2 : 1)} className="rounded-xl h-14 px-6 text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-bold text-base transition-colors">
                {t('back_btn')}
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="bg-[#0A2E1A] hover:bg-[#0f4527] text-white rounded-xl h-14 px-10 text-base font-bold shadow-lg transition-transform active:scale-[0.98] gap-3">
                {t('continue_btn')} <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Slot */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-10 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="mb-8 border-b border-slate-100 pb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="bg-emerald-100/50 p-2.5 rounded-2xl">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  {t('pick_date_time')}
                </h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">{t('select_optimal')}</p>
              </div>
              <Button variant="ghost" onClick={() => setCurrentStep(2)} className="hidden sm:flex rounded-xl h-12 px-4 text-slate-500 hover:bg-slate-100 font-bold transition-colors">
                {t('back_btn')}
              </Button>
            </div>

            <div className="mb-10">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-4">{t('delivery_date')}</Label>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
                {availableDates.map((date, idx) => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 w-[85px] h-[100px] rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.3)] ring-2 ring-emerald-600 ring-offset-2 scale-105'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                      <span className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {format(date, 'EEE')}
                      </span>
                      <span className="text-3xl font-black">{format(date, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">{t('time_slot')}</Label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 flex items-center shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> {t('afternoon_faster')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((s) => {
                  const isSelected = selectedSlot === s.time;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(s.time)}
                      className={`relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start text-left overflow-hidden group ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                        }`}
                    >
                      {s.isRecommended && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm">
                          Best
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      
                      <span className={`font-black text-base mb-2 transition-colors ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>{s.time}</span>
                      <div className="flex items-center gap-2 text-xs w-full">
                        <span className={`px-2.5 py-1 rounded-md font-bold shadow-sm ${s.rushLevel === 'Low' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            s.rushLevel === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                          {s.rushLevel === 'Low' ? t('fast') : s.rushLevel === 'Medium' ? t('normal') : t('peak')}
                        </span>
                        <span className="text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          ~{s.waitMins}m
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0A2E1A] text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('ready_confirm')}
                </p>
                <h3 className="text-xl font-bold mb-1">{selectedCrop} @ {selectedCentre.name}</h3>
                <p className="text-sm font-medium text-emerald-100/70">{format(selectedDate, 'EEEE, MMM d, yyyy')} • {selectedSlot}</p>
              </div>
              <Button
                onClick={handleCreateBooking}
                disabled={isSubmitting}
                className="relative z-10 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black h-14 px-10 text-base rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform active:scale-[0.98] whitespace-nowrap"
              >
                {isSubmitting ? t('processing') : rescheduleBookingId ? t('confirm_reschedule') : t('generate_token')}
              </Button>
            </div>
            
            <div className="mt-6 flex justify-center sm:hidden">
              <Button variant="ghost" onClick={() => setCurrentStep(2)} className="rounded-xl h-12 px-6 text-slate-500 hover:bg-slate-100 font-bold transition-colors w-full">
                {t('back_btn')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {currentStep === 4 && confirmedBooking && (
          <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 relative">
              {/* Ticket cutouts */}
              <div className="absolute top-[210px] -left-4 w-8 h-8 bg-slate-50 rounded-full border-r border-slate-200 z-20"></div>
              <div className="absolute top-[210px] -right-4 w-8 h-8 bg-slate-50 rounded-full border-l border-slate-200 z-20"></div>

              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-[#0A2E1A] p-10 pb-12 text-center text-white relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute top-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
                
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-inner relative z-10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-300 drop-shadow-md" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 mb-3 relative z-10">{t('digital_token_issued')}</p>
                <h2 className="text-4xl font-black tracking-widest font-mono text-white mb-4 drop-shadow-md relative z-10">
                  {confirmedBooking.token_number}
                </h2>
                <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold text-emerald-100 relative z-10 border border-white/5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> {t('saved_offline')}
                </div>
              </div>

              {/* Dashed line separating ticket parts */}
              <div className="relative h-0 border-t-2 border-dashed border-slate-200 mx-8 -mt-px z-10"></div>

              <div className="p-8 pt-10 relative bg-white">
                <div className="flex justify-center mb-8">
                  <div className="p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                    <QRCode
                      value={JSON.stringify({ token: confirmedBooking.token_number })}
                      size={160}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      fgColor="#0A2E1A"
                    />
                  </div>
                </div>

                <div className="space-y-4 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mt-0.5">{t('farmer_label')}</span>
                    <span className="font-bold text-slate-900">{farmer.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mt-0.5">{t('centre_label')}</span>
                    <span className="font-bold text-slate-900 text-right max-w-[65%] leading-tight">{confirmedBooking.centre_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mt-0.5">{t('produce_label')}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{confirmedBooking.expected_quantity_q} Q {confirmedBooking.crop_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">{t('time_label')}</span>
                    <span className="font-bold text-slate-900">{confirmedBooking.slot_time}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => window.open(generateWhatsAppShareUrl({
                    tokenNumber: confirmedBooking.token_number, centreName: confirmedBooking.centre_name, slotDate: confirmedBooking.slot_date, slotTime: confirmedBooking.slot_time, cropName: confirmedBooking.crop_name, quantityQ: confirmedBooking.expected_quantity_q, vehicleNumber: confirmedBooking.vehicle_number
                  }), '_blank')}
                    className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold h-14 rounded-xl shadow-[0_4px_15px_rgba(37,211,102,0.3)] gap-2 text-base transition-transform active:scale-[0.98]">
                    <Share2 className="w-5 h-5" /> {t('share_whatsapp')}
                  </Button>
                  <Button onClick={() => navigate('/farmer/queue')} variant="outline" className="w-full h-14 rounded-xl font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-base transition-all">
                    {t('track_queue')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
