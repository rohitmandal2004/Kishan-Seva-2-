// Recharts is used in AdminAnalytics — not needed here
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { toast } from 'sonner';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef } from 'react';

// Isolated clock component to prevent full-page re-renders
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono tabular-nums text-sm font-bold tracking-tight text-slate-900">
      {currentTime.toLocaleString('en-IN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: 'short', year: 'numeric'
      }).toUpperCase()}
    </div>
  );
}

// Simulated sync indicator
function SyncStatus() {
  const [syncSeconds, setSyncSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSyncSeconds(s => (s + 1) % 15), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-slate-300">Live Sys: Active [SYNC: {syncSeconds}s ago]</span>
  );
}

export default function AdminOverview() {
  const store = useKishanData();
  const { isProfileLoading: isLoading } = useSupabase();

  const centres = store.centres;
  const stats = store.getStats();
  const storeBookings = store.bookings || [];

  const sortedCentres = [...centres].sort((a, b) => b.current_queue_length - a.current_queue_length);
  const overloadedCentres = centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05));

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedCentres.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Estimated row height (52px)
    overscan: 5,
  });

  const [pendingFarmers, setPendingFarmers] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    const loadPending = async () => {
      const farmers = await SupabaseDataService.getPendingFarmers();
      setPendingFarmers(farmers);
    };
    loadPending();
  }, []);

  const handleApprove = async (farmerId: string) => {
    try {
      setIsApproving(farmerId);
      await SupabaseDataService.approveFarmer(farmerId);
      setPendingFarmers(prev => prev.filter(f => f.id !== farmerId));
      toast.success('Farmer profile approved successfully');
    } catch (err: any) {
      toast.error(`Failed to approve: ${err.message}`);
    } finally {
      setIsApproving(null);
    }
  };


  // Data export function
  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Booking ID,Farmer Name,Centre,Status,Quantity (Q),Slot Time\n"
      + storeBookings.map(b => `${b.id},${b.farmer_name},${b.centre_name},${b.status},${b.expected_quantity_q},${b.slot_time}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kishan_seva_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto bg-white min-h-screen">
        {/* Top Header Skeleton */}
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-2">
            <div className="h-2 w-32 bg-slate-200 animate-pulse"></div>
            <div className="h-6 w-64 bg-slate-300 animate-pulse"></div>
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-4 w-48 bg-slate-200 animate-pulse"></div>
            <div className="h-6 w-24 bg-slate-800 animate-pulse"></div>
          </div>
        </div>

        {/* 4-Col Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-slate-900 bg-slate-900 mb-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 bg-white h-[140px] flex flex-col justify-between border-[1px] border-slate-900">
              <div className="h-2 w-24 bg-slate-200 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-10 w-20 bg-slate-300 animate-pulse"></div>
                <div className="h-2 w-32 bg-slate-200 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Table Skeleton */}
            <div className="border-2 border-slate-900 bg-white h-[400px] shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <div className="p-4 border-b-2 border-slate-900 bg-slate-100 flex justify-between">
                <div className="h-3 w-48 bg-slate-300 animate-pulse"></div>
                <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
              </div>
              <div className="p-4 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse"></div>
                    <div className="h-4 w-12 bg-slate-300 animate-pulse"></div>
                    <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
                    <div className="h-1 w-32 bg-slate-200 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-2 border-slate-900 bg-white h-[500px] shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b-2 border-slate-900 bg-slate-900 flex justify-between">
              <div className="h-3 w-32 bg-slate-700 animate-pulse"></div>
              <div className="h-3 w-12 bg-slate-700 animate-pulse"></div>
            </div>
            <div className="p-4 space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-4 bg-slate-300 animate-pulse shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-full bg-slate-200 animate-pulse"></div>
                    <div className="h-2 w-2/3 bg-slate-100 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-sans text-slate-900 bg-white min-h-screen">
      
      {/* TOP: Command Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-2 py-0.5 mb-2 inline-block">State Agricultural Procurement Command</h1>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-none uppercase">Apex Real-Time Console</h2>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <LiveClock />
          <div className="flex items-center gap-2 bg-emerald-100 border-2 border-emerald-900 px-3 py-1 text-emerald-900 font-black text-[10px] uppercase tracking-widest">
            <div className="w-2 h-2 rounded-none bg-emerald-600 animate-pulse"></div>
            <SyncStatus />
          </div>
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors border-2 border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
          >
            <Download className="w-4 h-4" /> EXPORT CSV
          </button>
        </div>
      </div>

      {/* Global Alert Strip - Dynamically bound to data */}
      {overloadedCentres.length > 0 && (
        <div className="w-full bg-amber-50 border-2 border-amber-900 p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_rgba(120,53,15,1)]">
          <div className="flex items-center gap-4">
            <span className="bg-amber-900 text-amber-50 font-black text-[10px] px-2 py-1 tracking-widest uppercase">CRITICAL</span>
            <span className="text-sm font-black text-amber-900 uppercase tracking-widest">{overloadedCentres.length} Procurement Centres are approaching queue capacity overload.</span>
          </div>
          <button className="text-[10px] bg-amber-900 text-amber-50 px-4 py-2 font-black uppercase tracking-widest hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2 transition-colors border-2 border-transparent">TAKE ACTION</button>
        </div>
      )}

      {/* PRIMARY OPERATIONS: 4-Col Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 bg-slate-900 border-2 border-slate-900 mb-12 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        
        {/* Metric 1 */}
        <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Total Farmers Today</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-mono tabular-nums font-black tracking-tighter text-slate-900">{stats.totalBookings}</h3>
            </div>
            <p className="text-[10px] text-white bg-emerald-900 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-emerald-950">
              {stats.completedBookings} Completed
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Active Queues</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-mono tabular-nums font-black tracking-tighter text-slate-900">{stats.inQueueCount}</h3>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">VEHICLES</span>
            </div>
            <p className="text-[10px] text-amber-900 bg-amber-100 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-amber-900">
              AVG WAIT: 42 MINS
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Procurement Completed</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-mono tabular-nums font-black tracking-tighter text-slate-900">{stats.totalProcuredQuintals.toLocaleString('en-IN')}</h3>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Q</span>
            </div>
            <div className="w-full h-2 bg-slate-100 mt-4 relative border-2 border-slate-900">
              <div className="absolute top-0 left-0 h-full bg-slate-900" style={{ width: '45%' }}></div>
            </div>
            <p className="text-[10px] text-slate-900 font-black mt-2 text-right tracking-widest uppercase">45% of Daily Target</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-6 bg-white flex flex-col justify-between border-[1px] border-slate-900">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Centres Requiring Attention</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-mono tabular-nums font-black tracking-tighter text-amber-600">
                {centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05)).length}
              </h3>
            </div>
            <p className="text-[10px] text-red-100 bg-red-900 font-mono font-black mt-3 uppercase tracking-widest px-2 py-1 inline-block border-2 border-red-950">
              OVERLOAD RISK
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Centre Operations & Trends) */}
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          
          {/* CENTRE OPERATIONS: High-Density Table */}
          {/* CENTRE OPERATIONS: High-Density Table */}
          <div className="border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b-2 border-slate-900 bg-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Centre Performance & Queue Load</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:text-white border-2 border-slate-900 px-3 py-1 bg-white hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-none">EXPORT CSV</button>
            </div>
            <div ref={parentRef} className="overflow-x-auto max-h-[400px] overflow-y-auto relative no-scrollbar">
              <table className="w-full text-left text-xs min-w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-slate-900 bg-white">
                    <th className="py-4 px-4 font-black text-[9px] text-slate-900 uppercase tracking-widest w-16 border-r-2 border-slate-900">Status</th>
                    <th className="py-4 px-4 font-black text-[9px] text-slate-900 uppercase tracking-widest border-r-2 border-slate-900">Centre</th>
                    <th className="py-4 px-4 font-black text-[9px] text-slate-900 uppercase tracking-widest text-right border-r-2 border-slate-900">Queue</th>
                    <th className="py-4 px-4 font-black text-[9px] text-slate-900 uppercase tracking-widest border-r-2 border-slate-900">Wait Time</th>
                    <th className="py-4 px-4 font-black text-[9px] text-slate-900 uppercase tracking-widest w-48">Capacity Utilization</th>
                  </tr>
                </thead>
                <tbody 
                    className="divide-y-2 divide-slate-900 font-sans" 
                    style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const centre = sortedCentres[virtualRow.index];
                    const overloadThreshold = centre.daily_capacity_quintals * 0.05;
                    const isOverloaded = centre.current_queue_length > overloadThreshold;
                    const utilPercent = Math.min(100, Math.round((centre.current_queue_length / overloadThreshold) * 100));
                    
                    return (
                      <tr 
                        key={centre.id} 
                        className="hover:bg-slate-100 transition-colors absolute top-0 left-0 w-full"
                        style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <td className="py-4 px-4 w-16 border-r-2 border-slate-900">
                          <div className={`w-3 h-3 rounded-none border-2 border-slate-900 ${centre.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </td>
                        <td className="py-4 px-4 border-r-2 border-slate-900">
                          <div className="font-black text-slate-900 uppercase tracking-widest truncate">{centre.name}</div>
                          <div className="font-mono text-[9px] font-bold text-slate-600">{centre.centre_code}</div>
                        </td>
                        <td className={`py-4 px-4 font-mono tabular-nums text-right font-black border-r-2 border-slate-900 ${isOverloaded ? 'text-amber-600' : 'text-slate-900'}`}>
                          {centre.current_queue_length}
                        </td>
                        <td className="py-4 px-4 font-mono tabular-nums font-bold text-slate-900 border-r-2 border-slate-900">
                          {centre.est_wait_time_mins}m
                        </td>
                        <td className="py-4 px-4 w-48">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 bg-slate-100 border-2 border-slate-900 relative">
                              <div 
                                className={`absolute top-0 left-0 h-full ${isOverloaded ? 'bg-amber-500' : 'bg-slate-900'}`} 
                                style={{ width: `${utilPercent}%` }}
                              ></div>
                            </div>
                            <span className="font-mono tabular-nums text-[10px] w-8 text-right font-black inline-block">{utilPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t-2 border-slate-900 bg-slate-100 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-none px-2 py-1">Virtualization Active ({centres.length} Centres)</span>
            </div>
          </div>

          {/* TRENDS: 3-Col Compact Charts */}
          <div className="border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b-2 border-slate-900 bg-slate-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">System Velocity (7-Day Trends)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-slate-900">
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Procurement Velocity</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono tabular-nums font-black text-slate-900">14.2K</span>
                  <span className="text-[10px] font-black font-mono text-emerald-600 mb-1">+12%</span>
                </div>
                <div className="w-full h-10 flex items-end gap-1 border-b-2 border-slate-900 pb-1">
                  {[40, 55, 45, 60, 75, 65, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-slate-900" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Avg Wait Time</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono tabular-nums font-black text-slate-900">42m</span>
                  <span className="text-[10px] font-black font-mono text-amber-600 mb-1">+5m</span>
                </div>
                <div className="w-full h-10 flex items-end gap-1 border-b-2 border-slate-900 pb-1">
                  {[30, 32, 35, 45, 50, 42, 42].map((h, i) => (
                    <div key={i} className="flex-1 bg-amber-500" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Active Centres</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono tabular-nums font-black text-slate-900">{stats.activeCentres}</span>
                  <span className="text-[10px] font-black font-mono text-slate-500 mb-1">STABLE</span>
                </div>
                <div className="w-full h-10 flex items-end gap-1 border-b-2 border-slate-900 pb-1">
                  {[100, 100, 100, 95, 100, 100, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-slate-900" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="mt-8 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 font-bold uppercase tracking-widest border-2 border-slate-900 border-dashed">
              Map Visualization Offline
            </div>
          </div>

        </div>

        {/* Right Column (ALERTS & Exceptions) */}
        <div className="border-2 border-slate-900 bg-white flex flex-col h-full min-h-[500px] shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <div className="p-4 border-b-2 border-slate-900 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Action Required</h3>
            <span className="bg-red-600 text-white border-2 border-red-950 text-[10px] font-black font-mono px-2 py-0.5">4 ALERTS</span>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="divide-y-2 divide-slate-900">
              
              {pendingFarmers.length > 0 && pendingFarmers.map(farmer => (
                <div key={farmer.id} className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 border-2 border-slate-900 bg-blue-500 rounded-none mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black font-mono text-blue-900 bg-blue-100 px-2 py-0.5 border-2 border-blue-900">[VERIFICATION REQUIRED]</span>
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">{farmer.full_name} ({farmer.farmer_code})</p>
                      <p className="text-[10px] font-bold text-slate-700">Pending verification for Bank Account {farmer.account_number_masked}.</p>
                      <button 
                        onClick={() => handleApprove(farmer.id)}
                        disabled={isApproving === farmer.id}
                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-emerald-600 px-3 py-2 border-2 border-slate-900 transition-colors disabled:opacity-50"
                      >
                        {isApproving === farmer.id ? 'APPROVING...' : 'APPROVE PROFILE'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grievance Ticket Alert */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border-2 border-slate-900 bg-red-500 rounded-none mt-1 flex-shrink-0 animate-pulse"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black font-mono text-red-900 bg-red-100 px-2 py-0.5 border-2 border-red-900">[GRIEVANCE ESCALATION]</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">TKT-2026-0812: Payment Delayed</p>
                    <p className="text-[10px] font-bold text-slate-700">Treasury processing delayed &gt; 48hrs for Basirhat PC.</p>
                    <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border-2 border-slate-900 transition-colors">
                      REVIEW TICKET
                    </button>
                  </div>
                </div>
              </div>

              {/* Alert 1 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border-2 border-slate-900 bg-red-500 rounded-none mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black font-mono text-red-900 bg-red-100 px-2 py-0.5 border-2 border-red-900">[PAYMENT FAILED]</span>
                      <span className="text-[9px] font-black font-mono text-slate-500">10m ago</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">DBT Bounce: Invalid Account</p>
                    <p className="text-[10px] font-bold text-slate-700">Farmer KSP-1032 payment of ₹85,000 bounced at RBI gateway.</p>
                    <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border-2 border-slate-900 transition-colors">REVIEW LOG</button>
                  </div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border-2 border-slate-900 bg-amber-500 rounded-none mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border-2 border-amber-900">[CAPACITY WARN]</span>
                      <span className="text-[9px] font-black font-mono text-slate-500">22m ago</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">Burdwan-02 Queue Overload</p>
                    <p className="text-[10px] font-bold text-slate-700">Queue capacity reached 98%. Recommended to divert incoming vehicles.</p>
                    <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border-2 border-slate-900 transition-colors">MANAGE QUEUE</button>
                  </div>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border-2 border-slate-900 bg-amber-500 rounded-none mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border-2 border-amber-900">[CAPACITY WARN]</span>
                      <span className="text-[9px] font-black font-mono text-slate-500">45m ago</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">Ranaghat Queue Overload</p>
                    <p className="text-[10px] font-bold text-slate-700">Queue capacity reached 95%. Wait time exceeding 90 mins.</p>
                  </div>
                </div>
              </div>

              {/* Alert 4 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border-[1px] border-slate-900">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border-2 border-slate-900 bg-slate-900 rounded-none mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black font-mono text-white bg-slate-900 px-2 py-0.5 border-2 border-slate-950">[SYSTEM]</span>
                      <span className="text-[9px] font-black font-mono text-slate-500">2h ago</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 leading-tight mb-2">API Latency Degraded</p>
                    <p className="text-[10px] font-bold text-slate-700">NIC Gateway response time &gt; 2000ms. Transactions may be delayed.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div className="p-4 border-t-2 border-slate-900 bg-white mt-auto">
            <button className="w-full text-[10px] font-black uppercase tracking-widest text-slate-900 hover:text-white bg-white hover:bg-slate-900 transition-colors py-3 border-2 border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-none">
              VIEW ACTION CENTER
            </button>
          </div>
        </div>
      </div>
    
  );
}
