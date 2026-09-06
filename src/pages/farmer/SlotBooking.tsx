import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import QRCode from 'react-qr-code';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Sprout,
  ArrowRight,
  ShieldCheck,
  Download,
  Sparkles,
  Share2,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Cloud,
  CloudRain,
  Droplets,
  Sun,
} from 'lucide-react';
import { useMockStore } from '@/services/useMockStore';
import { OFFICIAL_MSP_RATES, BookingRecord } from '@/services/mockStore';
import { useSupabase } from '@/context/SupabaseContext';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { evaluateCentreRecommendations } from '@/services/recommendationEngine';
import { getCoordinatesForVillage } from '@/services/locationNames';
import {
  generateWhatsAppShareUrl,
  triggerWhatsAppNotification,
  speakBookingConfirmed,
} from '@/services/soundAndSpeech';
import { AnomalyDetectionEngine } from '@/services/anomalyDetection';
import { NotificationService } from '@/services/notificationService';
import { getDeterministicWeather } from '@/services/weatherService';

export default function SlotBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCentreId = searchParams.get('centre');

  const store = useMockStore();
  const { farmer } = useSupabase();
  const centres = store.getCentres();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCrop, setSelectedCrop] = useState('Paddy (Grade A)');
  const [quantity, setQuantity] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType] = useState('Tractor Trolley');
  
  if (!farmer) {
    return null;
  }

  const farmerCoords = useMemo(() => {
    if (farmer.latitude && farmer.longitude) {
      return { latitude: farmer.latitude, longitude: farmer.longitude };
    }
    return getCoordinatesForVillage(farmer.village, farmer.district);
  }, [farmer.latitude, farmer.longitude, farmer.village, farmer.district]);

  const recommendations = evaluateCentreRecommendations(
    centres,
    farmerCoords,
    selectedCrop,
    parseFloat(quantity) || 40
  );

  const [selectedCentreId, setSelectedCentreId] = useState<string>(
    preSelectedCentreId || recommendations[0]?.centre.id || centres[0]?.id || 'centre-1'
  );

  useEffect(() => {
    if (!preSelectedCentreId && recommendations.length > 0) {
      setSelectedCentreId(recommendations[0].centre.id);
    }
  }, [preSelectedCentreId, farmer?.village, recommendations[0]?.centre.id]);

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

  const weather = useMemo(() => {
    return getDeterministicWeather(selectedCentre.district || selectedCentre.name, selectedDate);
  }, [selectedCentre, selectedDate]);

  const anomalyReport = AnomalyDetectionEngine.evaluateBooking({
    quantity_quintals: numQuantity,
    farmer_id: farmer.id || 'farmer',
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
      const booking = await SupabaseDataService.createBooking({
        farmer_id: farmer.id || farmer.clerk_user_id || 'farmer',
        farmer_name: farmer.full_name,
        farmer_phone: farmer.phone,
        farmer_email: farmer.email,
        farmer_code: farmer.farmer_code,
        clerk_user_id: farmer.clerk_user_id,
        centre_id: selectedCentre.id,
        crop_name: selectedCrop,
        expected_quantity_q: numQuantity,
        slot_date: format(selectedDate, 'yyyy-MM-dd'),
        slot_time: selectedSlot,
        vehicle_number: vehicleNumber || 'WB-25-T-1904',
        vehicle_type: vehicleType,
      });

      setConfirmedBooking(booking);

      try {
        localStorage.setItem('kishan_offline_pass', JSON.stringify(booking));
      } catch {
        // ignore
      }

      setCurrentStep(4);
      toast.success('Procurement slot confirmed & token generated!');

      speakBookingConfirmed(booking.token_number, selectedCentre.name, 'bn');

      NotificationService.notifyBookingConfirmed({
        farmer_name: farmer.full_name,
        phone: farmer.phone || '+91 98301 23456',
        token_number: booking.token_number,
        centre_name: selectedCentre.name,
        slot_date: format(selectedDate, 'dd MMM yyyy'),
        time_window: selectedSlot,
      });

      triggerWhatsAppNotification(
        `Your slot for ${numQuantity} Q of ${selectedCrop} is confirmed for ${format(selectedDate, 'dd MMM')} at ${selectedSlot}. Token: ${booking.token_number}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to book slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Sleek Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 z-0 pointer-events-none"></div>
      
      <div className="relative z-10 p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 font-sans">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => currentStep > 1 && currentStep < 4 ? setCurrentStep((prev) => (prev - 1) as any) : navigate('/farmer/dashboard')}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100 hover:scale-105 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart Slot Booking</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Assured MSP • Zero Middlemen</p>
          </div>
        </div>

        {/* Minimalist Stepper */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
          {[
            { num: 1, title: 'Produce' },
            { num: 2, title: 'Mandi' },
            { num: 3, title: 'Slot' },
            { num: 4, title: 'Token' },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-transparent">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCurrent ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] ring-4 ring-emerald-50' : 
                  isDone ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600' : 
                  'bg-white text-slate-400 border-2 border-slate-100'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-emerald-800' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: Produce */}
        {currentStep === 1 && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Sprout className="w-6 h-6 text-emerald-600" /> Produce & Transport
              </h2>
              <p className="text-sm text-slate-500 mt-1">Tell us what you're bringing and how.</p>
            </div>

            {anomalyReport.isSuspicious && (
              <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-2xl flex gap-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <strong className="block font-bold mb-1">Notice:</strong>
                  <p>{anomalyReport.reasons[0]}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Crop Type</Label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {OFFICIAL_MSP_RATES.map((m, idx) => (
                    <option key={idx} value={m.crop}>{m.crop} ({m.crop_hi})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
                  <span>Expected Quantity</span>
                  <span className="text-slate-400 font-medium normal-case">in Quintals</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 45"
                  className="h-12 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-800 transition-colors focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vehicle Number</Label>
                <Input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. WB 25 B 4821"
                  className="h-12 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-800 uppercase transition-colors focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Glassmorphism Live MSP Calculation */}
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl shadow-lg text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Govt Assured MSP
                </p>
                <p className="text-lg font-bold">₹{selectedMsp.rate_per_quintal.toLocaleString('en-IN')} <span className="text-sm font-normal text-emerald-100">/ Quintal</span></p>
              </div>
              <div className="relative z-10 text-left sm:text-right">
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Est. Direct Transfer (DBT)</p>
                <p className="text-3xl font-black tracking-tight">₹{estimatedPayout.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={() => setCurrentStep(2)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-8 text-sm font-bold shadow-md transition-transform active:scale-95 gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Centre */}
        {currentStep === 2 && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" /> Select Mandi Centre
              </h2>
              <p className="text-sm text-slate-500 mt-1">Smart recommendations based on distance and queue times.</p>
            </div>

            <div className="space-y-4">
              {recommendations.slice(0, 4).map((rec) => {
                const isSelected = selectedCentreId === rec.centre.id;
                return (
                  <div
                    key={rec.centre.id}
                    onClick={() => setSelectedCentreId(rec.centre.id)}
                    className={`relative p-5 rounded-3xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    {rec.is_optimal && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                        AI Top Choice
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 leading-tight mb-1">{rec.centre.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">{rec.centre.address}</p>
                        
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-700">{rec.distance_km} km</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-emerald-700">~{rec.predicted_wait_mins}m wait</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <div className="text-2xl font-black text-slate-900">{rec.journey_score}</div>
                        <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Score</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(1)} className="rounded-2xl h-12 px-6 text-slate-500 hover:bg-slate-100 font-bold">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-8 text-sm font-bold shadow-md transition-transform active:scale-95 gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Slot */}
        {currentStep === 3 && (
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-emerald-600" /> Pick Date & Time
              </h2>
              <p className="text-sm text-slate-500 mt-1">Select an optimal slot to minimize wait time.</p>
            </div>

            <div className="mb-8">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Delivery Date</Label>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {availableDates.map((date, idx) => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 w-[72px] h-[84px] rounded-2xl flex flex-col items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-2' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {format(date, 'EEE')}
                      </span>
                      <span className="text-xl font-black">{format(date, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Time Slot</Label>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <TrendingUp className="w-3 h-3 inline mr-1 -mt-0.5" /> Afternoon is 65% faster
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slots.map((s) => {
                  const isSelected = selectedSlot === s.time;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(s.time)}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-start ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      {s.isRecommended && (
                        <div className="absolute top-3 right-3 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Best
                        </div>
                      )}
                      <span className="font-bold text-slate-900 text-sm mb-1.5">{s.time}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          s.rushLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' : 
                          s.rushLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {s.rushLevel === 'Low' ? 'Fast' : s.rushLevel === 'Medium' ? 'Normal' : 'Peak'}
                        </span>
                        <span className="text-slate-500 font-medium">~{s.waitMins}m wait</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl">
              <div>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ready to Confirm</p>
                <h3 className="text-lg font-bold">{selectedCrop} at {selectedCentre.name}</h3>
                <p className="text-sm text-slate-300 mt-1">{format(selectedDate, 'MMM d, yyyy')} • {selectedSlot}</p>
              </div>
              <Button
                onClick={handleCreateBooking}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black h-12 px-8 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform active:scale-95 whitespace-nowrap"
              >
                {isSubmitting ? 'Generating...' : 'Generate Token'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {currentStep === 4 && confirmedBooking && (
          <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
              
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 text-center text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-2">Digital Token Issued</p>
                <h2 className="text-4xl font-black tracking-widest font-mono text-white mb-2 shadow-sm">{confirmedBooking.token_number}</h2>
                <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium text-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Saved Offline
                </div>
              </div>

              <div className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <QRCode
                      value={JSON.stringify({ token: confirmedBooking.token_number })}
                      size={140}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    />
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-50 pb-3">
                    <span className="text-slate-400 font-medium">Farmer</span>
                    <span className="font-bold text-slate-800">{farmer.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-3">
                    <span className="text-slate-400 font-medium">Centre</span>
                    <span className="font-bold text-slate-800 text-right max-w-[60%]">{confirmedBooking.centre_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-3">
                    <span className="text-slate-400 font-medium">Produce</span>
                    <span className="font-bold text-emerald-600">{confirmedBooking.expected_quantity_q} Q {confirmedBooking.crop_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Time</span>
                    <span className="font-bold text-slate-800">{confirmedBooking.slot_time}</span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <Button onClick={() => window.open(generateWhatsAppShareUrl({
                    tokenNumber: confirmedBooking.token_number, centreName: confirmedBooking.centre_name, slotDate: confirmedBooking.slot_date, slotTime: confirmedBooking.slot_time, cropName: confirmedBooking.crop_name, quantityQ: confirmedBooking.expected_quantity_q, vehicleNumber: confirmedBooking.vehicle_number
                  }), '_blank')} 
                  className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold h-12 rounded-2xl shadow-md gap-2">
                    <Share2 className="w-4 h-4" /> Share on WhatsApp
                  </Button>
                  <Button onClick={() => navigate('/farmer/queue')} variant="outline" className="w-full h-12 rounded-2xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
                    Track Live Queue
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
