import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKishanData } from '@/context/DataContext';
import { ProcurementCentre } from '@/types';
import {
 Building2,
 Search,
 Filter,
 SlidersHorizontal,
 Scale,
 Users,
 CheckCircle2,
 AlertTriangle,
 Wrench,
 Plus,
 ArrowUpDown,
 MapPin,
 TrendingUp,
 Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';

export default function AdminCentres() {
 const store = useKishanData();
 const [searchTerm, setSearchTerm] = useState('');
 const [districtFilter, setDistrictFilter] = useState('ALL');
 const [statusFilter, setStatusFilter] = useState('ALL');
 const [editingCentre, setEditingCentre] = useState<ProcurementCentre | null>(null);
 const [newCapacity, setNewCapacity] = useState<number>(1000);
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);

 // New Mandi Form State
 const [newMandiName, setNewMandiName] = useState('');
 const [newMandiCode, setNewMandiCode] = useState('');
 const [newMandiDistrict, setNewMandiDistrict] = useState('North 24 Parganas');
 const [newMandiAddress, setNewMandiAddress] = useState('');
 const [newMandiCapacity, setNewMandiCapacity] = useState(1200);

 const centres = store.centres;

 // Extract unique districts
 const districts = useMemo(() => {
 const list = Array.from(new Set(centres.map((c) => c.district)));
 return ['ALL', ...list];
 }, [centres]);

 // Filtered list
 const filteredCentres = useMemo(() => {
 return centres.filter((c) => {
 const matchesSearch =
 c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.centre_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.district.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesDistrict = districtFilter === 'ALL' || c.district === districtFilter;
 const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
 return matchesSearch && matchesDistrict && matchesStatus;
 });
 }, [centres, searchTerm, districtFilter, statusFilter]);

 // Aggregate stats
 const totalCapacity = centres.reduce((acc, c) => acc + c.daily_capacity_quintals, 0);
 const totalQueue = centres.reduce((acc, c) => acc + c.current_queue_length, 0);
 const activeCount = centres.filter((c) => c.status === 'ACTIVE').length;

 const handleToggleStatus = (centre: ProcurementCentre) => {
 const nextStatus: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' =
 centre.status === 'ACTIVE'
 ? 'MAINTENANCE'
 : centre.status === 'MAINTENANCE'
 ? 'INACTIVE'
 : 'ACTIVE';

 store.updateCentre(centre.id, { status: nextStatus });
 toast.success(`Mandi ${centre.name} status changed to ${nextStatus}`);
 };

 const handleSaveCapacity = () => {
 if (!editingCentre) return;
 if (newCapacity <= 0) {
 toast.error('Capacity must be greater than 0');
 return;
 }

 store.updateCentre(editingCentre.id, { daily_capacity_quintals: newCapacity });
 toast.success(
 `Daily capacity updated to ${newCapacity.toLocaleString('en-IN')} Q for ${editingCentre.name}`
 );
 setEditingCentre(null);
 };

 const handleAddMandi = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newMandiName || !newMandiCode || !newMandiAddress) {
 toast.error('Please fill in all mandatory fields');
 return;
 }

 const newCentre: ProcurementCentre = {
 id: `centre-custom-${Date.now()}`,
 name: newMandiName,
 centre_code: newMandiCode.toUpperCase(),
 state: 'West Bengal',
 district: newMandiDistrict,
 address: newMandiAddress,
 latitude: 22.8 + Math.random() * 1.5,
 longitude: 87.5 + Math.random() * 1.5,
 daily_capacity_quintals: newMandiCapacity,
 current_queue_length: 0,
 est_wait_time_mins: 15,
 accepted_crops: ['Paddy (Grade A)', 'Common Paddy', 'Mustard'],
 status: 'ACTIVE',
 contact_number: '+91 33 2248 1000',
 };

 store.addCentre(newCentre);
 toast.success(`New Mandi ${newMandiName} registered successfully!`);
 setIsAddModalOpen(false);
 setNewMandiName('');
 setNewMandiCode('');
 setNewMandiAddress('');
 };

 return (
 <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-slate-900 pb-6">
 <div>
 <span className="text-[10px] uppercase font-black bg-slate-900 text-white px-2 py-0.5 tracking-widest inline-block mb-2">
 Infrastructure &amp; Mandi Control
 </span>
 <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight uppercase">
 Procurement Centre &amp; Mandi Management
 </h2>
 <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest">
 Configure weighbridge scales, capacity thresholds, and live operational status across {centres.length} Mandis.
 </p>
 </div>
 <button
 onClick={() => setIsAddModalOpen(true)}
 className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-black uppercase tracking-widest border-2 border-slate-900 px-4 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all flex items-center gap-2"
 >
 <Plus className="w-4 h-4" /> ADD NEW MANDI
 </button>
 </div>

 {/* KPI Overview */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 bg-slate-900 border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Mandis</span>
 <Building2 className="w-4 h-4 text-slate-900" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">{centres.length}</h3>
 </div>
 <p className="text-[10px] text-white bg-emerald-900 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-emerald-950">
 {activeCount} Active
 </p>
 <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-widest block">Spread across {districts.length - 1} districts</p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">State Capacity</span>
 <Scale className="w-4 h-4 text-emerald-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">
 {totalCapacity.toLocaleString('en-IN')}
 </h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Q/DAY</span>
 </div>
 <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest block border-t-2 border-slate-900 pt-2">Computerized scale certified</p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Vehicles In Yard</span>
 <Users className="w-4 h-4 text-blue-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">{totalQueue}</h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">TOKENS</span>
 </div>
 <p className="text-[10px] text-blue-900 bg-blue-100 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-blue-900">
 TURNAROUND: ~20M
 </p>
 </div>
 </div>

 <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
 <div className="flex items-center justify-between mb-6">
 <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mandi Health</span>
 <TrendingUp className="w-4 h-4 text-purple-600" />
 </div>
 <div>
 <div className="flex items-baseline gap-2">
 <h3 className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tabular-nums tracking-tighter">
 {Math.round((activeCount / (centres.length || 1)) * 100)}%
 </h3>
 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">OPR</span>
 </div>
 <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest block border-t-2 border-slate-900 pt-2">Zero downtime this week</p>
 </div>
 </div>
 </div>

 {/* Filter and Search Bar */}
 <div className="p-4 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
 <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="relative w-full md:w-96">
 <Search className="w-4 h-4 text-slate-900 absolute left-4 top-1/2 -translate-y-1/2 font-black" />
 <input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="SEARCH BY MANDI NAME, CODE..."
 className="pl-12 w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 placeholder:text-slate-400"
 />
 </div>

 <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
 <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-900 px-3 py-2">
 <Filter className="w-4 h-4 text-slate-900" />
 <span className="text-xs font-black uppercase tracking-widest text-slate-900">DISTRICT:</span>
 <select
 value={districtFilter}
 onChange={(e) => setDistrictFilter(e.target.value)}
 className="text-xs font-black uppercase tracking-widest bg-transparent text-slate-900 focus:outline-none cursor-pointer"
 >
 {districts.map((d) => (
 <option key={d} value={d}>
 {d === 'ALL' ? 'ALL DISTRICTS' : d.toUpperCase()}
 </option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-900 px-3 py-2">
 <span className="text-xs font-black uppercase tracking-widest text-slate-900">STATUS:</span>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="text-xs font-black uppercase tracking-widest bg-transparent text-slate-900 focus:outline-none cursor-pointer"
 >
 <option value="ALL">ALL STATUSES</option>
 <option value="ACTIVE">ACTIVE ONLY</option>
 <option value="MAINTENANCE">MAINTENANCE</option>
 <option value="INACTIVE">INACTIVE</option>
 </select>
 </div>
 </div>
 </div>
 </div>

 {/* Mandis Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredCentres.map((centre) => {
 const loadPercent = Math.min(
 100,
 Math.round(((centre.current_queue_length * 40) / centre.daily_capacity_quintals) * 100)
 );

 return (
 <div
 key={centre.id}
 className="p-5 border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white flex flex-col justify-between"
 >
 <div>
 <div className="flex items-start justify-between gap-2 mb-4">
 <div>
 <span className="text-[10px] font-mono font-black border-2 border-slate-900 bg-slate-100 text-slate-900 px-2 py-0.5 tracking-widest uppercase">
 {centre.centre_code}
 </span>
 <h3 className="font-black text-xl text-slate-900 mt-3 leading-snug uppercase tracking-widest">
 {centre.name}
 </h3>
 </div>
 <button
 className={`text-[10px] font-black border-2 border-slate-900 px-2 py-1 select-none transition uppercase tracking-widest flex items-center shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${
 centre.status === 'ACTIVE'
 ? 'bg-emerald-400 text-slate-900'
 : centre.status === 'MAINTENANCE'
 ? 'bg-amber-400 text-slate-900'
 : 'bg-red-500 text-white'
 }`}
 onClick={() => handleToggleStatus(centre)}
 title="Click to toggle status"
 >
 {centre.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 mr-1" />}
 {centre.status === 'MAINTENANCE' && <Wrench className="w-3 h-3 mr-1" />}
 {centre.status === 'INACTIVE' && <AlertTriangle className="w-3 h-3 mr-1" />}
 {centre.status}
 </button>
 </div>

 <p className="text-[10px] text-slate-700 font-bold flex items-center gap-1 mt-1 uppercase tracking-widest border-b-2 border-slate-900 pb-4">
 <MapPin className="w-3 h-3 text-slate-900 shrink-0" />
 <span className="truncate">{centre.address}, {centre.district}</span>
 </p>

 {/* Live Capacity Meter */}
 <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-900 space-y-3">
 <div className="flex justify-between items-center text-[10px]">
 <span className="text-slate-900 font-black uppercase tracking-widest">Live Yard Utilization</span>
 <span className="font-black text-slate-900 bg-white border-2 border-slate-900 px-1 py-0.5">{loadPercent}%</span>
 </div>
 <div className="w-full h-4 bg-white border-2 border-slate-900 overflow-hidden relative">
 <div
 className={`absolute h-full border-r-2 border-slate-900 ${
 loadPercent > 85 ? 'bg-red-500' : loadPercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
 }`}
 style={{ width: `${loadPercent}%` }}
 />
 </div>

 <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-slate-900 text-center text-xs">
 <div>
 <span className="text-[9px] text-slate-700 block font-black uppercase tracking-widest mb-1">Active Queue</span>
 <span className="font-black text-slate-900 tabular-nums">{centre.current_queue_length} VEHS</span>
 </div>
 <div className="border-l-2 border-slate-900">
 <span className="text-[9px] text-slate-700 block font-black uppercase tracking-widest mb-1">Daily Quota</span>
 <span className="font-black text-slate-900 tabular-nums">{centre.daily_capacity_quintals} Q</span>
 </div>
 </div>
 </div>

 {/* Hardware Spec */}
 <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-900 mt-4 px-1">
 <span className="flex items-center gap-1">
 <Scale className="w-3 h-3 text-slate-900" />
 COMPUTERIZED
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3 text-slate-900" />
 ~{centre.est_wait_time_mins}M WAIT
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex items-center gap-2 mt-6 pt-4 border-t-2 border-slate-900">
 <button
 onClick={() => {
 setEditingCentre(centre);
 setNewCapacity(centre.daily_capacity_quintals);
 }}
 className="flex-1 bg-white hover:bg-slate-900 text-slate-900 hover:text-white text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 py-3 transition-colors flex justify-center items-center gap-2"
 >
 <SlidersHorizontal className="w-3 h-3" /> Adjust Capacity
 </button>
 <button
 onClick={() => handleToggleStatus(centre)}
 className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border-2 border-slate-900 px-4 py-3 transition-colors"
 >
 <ArrowUpDown className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {filteredCentres.length === 0 && (
 <div className="p-12 text-center border-2 border-slate-900 shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white">
 <Building2 className="w-12 h-12 text-slate-900 mx-auto mb-4" />
 <h3 className="font-black text-slate-900 uppercase tracking-widest text-lg">NO MANDIS MATCH YOUR FILTERS</h3>
 <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-widest">Try resetting the search query or district filter.</p>
 <button
 onClick={() => {
 setSearchTerm('');
 setDistrictFilter('ALL');
 setStatusFilter('ALL');
 }}
 className="mt-6 text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 border-2 border-slate-900 transition-colors"
 >
 RESET FILTERS
 </button>
 </div>
 )}

 {/* Adjust Capacity Modal */}
 <Dialog open={!!editingCentre} onOpenChange={(open) => !open && setEditingCentre(null)}>
 <DialogContent className="sm:max-w-md bg-white border-2 border-slate-900 rounded-none shadow-[8px_8px_0px_rgba(0,0,0,1)] p-0">
 <div className="p-6">
 <DialogHeader>
 <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-widest">
 Adjust Mandi Daily Capacity
 </DialogTitle>
 <DialogDescription className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-2">
 Update the maximum daily intake threshold for {editingCentre?.name} ({editingCentre?.centre_code}).
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-6">
 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">
 Daily Capacity Threshold (Quintals)
 </label>
 <input
 type="number"
 value={newCapacity}
 onChange={(e) => setNewCapacity(Number(e.target.value))}
 min={100}
 max={10000}
 step={50}
 className="w-full text-sm font-black rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
 />
 <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase tracking-widest">
 Recommended range: 500 Q to 5,000 Q based on active weighbridges.
 </p>
 </div>
 </div>

 <DialogFooter className="gap-4 sm:gap-0 mt-4 border-t-2 border-slate-900 pt-6">
 <button
 type="button"
 onClick={() => setEditingCentre(null)}
 className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 px-6 py-3 transition-colors mr-0 sm:mr-4"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleSaveCapacity}
 className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 px-6 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all mt-4 sm:mt-0"
 >
 Save Capacity
 </button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 {/* Add New Mandi Modal */}
 <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
 <DialogContent className="sm:max-w-lg bg-white border-2 border-slate-900 rounded-none shadow-[8px_8px_0px_rgba(0,0,0,1)] p-0">
 <div className="p-6">
 <form onSubmit={handleAddMandi}>
 <DialogHeader>
 <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-widest">
 Register New Procurement Mandi
 </DialogTitle>
 <DialogDescription className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-2">
 Add an official West Bengal agricultural depot to the state procurement grid.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-6 text-left">
 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">Mandi Name *</label>
 <input
 required
 value={newMandiName}
 onChange={(e) => setNewMandiName(e.target.value)}
 placeholder="E.G. BARASAT KRISHAK BAZAAR"
 className="w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">Mandi Code *</label>
 <input
 required
 value={newMandiCode}
 onChange={(e) => setNewMandiCode(e.target.value)}
 placeholder="E.G. MANDI-WB-09"
 className="w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
 />
 </div>
 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">District *</label>
 <select
 value={newMandiDistrict}
 onChange={(e) => setNewMandiDistrict(e.target.value)}
 className="w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none cursor-pointer"
 >
 {districts
 .filter((d) => d !== 'ALL')
 .map((d) => (
 <option key={d} value={d}>
 {d.toUpperCase()}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">Depot Address *</label>
 <input
 required
 value={newMandiAddress}
 onChange={(e) => setNewMandiAddress(e.target.value)}
 placeholder="E.G. NH-34 HIGHWAY CROSSING, BARASAT"
 className="w-full text-xs font-black uppercase tracking-widest rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
 />
 </div>

 <div>
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block mb-2">Daily Capacity (Quintals)</label>
 <input
 type="number"
 min={100}
 step={50}
 value={newMandiCapacity}
 onChange={(e) => setNewMandiCapacity(Number(e.target.value))}
 className="w-full text-sm font-black rounded-none border-2 border-slate-900 bg-slate-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
 />
 </div>
 </div>

 <DialogFooter className="gap-4 sm:gap-0 mt-2 border-t-2 border-slate-900 pt-6">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
 className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 px-6 py-3 transition-colors mr-0 sm:mr-4"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 px-6 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all mt-4 sm:mt-0"
 >
 Register Mandi
 </button>
 </DialogFooter>
 </form>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
