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
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
 <div>
 <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
 Gate Intake & Scheduling Algorithms
 </span>
 <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
 Slot Quota & Capacity Control Console
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Calibrate hourly arrival windows, apply weather risk mitigation buffers, and execute emergency intake throttling.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={handleEmergencyToggle}
 variant={isEmergencyThrottled ? 'destructive' : 'outline'}
 className={`text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition ${
 isEmergencyThrottled ? 'animate-pulse' : 'border-slate-300 text-slate-700'
 }`}
 >
 <ShieldAlert className="w-4 h-4" />
 {isEmergencyThrottled ? 'Emergency Throttle Active' : 'Engage Emergency Throttle'}
 </Button>

 <Button
 onClick={handleSaveConfig}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
 >
 <Save className="w-4 h-4" /> Save Quotas
 </Button>
 </div>
 </div>

 {/* Select Mandi Bar */}
 <Card className="p-4 border border-slate-200 shadow-xs bg-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-3 w-full md:w-auto">
 <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
 <Building2 className="w-5 h-5" />
 </div>
 <div>
 <label className="text-[10px] uppercase font-bold text-slate-500 block">Target Mandi</label>
 <select
 value={selectedCentreId}
 onChange={(e) => setSelectedCentreId(e.target.value)}
 className="text-sm font-extrabold text-slate-900 bg-transparent border-0 outline-hidden cursor-pointer"
 >
 {centres.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} ({c.centre_code} - {c.district})
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
 Daily Intake Cap: <strong className="text-slate-900">{selectedCentre?.daily_capacity_quintals} Q</strong>
 </span>
 <span className="border-l border-slate-200 pl-3 flex items-center gap-1">
 <Clock className="w-3.5 h-3.5 text-slate-500" />
 Computerized Scale: <strong className="text-slate-900">Certified Active</strong>
 </span>
 </div>
 </Card>

 {/* Main Control Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column: Quota Adjusters */}
 <div className="space-y-6 lg:col-span-2">
 <Card className="p-6 border border-slate-200 shadow-xs bg-white rounded-3xl space-y-6">
 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
 <div>
 <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
 <Sliders className="w-4 h-4 text-emerald-600" />
 Time-Slot Arrival Quotas
 </h3>
 <p className="text-xs text-slate-500">Adjust max vehicles admitted per time bracket</p>
 </div>
 <Badge className="bg-slate-100 text-slate-700 border-0 text-xs font-bold">
 Total Allowed Today: {totalDailyTokens} Vehicles
 </Badge>
 </div>

 {/* Morning Slot */}
 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <Sun className="w-4 h-4 text-amber-500" />
 <div>
 <span className="text-xs font-extrabold text-slate-900 block">Morning Slot</span>
 <span className="text-[11px] text-slate-500">08:00 AM – 11:00 AM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-sm font-black text-slate-900">{effectiveMorning} Vehicles</span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-amber-600 block font-semibold">
 (Base: {morningQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
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
 className="w-full accent-emerald-600 cursor-pointer"
 />
 </div>

 {/* Afternoon Slot */}
 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <Sun className="w-4 h-4 text-orange-500" />
 <div>
 <span className="text-xs font-extrabold text-slate-900 block">Afternoon Peak Slot</span>
 <span className="text-[11px] text-slate-500">11:00 AM – 02:00 PM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-sm font-black text-slate-900">{effectiveAfternoon} Vehicles</span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-amber-600 block font-semibold">
 (Base: {afternoonQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
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
 className="w-full accent-emerald-600 cursor-pointer"
 />
 </div>

 {/* Evening Slot */}
 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-indigo-500" />
 <div>
 <span className="text-xs font-extrabold text-slate-900 block">Evening Twilight Slot</span>
 <span className="text-[11px] text-slate-500">02:00 PM – 05:00 PM</span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-sm font-black text-slate-900">{effectiveEvening} Vehicles</span>
 {weatherBufferPercent > 0 && (
 <span className="text-[10px] text-amber-600 block font-semibold">
 (Base: {eveningQuota} -{Math.round(100 - effectiveReductionFactor * 100)}%)
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
 className="w-full accent-emerald-600 cursor-pointer"
 />
 </div>
 </Card>

 {/* Slot Utilization Graph */}
 <Card className="p-6 border border-slate-200 shadow-xs bg-white rounded-3xl">
 <h3 className="font-extrabold text-slate-900 text-sm mb-1">Live Slot Booking Utilization</h3>
 <p className="text-xs text-slate-500 mb-4">Booked tokens vs Effective Quota vs Base Capacity</p>
 <div className="h-64 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis dataKey="slot" tick={{ fontSize: 11, fill: '#64748b' }} />
 <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
 <Tooltip
 contentStyle={{
 backgroundColor: '#1e293b',
 borderRadius: '12px',
 color: '#fff',
 fontSize: '12px',
 border: 'none',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
 <Bar dataKey="baseQuota" fill="#cbd5e1" name="Base Quota" radius={[4, 4, 0, 0]} />
 <Bar dataKey="effectiveQuota" fill="#10b981" name="Effective Quota" radius={[4, 4, 0, 0]} />
 <Bar dataKey="booked" fill="#3b82f6" name="Already Booked" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </Card>
 </div>

 {/* Right Column: Weather Mitigation & Emergency */}
 <div className="space-y-6">
 <Card className="p-6 border border-slate-200 shadow-xs bg-white rounded-3xl space-y-4">
 <div className="flex items-center gap-2">
 <CloudRain className="w-5 h-5 text-blue-600" />
 <div>
 <h3 className="font-extrabold text-slate-900 text-sm">Weather Risk Mitigation</h3>
 <p className="text-[11px] text-slate-500">Auto-throttle arrivals during rain alerts</p>
 </div>
 </div>

 <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
 <div className="flex justify-between items-center text-xs">
 <span className="font-bold text-blue-900">Live IMD Forecast:</span>
 <Badge className="bg-blue-200 text-blue-900 border-0 text-[10px] font-bold">
 {weatherCondition === 'CLEAR' ? 'Sunny / Clear' : weatherCondition === 'MODERATE_RAIN' ? 'Passing Showers (12mm)' : 'Heavy Monsoon'}
 </Badge>
 </div>
 <p className="text-[11px] text-blue-700 leading-tight">
 Moisture spikes occur during rain; damp paddy takes 2.5x longer to grade and weigh.
 </p>
 </div>

 <div>
 <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
 <span>Buffer Safety Margin</span>
 <span className="text-blue-600">-{weatherBufferPercent}% Quota</span>
 </div>
 <input
 type="range"
 min={0}
 max={50}
 step={5}
 value={weatherBufferPercent}
 onChange={(e) => setWeatherBufferPercent(Number(e.target.value))}
 className="w-full accent-blue-600 cursor-pointer"
 />
 <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
 <span>0% (No buffer)</span>
 <span>25% (Recommended)</span>
 <span>50% (Heavy downpour)</span>
 </div>
 </div>

 <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
 <span className="font-bold text-slate-700 block">Forecast Override:</span>
 <div className="grid grid-cols-3 gap-1.5">
 <Button
 type="button"
 size="sm"
 variant={weatherCondition === 'CLEAR' ? 'default' : 'outline'}
 onClick={() => {
 setWeatherCondition('CLEAR');
 setWeatherBufferPercent(0);
 }}
 className="text-[10px] font-bold h-8 rounded-lg"
 >
 Clear
 </Button>
 <Button
 type="button"
 size="sm"
 variant={weatherCondition === 'MODERATE_RAIN' ? 'default' : 'outline'}
 onClick={() => {
 setWeatherCondition('MODERATE_RAIN');
 setWeatherBufferPercent(15);
 }}
 className="text-[10px] font-bold h-8 rounded-lg"
 >
 Showers
 </Button>
 <Button
 type="button"
 size="sm"
 variant={weatherCondition === 'HEAVY_MONSOON' ? 'default' : 'outline'}
 onClick={() => {
 setWeatherCondition('HEAVY_MONSOON');
 setWeatherBufferPercent(40);
 }}
 className="text-[10px] font-bold h-8 rounded-lg"
 >
 Monsoon
 </Button>
 </div>
 </div>
 </Card>

 {/* Emergency Safety Protocols */}
 <Card
 className={`p-6 border rounded-3xl shadow-xs transition ${
 isEmergencyThrottled
 ? 'bg-red-50/70 border-red-200'
 : 'bg-white border-slate-200'
 }`}
 >
 <div className="flex items-center gap-2 mb-3">
 <AlertCircle
 className={`w-5 h-5 ${
 isEmergencyThrottled ? 'text-red-600' : 'text-slate-500'
 }`}
 />
 <div>
 <h3
 className={`font-extrabold text-sm ${
 isEmergencyThrottled ? 'text-red-900' : 'text-slate-900'
 }`}
 >
 Congestion Emergency Brake
 </h3>
 <p className="text-[11px] text-slate-500">
 Instantly restrict gate passes if traffic gridlocks the highway
 </p>
 </div>
 </div>

 <p className="text-xs text-slate-600 leading-relaxed mb-4">
 When triggered, all incoming unconfirmed farmer tokens receive an automated SMS deferral notice, and booking slots are throttled by 50% immediately.
 </p>

 <Button
 onClick={handleEmergencyToggle}
 variant={isEmergencyThrottled ? 'destructive' : 'outline'}
 className="w-full text-xs font-bold rounded-xl"
 >
 {isEmergencyThrottled ? 'Deactivate Emergency Protocol' : 'Engage Emergency Brake'}
 </Button>
 </Card>
 </div>
 </div>
 </div>
 );
}
