import { useMemo, useState, useEffect } from 'react';
import { useKishanData } from '@/context/DataContext';
import { 
 AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
 BarChart, Bar, Legend,
 PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, Sprout, Building2, Calendar, Star } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

export default function AdminAnalytics() {
 const store = useKishanData();
 const stats = store.getStats();
 const centres = store.centres;
 const bookings = store.getBookings();

 // Generate real timeline data for the last 7 days from completed bookings
 const timelineData = useMemo(() => {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.status === 'COMPLETED' && b.created_at?.startsWith(dateStr));
    const procured = dayBookings.reduce((sum, b) => sum + (b.weighment_data?.net_weight_q || 0), 0);
    return {
      date: format(d, 'dd MMM'),
      procured: procured,
      target: 600,
    };
  });
 }, [bookings]);

  // Generate real future timeline data for Expected Arrivals (Next 7 Days)
  const futureData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayBookings = bookings.filter(b => b.slot_date === dateStr && b.status !== 'CANCELLED');
      
      const totalExpected = dayBookings.reduce((sum, b) => sum + (b.expected_quantity_q || 0), 0);
      
      return {
        date: format(d, 'dd MMM'),
        individual: dayBookings.length,
        fpo: 0,
        totalExpected: totalExpected
      };
    });
  }, [bookings]);

 // Prepare Pie Chart data (Crop Distribution) from real bookings
 const cropData = useMemo(() => {
  const cropCounts: Record<string, number> = {};
  bookings.forEach(b => {
    const crop = b.crop_name || 'Unknown';
    cropCounts[crop] = (cropCounts[crop] || 0) + (b.expected_quantity_q || 1);
  });
  const colors = ['#047857', '#ca8a04', '#b91c1c', '#1d4ed8', '#4338ca'];
  return Object.entries(cropCounts).map(([name, value], idx) => ({
    name,
    value,
    color: colors[idx % colors.length]
  }));
 }, [bookings]);

 // Prepare Bar Chart data (Centre Loads)
 const centreLoads = centres.slice(0, 5).map(c => ({
 name: c.name.split(' ')[0], // Short name
 queue: c.current_queue_length,
 capacity: c.daily_capacity_quintals / 10, // Scaled for visual comparison
 }));

  const [avgRating, setAvgRating] = useState<number | null>(null);
  
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.from('centre_feedback').select('overall_rating')
        .then(({ data }) => {
          if (data && data.length > 0) {
            const sum = data.reduce((a, c) => a + c.overall_rating, 0);
            setAvgRating(Number((sum / data.length).toFixed(1)));
          }
        });
    }
  }, []);

  return (
  <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 font-sans bg-white min-h-screen text-slate-900">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
  <div>
  <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">State Agricultural Procurement Command</h1>
  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">Analytics & Reports</h2>
  <p className="text-slate-600 text-sm font-mono mt-2">Statewide procurement insights and financial disbursals.</p>
  </div>
  <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 text-sm font-bold text-white uppercase tracking-widest">
  <Calendar className="w-4 h-4" />
  Last 7 Days
  </div>
  </div>

  {/* KPI Cards */}
  <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-slate-200 bg-slate-900">
  <div className="p-5 flex flex-col justify-between bg-white border-b-2 md:border-b-0 md:border-r border-slate-200 last:border-none min-h-[120px]">
  <div className="flex items-center justify-between mb-4">
  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest bg-emerald-100 px-2 py-0.5">Total Procured</p>
  <Sprout className="w-5 h-5 text-emerald-700" />
  </div>
  <h3 className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">{stats.totalProcuredQuintals.toLocaleString()} Q</h3>
  </div>

  <div className="p-5 flex flex-col justify-between bg-white border-b-2 md:border-b-0 md:border-r border-slate-200 min-h-[120px]">
  <div className="flex items-center justify-between mb-4">
  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest bg-blue-100 px-2 py-0.5">DBT Disbursed</p>
  <TrendingUp className="w-5 h-5 text-blue-700" />
  </div>
  <h3 className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">₹{stats.totalDisbursedCrores} Cr</h3>
  </div>

  <div className="p-5 flex flex-col justify-between bg-white border-b-2 md:border-b-0 md:border-r border-slate-200 min-h-[120px]">
  <div className="flex items-center justify-between mb-4">
  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest bg-amber-100 px-2 py-0.5">Active Farmers</p>
  <Users className="w-5 h-5 text-amber-700" />
  </div>
  <h3 className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">{stats.totalFarmers.toLocaleString()}</h3>
  </div>

  <div className="p-5 flex flex-col justify-between bg-white border-b-2 md:border-b-0 md:border-r border-slate-200 min-h-[120px]">
  <div className="flex items-center justify-between mb-4">
  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest bg-purple-100 px-2 py-0.5">Active Mandis</p>
  <Building2 className="w-5 h-5 text-purple-700" />
  </div>
  <h3 className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">{stats.activeCentres} / {centres.length}</h3>
  </div>

  <div className={`p-5 flex flex-col justify-between bg-white min-h-[120px] ${(avgRating && avgRating < 3.0) ? 'bg-red-50' : ''}`}>
  <div className="flex items-center justify-between mb-4">
  <p className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${(avgRating && avgRating < 3.0) ? 'bg-red-900 text-white' : 'bg-orange-100 text-slate-900'}`}>Service Quality</p>
  <Star className={`w-5 h-5 ${(avgRating && avgRating < 3.0) ? 'text-red-700' : 'text-orange-700'}`} />
  </div>
  <h3 className={`text-3xl font-bold font-mono tracking-tighter ${(avgRating && avgRating < 3.0) ? 'text-red-700' : 'text-slate-900'}`}>
    {avgRating ? `${avgRating}/5.0` : 'N/A'}
  </h3>
  </div>
  </div>

 {/* Charts Section */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* Main Area Chart */}
 <div className="lg:col-span-2 p-0 border border-slate-200 bg-white">
 <div className="p-4 border-b border-slate-200 bg-slate-50">
  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Procurement Volume Trend (Quintals)</h3>
 </div>
 <div className="h-[300px] w-full p-6">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <defs>
 <linearGradient id="colorProcured" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#047857" stopOpacity={0.3}/>
 <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} />
 <RechartsTooltip 
 contentStyle={{ borderRadius: '0px', border: '2px solid #0f172a', boxShadow: 'none' }}
 />
 <Area type="monotone" dataKey="procured" stroke="#047857" strokeWidth={3} fillOpacity={1} fill="url(#colorProcured)" />
 <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" fillOpacity={0} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Pie Chart */}
 <div className="p-0 border border-slate-200 bg-white flex flex-col">
 <div className="p-4 border-b border-slate-200 bg-slate-50">
  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Crop Distribution</h3>
 </div>
 <div className="flex-1 min-h-[200px] p-6 pb-0">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={cropData}
 innerRadius={60}
 outerRadius={80}
 paddingAngle={5}
 dataKey="value"
 stroke="none"
 >
 {cropData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <RechartsTooltip 
 contentStyle={{ borderRadius: '0px', border: '2px solid #0f172a', boxShadow: 'none' }}
 />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="space-y-0 p-6 pt-0 mt-4">
 {cropData.map((c, i) => (
 <div key={c.name} className={`flex justify-between items-center text-sm py-3 border-slate-200 ${i !== cropData.length - 1 ? 'border-b' : ''}`}>
 <div className="flex items-center gap-3">
 <div className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: c.color }}></div>
 <span className="text-slate-900 font-bold uppercase tracking-wider text-[10px]">{c.name}</span>
 </div>
 <span className="font-bold font-mono text-slate-900">{c.value}%</span>
 </div>
 ))}
 </div>
 </div>

 {/* Bar Chart */}
 <div className="lg:col-span-3 p-0 border border-slate-200 bg-white">
 <div className="p-4 border-b border-slate-200 bg-slate-50">
  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Top Mandis Queue vs Capacity</h3>
 </div>
 <div className="h-[300px] w-full p-6">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={centreLoads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} />
 <RechartsTooltip 
 cursor={{ fill: '#f1f5f9' }}
 contentStyle={{ borderRadius: '0px', border: '2px solid #0f172a', boxShadow: 'none' }}
 />
 <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
 <Bar dataKey="queue" name="Active Queue" fill="#ca8a04" radius={[0, 0, 0, 0]} />
 <Bar dataKey="capacity" name="Scaled Capacity" fill="#94a3b8" radius={[0, 0, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 
 {/* Expected Arrivals (Next 7 Days) */}
 <div className="lg:col-span-3 p-0 border border-slate-200 bg-white mt-4">
 <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Pre-Harvest Arrival Forecast (Quintals)</h3>
  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Based on FPO & Farmer Bookings</span>
 </div>
 <div className="h-[300px] w-full p-6">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={futureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 'bold' }} />
 <RechartsTooltip 
 cursor={{ fill: '#f1f5f9' }}
 contentStyle={{ borderRadius: '0px', border: '2px solid #0f172a', boxShadow: 'none' }}
 />
 <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
 <Bar dataKey="individual" name="Individual Farmers" stackId="a" fill="#0f172a" />
 <Bar dataKey="fpo" name="FPO / Group Bookings" stackId="a" fill="#047857" radius={[0, 0, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 </div>
 );
}
