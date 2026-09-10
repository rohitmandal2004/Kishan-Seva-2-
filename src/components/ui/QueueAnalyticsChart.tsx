import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock } from 'lucide-react';

interface QueueAnalyticsChartProps {
 centreId: string;
}

export function QueueAnalyticsChart({ centreId }: QueueAnalyticsChartProps) {
 const data = useMemo(() => {
 // Generate deterministic chart data based on centreId
 let hash = 0;
 for (let i = 0; i < centreId.length; i++) {
 hash = ((hash << 5) - hash) + centreId.charCodeAt(i);
 hash = hash & hash;
 }
 const seed = Math.abs(hash);

 const hourlyData = [];
 // Open from 8 AM to 6 PM (10 hours)
 for (let hour = 8; hour <= 18; hour++) {
 let waitMins = 0;
 // Define peak patterns
 if (hour >= 9 && hour <= 11) {
 // Morning peak
 waitMins = 40 + (seed % 40) + ((hour === 10) ? 20 : 0);
 } else if (hour >= 14 && hour <= 16) {
 // Afternoon peak
 waitMins = 30 + (seed % 30);
 } else {
 // Off-peak
 waitMins = 10 + (seed % 15);
 }
 
 hourlyData.push({
 time: hour > 12 ? `${hour - 12} PM` : hour === 12 ? `12 PM` : `${hour} AM`,
 hourNum: hour,
 waitMins: waitMins
 });
 }
 return hourlyData;
 }, [centreId]);

 const currentHour = new Date().getHours();
 // Don't show reference line if outside working hours
 const showCurrentTime = currentHour >= 8 && currentHour <= 18;
 const currentLabel = showCurrentTime 
 ? (currentHour > 12 ? `${currentHour - 12} PM` : currentHour === 12 ? `12 PM` : `${currentHour} AM`)
 : '';

 return (
 <div className="w-full h-32 mt-2">
 <div className="flex items-center gap-1.5 mb-2 text-slate-500 text-[10px] font-bold uppercase">
 <Clock className="w-3 h-3" />
 Estimated Wait Times (Today)
 </div>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
 <defs>
 <linearGradient id={`colorWait-${centreId}`} x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#059669" stopOpacity={0} />
 </linearGradient>
 </defs>
 <XAxis 
 dataKey="time" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 9, fill: '#94a3b8' }} 
 interval="preserveStartEnd"
 minTickGap={10}
 />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 9, fill: '#94a3b8' }}
 tickFormatter={(val) => `${val}m`}
 />
 <Tooltip 
 contentStyle={{ borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
 formatter={(value: any) => [`${value} mins`, 'Wait Time']}
 labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
 />
 {showCurrentTime && (
 <ReferenceLine 
 x={currentLabel} 
 stroke="#ef4444" 
 strokeDasharray="3 3"
 />
 )}
 <Area 
 type="monotone" 
 dataKey="waitMins" 
 stroke="#059669" 
 strokeWidth={2}
 fillOpacity={1} 
 fill={`url(#colorWait-${centreId})`} 
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 );
}
