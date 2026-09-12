import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, BellRing, MapPin, ChevronLeft, 
  Ticket, Navigation, CheckCircle2, ArrowRight,
  Play, Smartphone, Download, FileText,
  Volume2, Share2, WifiOff, Banknote, Sparkles,
  RefreshCw, Wifi, ShieldCheck, Beaker, Scale, Wallet
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { useSupabase } from '@/context/SupabaseContext';
import { useLanguage } from '@/services/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'react-qr-code';
import { calculateQueuePrediction } from '@/services/queuePredictionEngine';
import { playMandiChime, speakAnnouncement, generateWhatsAppShareUrl } from '@/services/soundAndSpeech';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function LiveQueue() {
  const navigate = useNavigate();
  const store = useKishanData();
  const { farmer, user, isProfileLoading } = useSupabase();
  const { lang, t } = useLanguage();
  const isOnline = useOnlineStatus();
  
  const activeBooking = store.getActiveFarmerBookingForFarmer(farmer?.id, user?.email);
  const centre = activeBooking ? store.getCentreById(activeBooking.centre_id) : null;
  const allBookings = store.getBookings();
  const [smsSent, setSmsSent] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const POLL_INTERVAL = 30;

  const offlinePassKey = farmer?.id ? `kishan_offline_pass_${farmer.id}` : null;

  // Cleanup any legacy shared un-scoped pass
  useEffect(() => {
    try {
      localStorage.removeItem('kishan_offline_pass');
    } catch {}
  }, []);

  useEffect(() => {
    if (offlinePassKey && activeBooking) {
      try {
        localStorage.setItem(offlinePassKey, JSON.stringify(activeBooking));
      } catch (e) {
        // quota ignore
      }
    }
  }, [offlinePassKey, activeBooking]);

  // Auto-poll: refresh store data every 30s and count down
  useEffect(() => {
    setLastUpdated(new Date());
    setCountdown(POLL_INTERVAL);

    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger a no-op state bump to re-read store
          setLastUpdated(new Date());
          return POLL_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [activeBooking?.status]);

  useEffect(() => {
    const unsubscribe = SupabaseDataService.subscribeRealtime(() => {
      setLastUpdated(new Date());
      setCountdown(POLL_INTERVAL);
      setIsRealtimeConnected(true);
    }, { farmerId: farmer?.id });
    return () => unsubscribe();
  }, [farmer?.id]);

  const handleSimulateAdvance = async () => {
    if (activeBooking) {
      await SupabaseDataService.advanceBooking(activeBooking.id);
      setLastUpdated(new Date());
      setCountdown(POLL_INTERVAL);
    }
  };

  const handleSendSms = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 4000);
  };

  const [showOfflinePass, setShowOfflinePass] = useState(false);
  let cachedOfflinePass: any = null;
  if (offlinePassKey) {
    try {
      const raw = localStorage.getItem(offlinePassKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.farmer_id === farmer?.id || (user?.email && parsed.farmer_email === user?.email))) {
          cachedOfflinePass = parsed;
        } else {
          localStorage.removeItem(offlinePassKey);
        }
      }
    } catch {}
  }

  if (isProfileLoading) {
    return (
      <div className="relative min-h-screen bg-zinc-50">
        <div className="relative z-10 p-4 md:p-8 max-w-lg mx-auto w-full pb-24 font-sans">
          
          {/* Header Skeleton */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-16 h-8 rounded-full" />
              <Skeleton className="w-9 h-9 rounded-full" />
            </div>
          </div>

          {/* Ticket Skeleton */}
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-zinc-100 mb-8 h-96 flex flex-col">
            <div className="p-8 pb-10 flex-1 flex flex-col items-center justify-center space-y-6">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-32 rounded-lg" />
            </div>
            <div className="bg-slate-900 p-6 flex items-center justify-between h-24">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 bg-slate-700" />
                <Skeleton className="h-6 w-32 bg-slate-700" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
                <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
              </div>
            </div>
          </div>

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Skeleton className="h-28 rounded-md bg-white border border-zinc-100" />
            <Skeleton className="h-28 rounded-md bg-white border border-zinc-100" />
          </div>

          {/* Timeline Skeleton */}
          <div className="bg-white border-zinc-200 shadow-sm rounded-md p-6 sm:p-8">
            <Skeleton className="h-4 w-32 mb-6" />
            <div className="space-y-6">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="flex gap-4">
                  <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // If no active booking in database:
  if (!activeBooking) {
    // Only allow viewing offline pass if device is offline AND the pass belongs to this farmer
    const canShowOffline = !isOnline && cachedOfflinePass;

    if (!canShowOffline || !showOfflinePass) {
      return (
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-zinc-50 z-0 pointer-events-none"></div>
          <div className="relative z-10 p-4 md:p-8 max-w-lg mx-auto w-full pb-24 font-sans">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => navigate('/farmer/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-zinc-100 hover:scale-105 transition-transform">
                <ChevronLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">{t('live_queue_status') || 'Live Queue Status'}</h1>
            </div>

            <div className="bg-white border-zinc-200 shadow-sm rounded-md p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-slate-300">
                <Ticket className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">{t('no_active_token')}</h2>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-8">
                {t('no_active_token_desc')}
              </p>

              {canShowOffline && (
                <div className="mb-8 p-5 bg-emerald-50/80 border border-emerald-200/60 rounded-lg text-left shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold mb-2">
                    <WifiOff className="w-4 h-4 text-emerald-600" /> Offline Pass Available
                  </div>
                  <p className="text-xs text-emerald-700/80 mb-4 font-medium leading-relaxed">
                    A previously issued token ({cachedOfflinePass.token_number}) is saved locally on this device.
                  </p>
                  <Button 
                    onClick={() => setShowOfflinePass(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-bold h-12 shadow-md transition-transform active:scale-[0.97]"
                  >
                    {t('view_offline_pass')}
                  </Button>
                </div>
              )}

              <Link to="/farmer/book">
                <Button className="w-full bg-[#0A2E1A] hover:bg-emerald-900 text-white rounded-md text-sm font-bold h-12 shadow-md transition-transform active:scale-[0.97] gap-2">
                  {t('book_procurement_slot')} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  const currentBooking = activeBooking || cachedOfflinePass;
  if (!currentBooking) {
    return null;
  }
  const prediction = calculateQueuePrediction(currentBooking.centre_id, allBookings);

  const stages = [
    { key: 'BOOKED', label: 'Slot Booked / स्लॉट बुक', desc: 'Arrive at Mandi Gate 1', icon: Ticket },
    { key: 'CHECKED_IN', label: 'Gate Entry / मुख्य प्रवेश द्वार', desc: 'Barrier lifted & token verified', icon: ShieldCheck },
    { key: 'QUALITY_TESTING', label: 'Moisture Lab / नमी जांच केंद्र', desc: 'Digital moisture & grain assay', icon: Beaker },
    { key: 'WEIGHMENT', label: 'Weighbridge / धर्मकांटा', desc: 'Gross & Tare automated weighment', icon: Scale },
    { key: 'COMPLETED', label: 'DBT Payment / सरकारी भुगतान', desc: 'Official e-J-Form issued via PFMS', icon: Wallet }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === currentBooking.status);
  const centreActiveBookings = allBookings.filter(
    b => b.centre_id === currentBooking.centre_id && b.status !== 'COMPLETED' && b.status !== 'CANCELLED'
  );
  const positionInLine = Math.max(1, centreActiveBookings.findIndex(b => b.id === currentBooking.id) + 1);
  const farmersAhead = Math.max(0, positionInLine - 1);

  const handleListenAudio = () => {
    setIsSpeaking(true);
    playMandiChime();
    const stageLabel = stages[currentStageIndex]?.label || currentBooking.status;
    const waitMins = Math.max(5, Math.round(farmersAhead * 4.5));
    let text = `Kishan Seva token ${currentBooking.token_number}. Current status: ${stageLabel}. Position in line: number ${positionInLine}. Estimated wait: ${waitMins} minutes.`;
    speakAnnouncement(text, lang as any);
    setTimeout(() => setIsSpeaking(false), 5000);
  };

  const handleWhatsAppShare = () => {
    window.open(generateWhatsAppShareUrl({
      tokenNumber: currentBooking.token_number, centreName: currentBooking.centre_name,
      slotDate: currentBooking.slot_date, slotTime: currentBooking.slot_time,
      cropName: currentBooking.crop_name, quantityQ: currentBooking.expected_quantity_q,
      vehicleNumber: currentBooking.vehicle_number
    }), '_blank');
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-zinc-50 z-0 pointer-events-none"></div>
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            {t('offline_banner') || 'Offline — Showing cached Gate Pass. Connect to internet for live queue updates.'}
          </p>
        </div>
      )}

      <div className="relative z-10 p-4 md:p-8 max-w-lg mx-auto w-full pb-24 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/farmer/dashboard')} 
              className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-zinc-100 hover:scale-105 transition-transform shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{t('live_queue_status') || 'Live Queue Status'}</h1>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                GPS &amp; Electronic Tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Realtime / Polling Status Badge */}
            <div
              title={isRealtimeConnected ? 'Supabase Realtime connected' : 'Polling every 30s'}
              className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full ${
                isRealtimeConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }`}
            >
              {isRealtimeConnected ? (
                <><Wifi className="w-2.5 h-2.5" /> LIVE</>
              ) : (
                <><RefreshCw className="w-2.5 h-2.5" /> {countdown}s</>
              )}
            </div>
            {/* Countdown ring */}
            <div className="relative w-9 h-9 flex items-center justify-center" title={`Refreshes in ${countdown}s`}>
              <svg className="absolute inset-0 w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e4e4e7" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="#10b981" strokeWidth="2.5"
                  strokeDasharray={`${(countdown / POLL_INTERVAL) * 94.2} 94.2`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
              </svg>
              <span className="text-[9px] font-bold text-zinc-500">{countdown}s</span>
            </div>
            <Button 
              onClick={handleSimulateAdvance}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold h-9 px-4 shadow-md transition-transform active:scale-[0.97]"
            >
              Advance ⚡
            </Button>
          </div>
        </div>

        {/* Minimalist Digital Ticket */}
        <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-zinc-100 mb-8 relative">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-zinc-50 rounded-full shadow-inner z-10 transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-zinc-50 rounded-full shadow-inner z-10 transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-4 right-4 border-t-2 border-dashed border-zinc-200 z-0"></div>

          <div className="p-8 pb-10 bg-gradient-to-b from-white to-slate-50/50 text-center relative z-10">
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-widest rounded-full border border-emerald-100 mb-4">
              Official Mandi Pass
            </div>
            <h2 className="text-5xl font-semibold tracking-widest font-mono text-zinc-900 mb-1">
              {currentBooking.token_number}
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Vehicle: <span className="text-zinc-800 font-bold">{currentBooking.vehicle_number || 'Tractor Trolley'}</span></p>
            
            <div className="mt-8 flex justify-center">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-zinc-200">
                <QRCode 
                  value={JSON.stringify({ token: currentBooking.token_number, f: currentBooking.farmer_id, b: currentBooking.id, c: currentBooking.centre_id })} 
                  size={140} 
                  level="M"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
              Scan at Entry Gate
            </p>
          </div>

          <div className="bg-slate-900 p-6 flex items-center justify-between gap-4 text-white">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">{currentBooking.crop_name}</p>
              <p className="text-lg font-bold truncate">{currentBooking.expected_quantity_q} Quintals</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleListenAudio} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Volume2 className="w-4 h-4 text-white" />
              </button>
              <button onClick={handleWhatsAppShare} className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-colors shadow-md">
                <Share2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="relative group bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
              Position
            </p>
            <div className="flex items-baseline gap-1 relative z-10">
              <span className="text-zinc-400 font-medium text-2xl">#</span>
              <p className="text-5xl font-bold text-zinc-900 font-mono tracking-tighter">{positionInLine}</p>
            </div>
            <p className="text-xs font-semibold text-zinc-500 mt-2 relative z-10 bg-zinc-100/50 inline-block px-2 py-1 rounded-md">
              {farmersAhead} vehicles ahead
            </p>
          </div>

          <div className="relative group bg-emerald-500/5 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.04)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Est. Wait
            </p>
            <div className="flex items-baseline relative z-10">
              <p className="text-5xl font-bold text-emerald-700 font-mono tracking-tighter">{Math.max(5, Math.round(farmersAhead * 4.5))}</p>
              <span className="text-xl font-bold text-emerald-600/70 ml-1">m</span>
            </div>
            <p className="text-xs font-semibold text-emerald-700/80 mt-2 relative z-10 bg-emerald-500/10 inline-block px-2 py-1 rounded-md border border-emerald-500/10">
              {prediction.processing_rate_per_hour} Q/hr speed
            </p>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {currentBooking.status === 'QUALITY_TESTING' && (
          <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200/60 rounded-md p-6 mb-8 flex gap-4 animate-pulse">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 text-sm mb-1">Proceed to Quality Lab</h4>
              <p className="text-xs text-amber-800/80 font-medium">Automated electronic moisture sensor will sample your vehicle batch for fair grading.</p>
            </div>
          </div>
        )}

        {currentBooking.status === 'WEIGHMENT' && (
          <div className="bg-emerald-50/80 backdrop-blur-md border border-emerald-200/60 rounded-md p-6 mb-8 flex gap-4 animate-pulse">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-emerald-900 text-sm mb-1">Quality Passed!</h4>
              <p className="text-xs text-emerald-800/80 font-medium">Drive to Dharamkanta (Weighbridge 1). Keep vehicle engine idling on scale.</p>
            </div>
          </div>
        )}

        {/* Premium Timeline Stepper */}
        <div className="bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              Live Progress
            </h3>
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full uppercase tracking-wider">
              Step {currentStageIndex + 1} of {stages.length}
            </span>
          </div>

          <div className="space-y-0 relative z-10">
            {stages.map((stage, idx) => {
              const isPassed = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;
              
              const StageIcon = stage.icon;

              return (
                <div key={stage.key} className="relative group">
                  {/* Connecting Line */}
                  {idx !== stages.length - 1 && (
                    <div className="absolute top-10 bottom-0 left-[23px] w-[2px] -ml-px bg-zinc-100">
                      {isPassed && (
                        <div className="absolute top-0 w-full h-full bg-emerald-500 origin-top animate-in fade-in zoom-in duration-500"></div>
                      )}
                    </div>
                  )}
                  
                  <div className={`relative flex items-start gap-5 pb-8 ${isPassed || isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                    {/* Icon Container */}
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                      isPassed 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                        : isCurrent 
                          ? 'bg-white text-emerald-600 shadow-[0_0_0_2px_#10b981,0_4px_20px_rgba(16,185,129,0.3)] scale-110' 
                          : 'bg-zinc-50 text-zinc-400 border border-zinc-200'
                    }`}>
                      {isPassed ? (
                        <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" />
                      ) : (
                        <StageIcon className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className={`pt-3 flex-1 transition-all duration-300 ${isCurrent ? 'translate-x-1' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-base font-bold leading-none ${isCurrent ? 'text-emerald-700' : isPassed ? 'text-zinc-900' : 'text-zinc-500'}`}>
                          {stage.label}
                        </p>
                        {isCurrent && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1.5 font-medium ${isCurrent ? 'text-emerald-600/80' : isPassed ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {stage.desc}
                      </p>
                      
                      {/* Active State Highlight/Card */}
                      {isCurrent && (
                        <div className="mt-4 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 font-medium animate-in slide-in-from-top-2 duration-300 shadow-sm">
                          Please complete this step before proceeding to the next station.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Helpdesk Info */}
        <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-lg border border-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">{currentBooking.centre_name}</p>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">Gate 1 • Slot: {currentBooking.slot_time}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {centre?.contact_number && (
              <a href={`tel:${centre.contact_number}`} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-transform active:scale-[0.97] shadow-md">
                <Smartphone className="w-4 h-4" />
              </a>
            )}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBooking.centre_name)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-transform active:scale-[0.97] shadow-sm">
              <Navigation className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
