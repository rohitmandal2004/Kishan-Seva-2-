import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Calendar, Clock, MapPin, Leaf, Sprout,
  FileText, CloudRain, ArrowRight, ShieldCheck,
  Banknote, Download, CheckCircle2, AlertCircle, X, Sparkles,
  CalendarClock, Ticket, User, Users, PhoneCall, Truck,
  TrendingUp, TrendingDown, Sun, Cloud, Bell, Building, BellRing, CreditCard, Edit2, Activity, WifiOff, FileArchive, AlertTriangle
} from 'lucide-react';
import { useKishanData } from '@/context/DataContext';
import { Booking as BookingRecord } from '@/types';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase } from '@/lib/supabase';
import { evaluateCentreRecommendationsAsync } from '@/services/recommendationEngine';
import { CentreRecommendation } from '@/types';
import { getCoordinatesForVillage } from '@/services/locationNames';
import { Skeleton } from '@/components/ui/skeleton';
import PageLoader from '@/components/ui/PageLoader';
import QRCode from 'react-qr-code';
import { getLiveWeatherForecast } from '@/services/weatherService';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { PriceHistoryChart } from '@/components/ui/PriceHistoryChart';
import { useLanguage } from '@/services/i18n';
import { usePushNotifications, getNotificationPermission } from '@/services/usePushNotifications';
import { usePwaInstall } from '@/services/usePwaInstall';
import { SellPredictorWidget } from '@/components/ui/SellPredictorWidget';

const INDIAN_BANKS = [
  'State Bank of India', 'Punjab National Bank', 'HDFC Bank', 'ICICI Bank', 
  'Axis Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 
  'Bank of India', 'Indian Bank', 'Central Bank of India', 'Indian Overseas Bank', 
  'UCO Bank', 'Bank of Maharashtra', 'Kotak Mahindra Bank', 'IndusInd Bank', 
  'Yes Bank', 'IDBI Bank'
];

