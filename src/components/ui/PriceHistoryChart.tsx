import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PriceHistoryChartProps {
  cropName: string;
  mspRate: number;
}

export function PriceHistoryChart({ cropName, mspRate }: PriceHistoryChartProps) {
  const data = useMemo(() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep (Now)', 'Oct', 'Nov', 'Dec'];
    
    return months.map((month, idx) => {
      // Simulate historical and forecast data
      // MSP is constant
      // Open market fluctuates. Forecasting into the future (idx > 5) goes lower due to harvest season glut.
      
      let marketRate = mspRate - 150; // Base market is lower than MSP
      
      if (idx < 5) {
        // Historical: Market was somewhat stable but lower
        marketRate = mspRate - 100 - (Math.random() * 80);
      } else if (idx === 5) {
        // Current month
        marketRate = mspRate - 180;
      } else {
        // Forecast: Harvest glut drops market price further
        marketRate = mspRate - 250 - (Math.random() * 100);
      }

      return {
        month,
        MSP: mspRate,
        Market: Math.round(marketRate),
        isForecast: idx > 5,
      };
    });
  }, [mspRate]);

  return (
    <div className="w-full h-[220px] mt-2 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          {cropName} Price Trends & Forecast
        </div>
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div> Government MSP
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-amber-500"></div> Open Market
          </div>
        </div>
      </div>
      
      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMsp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
              dy={10}
            />
            <YAxis 
              domain={['dataMin - 100', 'dataMax + 100']}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
              tickFormatter={(val) => `₹${val}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}
              itemStyle={{ fontWeight: '700' }}
              formatter={(value: number) => [`₹${value}`, undefined]}
            />
            <Area 
              type="monotone" 
              dataKey="Market" 
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorMarket)" 
            />
            <Area 
              type="monotone" 
              dataKey="MSP" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMsp)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
