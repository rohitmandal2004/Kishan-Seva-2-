// Recharts is used in AdminAnalytics — not needed here
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase } from '@/lib/supabase';
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
    <div className="font-mono  text-sm font-bold tracking-tight text-slate-900">
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
    <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-300">Live Sys: Active [SYNC: {syncSeconds}s ago]</span>
  );
}

export default function AdminOverview() {
  const store = useKishanData();
  const { isProfileLoading: isLoading } = useSupabase();

  const centres = store.centres;
  const stats = store.getStats();
  const storeBookings = store.bookings || [];

    const [pendingOperators, setPendingOperators] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    const loadPending = async () => {
      const { data } = await supabase.from('operator_profiles').select('*').eq('status', 'PENDING');
      const operators = data || [];
      setPendingOperators(operators);
    };
    loadPending();
  }, []);

  const sortedCentres = [...centres].sort((a, b) => b.current_queue_length - a.current_queue_length);
  const avgWaitTime = Math.round(centres.reduce((sum, c) => sum + (c.est_wait_time_mins || 0), 0) / (centres.length || 1));
  const overloadedCentres = centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05));
  
  // Dynamic Needs Attention logic
  const pendingOpCount = pendingOperators.length;
  
  const sortedByLoad = [...centres].sort((a, b) => {
    const loadA = (a.current_queue_length / (a.daily_capacity_quintals || 1));
    const loadB = (b.current_queue_length / (b.daily_capacity_quintals || 1));
    return loadB - loadA;
  });
  const mostOverloaded = sortedByLoad[0];
  const mostOverloadedPct = mostOverloaded ? Math.round((mostOverloaded.current_queue_length / (mostOverloaded.daily_capacity_quintals || 1)) * 100) : 0;

  const longestQueue = [...centres].sort((a, b) => b.current_queue_length - a.current_queue_length)[0];
  
  const pendingPayments = storeBookings.filter(b => b.status === 'PROCUREMENT').length;

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedCentres.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Estimated row height (52px)
    overscan: 5,
  });

  

  


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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 rounded-xl bg-slate-900 mb-8 shadow-sm rounded-xl">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 bg-white h-[140px] flex flex-col justify-between border border-slate-200">
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
            <div className="border border-slate-200 rounded-xl bg-white h-[400px] shadow-sm rounded-xl">
              <div className="p-4 border-b border-slate-200 bg-slate-100 flex justify-between">
                <div className="h-3 w-48 bg-slate-300 animate-pulse"></div>
                <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
              </div>
              <div className="p-4 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse"></div>
                    <div className="h-4 w-12 bg-slate-300 animate-pulse"></div>
                    <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
                    <div className="h-1 w-32 bg-slate-200 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl bg-white h-[500px] shadow-sm rounded-xl">
            <div className="p-4 border-b border-slate-200 bg-slate-900 flex justify-between">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider bg-white text-slate-900 px-2 py-0.5 mb-2 inline-block">State Agricultural Procurement Command</h1>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Apex Real-Time Console</h2>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <LiveClock />
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-md px-3 py-1 text-emerald-900 font-medium text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
            <SyncStatus />
          </div>
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border border-slate-200 rounded-xl shadow-sm rounded-lg"
          >
            <Download className="w-4 h-4" /> EXPORT CSV
          </button>
        </div>
      </div>

      {/* Global Alert Strip - Dynamically bound to data */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          Needs Attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => window.location.href='/admin/operators'}>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-600 font-bold">🟡</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{pendingOpCount} Operator Applications</p>
              <p className="text-slate-500 text-xs mt-0.5">{pendingOpCount > 0 ? 'Awaiting admin approval' : 'All clear'}</p>
            </div>
          </div>
          
          <div className={`\${mostOverloadedPct > 80 ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'} border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors`} onClick={() => window.location.href='/admin/centres'}>
            <div className={`\${mostOverloadedPct > 80 ? 'bg-red-100' : 'bg-emerald-100'} w-8 h-8 rounded-full flex items-center justify-center shrink-0`}>
              <span className={`\${mostOverloadedPct > 80 ? 'text-red-600' : 'text-emerald-600'} font-bold`}>${mostOverloadedPct > 80 ? '🔴' : '🟢'}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{mostOverloaded?.name || 'All Centres'}</p>
              <p className="text-slate-500 text-xs mt-0.5">Capacity utilization: {mostOverloadedPct}%</p>
            </div>
          </div>

          <div className={`\${longestQueue?.current_queue_length > 10 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'} border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors`} onClick={() => window.location.href='/admin/centres'}>
            <div className={`\${longestQueue?.current_queue_length > 10 ? 'bg-orange-100' : 'bg-emerald-100'} w-8 h-8 rounded-full flex items-center justify-center shrink-0`}>
              <span className={`\${longestQueue?.current_queue_length > 10 ? 'text-orange-600' : 'text-emerald-600'} font-bold`}>${longestQueue?.current_queue_length > 10 ? '🟠' : '🟢'}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{longestQueue?.name || 'No Queues'} Queue</p>
              <p className="text-slate-500 text-xs mt-0.5">{longestQueue?.current_queue_length || 0} vehicles waiting</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => window.location.href='/admin/transactions'}>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-600 font-bold">🟡</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{pendingPayments} Payments</p>
              <p className="text-slate-500 text-xs mt-0.5">{pendingPayments > 0 ? 'Require immediate disbursal' : 'All payments clear'}</p>
            </div>
          </div>

        </div>
      </div>

      {/* PRIMARY OPERATIONS: 4-Col Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {/* Metric 1 */}
        <div className="p-6 bg-white flex flex-col justify-between border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6">Total Farmers Today</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl  font-semibold tracking-tighter text-slate-900">{stats.totalBookings}</h3>
            </div>
            <p className="text-xs text-white bg-emerald-900 font-mono font-semibold mt-3 uppercase tracking-wider px-2 py-1 inline-block border border-emerald-200 rounded-md">
              {stats.completedBookings} Completed
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-6 bg-white flex flex-col justify-between border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6">Active Queues</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl  font-semibold tracking-tighter text-slate-900">{stats.inQueueCount}</h3>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">VEHICLES</span>
            </div>
            <p className="text-xs text-amber-900 bg-amber-100 font-mono font-semibold mt-3 uppercase tracking-wider px-2 py-1 inline-block border border-amber-200 rounded-lg">
              AVG WAIT: {avgWaitTime} MINS
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-6 bg-white flex flex-col justify-between border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6">Procurement Completed</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl  font-semibold tracking-tighter text-slate-900">{stats.totalProcuredQuintals.toLocaleString('en-IN')}</h3>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Q</span>
            </div>
            <div className="w-full h-2 bg-slate-100 mt-4 relative rounded-xl overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-slate-900" style={{ width: `${Math.min(100, Math.round((stats.totalProcuredQuintals / (centres.reduce((a,c) => a + c.daily_capacity_quintals, 0) || 1)) * 100))}%` }}></div>
            </div>
            <p className="text-xs text-slate-900 font-semibold mt-2 text-right tracking-wider uppercase">{Math.min(100, Math.round((stats.totalProcuredQuintals / (centres.reduce((a,c) => a + c.daily_capacity_quintals, 0) || 1)) * 100))}% of Daily Target</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-6 bg-white flex flex-col justify-between border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6">Centres Requiring Attention</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl  font-semibold tracking-tighter text-amber-600">
                {centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05)).length}
              </h3>
            </div>
            <p className="text-xs text-red-100 bg-red-900 font-mono font-semibold mt-3 uppercase tracking-wider px-2 py-1 inline-block border border-red-200 rounded-md">
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
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Centre Performance & Queue Load</h3>
              <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1 bg-white hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1">EXPORT CSV</button>
            </div>
            <div ref={parentRef} className="overflow-x-auto max-h-[400px] overflow-y-auto relative no-scrollbar">
              <table className="w-full text-left text-xs min-w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="py-3 px-4 font-semibold text-xs text-slate-500 text-left w-16 ">Status</th>
                    <th className="py-3 px-4 font-semibold text-xs text-slate-500 text-left ">Centre</th>
                    <th className="py-3 px-4 font-semibold text-xs text-slate-500 text-left text-right ">Queue</th>
                    <th className="py-3 px-4 font-semibold text-xs text-slate-500 text-left ">Wait Time</th>
                    <th className="py-3 px-4 font-semibold text-xs text-slate-500 text-left w-48">Capacity Utilization</th>
                  </tr>
                </thead>
                <tbody 
                    className="divide-y divide-slate-100 font-sans" 
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
                        <td className="py-4 px-4 w-16 ">
                          <div className={`w-3 h-3 rounded-full border border-slate-200 rounded-xl ${centre.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </td>
                        <td className="py-4 px-4 ">
                          <div className="font-semibold text-slate-900 uppercase tracking-wider truncate">{centre.name}</div>
                          <div className="font-mono text-xs font-bold text-slate-600">{centre.centre_code}</div>
                        </td>
                        <td className={`py-4 px-4 font-mono  text-right font-semibold  ${isOverloaded ? 'text-amber-600' : 'text-slate-900'}`}>
                          {centre.current_queue_length}
                        </td>
                        <td className="py-4 px-4 font-mono  font-bold text-slate-900 ">
                          {centre.est_wait_time_mins}m
                        </td>
                        <td className="py-4 px-4 w-48">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-xl relative">
                              <div 
                                className={`absolute top-0 left-0 h-full ${isOverloaded ? 'bg-amber-500' : 'bg-slate-900'}`} 
                                style={{ width: `${utilPercent}%` }}
                              ></div>
                            </div>
                            <span className="font-mono  text-xs w-8 text-right font-semibold inline-block">{utilPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t-2 border-slate-900 bg-slate-100 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 rounded-full px-2 py-1">Virtualization Active ({centres.length} Centres)</span>
            </div>
          </div>

          {/* TRENDS: 3-Col Compact Charts */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">System Overview</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-slate-100 md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-2">Total Procurement</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono  font-semibold text-slate-900">{stats.totalProcuredQuintals.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-semibold font-mono text-emerald-600 mb-1">Quintals</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-2">Avg Wait Time</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono  font-semibold text-slate-900">{avgWaitTime}m</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-2">Active Centres</p>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-mono  font-semibold text-slate-900">{stats.activeCentres}</span>
                  <span className="text-xs font-semibold font-mono text-slate-500 mb-1">ONLINE</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="mt-8 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider border border-slate-200 rounded-xl border-dashed">
              Map Visualization Offline
            </div>
          </div>

        </div>

        {/* Right Column (ALERTS & Exceptions) */}
        <div className="border border-slate-200 rounded-xl bg-white flex flex-col h-full min-h-[500px] shadow-sm rounded-xl">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 text-slate-900 flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Action Required</h3>
            <span className="bg-red-600 text-white border border-red-200 rounded-md text-xs font-semibold font-mono px-2 py-0.5">4 ALERTS</span>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="divide-y divide-slate-100">
              
              {pendingOperators.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <span className="text-emerald-500 font-bold block text-2xl mb-2">✓</span>
                  No pending actions required at this time.
                </div>
              ) : (
                pendingOperators.map(op => (
                  <div key={op.id} className="p-5 bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">OPERATOR APPROVAL</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">{op.full_name} ({op.phone_number})</p>
                        <p className="text-xs text-slate-500">Requested Centre ID: {op.requested_centre_id}</p>
                        <button 
                          onClick={() => window.location.href='/admin/operators'}
                          className="mt-3 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-md transition-colors"
                        >
                          REVIEW PROFILE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Grievance Ticket Alert */}
              {/* Alert 1 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-red-900 bg-red-100 px-2 py-0.5 border-2 border-red-900">[PAYMENT FAILED]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">10m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">DBT Bounce: Invalid Account</p>
                    <p className="text-xs font-bold text-slate-700">Farmer KSP-1032 payment of ₹85,000 bounced at RBI gateway.</p>
                    <button className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">REVIEW LOG</button>
                  </div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-200 rounded-lg">[CAPACITY WARN]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">22m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">Burdwan-02 Queue Overload</p>
                    <p className="text-xs font-bold text-slate-700">Queue capacity reached 98%. Recommended to divert incoming vehicles.</p>
                    <button className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">MANAGE QUEUE</button>
                  </div>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-200 rounded-lg">[CAPACITY WARN]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">45m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">Ranaghat Queue Overload</p>
                    <p className="text-xs font-bold text-slate-700">Queue capacity reached 95%. Wait time exceeding 90 mins.</p>
                  </div>
                </div>
              </div>

              {/* Alert 4 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-slate-900 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-white bg-slate-900 px-2 py-0.5 border-2 border-slate-950">[SYSTEM]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">2h ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">API Latency Degraded</p>
                    <p className="text-xs font-bold text-slate-700">NIC Gateway response time &gt; 2000ms. Transactions may be delayed.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div className="p-4 border-t-2 border-slate-900 bg-white mt-auto">
            <button className="w-full text-xs font-semibold uppercase tracking-wider text-slate-900 hover:text-white bg-white hover:bg-slate-900 transition-colors py-3 border border-slate-200 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-full">
              VIEW ACTION CENTER
            </button>
          </div>
        </div>
      </div>
    
  );
}
