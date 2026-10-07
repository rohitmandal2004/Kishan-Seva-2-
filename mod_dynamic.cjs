const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

// Replace the pendingFarmers logic with pendingOperators
content = content.replace(
  /const \[pendingFarmers, setPendingFarmers\] = useState<any\[\]>\(\[\]\);/g,
  'const [pendingOperators, setPendingOperators] = useState<any[]>([]);'
);
content = content.replace(
  /const farmers = await SupabaseDataService\.getPendingFarmers\(\);/g,
  'const { data } = await supabase.from(\'operator_profiles\').select(\'id\').eq(\'status\', \'PENDING\');\n      const operators = data || [];'
);
content = content.replace(
  /setPendingFarmers\(farmers\);/g,
  'setPendingOperators(operators);'
);

// We need to make sure supabase is imported
if (!content.includes('import { supabase }')) {
  content = content.replace(
    /import \{ useSupabase \} from '@\/context\/SupabaseContext';/g,
    "import { useSupabase } from '@/context/SupabaseContext';\nimport { supabase } from '@/lib/supabase';"
  );
}

// Compute dynamic values for Needs Attention
content = content.replace(
  /const overloadedCentres = centres\.filter\(c => c\.current_queue_length > \(c\.daily_capacity_quintals \* 0\.05\)\);/g,
  `const overloadedCentres = centres.filter(c => c.current_queue_length > (c.daily_capacity_quintals * 0.05));
  
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
  
  const pendingPayments = storeBookings.filter(b => b.status === 'PROCUREMENT').length;`
);

// Now replace the hardcoded UI for Needs Attention
const dynamicCards = `
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => window.location.href='/admin/operators'}>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-600 font-bold">🟡</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{pendingOpCount} Operator Applications</p>
              <p className="text-slate-500 text-xs mt-0.5">{pendingOpCount > 0 ? 'Awaiting admin approval' : 'All clear'}</p>
            </div>
          </div>
          
          <div className="\${mostOverloadedPct > 80 ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'} border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors" onClick={() => window.location.href='/admin/centres'}>
            <div className="\${mostOverloadedPct > 80 ? 'bg-red-100' : 'bg-emerald-100'} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <span className="\${mostOverloadedPct > 80 ? 'text-red-600' : 'text-emerald-600'} font-bold">\${mostOverloadedPct > 80 ? '🔴' : '🟢'}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{mostOverloaded?.name || 'All Centres'}</p>
              <p className="text-slate-500 text-xs mt-0.5">Capacity utilization: {mostOverloadedPct}%</p>
            </div>
          </div>

          <div className="\${longestQueue?.current_queue_length > 10 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'} border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors" onClick={() => window.location.href='/admin/centres'}>
            <div className="\${longestQueue?.current_queue_length > 10 ? 'bg-orange-100' : 'bg-emerald-100'} w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <span className="\${longestQueue?.current_queue_length > 10 ? 'text-orange-600' : 'text-emerald-600'} font-bold">\${longestQueue?.current_queue_length > 10 ? '🟠' : '🟢'}</span>
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
`;

content = content.replace(
  /<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* PRIMARY OPERATIONS/g,
  dynamicCards + '\n        </div>\n      </div>\n\n      {/* PRIMARY OPERATIONS'
);

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', content);