function BankAccountCard() {
  const { farmer, setFarmer } = useSupabase();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    bank_name: farmer?.bank_name || '',
    account_number: farmer?.account_number_masked || '',
    ifsc_code: farmer?.ifsc_code || '',
  });

  // Update formData when farmer changes
  useEffect(() => {
    setFormData({
      bank_name: farmer?.bank_name || '',
      account_number: farmer?.account_number_masked || '',
      ifsc_code: farmer?.ifsc_code || '',
    });
  }, [farmer]);

  const handleSave = async () => {
    if (!farmer?.id) return;
    setIsSaving(true);
    try {
      let newMaskedAccount = formData.account_number;
      if (newMaskedAccount && !newMaskedAccount.includes('X') && newMaskedAccount.length >= 4) {
        newMaskedAccount = 'XXXX-XXXX-' + newMaskedAccount.slice(-4);
      }

      const updatedData = {
        bank_name: formData.bank_name || undefined,
        account_number_masked: newMaskedAccount || undefined,
        ifsc_code: formData.ifsc_code || undefined,
      };

      await supabase.from('farmer_profiles').update(updatedData).eq('id', farmer.id);
      
      setFarmer({ ...farmer, ...updatedData } as any);
      toast.success('Bank details updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update bank details');
    } finally {
      setIsSaving(false);
    }
  };

  const hasBankDetails = !!farmer?.bank_name;

  return (
    <Card className="p-4 border border-slate-200 bg-white rounded-lg shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" /> Linked Bank Account
          </h3>
          <p className="text-[11px] text-slate-500">For DBT payments & subsidies</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Bank Name</label>
              <select 
                value={formData.bank_name} 
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="">Select Bank</option>
                {INDIAN_BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Account Number</label>
              <Input 
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Enter A/C Number"
                className="h-8 text-xs rounded-md border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">IFSC Code</label>
              <Input 
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="IFSC Code"
                className="h-8 text-xs rounded-md border-slate-200 bg-slate-50 uppercase"
              />
            </div>
          </div>
        ) : hasBankDetails ? (
          <div className="space-y-4">
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-100">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-900 text-sm">{farmer.bank_name}</span>
                <Building className="w-4 h-4 text-emerald-600 opacity-50" />
              </div>
              <p className="font-mono text-slate-700 text-sm tracking-widest mb-1">{farmer.account_number_masked}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">IFSC: {farmer.ifsc_code}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Aadhaar-seeded account ready for DBT</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 mb-1">No Bank Linked</p>
            <p className="text-[10px] text-slate-500 mb-3 px-4">Add your bank details to receive payments directly.</p>
            <Button onClick={() => setIsEditing(true)} size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              Add Bank Details
            </Button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="flex-1 h-8 text-xs" disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      )}
    </Card>
  );
}

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
  }, [farmer, centres]);

  const bestCentreRec = recommendations[0];

  // Weather Forecast (Next 3 Days)
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (farmer?.village) {
        const forecast = await getLiveWeatherForecast(farmer.village);
        setWeatherForecast(forecast);
      }
    };
    fetchWeather();
  }, [farmer?.village]);

  // Route is guarded by RequireRole; render splash screen while farmer resolves
  if (!farmer) {
    return <PageLoader />;
  }

  const totalQuintalsSold = completedBookings.reduce((sum, b) => sum + (b.weighment_data?.net_weight_q || b.expected_quantity_q), 0);
  const totalAmountReceived = completedBookings.reduce((sum, b) => sum + (b.weighment_data?.net_payable || 0), 0);
  const notifications = store.getNotificationsForFarmer(farmer.id, user?.email).slice(0);

  const today = new Date();

  // Yield Estimator
  const cropMsp = OFFICIAL_MSP_RATES.find(m => m.crop === farmer?.crop_name) || OFFICIAL_MSP_RATES[0];
  const estYieldPerAcre = 18;
  const expectedTotalQuintals = (farmer?.land_area_acres || 0) * estYieldPerAcre;
  const expectedTotalValue = expectedTotalQuintals * cropMsp.rate_per_quintal;
  const openMarketRate = cropMsp.rate_per_quintal - (cropMsp.rate_per_quintal * 0.08);

  const getPaymentStage = (status: string) => {
    if (status === 'SUCCESS') return 3;
    if (status === 'PROCESSING') return 2;
    return 1;
  };



  const lastCompletedBooking = completedBookings.length > 0 
    ? completedBookings.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0]
    : null;

  const getNextAction = () => {
    if (activeBooking) {
      if (['COMPLETED', 'PROCUREMENT', 'WEIGHMENT'].includes(activeBooking.status)) {
        return {
          title: "Your procurement is processing.",
          cta: "Track Payment",
          link: "/farmer/payments",
          icon: <Banknote className="w-5 h-5 text-emerald-600" />
        };
      }
      if (activeBooking.status === 'QUALITY_TESTING') {
        return {
          title: "Quality testing is in progress.",
          cta: "View Queue",
          link: "/farmer/queue",
          icon: <Activity className="w-5 h-5 text-blue-600" />
        };
      }
      if (activeBooking.status === 'CHECKED_IN') {
        return {
          title: "You are currently in the queue.",
          cta: "Track Queue",
          link: "/farmer/queue",
          icon: <Users className="w-5 h-5 text-amber-600" />
        };
      }
      return {
        title: "Your procurement is scheduled for today.",
        cta: "View Digital Pass",
        onClick: () => setIsQrModalOpen(true),
        icon: <Ticket className="w-5 h-5 text-indigo-600" />
      };
    }
    
    if (lastCompletedBooking && lastCompletedBooking.weighment_data?.dbt_status !== 'SUCCESS') {
      return {
        title: "Your procurement is complete. Payment is processing.",
        cta: "Track Payment",
        link: "/farmer/payments",
        icon: <Banknote className="w-5 h-5 text-emerald-600" />
      };
    }
    
    return {
      title: "Book a procurement slot for your crop.",
      cta: "Find Best Centre",
      link: "/farmer/book",
      icon: <MapPin className="w-5 h-5 text-emerald-600" />
    };
  };

  const nextAction = getNextAction();

  return (
    <div className="relative w-full min-h-full flex flex-col bg-slate-50 pb-20">
      
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 relative z-50">
          <WifiOff className="w-4 h-4" />
          <span>⚠ Offline mode. Showing last known status.</span>
        </div>
      )}

      {/* TOP HEADER - Premium Aesthetic */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white pt-6 pb-24 px-4 sm:px-6 rounded-b-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.1)] relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-40 -mr-20 -mt-20"></div>
        <div className="max-w-4xl mx-auto relative z-10 flex justify-between items-start">
          <div>
            <p className="text-emerald-200/90 text-sm font-medium flex items-center gap-2">
              Namaste, <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-white/5">{t('lang_name') || 'English'}</span>
            </p>
            <h1 className="text-3xl font-bold mt-1 tracking-tight">{farmer.full_name}</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/farmer/notifications" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-sm">
              <Bell className="w-4 h-4 text-white" />
            </Link>
            <Link to="/farmer/profile" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-sm">
              <User className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 -mt-16 relative z-20 space-y-5">
        
        {/* PWA Install Banner */}
        {isInstallable && (
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-emerald-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Download className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-slate-800 flex-1 font-medium">Install Kishan Seva to your home screen.</p>
            <button onClick={promptInstall} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 shadow-sm">Install</button>
          </div>
        )}

        {/* Push Notification Permission Banner */}
        {showPushBanner && activeBooking && (
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <BellRing className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-sm text-slate-800 flex-1 font-medium">{t('push_banner_text') || 'Enable slot reminders.'}</p>
            <button onClick={async () => { await Notification.requestPermission(); setPushBannerDismissed(true); try { localStorage.setItem('kishan_push_banner_dismissed', '1'); } catch { } }} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm">{t('enable') || 'Enable'}</button>
            <button onClick={() => { setPushBannerDismissed(true); try { localStorage.setItem('kishan_push_banner_dismissed', '1'); } catch { } }} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* MAIN HERO */}
        {activeBooking ? (
          <Card className="p-5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <Badge className="bg-emerald-100/80 text-emerald-800 border-0 uppercase tracking-widest text-[10px] mb-2 px-2.5 py-0.5 shadow-none font-bold">Today's Booking</Badge>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{activeBooking.crop_name} • {activeBooking.expected_quantity_q} Q</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-600/70"/> {activeBooking.centre_name}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Token</p>
                  <p className="text-lg font-mono font-bold text-emerald-700 bg-emerald-50 px-2 rounded mt-0.5 border border-emerald-100">{activeBooking.token_number}</p>
               </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6 bg-slate-50/80 rounded-xl p-3 border border-slate-100 relative z-10">
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Schedule</p>
                 <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-slate-400" /> {activeBooking.slot_time}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Est. Wait</p>
                 <p className="text-sm font-bold text-slate-900">~ 24 mins</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status</p>
                 <Badge className="bg-amber-100 text-amber-800 border-0 uppercase text-[10px]">{activeBooking.status}</Badge>
               </div>
            </div>

            <div className="flex gap-3 relative z-10">
              <Link to="/farmer/queue" className="flex-1">
                <Button className="w-full bg-[#0A2E1A] hover:bg-emerald-900 text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-emerald-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Track Queue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setIsQrModalOpen(true)} className="flex-1 border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl h-12 text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Ticket className="w-4 h-4 mr-2" /> Digital Pass
              </Button>
            </div>
          </Card>
        ) : lastCompletedBooking && lastCompletedBooking.slot_date === format(new Date(), 'yyyy-MM-dd') ? (
          <Card className="p-5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-4">
               <div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 uppercase tracking-widest text-[10px] mb-2 px-2.5 py-0.5 shadow-none font-bold">Procurement Completed</Badge>
                  <h2 className="text-xl font-bold text-slate-900">{lastCompletedBooking.crop_name}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Quantity: {lastCompletedBooking.weighment_data?.net_weight_q} Q</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Value</p>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">₹{lastCompletedBooking.weighment_data?.net_payable.toLocaleString('en-IN')}</p>
               </div>
            </div>
            
            <Link to="/farmer/payments">
              <Button className="w-full bg-[#0A2E1A] hover:bg-emerald-900 text-white rounded-xl h-12 text-sm font-bold shadow-lg mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Track Payment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-6 border border-emerald-800 shadow-xl bg-gradient-to-br from-emerald-800 to-[#0A2E1A] rounded-2xl overflow-hidden relative text-white group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
            <h2 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Ready to sell your crop?</h2>
            <p className="text-emerald-100/90 text-sm mb-6 relative z-10 max-w-[280px]">Book a procurement slot at your nearest MSP centre to get the best price.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
              <Link to="/farmer/book" className="flex-1">
                <Button className="w-full bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl h-12 text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Book Procurement Slot
                </Button>
              </Link>
              <Link to="/farmer/centres" className="flex-1">
                <Button variant="outline" className="w-full border-emerald-400/30 bg-emerald-800/40 hover:bg-emerald-800/60 text-white rounded-xl h-12 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Find Best Centre
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* SMART NEXT ACTION */}
        <div className="bg-indigo-50/80 border border-indigo-100 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/40 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center gap-3 relative z-10">
             <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
               {nextAction.icon}
             </div>
             <div>
               <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-0.5">Next Action</p>
               <p className="text-sm font-semibold text-indigo-950 leading-tight">{nextAction.title}</p>
             </div>
          </div>
          <div className="relative z-10">
            {nextAction.link ? (
              <Link to={nextAction.link}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold px-4 h-9 whitespace-nowrap shadow-sm transition-all hover:scale-[1.02]">
                  {nextAction.cta}
                </Button>
              </Link>
            ) : (
              <Button onClick={nextAction.onClick} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold px-4 h-9 whitespace-nowrap shadow-sm transition-all hover:scale-[1.02]">
                {nextAction.cta}
              </Button>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: 'Book Slot', icon: <Calendar className="w-5 h-5"/>, to: '/farmer/book', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'My Bookings', icon: <FileText className="w-5 h-5"/>, to: '/farmer/bookings', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Live Queue', icon: <Users className="w-5 h-5"/>, to: '/farmer/queue', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Payments', icon: <Banknote className="w-5 h-5"/>, to: '/farmer/payments', color: 'text-teal-600', bg: 'bg-teal-50' },
              { label: 'Documents', icon: <FileArchive className="w-5 h-5"/>, to: '/farmer/documents', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Support', icon: <AlertTriangle className="w-5 h-5"/>, to: '/farmer/support', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((action, i) => (
              <Link key={i} to={action.to} className="flex flex-col items-center gap-2 group outline-none">
                <div className={`w-full aspect-[4/3] rounded-xl ${action.bg} ${action.color} flex items-center justify-center border border-transparent group-hover:border-slate-200 group-hover:shadow-sm transition-all focus:ring-2 focus:ring-emerald-500 min-h-[44px] min-w-[44px]`}>
                  {action.icon}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* RECENT PROCUREMENT HISTORY & PAYMENT TRACKER */}

        {/* RECENT PROCUREMENT HISTORY & PAYMENT TRACKER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <Card className="p-4 border border-slate-200 bg-white rounded-lg shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Recent Procurement History</h3>
                  <p className="text-[11px] text-slate-500">Track your past sales and DBT payment statuses</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700">All Records</span>
              </div>

              <div className="space-y-4 flex-1">
                {allBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <Leaf className="w-7 h-7 text-emerald-300" />
                    </div>
                    <p className="text-slate-700 text-sm font-bold mb-1">No procurement history yet</p>
                    <p className="text-slate-500 text-xs mb-4">Book your first slot to sell your harvest at guaranteed MSP prices.</p>
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
                      <div key={b.id} className="p-4 rounded-md border border-slate-200 bg-white hover:border-emerald-300 shadow-xs transition flex flex-col gap-4">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                              {b.token_number}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{b.crop_name} • {b.weighment_data?.net_weight_q || b.expected_quantity_q} Q</h4>
                              <p className="text-[11px] text-slate-500">{b.centre_name} • {b.slot_date}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                              {b.status}
                            </span>

                            {isCompleted ? (
                              <Button onClick={() => setSelectedReceipt(b)} size="sm" variant="outline" className="text-[11px] h-8 rounded-lg border-slate-300 text-slate-700 gap-1.5 px-3">
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
                          <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/50 -mx-2 -mb-2 px-2 pb-2 rounded-b-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex items-center gap-2 relative">
                                {/* Line connecting stages */}
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
                                <div className={`absolute top-1/2 left-4 h-0.5 bg-emerald-500 -z-10 -translate-y-1/2 transition-colors duration-200 ease-out`} style={{ width: stage === 3 ? 'calc(100% - 32px)' : stage === 2 ? '50%' : '0%' }}></div>

                                {/* Stage 1: Initiated */}
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage >= 1 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-slate-500'}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                  </div>
                                  <span className={`text-[9px] font-bold ${stage >= 1 ? 'text-emerald-700' : 'text-slate-500'}`}>Initiated</span>
                                </div>

                                {/* Stage 2: Treasury */}
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage >= 2 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-slate-500'} ${stage === 2 && 'ring-2 ring-emerald-200 ring-offset-1 animate-pulse'}`}>
                                    <Building className="w-3 h-3" />
                                  </div>
                                  <span className={`text-[9px] font-bold ${stage >= 2 ? 'text-emerald-700' : 'text-slate-500'}`}>Treasury Process</span>
                                </div>

                                {/* Stage 3: Credited */}
                                <div className="flex flex-col items-center gap-1 flex-1">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${stage === 3 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-slate-300 text-slate-500'}`}>
                                    <Banknote className="w-3 h-3" />
                                  </div>
                                  <span className={`text-[9px] font-bold ${stage === 3 ? 'text-emerald-700' : 'text-slate-500'}`}>Credited</span>
                                </div>
                              </div>

                              <div className="w-1/3 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">DBT Value</span>
                                <span className="text-sm font-semibold text-slate-900">₹{b.weighment_data.net_payable.toLocaleString('en-IN')}</span>
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
          </div>
          <div className="lg:col-span-1">
            <BankAccountCard />
          </div>
        </div>

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
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 print-hide"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Slip Header */}
            <div className="text-center border-b-2 border-emerald-800/20 pb-4 mb-4 relative">
              <div className="flex justify-center mb-1">
                <img src="/logo.svg" alt="Kishan Seva" className="h-14 w-14 object-contain" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base uppercase tracking-wider">
                Government of India • भारत सरकार
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold">
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
              <span className="font-mono text-slate-500 font-bold">
                SECURITY HASH: #PFMS-2026-{(selectedReceipt.id || '9821').slice(-6)}
              </span>
            </div>

            {/* Detailed Bilingual Procurement Breakdown */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Slip / Parchi Number (पर्ची संख्या):</span>
                <span className="font-mono font-semibold text-slate-900">{selectedReceipt.weighment_data.slip_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Farmer Name (किसान का नाम):</span>
                <span className="font-bold text-slate-900">{selectedReceipt.farmer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Mandi Yard (खरीद केंद्र / मंडी):</span>
                <span className="font-bold text-slate-900">{selectedReceipt.centre_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Crop Procured (फसल विवरण):</span>
                <span className="font-bold text-emerald-800">{selectedReceipt.crop_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Gross Weight (लदा हुआ धर्मकांटा वजन):</span>
                <span className="font-bold font-mono">{selectedReceipt.weighment_data.gross_weight_q} Q</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tare Weight (खाली वाहन धर्मकांटा वजन):</span>
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

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Government MSP Rate (न्यूनतम समर्थन मूल्य):</span>
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
                  MSP<br />PASS
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

            <div className="pt-2 border-t border-slate-200 flex gap-3 print-hide">
              <Button
                onClick={async () => {
                  try {
                    const { generateReceiptPdf } = await import('@/services/receiptGenerator');
                    const paymentData = {
                      rate_per_q: selectedReceipt.weighment_data?.msp_rate_per_q || 0,
                      total_amount: selectedReceipt.weighment_data?.net_payable || 0,
                      dbt_reference: selectedReceipt.weighment_data?.transaction_ref || 'PENDING'
                    };
                    toast.promise(
                      generateReceiptPdf(
                        selectedReceipt,
                        selectedReceipt.weighment_data,
                        paymentData
                      ),
                      {
                        loading: 'Generating PDF receipt...',
                        success: 'Receipt downloaded successfully!',
                        error: 'Failed to generate receipt'
                      }
                    );
                  } catch (_err) {
                    toast.error('Failed to load PDF generator');
                  }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-700 p-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold">Digital Entry Pass</h3>
                <p className="text-[10px] text-emerald-100 opacity-90">Show this at {activeBooking.centre_name}</p>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="p-1 hover:bg-emerald-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <QRCode value={activeBooking.token_number} size={180} />
              </div>
              <p className="font-mono text-xl font-bold tracking-widest text-slate-800">{activeBooking.token_number}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Scan at weighbridge</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium uppercase text-[9px] tracking-wider">Farmer</span>
                <p className="font-bold text-slate-800 truncate">{activeBooking.farmer_name}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium uppercase text-[9px] tracking-wider">Crop</span>
                <p className="font-bold text-slate-800 truncate">{activeBooking.crop_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
