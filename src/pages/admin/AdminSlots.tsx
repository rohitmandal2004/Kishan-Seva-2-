import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useKishanData } from '@/context/DataContext';
import {
 Clock,
 CloudRain,
 ShieldAlert,
 Sliders,
 Building2,
 Sun,
 AlertCircle,
 Save,
} from 'lucide-react';
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Legend,
} from 'recharts';
import { toast } from 'sonner';

export default function AdminSlots() {
 const store = useKishanData();
 const centres = store.centres;

 const [selectedCentreId, setSelectedCentreId] = useState<string>(
 centres[0]?.id || 'centre-wb-01'
 );

 // Slot quotas for the selected centre
 const [morningQuota, setMorningQuota] = useState<number>(35);
 const [afternoonQuota, setAfternoonQuota] = useState<number>(45);
 const [eveningQuota, setEveningQuota] = useState<number>(25);

 // Weather Advisory Buffer (0% to 50% automatic cut)
 const [weatherBufferPercent, setWeatherBufferPercent] = useState<number>(15);
 const [isEmergencyThrottled, setIsEmergencyThrottled] = useState<boolean>(false);
 const [weatherCondition, setWeatherCondition] = useState<'CLEAR' | 'MODERATE_RAIN' | 'HEAVY_MONSOON'>('MODERATE_RAIN');

 const selectedCentre = useMemo(() => {
 return centres.find((c) => c.id === selectedCentreId) || centres[0];
 }, [centres, selectedCentreId]);

 // Dynamic slot calculations
 const effectiveReductionFactor = isEmergencyThrottled
 ? 0.5
 : 1 - weatherBufferPercent / 100;

 const effectiveMorning = Math.round(morningQuota * effectiveReductionFactor);
 const effectiveAfternoon = Math.round(afternoonQuota * effectiveReductionFactor);
 const effectiveEvening = Math.round(eveningQuota * effectiveReductionFactor);
 const totalDailyTokens = effectiveMorning + effectiveAfternoon + effectiveEvening;

 // Chart data
 const chartData = [
 {
 slot: 'Morning (08:00 - 11:00)',
 baseQuota: morningQuota,
 effectiveQuota: effectiveMorning,
 booked: Math.min(effectiveMorning, 28),
 },
 {
 slot: 'Afternoon (11:00 - 14:00)',
 baseQuota: afternoonQuota,
 effectiveQuota: effectiveAfternoon,
 booked: Math.min(effectiveAfternoon, 34),
 },
 {
 slot: 'Evening (14:00 - 17:00)',
 baseQuota: eveningQuota,
 effectiveQuota: effectiveEvening,
 booked: Math.min(effectiveEvening, 14),
 },
 ];

 const handleSaveConfig = () => {
 toast.success(
 `Slot configuration saved for ${selectedCentre?.name}! Daily limit set to ${totalDailyTokens} tokens.`
 );
 };

 const handleEmergencyToggle = () => {
 const nextState = !isEmergencyThrottled;
 setIsEmergencyThrottled(nextState);
 if (nextState) {
 toast.warning(`EMERGENCY THROTTLE ACTIVATED for ${selectedCentre?.name}. Intake capped at 50%.`);
 } else {
 toast.success(`Emergency throttle deactivated for ${selectedCentre?.name}. Normal quotas restored.`);
 }
 };

 return (
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-slate-200 pb-6">
 <div>
 <span className="text-[10px] uppercase font-bold bg-white text-slate-900 px-2 py-0.5 tracking-widest inline-block mb-2">
 Gate Intake & Scheduling Algorithms
 </span>
 <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight uppercase">
 Slot Quota & Capacity Control Console
 </h2>
 <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest">
 Calibrate hourly arrival windows, apply weather risk mitigation buffers, and execute emergency intake throttling.
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={handleEmergencyToggle}
 className={`text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-4 py-3 shadow-sm rounded-lg hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all flex items-center gap-2 ${
 isEmergencyThrottled ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-900 hover:bg-slate-100'
 }`}
 >
 <ShieldAlert className="w-4 h-4" />
 {isEmergencyThrottled ? 'EMERGENCY THROTTLE ACTIVE' : 'ENGAGE EMERGENCY THROTTLE'}
 </button>

 <button
 onClick={handleSaveConfig}
 className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-4 py-3 shadow-sm rounded-lg hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all flex items-center gap-2"
 >
 <Save className="w-4 h-4" /> SAVE QUOTAS
 </button>
 </div>
 </div>

 {/* Select Mandi Bar */}
 <div className="p-4 border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-4 w-full md:w-auto">
 <div className="p-3 border border-slate-200 bg-emerald-400 text-slate-900">
 <Building2 className="w-5 h-5" />
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-slate-900 block mb-1">TARGET MANDI</label>
 <select
 value={selectedCentreId}
 onChange={(e) => setSelectedCentreId(e.target.value)}
 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-50 border border-slate-200 px-3 py-2 cursor-pointer focus:outline-none"
 >
 {centres.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name.toUpperCase()} ({c.centre_code} - {c.district.toUpperCase()})
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-500 text-slate-900">
 <span className="flex items-center gap-2 bg-slate-100 px-3 py-2 border border-slate-200">
 <span className="w-2 h-2 bg-emerald-500 border border-slate-900"></span>
 DAILY INTAKE CAP: <strong className="text-slate-900">{selectedCentre?.daily_capacity_quintals} Q</strong>
 </span>
 <span className="flex items-center gap-2 bg-slate-100 px-3 py-2 border border-slate-200">
 <Clock className="w-3.5 h-3.5 text-slate-900" />
 COMPUTERIZED SCALE: <strong className="text-slate-900">CERTIFIED ACTIVE</strong>
 </span>
 </div>
 </div>

 {/* Main Control Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Left Column: Quota Adjusters */}
 <div className="space-y-8 lg:col-span-2">
 <div className="p-6 border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white space-y-6">
 <div className="flex items-center justify-between border-b border-slate-200 pb-4">
 <div>
 <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 uppercase tracking-widest">
 <Sliders className="w-5 h-5 text-emerald-500" />
 Time-Slot Arrival Quotas
 </h3>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Adjust max vehicles admitted per time bracket</p>
 </div>
 <span className="bg-white text-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-slate-200">
 TOTAL TODAY: {totalDailyTokens} VEHS
 </span>
 </div>

 {/* Morning Slot */}
 <div className="p-5 bg-white border border-slate-200 space-y-4 hover:shadow-sm rounded-lg transition-all">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-100 border border-slate-200">
 <Sun className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <span className="text-sm font-bold text-slate-900 block uppercase tracking-widest">Morning Slot</span>
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">08:00 AM – 11:00 AM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-2xl font-bold text-slate-900 tabular-nums">{effectiveMorning} <span className="text-[10px] text-slate-500 tracking-widest ml-1">VEHS</span></span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-slate-900 bg-amber-400 font-bold uppercase tracking-widest px-1 border border-slate-200 block mt-1">
 (BASE: {morningQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
 </span>
 )}
 </div>
 </div>
 <input
 type="range"
 min={10}
 max={80}
 step={5}
 value={morningQuota}
 onChange={(e) => setMorningQuota(Number(e.target.value))}
 className="w-full accent-slate-900 h-2 bg-slate-200 cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
 />
 </div>

 {/* Afternoon Slot */}
 <div className="p-5 bg-white border border-slate-200 space-y-4 hover:shadow-sm rounded-lg transition-all">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-orange-100 border border-slate-200">
 <Sun className="w-5 h-5 text-orange-500" />
 </div>
 <div>
 <span className="text-sm font-bold text-slate-900 block uppercase tracking-widest">Afternoon Peak Slot</span>
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">11:00 AM – 02:00 PM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-2xl font-bold text-slate-900 tabular-nums">{effectiveAfternoon} <span className="text-[10px] text-slate-500 tracking-widest ml-1">VEHS</span></span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-slate-900 bg-amber-400 font-bold uppercase tracking-widest px-1 border border-slate-200 block mt-1">
 (BASE: {afternoonQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
 </span>
 )}
 </div>
 </div>
 <input
 type="range"
 min={10}
 max={80}
 step={5}
 value={afternoonQuota}
 onChange={(e) => setAfternoonQuota(Number(e.target.value))}
 className="w-full accent-slate-900 h-2 bg-slate-200 cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
 />
 </div>

 {/* Evening Slot */}
 <div className="p-5 bg-white border border-slate-200 space-y-4 hover:shadow-sm rounded-lg transition-all">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-indigo-100 border border-slate-200">
 <Clock className="w-5 h-5 text-indigo-500" />
 </div>
 <div>
 <span className="text-sm font-bold text-slate-900 block uppercase tracking-widest">Evening Twilight Slot</span>
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">02:00 PM – 05:00 PM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-2xl font-bold text-slate-900 tabular-nums">{effectiveEvening} <span className="text-[10px] text-slate-500 tracking-widest ml-1">VEHS</span></span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-slate-900 bg-amber-400 font-bold uppercase tracking-widest px-1 border border-slate-200 block mt-1">
 (BASE: {eveningQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
 </span>
 )}
 </div>
 </div>
 <input
 type="range"
 min={10}
 max={80}
 step={5}
 value={eveningQuota}
 onChange={(e) => setEveningQuota(Number(e.target.value))}
 className="w-full accent-slate-900 h-2 bg-slate-200 cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
 />
 </div>
 </div>

 {/* Slot Utilization Graph */}
 <div className="p-6 border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
 <h3 className="font-bold text-slate-900 text-lg uppercase tracking-widest mb-1">Live Slot Booking Utilization</h3>
 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Booked tokens vs Effective Quota vs Base Capacity</p>
 <div className="h-64 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e2e8f0" strokeWidth={2} />
 <XAxis dataKey="slot" tick={{ fontSize: 10, fill: '#0f172a', fontWeight: '900' }} tickLine={false} axisLine={{ strokeWidth: 2, stroke: '#0f172a' }} />
 <YAxis tick={{ fontSize: 10, fill: '#0f172a', fontWeight: '900' }} tickLine={false} axisLine={{ strokeWidth: 2, stroke: '#0f172a' }} />
 <Tooltip
 contentStyle={{
 backgroundColor: '#0f172a',
 borderRadius: '0',
 color: '#fff',
 fontSize: '10px',
 fontWeight: '900',
 textTransform: 'uppercase',
 letterSpacing: '0.1em',
 border: '2px solid #000',
 boxShadow: '4px 4px 0px rgba(0,0,0,1)',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} />
 <Bar dataKey="baseQuota" fill="#cbd5e1" name="Base Quota" radius={[0, 0, 0, 0]} stroke="#0f172a" strokeWidth={2} />
 <Bar dataKey="effectiveQuota" fill="#34d399" name="Effective Quota" radius={[0, 0, 0, 0]} stroke="#0f172a" strokeWidth={2} />
 <Bar dataKey="booked" fill="#3b82f6" name="Already Booked" radius={[0, 0, 0, 0]} stroke="#0f172a" strokeWidth={2} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* Right Column: Weather Mitigation & Emergency */}
 <div className="space-y-8">
 <div className="p-6 border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white space-y-6">
 <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
 <div className="p-2 bg-blue-100 border border-slate-200">
 <CloudRain className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest leading-none mb-1">Weather Mitigation</h3>
 <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Auto-throttle during rain</p>
 </div>
 </div>

 <div className="p-4 bg-blue-50 border border-slate-200 space-y-3">
 <div className="flex justify-between items-center text-[10px]">
 <span className="font-bold text-slate-900 uppercase tracking-widest">Live IMD Forecast</span>
 <span className="bg-white text-slate-900 px-2 py-0.5 border border-slate-200 text-[9px] font-bold uppercase tracking-widest">
 {weatherCondition === 'CLEAR' ? 'SUNNY / CLEAR' : weatherCondition === 'MODERATE_RAIN' ? 'SHOWERS (12MM)' : 'HEAVY MONSOON'}
 </span>
 </div>
 <p className="text-[10px] font-bold text-slate-700 leading-tight border-t-2 border-slate-900 pt-3 uppercase tracking-widest">
 Damp paddy takes 2.5x longer to grade and weigh.
 </p>
 </div>

 <div>
 <div className="flex justify-between text-[10px] font-bold text-slate-900 mb-2 uppercase tracking-widest">
 <span>Buffer Margin</span>
 <span className="bg-blue-400 px-1 border border-slate-200">-{weatherBufferPercent}% QUOTA</span>
 </div>
 <input
 type="range"
 min={0}
 max={50}
 step={5}
 value={weatherBufferPercent}
 onChange={(e) => setWeatherBufferPercent(Number(e.target.value))}
 className="w-full accent-slate-900 h-2 bg-slate-200 cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
 />
 <div className="flex justify-between text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-widest">
 <span>0% (NONE)</span>
 <span>25% (REC.)</span>
 <span>50% (MAX)</span>
 </div>
 </div>

 <div className="pt-4 border-t-2 border-slate-900 text-xs space-y-3">
 <span className="font-bold text-slate-900 text-[10px] uppercase tracking-widest block">Forecast Override:</span>
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => {
 setWeatherCondition('CLEAR');
 setWeatherBufferPercent(0);
 }}
 className={`text-[10px] font-bold uppercase tracking-widest border border-slate-200 py-2 transition-all ${weatherCondition === 'CLEAR' ? 'bg-white text-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
 >
 CLEAR
 </button>
 <button
 type="button"
 onClick={() => {
 setWeatherCondition('MODERATE_RAIN');
 setWeatherBufferPercent(15);
 }}
 className={`text-[10px] font-bold uppercase tracking-widest border border-slate-200 py-2 transition-all ${weatherCondition === 'MODERATE_RAIN' ? 'bg-white text-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
 >
 SHOWERS
 </button>
 <button
 type="button"
 onClick={() => {
 setWeatherCondition('HEAVY_MONSOON');
 setWeatherBufferPercent(40);
 }}
 className={`text-[10px] font-bold uppercase tracking-widest border border-slate-200 py-2 transition-all ${weatherCondition === 'HEAVY_MONSOON' ? 'bg-white text-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'}`}
 >
 MONSOON
 </button>
 </div>
 </div>
 </div>

 {/* Emergency Safety Protocols */}
 <div
 className={`p-6 border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-colors ${
 isEmergencyThrottled
 ? 'bg-red-400'
 : 'bg-white'
 }`}
 >
 <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-4">
 <div className={`p-2 border border-slate-200 ${isEmergencyThrottled ? 'bg-white' : 'bg-slate-100'}`}>
 <AlertCircle
 className="w-5 h-5 text-slate-900"
 />
 </div>
 <div>
 <h3
 className="font-bold text-slate-900 text-sm uppercase tracking-widest leading-none mb-1"
 >
 Congestion Brake
 </h3>
 <p className={`text-[9px] font-bold uppercase tracking-widest ${isEmergencyThrottled ? 'text-slate-900' : 'text-slate-600'}`}>
 Restrict gate passes
 </p>
 </div>
 </div>

 <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-6 ${isEmergencyThrottled ? 'text-slate-900' : 'text-slate-600'}`}>
 When triggered, unconfirmed farmer tokens receive SMS deferrals, and slots are throttled by 50%.
 </p>

 <button
 onClick={handleEmergencyToggle}
 className={`w-full text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-4 py-4 shadow-sm rounded-lg hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all ${
 isEmergencyThrottled ? 'bg-white text-slate-900' : 'bg-red-500 text-white'
 }`}
 >
 {isEmergencyThrottled ? 'DEACTIVATE EMERGENCY PROTOCOL' : 'ENGAGE EMERGENCY BRAKE'}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
