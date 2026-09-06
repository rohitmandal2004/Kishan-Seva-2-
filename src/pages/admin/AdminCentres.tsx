import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMockStore } from '@/services/useMockStore';
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
  const store = useMockStore();
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

  const centres = store.getCentres();

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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Infrastructure &amp; Mandi Control
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            Procurement Centre &amp; Mandi Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weighbridge scales, capacity thresholds, and live operational status across {centres.length} Mandis.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add New Mandi
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Mandis</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{centres.length}</h3>
            <span className="text-[11px] font-bold text-emerald-600">({activeCount} Active)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Spread across {districts.length - 1} districts</p>
        </Card>

        <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Capacity</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalCapacity.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] font-bold text-slate-500">Q / day</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">Computerized scale certified</p>
        </Card>

        <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicles In Yard</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{totalQueue}</h3>
            <span className="text-[11px] font-bold text-slate-500">Live tokens</span>
          </div>
          <p className="text-[10px] text-blue-600 font-semibold mt-1">Avg turnaround ~20 min</p>
        </Card>

        <Card className="p-4 sm:p-5 border border-slate-200 shadow-xs bg-white rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mandi Health</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              {Math.round((activeCount / (centres.length || 1)) * 100)}%
            </h3>
            <span className="text-[11px] font-bold text-emerald-600">Operational</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Zero downtime recorded this week</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-slate-200 shadow-xs bg-white rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Mandi name, code, district..."
              className="pl-10 text-xs rounded-xl border-slate-200 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">District:</span>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-hidden focus:border-emerald-500"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Districts' : d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Mandis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCentres.map((centre) => {
          const loadPercent = Math.min(
            100,
            Math.round(((centre.current_queue_length * 40) / centre.daily_capacity_quintals) * 100)
          );

          return (
            <Card
              key={centre.id}
              className="p-5 border border-slate-200 shadow-xs bg-white rounded-3xl hover:border-emerald-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {centre.centre_code}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1 leading-snug">
                      {centre.name}
                    </h3>
                  </div>
                  <Badge
                    className={`text-[10px] font-bold border-0 px-2.5 py-0.5 cursor-pointer select-none transition-all ${
                      centre.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : centre.status === 'MAINTENANCE'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                    onClick={() => handleToggleStatus(centre)}
                    title="Click to toggle status"
                  >
                    {centre.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {centre.status === 'MAINTENANCE' && <Wrench className="w-3 h-3 mr-1" />}
                    {centre.status === 'INACTIVE' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {centre.status}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{centre.address}, {centre.district}</span>
                </p>

                {/* Live Capacity Meter */}
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">Live Yard Utilization</span>
                    <span className="font-bold text-slate-900">{loadPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 85 ? 'bg-red-500' : loadPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Active Queue</span>
                      <span className="font-extrabold text-slate-900">{centre.current_queue_length} Vehicles</span>
                    </div>
                    <div className="border-l border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block font-semibold">Daily Quota</span>
                      <span className="font-extrabold text-slate-900">{centre.daily_capacity_quintals} Q</span>
                    </div>
                  </div>
                </div>

                {/* Hardware Spec */}
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Computerized Scale
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    ~{centre.est_wait_time_mins}m wait
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCentre(centre);
                    setNewCapacity(centre.daily_capacity_quintals);
                  }}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Adjust Capacity
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(centre)}
                  className="text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredCentres.length === 0 && (
        <Card className="p-12 text-center border border-slate-200 rounded-3xl bg-white">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">No Mandis match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the search query or district filter.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setDistrictFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="mt-4 text-xs font-bold rounded-xl"
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* Adjust Capacity Modal */}
      <Dialog open={!!editingCentre} onOpenChange={(open) => !open && setEditingCentre(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Adjust Mandi Daily Capacity
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update the maximum daily intake threshold for {editingCentre?.name} ({editingCentre?.centre_code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Daily Capacity Threshold (Quintals)
              </label>
              <Input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                min={100}
                max={10000}
                step={50}
                className="text-sm font-bold rounded-xl border-slate-200 focus-visible:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Recommended range: 500 Q to 5,000 Q based on active weighbridges.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingCentre(null)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCapacity}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Save Capacity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Mandi Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6">
          <form onSubmit={handleAddMandi}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Register New Procurement Mandi
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Add an official West Bengal agricultural depot to the state procurement grid.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mandi Name *</label>
                <Input
                  required
                  value={newMandiName}
                  onChange={(e) => setNewMandiName(e.target.value)}
                  placeholder="e.g. Barasat Krishak Bazaar"
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mandi Code *</label>
                  <Input
                    required
                    value={newMandiCode}
                    onChange={(e) => setNewMandiCode(e.target.value)}
                    placeholder="e.g. MANDI-WB-09"
                    className="text-xs uppercase font-mono rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">District *</label>
                  <select
                    value={newMandiDistrict}
                    onChange={(e) => setNewMandiDistrict(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 outline-hidden"
                  >
                    {districts
                      .filter((d) => d !== 'ALL')
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Depot Address *</label>
                <Input
                  required
                  value={newMandiAddress}
                  onChange={(e) => setNewMandiAddress(e.target.value)}
                  placeholder="e.g. NH-34 Highway Crossing, Barasat"
                  className="text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Daily Capacity (Quintals)</label>
                <Input
                  type="number"
                  min={100}
                  step={50}
                  value={newMandiCapacity}
                  onChange={(e) => setNewMandiCapacity(Number(e.target.value))}
                  className="text-xs font-bold rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Register Mandi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
