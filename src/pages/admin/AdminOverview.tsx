import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useKishanData } from '@/context/DataContext';
import { useSupabase } from '@/context/SupabaseContext';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

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

  // Sort centres by queue length descending for the Centre Operations table
  const sortedCentres = [...centres].sort((a, b) => b.current_queue_length - a.current_queue_length);
  // Using 5% as overload threshold heuristic for demonstration
  const overloadedCentres = centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05));

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-300 border border-slate-300 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 bg-white h-[140px] flex flex-col justify-between">
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
            <div className="border border-slate-300 bg-white h-[400px]">
              <div className="p-4 border-b border-slate-300 bg-slate-50 flex justify-between">
                <div className="h-3 w-48 bg-slate-300 animate-pulse"></div>
                <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
              </div>
              <div className="p-4 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse"></div>
                    <div className="h-4 w-12 bg-slate-300 animate-pulse"></div>
                    <div className="h-4 w-16 bg-slate-200 animate-pulse"></div>
                    <div className="h-1 w-32 bg-slate-200 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border border-slate-300 bg-white h-[500px]">
            <div className="p-4 border-b border-slate-300 bg-slate-900 flex justify-between">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">State Agricultural Procurement Command</h1>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">Apex Real-Time Console</h2>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <LiveClock />
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 text-white">
            <div className="w-2 h-2 rounded-none bg-emerald-400"></div>
            <SyncStatus />
          </div>
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors border border-slate-300"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Global Alert Strip - Dynamically bound to data */}
      {overloadedCentres.length > 0 && (
        <div className="w-full bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 p-3 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-amber-900 text-amber-50 font-mono text-[10px] font-bold px-1.5 py-0.5 tracking-widest uppercase">CRITICAL</span>
            <span className="text-sm font-bold text-amber-900">{overloadedCentres.length} Procurement Centres are approaching queue capacity overload.</span>
          </div>
          <button className="text-xs font-bold text-amber-700 underline uppercase tracking-wider hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 rounded-sm">Take Action</button>
        </div>
      )}

      {/* PRIMARY OPERATIONS: 4-Col Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-300 border border-slate-300 mb-8">
        
        {/* Metric 1 */}
        <div className="p-5 bg-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Total Farmers Today</span>
          <div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-4xl font-mono tabular-nums font-black tracking-tighter">{stats.totalBookings}</h3>
            </div>
            <p className="text-[10px] text-emerald-600 font-mono font-bold mt-2 uppercase tracking-wide">
              {stats.completedBookings} Completed
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Active Queues</span>
          <div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-4xl font-mono tabular-nums font-black tracking-tighter">{stats.inQueueCount}</h3>
              <span className="text-xs font-bold text-slate-400 font-sans tracking-wide">VEHICLES</span>
            </div>
            <p className="text-[10px] text-amber-600 font-mono font-bold mt-2 uppercase tracking-wide">
              AVG WAIT: 42 MINS
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Procurement Completed</span>
          <div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-4xl font-mono tabular-nums font-black tracking-tighter">{stats.totalProcuredQuintals.toLocaleString('en-IN')}</h3>
              <span className="text-xs font-bold text-slate-400 font-sans tracking-wide">Q</span>
            </div>
            <div className="w-full h-1 bg-slate-100 mt-3 relative">
              <div className="absolute top-0 left-0 h-full bg-slate-900" style={{ width: '45%' }}></div>
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-1 text-right tracking-widest uppercase">45% of Daily Target</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 bg-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Centres Requiring Attention</span>
          <div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-4xl font-mono tabular-nums font-black tracking-tighter text-amber-600">
                {centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05)).length}
              </h3>
            </div>
            <p className="text-[10px] text-amber-600 font-mono font-bold mt-2 uppercase tracking-wide">
              OVERLOAD RISK
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Centre Operations & Trends) */}
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          
          {/* CENTRE OPERATIONS: High-Density Table */}
          <div className="border border-slate-300 bg-white">
            <div className="p-4 border-b border-slate-300 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Centre Performance & Queue Load</h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 px-2 py-1 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-sm">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest w-16">Status</th>
                    <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Centre</th>
                    <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest text-right">Queue</th>
                    <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest">Wait Time</th>
                    <th className="py-3 px-4 font-bold text-[9px] text-slate-400 uppercase tracking-widest w-48">Capacity Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {sortedCentres.slice(0, 8).map((centre) => {
                    // Quick heuristic for overload: > 5% of capacity in queue
                    const overloadThreshold = centre.daily_capacity_quintals * 0.05;
                    const isOverloaded = centre.current_queue_length > overloadThreshold;
                    const utilPercent = Math.min(100, Math.round((centre.current_queue_length / overloadThreshold) * 100));
                    
                    return (
                      <tr key={centre.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className={`w-2 h-2 rounded-none ${centre.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{centre.name}</div>
                          <div className="font-mono text-[9px] text-slate-500">{centre.centre_code}</div>
                        </td>
                        <td className={`py-3 px-4 font-mono tabular-nums text-right font-bold ${isOverloaded ? 'text-amber-600' : 'text-slate-700'}`}>
                          {centre.current_queue_length}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                          {centre.est_wait_time_mins}m
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-[1px] bg-slate-200 relative">
                              <div 
                                className={`absolute top-0 left-0 h-full ${isOverloaded ? 'bg-amber-500' : 'bg-slate-900'}`} 
                                style={{ width: `${utilPercent}%` }}
                              ></div>
                            </div>
                            <span className="font-mono tabular-nums text-[10px] w-8 text-right font-bold inline-block">{utilPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
              <button className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-sm px-2 py-1">View All {centres.length} Centres</button>
            </div>
          </div>

          {/* TRENDS: 3-Col Compact Charts */}
          <div className="border border-slate-300 bg-white">
            <div className="p-4 border-b border-slate-300 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">System Velocity (7-Day Trends)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Procurement Velocity</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-mono tabular-nums font-black text-slate-900">14.2K</span>
                  <span className="text-[10px] font-bold font-mono text-emerald-600 mb-1">+12%</span>
                </div>
                <div className="w-full h-8 flex items-end gap-1">
                  {[40, 55, 45, 60, 75, 65, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-slate-200" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Avg Wait Time</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-mono tabular-nums font-black text-slate-900">42m</span>
                  <span className="text-[10px] font-bold font-mono text-amber-600 mb-1">+5m</span>
                </div>
                <div className="w-full h-8 flex items-end gap-1">
                  {[30, 32, 35, 45, 50, 42, 42].map((h, i) => (
                    <div key={i} className="flex-1 bg-amber-200" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Active Centres</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-mono tabular-nums font-black text-slate-900">{stats.activeCentres}</span>
                  <span className="text-[10px] font-bold font-mono text-slate-400 mb-1">STABLE</span>
                </div>
                <div className="w-full h-8 flex items-end gap-1">
                  {[100, 100, 100, 95, 100, 100, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-slate-800" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (ALERTS & Exceptions) */}
        <div className="border border-slate-300 bg-white flex flex-col h-full min-h-[500px]">
          <div className="p-4 border-b border-slate-300 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Action Required</h3>
            <span className="bg-red-500 text-white text-[9px] font-bold font-mono px-1.5 py-0.5">4 ALERTS</span>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="divide-y divide-slate-200">
              
              {/* Alert 1 */}
              <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-none mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold font-mono text-red-600 bg-red-50 px-1 border border-red-200">[PAYMENT FAILED]</span>
                      <span className="text-[9px] font-mono text-slate-400">10m ago</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-tight mb-1">DBT Bounce: Invalid Account</p>
                    <p className="text-[10px] text-slate-600">Farmer KSP-1032 payment of ₹85,000 bounced at RBI gateway.</p>
                    <button className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 underline">Review Log</button>
                  </div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-none mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold font-mono text-amber-600 bg-amber-50 px-1 border border-amber-200">[CAPACITY WARN]</span>
                      <span className="text-[9px] font-mono text-slate-400">22m ago</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-tight mb-1">Burdwan-02 Queue Overload</p>
                    <p className="text-[10px] text-slate-600">Queue capacity reached 98%. Recommended to divert incoming vehicles.</p>
                    <button className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 underline">Manage Queue</button>
                  </div>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-none mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold font-mono text-amber-600 bg-amber-50 px-1 border border-amber-200">[CAPACITY WARN]</span>
                      <span className="text-[9px] font-mono text-slate-400">45m ago</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-tight mb-1">Ranaghat Queue Overload</p>
                    <p className="text-[10px] text-slate-600">Queue capacity reached 95%. Wait time exceeding 90 mins.</p>
                  </div>
                </div>
              </div>

              {/* Alert 4 */}
              <div className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-none mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold font-mono text-slate-600 bg-slate-100 px-1 border border-slate-200">[SYSTEM]</span>
                      <span className="text-[9px] font-mono text-slate-400">2h ago</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-tight mb-1">API Latency Degraded</p>
                    <p className="text-[10px] text-slate-600">NIC Gateway response time &gt; 2000ms. Transactions may be delayed.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div className="p-4 border-t border-slate-200 bg-white mt-auto">
            <button className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors py-2.5 border border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-sm">
              View Action Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
