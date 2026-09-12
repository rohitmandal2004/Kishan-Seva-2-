import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, MapPin, Leaf, Sprout, 
  FileText, CloudRain, ArrowRight, ShieldCheck, 
  Banknote, Download, CheckCircle2, AlertCircle, X, Sparkles,
  CalendarClock, Ticket, User, Users, PhoneCall,
  TrendingUp, TrendingDown, Sun, Cloud, Bell, Building, BellRing
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { Booking as BookingRecord } from '@/types';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';
import { useSupabase } from '@/context/SupabaseContext';
import { evaluateCentreRecommendationsAsync } from '@/services/recommendationEngine';
import { CentreRecommendation } from '@/types';
import { getCoordinatesForVillage } from '@/services/locationNames';
import { Skeleton } from '@/components/ui/skeleton';
import AnimatedPage from '@/components/ui/AnimatedPage';
import QRCode from 'react-qr-code';
import { getDeterministicWeather } from '@/services/weatherService';
import { addDays, format, parseISO } from 'date-fns';
import { PriceHistoryChart } from '@/components/ui/PriceHistoryChart';
import { useLanguage } from '@/services/i18n';
import { usePushNotifications, getNotificationPermission } from '@/services/usePushNotifications';
import { usePwaInstall } from '@/services/usePwaInstall';

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const store = useKishanData();
  const { farmer, user } = useSupabase();
  const activeBooking = store.getActiveFarmerBookingForFarmer(farmer?.id, user?.email);
  const allBookings = store.getFarmerBookingsForFarmer(farmer?.id, user?.email);
  const completedBookings = allBookings.filter(b => b.status === 'COMPLETED');
  const centres = store.centres;
  
  const [selectedReceipt, setSelectedReceipt] = useState<BookingRecord | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Async PostGIS recommendation engine (Item 7)
  const [recommendations, setRecommendations] = useState<CentreRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(true);

  // Push notifications hook (Item 8)
  usePushNotifications(activeBooking);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(() => {
    try { return localStorage.getItem('kishan_push_banner_dismissed') === '1'; } catch { return false; }
  });
  const notifPermission = getNotificationPermission();
  const showPushBanner = !pushBannerDismissed && notifPermission === 'default' && 'Notification' in window;

  const { isInstallable, promptInstall } = usePwaInstall();

  useEffect(() => {
    if (!farmer) return;
    const farmerCoords = (farmer.latitude && farmer.longitude)
      ? { latitude: farmer.latitude, longitude: farmer.longitude }
      : getCoordinatesForVillage(farmer.village, farmer.district);
    setRecLoading(true);
    evaluateCentreRecommendationsAsync(
      centres,
      farmerCoords,
      farmer.crop_name || 'Paddy (Grade A)'
    ).then(recs => {
      setRecommendations(recs);
      setRecLoading(false);
    });
  }, [farmer?.id, centres.length]);

  const bestCentreRec = recommendations[0];

  // Route is guarded by RequireRole; render skeleton while farmer resolves
  if (!farmer) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4 pt-12">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const totalQuintalsSold = completedBookings.reduce((sum, b) => sum + (b.weighment_data?.net_weight_q || b.expected_quantity_q), 0);
  const totalAmountReceived = completedBookings.reduce((sum, b) => sum + (b.weighment_data?.net_payable || 0), 0);
  const notifications = store.getNotificationsForFarmer(farmer.id, user?.email).slice(0);

  // Weather Forecast (Next 3 Days)
  const today = new Date();
  const weatherForecast = [
    getDeterministicWeather(farmer.village, today),
    getDeterministicWeather(farmer.village, addDays(today, 1)),
    getDeterministicWeather(farmer.village, addDays(today, 2))
  ];

  // Yield Estimator
  const cropMsp = OFFICIAL_MSP_RATES.find(m => m.crop === farmer.crop_name) || OFFICIAL_MSP_RATES[0];
  const estYieldPerAcre = 18;
  const expectedTotalQuintals = (farmer.land_area_acres || 0) * estYieldPerAcre;
  const expectedTotalValue = expectedTotalQuintals * cropMsp.rate_per_quintal;
  const openMarketRate = cropMsp.rate_per_quintal - (cropMsp.rate_per_quintal * 0.08);

  const getPaymentStage = (status: string) => {
    if (status === 'SUCCESS') return 3;
    if (status === 'PROCESSING') return 2;
    return 1;
  };

  return (
    <AnimatedPage className="relative w-full h-full flex flex-col">
      {/* Absolute background for the top right hero effect */}
      <div className="absolute top-0 right-0 w-[500px] h-[250px] z-0 pointer-events-none opacity-40">
        <img src="/hero-bg.jpg" alt="Farmer Background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)' }} />
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24 md:pb-6 font-sans relative z-10 space-y-4">

        {/* PWA Install Banner */}
        {isInstallable && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
            <Download className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 flex-1 font-medium">
              Install Kishan Seva to your home screen for quick access and full offline capabilities.
            </p>
            <button
              onClick={promptInstall}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 shrink-0 shadow-sm"
            >
              Install App
            </button>
          </div>
        )}

        {/* Push Notification Permission Banner (Item 8) */}
        {showPushBanner && activeBooking && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <BellRing className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-sm text-indigo-800 flex-1 font-medium">
              {t('push_banner_text') || 'Enable slot reminders to get notified 2 hours before your procurement appointment.'}
            </p>
            <button
              onClick={async () => {
                await Notification.requestPermission();
                setPushBannerDismissed(true);
                try { localStorage.setItem('kishan_push_banner_dismissed', '1'); } catch {}
              }}
              className="text-xs font-bold text-indigo-700 hover:underline shrink-0"
            >
              {t('enable') || 'Enable'}
            </button>
            <button
              onClick={() => {
                setPushBannerDismissed(true);
                try { localStorage.setItem('kishan_push_banner_dismissed', '1'); } catch {}
              }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP ROW: KPI Overview Cards & New Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-white/90 backdrop-blur-sm rounded-lg relative overflow-hidden group transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-md bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100/50">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t('total_procured')}</span>
                <p className="text-xl font-semibold text-zinc-900 leading-tight truncate">{totalQuintalsSold.toFixed(1)} <span className="text-xs font-semibold text-zinc-500">Quintals</span></p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 ml-[60px] font-medium">{t('historical_sales')}</p>
            <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </Card>

          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-white/90 backdrop-blur-sm rounded-lg relative overflow-hidden group transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100/50">
                <Banknote className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t('dbt_disbursed')}</span>
                <p className="text-xl font-semibold text-zinc-900 leading-tight truncate">₹{totalAmountReceived.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 ml-[60px] font-medium">Direct Bank Transfer</p>
            <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Yield Estimator */}
          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white backdrop-blur-sm rounded-lg relative overflow-hidden group transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1"><Sprout className="w-3 h-3" /> {t('yield_estimator')}</span>
                <p className="text-lg font-semibold text-zinc-900 mt-1">{expectedTotalQuintals.toFixed(0)} Q <span className="text-xs font-semibold text-zinc-500">{t('est_harvest')}</span></p>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[9px] px-1.5 py-0">{farmer.land_area_acres} Acres</Badge>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-100/60">
              <p className="text-[10px] text-zinc-500 flex justify-between">
                <span>{t('est_msp_value')}</span>
                <span className="font-bold text-indigo-700">₹{expectedTotalValue.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </Card>

          {/* Live Market Prices */}
          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white backdrop-blur-sm rounded-lg relative overflow-hidden group transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t('rate_advantage')}</span>
                <p className="text-lg font-semibold text-emerald-700 mt-1">₹{cropMsp.rate_per_quintal} <span className="text-xs font-semibold text-zinc-500">/ Q (MSP)</span></p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] px-1.5 py-0">+{Math.round(((cropMsp.rate_per_quintal - openMarketRate) / openMarketRate) * 100)}%</Badge>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-100/60">
              <p className="text-[10px] text-zinc-500 flex justify-between">
                <span>{t('local_market_rate')}</span>
                <span className="font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5" /> ₹{openMarketRate.toFixed(0)}</span>
              </p>
            </div>
          </Card>
        </div>

        {/* FULL WIDTH PRICE HISTORY CHART */}
        <Card className="p-5 border border-zinc-200/80 shadow-sm bg-white rounded-lg">
          <PriceHistoryChart cropName={farmer.crop_name || 'Paddy (Grade A)'} mspRate={cropMsp.rate_per_quintal} />
        </Card>

        {/* DECISION CARDS: Active Booking OR Recommendation */}
        {activeBooking ? (
          <Card className="p-4 sm:p-5 border border-emerald-200/60 bg-white/90 backdrop-blur-md shadow-sm rounded-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-emerald-700 flex items-center justify-center shadow-inner">
                  <Sprout className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1 inline-block border border-emerald-100">
                    {t('active_pass')}
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-zinc-900">
                      {activeBooking.crop_name} • {activeBooking.expected_quantity_q} Quintals
                    </h2>
                    <Badge className="bg-amber-100/80 text-amber-900 border border-amber-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline" /> {activeBooking.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/farmer/queue">
                  <Button className="bg-[#0A2E1A] hover:bg-emerald-900 text-white rounded-lg text-xs font-bold px-5 h-10 shadow-md gap-2 transition-colors transition-transform active:scale-[0.97]">
                    {t('track_queue')} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setIsQrModalOpen(true)} className="border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold px-4 h-10 gap-2 bg-emerald-50 hover:bg-emerald-100 shadow-sm transition-colors transition-transform active:scale-[0.97]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg> Show QR Pass
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-100 text-xs px-2">
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-500"><FileText className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Token Number</p>
                  <p className="text-sm font-semibold text-zinc-800 mt-0.5">{activeBooking.token_number}</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-500"><MapPin className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Mandi Centre</p>
                  <p className="font-bold text-zinc-800 mt-0.5 text-[11px] leading-tight pr-4">{activeBooking.centre_name}</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-500"><CalendarClock className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Scheduled Slot</p>
                  <p className="font-bold text-zinc-800 mt-0.5 text-[11px]">{activeBooking.slot_time}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Today, {activeBooking.slot_date}</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 p-1.5 bg-zinc-50 rounded-md border border-zinc-100 text-zinc-500"><Ticket className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Vehicle</p>
                  <p className="font-bold text-zinc-800 mt-0.5 text-[11px]">{activeBooking.vehicle_number || '—'}</p>
                  {!activeBooking.vehicle_number && <p className="text-[10px] text-zinc-500 font-medium">Not added</p>}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          recLoading ? (
            <div className="p-5 border border-zinc-200/80 bg-white/90 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-5 w-48 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-zinc-100">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 rounded" />)}
              </div>
            </div>
          ) : bestCentreRec && (
            <Card className="p-4 sm:p-5 border border-zinc-200/80 bg-white/90 backdrop-blur-md shadow-sm rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-200 group-hover:bg-emerald-400 transition-colors"></div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mb-1 border border-emerald-100">
                      RECOMMENDED FOR TODAY'S HARVEST
                    </span>
                    <h3 className="text-lg font-semibold text-zinc-900 leading-tight">
                      {bestCentreRec.centre.name}
                    </h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Best match based on your crop and location</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1.5 rounded-full shadow-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{bestCentreRec.journey_score}/100 Match Score</span>
                  </div>
                  <Link to={`/farmer/book?centre=${bestCentreRec.centre.id}`}>
                    <Button className="bg-[#0A2E1A] hover:bg-emerald-900 text-white rounded-lg text-xs font-bold px-5 h-10 shadow-md gap-2 transition-colors transition-transform active:scale-[0.97]">
                      Book New Slot <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-100 text-xs px-2">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><MapPin className="w-4 h-4" /></div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Distance</p>
                    <p className="text-xs font-bold text-zinc-800 mt-0.5">{bestCentreRec.distance_km} km ({bestCentreRec.travel_time_mins} min)</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Users className="w-4 h-4" /></div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Current Queue</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">{bestCentreRec.current_queue} vehicle waiting</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-4 h-4" /></div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Predicted Wait</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">~ {bestCentreRec.predicted_wait_mins} mins</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600"><ShieldCheck className="w-4 h-4" /></div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Yard Capacity</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">{bestCentreRec.centre.daily_capacity_quintals} Q/day</p>
                  </div>
                </div>
              </div>
            </Card>
          )
        )}

        {/* COMPACT ACTIONS & HELPLINE ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 p-4 border border-zinc-200 shadow-sm bg-white rounded-lg flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 text-sm hidden sm:block shrink-0 mr-4">Quick Links</h3>
            <div className="flex gap-2 w-full justify-between sm:justify-end">
              <Link to="/farmer/book" className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-50 transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[9px] text-zinc-600 font-semibold text-center">Book Slot</span>
              </Link>
              <Link to="/farmer/queue" className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[9px] text-zinc-600 font-semibold text-center">Live Queue</span>
              </Link>
              <Link to="/farmer/centres" className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-50 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[9px] text-zinc-600 font-semibold text-center">Centres</span>
              </Link>
              <Link to="/farmer/dashboard" className="flex flex-col items-center gap-1.5 group">
                <div className="w-10 h-10 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-100 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[9px] text-zinc-600 font-semibold text-center">Profile</span>
              </Link>
            </div>
          </Card>

          <Card className="md:col-span-1 p-4 border border-emerald-100 shadow-sm bg-emerald-50/50 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-inner">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800">Kisan Helpline</span>
              <p className="text-lg font-semibold text-zinc-900 mt-0.5 tracking-tight">1800-180-1551</p>
            </div>
          </Card>
        </div>

        {/* WEATHER & NOTIFICATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-white rounded-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /> Harvest Weather Advisory</h3>
              <span className="text-[10px] text-zinc-500 font-medium">{farmer.village}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {weatherForecast.map((w, idx) => (
                <div key={idx} className={`p-2.5 rounded-md border ${w.isGoodForHarvest ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} text-center flex flex-col items-center justify-between h-full`}>
                  <p className="text-[10px] font-bold text-zinc-600 mb-1">{idx === 0 ? 'Today' : format(addDays(today, idx), 'EEE')}</p>
                  <div className={`w-8 h-8 rounded-full mb-1 flex items-center justify-center ${w.isGoodForHarvest ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {w.icon === 'sun' && <Sun className="w-4 h-4 text-amber-500" />}
                    {w.icon === 'cloud' && <Cloud className="w-4 h-4 text-zinc-500" />}
                    {(w.icon === 'rain' || w.icon === 'cloud-rain') && <CloudRain className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-800">{w.temp}°C</p>
                  <div className="mt-2 text-[9px] font-bold leading-tight">
                    {w.isGoodForHarvest ? (
                      <span className="text-emerald-700">Clear</span>
                    ) : (
                      <span className="text-red-700">{w.message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border border-zinc-200/80 shadow-sm bg-white rounded-lg flex flex-col transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-blue-500" /> Recent Updates</h3>
              <Link to="/farmer/notifications" className="text-[10px] text-blue-600 font-bold hover:underline">View All</Link>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <Bell className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs font-medium">No recent notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex gap-3 items-start pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className={`text-xs ${!n.read ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>{n.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RECENT PROCUREMENT HISTORY & PAYMENT TRACKER */}
        <Card className="p-4 border border-zinc-200 bg-white rounded-lg shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-zinc-900 text-sm">Recent Procurement History</h3>
              <p className="text-[11px] text-zinc-500">Track your past sales and DBT payment statuses</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">All Records</span>
          </div>

          <div className="space-y-4">
            {allBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <Leaf className="w-7 h-7 text-emerald-300" />
                </div>
                <p className="text-zinc-700 text-sm font-bold mb-1">No procurement history yet</p>
                <p className="text-zinc-500 text-xs mb-4">Book your first slot to sell your harvest at guaranteed MSP prices.</p>
                <Link to="/farmer/book">
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold px-6 h-9 shadow-xs gap-1.5 transition-transform active:scale-[0.97]">
                    <Calendar className="w-3.5 h-3.5" /> Book Your First Slot
                  </Button>
                </Link>
              </div>
            ) : (
              allBookings.map((b) => {
                const isCompleted = b.status === 'COMPLETED' && b.weighment_data;
                const stage = isCompleted ? getPaymentStage(b.weighment_data!.dbt_status) : 0;

                return (
                  <div key={b.id} className="p-4 rounded-md border border-zinc-200 bg-white hover:border-emerald-300 shadow-xs transition flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.token_number}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm">{b.crop_name} • {b.weighment_data?.net_weight_q || b.expected_quantity_q} Q</h4>
                          <p className="text-[11px] text-zinc-500">{b.centre_name} • {b.slot_date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {b.status}
                        </span>

                        {isCompleted ? (
                          <Button onClick={() => setSelectedReceipt(b)} size="sm" variant="outline" className="text-[11px] h-8 rounded-lg border-slate-300 text-zinc-700 gap-1.5 px-3">
                            <FileText className="w-3.5 h-3.5" /> e-Slip
                          </Button>
                        ) : (
                          <Link to="/farmer/queue">
                            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] h-8 rounded-lg px-4 transition-transform active:scale-[0.97]">Track</Button>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Payment Tracking Timeline (Only for completed) */}
                    {isCompleted && b.weighment_data && (
                      <div className="mt-2 pt-3 border-t border-zinc-100 bg-zinc-50/50 -mx-2 -mb-2 px-2 pb-2 rounded-b-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 flex items-center gap-2 relative">
                            {/* Line connecting stages */}
                            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
                            <div className={`absolute top-1/2 left-4 h-0.5 bg-emerald-500 -z-10 -translate-y-1/2 transition-colors duration-200 ease-out`} style={{ width: stage === 3 ? 'calc(100% - 32px)' : stage === 2 ? '50%' : '0%' }}></div>
                            
                            {/* Stage 1: Initiated */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage >= 1 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-zinc-500'}`}>
                                <CheckCircle2 className="w-3 h-3" />
                              </div>
                              <span className={`text-[9px] font-bold ${stage >= 1 ? 'text-emerald-700' : 'text-zinc-500'}`}>Initiated</span>
                            </div>

                            {/* Stage 2: Treasury */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage >= 2 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-zinc-500'} ${stage === 2 && 'ring-2 ring-emerald-200 ring-offset-1 animate-pulse'}`}>
                                <Building className="w-3 h-3" />
                              </div>
                              <span className={`text-[9px] font-bold ${stage >= 2 ? 'text-emerald-700' : 'text-zinc-500'}`}>Treasury Process</span>
                            </div>

                            {/* Stage 3: Credited */}
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage === 3 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-zinc-500'}`}>
                                <Banknote className="w-3 h-3" />
                              </div>
                              <span className={`text-[9px] font-bold ${stage === 3 ? 'text-emerald-700' : 'text-zinc-500'}`}>Credited</span>
                            </div>
                          </div>
                          
                          <div className="w-1/3 text-right">
                            <span className="text-[10px] font-semibold text-zinc-500 block mb-0.5">DBT Value</span>
                            <span className="text-sm font-semibold text-zinc-900">₹{b.weighment_data.net_payable.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Advisory & Guidelines */}
        <div className="p-3 rounded-md bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-[11px] text-amber-900 mb-6">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5 text-xs">Government Procurement Advisory (2026 Kharif/Rabi Season)</p>
            <p className="text-amber-800/90 leading-relaxed">
              Ensure produce moisture is dried below 14% for Grade A certification. 
              All weighments are CCTV monitored. Payment via DBT to Aadhaar-seeded bank within 48 hours.
            </p>
          </div>
        </div>

      </div>

      {/* e-J-Form / Weighment Receipt Modal */}
      {selectedReceipt && selectedReceipt.weighment_data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-md max-w-lg w-full p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto print-clean-card">
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 print-hide"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Slip Header */}
            <div className="text-center border-b-2 border-emerald-800/20 pb-4 mb-4 relative">
              <div className="flex justify-center mb-1">
                <img src="/logo.svg" alt="Kishan Seva" className="h-14 w-14 object-contain" />
              </div>
              <h3 className="font-semibold text-zinc-900 text-sm sm:text-base uppercase tracking-wider">
                Government of India • भारत सरकार
              </h3>
              <p className="text-[11px] text-zinc-600 font-semibold">
                Ministry of Agriculture & Farmers Welfare • कृषि एवं किसान कल्याण मंत्रालय
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Official Electronic J-Form / सरकारी जे-फॉर्म (e-J-Form)</span>
              </div>
            </div>

            {/* Security Hologram & Verification Bar */}
            <div className="mb-4 p-2.5 bg-gradient-to-r from-emerald-50 via-amber-50 to-emerald-50 rounded-md border border-emerald-200 flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>PFMS Direct Benefit Transfer Guaranteed</span>
              </div>
              <span className="font-mono text-zinc-500 font-bold">
                SECURITY HASH: #PFMS-2026-{(selectedReceipt.id || '9821').slice(-6)}
              </span>
            </div>

            {/* Detailed Bilingual Procurement Breakdown */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Slip / Parchi Number (पर्ची संख्या):</span>
                <span className="font-mono font-semibold text-zinc-900">{selectedReceipt.weighment_data.slip_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Farmer Name (किसान का नाम):</span>
                <span className="font-bold text-zinc-900">{selectedReceipt.farmer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Mandi Yard (खरीद केंद्र / मंडी):</span>
                <span className="font-bold text-zinc-900">{selectedReceipt.centre_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Crop Procured (फसल विवरण):</span>
                <span className="font-bold text-emerald-800">{selectedReceipt.crop_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Gross Weight (लदा हुआ धर्मकांटा वजन):</span>
                <span className="font-bold font-mono">{selectedReceipt.weighment_data.gross_weight_q} Q</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Tare Weight (खाली वाहन धर्मकांटा वजन):</span>
                <span className="font-bold font-mono">{selectedReceipt.weighment_data.tare_weight_q} Q</span>
              </div>
              
              <div className="flex justify-between py-2 border-y-2 border-emerald-600 bg-emerald-50 px-2.5 rounded-lg font-bold text-emerald-950">
                <div>
                  <span className="block font-semibold text-xs sm:text-sm">Certified Net Weight / शुद्ध अनाज वजन</span>
                  <span className="text-[10px] text-emerald-800 font-normal">Approx. {Math.round(selectedReceipt.weighment_data.net_weight_q * 2)} Bori (बोरी)</span>
                </div>
                <span className="text-sm sm:text-base font-mono font-semibold text-emerald-900 self-center">
                  {selectedReceipt.weighment_data.net_weight_q} Quintals
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Government MSP Rate (न्यूनतम समर्थन मूल्य):</span>
                <span className="font-bold font-mono">₹{selectedReceipt.weighment_data.msp_rate_per_q} / Quintal</span>
              </div>

              <div className="flex justify-between py-2.5 bg-slate-900 text-white px-3 rounded-md font-semibold text-sm">
                <div>
                  <span className="block text-slate-300 text-[11px]">Total Net Remittance (कुल देय राशि)</span>
                  <span className="text-[9px] text-emerald-400 font-normal">Directly Credited to Aadhaar-Linked Bank</span>
                </div>
                <span className="text-amber-300 font-mono text-base sm:text-lg self-center">
                  ₹{selectedReceipt.weighment_data.net_payable.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between py-1 text-[11px] text-emerald-700 font-semibold">
                <span>DBT Payout Status:</span>
                <span>● {selectedReceipt.weighment_data.dbt_status} ({selectedReceipt.weighment_data.transaction_ref})</span>
              </div>
            </div>

            {/* Official Digital Stamp Box */}
            <div className="p-3 border-2 border-dashed border-emerald-600/40 rounded-lg bg-emerald-50/40 flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-700 flex items-center justify-center text-emerald-800 font-semibold text-[9px] text-center leading-tight">
                  MSP<br/>PASS
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-emerald-900">Department of Food & Public Distribution</p>
                  <p className="text-[9px] text-emerald-800">Electronic Verification Valid Across All Nationalised Banks</p>
                </div>
              </div>
              <div className="bg-white p-1 rounded-lg border border-emerald-200 shrink-0">
                <QRCode 
                  value={`MSP-RECEIPT-${selectedReceipt.weighment_data.slip_number}-${selectedReceipt.weighment_data.net_weight_q}Q`} 
                  size={48}
                  level="L"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 flex gap-3 print-hide">
              <Button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold h-10 gap-1.5 shadow-md transition"
              >
                <Download className="w-4 h-4" /> Download / Print Official Slip
              </Button>
              <Button 
                onClick={() => setSelectedReceipt(null)}
                variant="outline" 
                className="rounded-md text-xs font-bold h-10 px-5 transition"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-700 p-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold">Digital Entry Pass</h3>
                <p className="text-[10px] text-emerald-100 opacity-90">Show this at {activeBooking.centre_name}</p>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-emerald-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-zinc-50">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 mb-4">
                <QRCode value={activeBooking.token_number} size={180} />
              </div>
              <p className="font-mono text-xl font-bold tracking-widest text-zinc-800">{activeBooking.token_number}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Scan at weighbridge</p>
            </div>
            <div className="p-4 border-t border-zinc-100 bg-white grid grid-cols-2 gap-4 text-xs">
               <div>
                 <span className="text-zinc-500 font-medium uppercase text-[9px] tracking-wider">Farmer</span>
                 <p className="font-bold text-zinc-800 truncate">{activeBooking.farmer_name}</p>
               </div>
               <div>
                 <span className="text-zinc-500 font-medium uppercase text-[9px] tracking-wider">Crop</span>
                 <p className="font-bold text-zinc-800 truncate">{activeBooking.crop_name}</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}
