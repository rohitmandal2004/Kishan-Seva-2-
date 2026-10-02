import { Card } from '@/components/ui/card';
import { LineChart, TrendingUp, TrendingDown, Info, BarChart3 } from 'lucide-react';
import { OFFICIAL_MSP_RATES } from '@/lib/constants';
import { PriceHistoryChart } from '@/components/ui/PriceHistoryChart';

export default function MarketInsights() {
  const paddyRate = OFFICIAL_MSP_RATES.find(m => m.crop === 'Paddy (Grade A)')?.rate_per_quintal || 2320;
  const mandiRate = 2150;
  const difference = paddyRate - mandiRate;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-emerald-600" /> Market Insights
        </h1>
        <p className="text-slate-500 text-sm mt-1">Track Government MSP vs Local Mandi Prices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-xs">Gov</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase">Govt. MSP (Grade A)</p>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">₹{paddyRate}</h2>
          <p className="text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Guaranteed Minimum Support Price
          </p>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700 font-bold text-xs">Pvt</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase">Local Mandi Avg.</p>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">₹{mandiRate}</h2>
          <p className="text-[10px] font-medium text-amber-600 mt-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Current Market Rate (Basirhat)
          </p>
        </Card>

        <Card className="p-5 border-transparent bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-sm rounded-xl text-white flex flex-col justify-center">
          <p className="text-xs font-bold text-emerald-100 uppercase mb-1">Your Benefit</p>
          <h2 className="text-3xl font-black tracking-tight">+₹{difference} <span className="text-lg font-medium text-emerald-200">/ Q</span></h2>
          <p className="text-[10px] font-medium text-emerald-100 mt-2 leading-tight">
            You earn ₹{difference} more per quintal by selling through Kishan Seva instead of the local market.
          </p>
        </Card>
      </div>

      <Card className="p-5 border-slate-200 bg-white shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" /> Price Trend Analysis (Last 6 Months)
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Paddy (Grade A)</span>
        </div>
        
        <div className="h-[300px] w-full">
           <PriceHistoryChart cropName="Paddy (Grade A)" mspRate={paddyRate} />
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-blue-800 leading-relaxed">
            <span className="font-bold block mb-1">Why do Mandi prices fluctuate?</span>
            Private mandi rates are driven by immediate local demand and supply. During peak harvest season, a glut in supply often drives mandi prices down significantly. The Government MSP remains stable, ensuring you are protected from these market crashes.
          </p>
        </div>
      </Card>
    </div>
  );
}
