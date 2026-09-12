import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { QRScannerModal } from '@/components/ui/QRScannerModal';
import { QueueAnalyticsChart } from '@/components/ui/QueueAnalyticsChart';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/services/i18n';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const store = useKishanData();
  const allBookings = store.getBookings();
  
  // Status bucketing
  const activeBookings = allBookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
  const completedBookings = allBookings.filter(b => b.status === 'COMPLETED');
  const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');
  const waitingBookings = activeBookings.filter(b => b.status === 'BOOKED' || b.status === 'CHECKED_IN');
  const servingBookings = activeBookings.filter(b => b.status === 'QUALITY_TESTING' || b.status === 'WEIGHMENT');
  
  const totalProcuredQ = completedBookings.reduce((sum, b) => sum + (b.weighment_data?.net_weight_q || b.expected_quantity_q), 0);
  const centreCapacity = 500; // Mocked capacity
  const remainingCapacity = centreCapacity - totalProcuredQ;

  const currentlyServing = servingBookings[0] || waitingBookings[0]; // The active one
  
  // Queue for table (excluding the one currently in the big command box)
  const queueList = activeBookings.filter(b => b.id !== currentlyServing?.id);

  const { isProfileLoading } = useSupabase();
  const reduce = useReducedMotion();

  // Animation constants based on the animate skill
  const transition = {
    duration: 0.2 // 200ms
  };

  const variants = {
    initial: { opacity: 0, transform: reduce ? "translateY(0px)" : "translateY(10px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    exit: { opacity: 0, transform: reduce ? "translateY(0px)" : "translateY(-10px)" }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (isScannerOpen) return;
      
      if (e.key.toLowerCase() === 'q') navigate('/operator/quality');
      if (e.key.toLowerCase() === 'w') navigate('/operator/weighment');
      if (e.key.toLowerCase() === 's') setIsScannerOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, isScannerOpen]);

  if (isProfileLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full p-4 md:p-6 bg-slate-50/60 min-h-screen">
        {/* Top Strip Skeleton */}
        <div className="bg-slate-900 p-3 mb-6 flex justify-between">
          <div className="h-4 w-48 bg-slate-800 animate-pulse"></div>
          <div className="h-4 w-96 bg-slate-800 animate-pulse hidden md:block"></div>
        </div>

        {/* Command Box Skeleton */}
        <div className="border-2 border-slate-900 bg-white mb-8">
          <div className="p-4 border-b-2 border-slate-900 bg-slate-50 flex justify-between">
            <div className="h-3 w-48 bg-slate-300 animate-pulse"></div>
            <div className="h-3 w-64 bg-slate-200 animate-pulse"></div>
          </div>
          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="h-4 w-32 bg-slate-800 animate-pulse"></div>
              <div className="h-24 w-48 bg-slate-300 animate-pulse"></div>
              <div className="h-6 w-64 bg-slate-200 animate-pulse"></div>
            </div>
            <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px]">
              <div className="h-16 w-full bg-slate-200 animate-pulse border-2 border-transparent"></div>
              <div className="h-16 w-full bg-white animate-pulse border-2 border-slate-200"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="border border-slate-300 bg-white">
          <div className="p-4 border-b border-slate-300 bg-slate-50 flex justify-between">
            <div className="h-3 w-48 bg-slate-300 animate-pulse"></div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
                <div className="h-4 w-48 bg-slate-200 animate-pulse"></div>
                <div className="h-4 w-24 bg-slate-300 animate-pulse"></div>
                <div className="h-6 w-16 bg-slate-200 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1400px] mx-auto w-full font-sans text-slate-900 pb-12 p-4 md:p-6">
        
        {/* 1. CENTRE STATUS (Top Strip) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-3 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-none animate-pulse"></div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
              KSP-001 | Live Operations
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 uppercase">{t('waiting')}:</span>
              <span className="font-bold">{waitingBookings.length}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 uppercase">{t('serving')}:</span>
              <span className="font-bold text-emerald-400">{servingBookings.length}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 uppercase">{t('completed_status')}:</span>
              <span className="font-bold">{completedBookings.length}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 uppercase">{t('cancel_noshow')}:</span>
              <span className="font-bold text-red-400">{cancelledBookings.length}</span>
            </div>
            <div className="flex gap-2 items-center border-l border-slate-700 pl-6">
              <span className="text-slate-400 uppercase">{t('capacity_rem')}:</span>
              <span className="font-bold text-amber-400">{Math.max(0, remainingCapacity).toFixed(0)} Q</span>
            </div>
          </div>
        </div>

        {/* 2. PRIMARY ACTION & CURRENT TOKEN (Command Box) */}
        <div className="border-2 border-slate-900 bg-white mb-8">
          <div className="p-4 border-b-2 border-slate-900 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">{t('immediate_action')}</h2>
            <div className="flex flex-wrap gap-3 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">
              <span>Shortcuts:</span>
              <span className="bg-slate-200 px-1 border border-slate-300">[Q] Quality</span>
              <span className="bg-slate-200 px-1 border border-slate-300">[W] Weigh</span>
              <span className="bg-slate-200 px-1 border border-slate-300">[S] Scan</span>
            </div>
          </div>
          
          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 overflow-hidden relative">
            <AnimatePresence mode="popLayout">
              {currentlyServing ? (
                <motion.div 
                  key={currentlyServing.id}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={variants}
                  transition={transition}
                  className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 w-full"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">
                        {currentlyServing.status.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {currentlyServing.crop_name} • {currentlyServing.expected_quantity_q} Q
                      </span>
                    </div>
                    <h3 className="text-[clamp(2.5rem,8vw,4.5rem)] font-black font-mono tabular-nums tracking-tighter mb-2 leading-none">
                      {currentlyServing.token_number}
                    </h3>
                    <p className="text-xl font-bold text-slate-700">
                      {currentlyServing.farmer_name} <span className="text-slate-400 font-normal">({currentlyServing.farmer_phone})</span>
                    </p>
                    <p className="text-sm font-mono text-slate-500 mt-1 uppercase">Vehicle: {currentlyServing.vehicle_number || 'N/A'}</p>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px]">
                    {currentlyServing.status === 'BOOKED' || currentlyServing.status === 'CHECKED_IN' ? (
                      <button 
                        onClick={() => navigate('/operator/quality')}
                        className="w-full bg-slate-900 text-white font-bold uppercase tracking-widest py-4 px-6 border-2 border-transparent hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                      >
                        {t('call_quality')}
                      </button>
                    ) : currentlyServing.status === 'QUALITY_TESTING' ? (
                      <button 
                        onClick={() => navigate('/operator/weighment')}
                        className="w-full bg-emerald-600 text-white font-bold uppercase tracking-widest py-4 px-6 border-2 border-transparent hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        {t('proceed_weighment')}
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/operator/weighment')}
                        className="w-full bg-amber-500 text-slate-900 font-bold uppercase tracking-widest py-4 px-6 border-2 border-transparent hover:bg-amber-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                      >
                        Complete & Disburse
                      </button>
                    )}
                    <button className="w-full bg-white text-slate-900 font-bold uppercase tracking-widest py-4 px-6 border-2 border-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
                      Mark No-Show
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty-queue"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={variants}
                  transition={transition}
                  className="flex-1 text-center py-12 w-full"
                >
                  <p className="text-2xl font-bold text-slate-400">Queue is currently empty.</p>
                  <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="mt-6 bg-slate-900 text-white font-bold uppercase tracking-widest py-3 px-6 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    Scan Arrival Slip [S]
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. THE LIVE QUEUE */}
        <div className="border border-slate-300 bg-white mb-12">
          <div className="p-4 border-b border-slate-300 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Live Operational Queue</h3>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">{queueList.length} Farmers Waiting</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Token</th>
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Farmer</th>
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Commodity</th>
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Wait Time</th>
                  <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {queueList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans font-bold">No other farmers in the live queue.</td>
                  </tr>
                ) : queueList.map((booking, index) => {
                  // Mocking wait duration based on index for visual realism
                  const waitTime = (index + 1) * 15;
                  const isDelayed = waitTime > 45;
                  
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{booking.token_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-sans">{booking.farmer_name}</div>
                        <div className="text-[9px] text-slate-500">{booking.farmer_phone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {booking.expected_quantity_q} Q <br/> <span className="text-[9px] text-slate-400">{booking.crop_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 border uppercase ${
                          booking.status === 'BOOKED' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                          booking.status === 'QUALITY_TESTING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          [{booking.status.replace('_', ' ')}]
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-bold ${isDelayed ? 'text-amber-600' : 'text-slate-600'}`}>
                        {waitTime}m
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-[10px] font-bold uppercase tracking-widest text-slate-900 underline hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-sm">
                          {booking.status === 'BOOKED' ? 'Call' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. SECONDARY ANALYTICS */}
        <div className="border border-slate-300 bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Queue Analytics (End of Day)</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 font-bold font-mono uppercase tracking-widest">HISTORICAL</span>
          </div>
          <QueueAnalyticsChart centreId="KSP-001" />
        </div>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
