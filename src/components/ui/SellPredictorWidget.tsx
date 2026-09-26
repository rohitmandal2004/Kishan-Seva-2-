import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/services/i18n';
import { useKishanData } from '@/context/DataContext';

export function SellPredictorWidget({ farmerVillage, cropName }: { farmerVillage?: string; cropName?: string }) {
    const { t } = useLanguage();
    const [prediction, setPrediction] = useState<{ day: string, waitTime: string, trend: 'up' | 'down' | 'flat', message: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking an AI prediction based on historical data
        setLoading(true);
        const timer = setTimeout(() => {
            const days = ['Tomorrow', 'Day after tomorrow', 'In 3 days'];
            const randomDay = days[Math.floor(Math.random() * days.length)];
            const waitTime = Math.floor(Math.random() * 30 + 15) + ' mins';
            const trends: ('up' | 'down' | 'flat')[] = ['up', 'down', 'flat'];
            const trend = trends[Math.floor(Math.random() * trends.length)];
            
            setPrediction({
                day: randomDay,
                waitTime: waitTime,
                trend: trend,
                message: `Based on AI analysis of mandi queues in ${farmerVillage || 'your area'}, wait times will be lowest on ${randomDay}.`
            });
            setLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [farmerVillage, cropName]);

    return (
        <Card className="p-5 border border-indigo-200 shadow-sm bg-gradient-to-br from-indigo-50/80 to-white rounded-lg relative overflow-hidden group transition h-full">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    AI Best Time to Sell
                </h3>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    Smart India Hackathon
                </span>
            </div>

            {loading ? (
                <div className="animate-pulse flex flex-col gap-3">
                    <div className="h-4 bg-indigo-100/50 rounded w-3/4"></div>
                    <div className="h-8 bg-indigo-100/50 rounded w-1/2 mt-2"></div>
                </div>
            ) : prediction ? (
                <div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {prediction.message}
                    </p>
                    
                    <div className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Est. Wait Time</p>
                                <p className="font-bold text-slate-900">{prediction.waitTime}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Crowd Trend</p>
                            <div className={`flex items-center justify-end gap-1 font-bold ${
                                prediction.trend === 'down' ? 'text-emerald-600' : 
                                prediction.trend === 'up' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                                {prediction.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : 
                                 prediction.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                                <span className="capitalize">{prediction.trend}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </Card>
    );
}
