const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

// 1. Fix Procurement Completed Metric (Remove 45%)
content = content.replace(
  /\{\/\* Metric 3 \*\/\}[\s\S]*?\{\/\* Metric 4 \*\/\}/,
  `{/* Metric 3 */}
        <div className="p-6 bg-white flex flex-col justify-between border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-6">Procurement Completed</span>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl  font-semibold tracking-tighter text-slate-900">{stats.totalProcuredQuintals.toLocaleString('en-IN')}</h3>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Q</span>
            </div>
            <div className="w-full h-2 bg-slate-100 mt-4 relative rounded-xl overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-slate-900" style={{ width: \`\${Math.min(100, Math.round((stats.totalProcuredQuintals / (centres.reduce((a,c) => a + c.daily_capacity_quintals, 0) || 1)) * 100))}%\` }}></div>
            </div>
            <p className="text-xs text-slate-900 font-semibold mt-2 text-right tracking-wider uppercase">{Math.min(100, Math.round((stats.totalProcuredQuintals / (centres.reduce((a,c) => a + c.daily_capacity_quintals, 0) || 1)) * 100))}% of Daily Target</p>
          </div>
        </div>

        {/* Metric 4 */}`
);

// 2. Fix the Avg Wait Time calculation
const waitCalc = "const avgWaitTime = Math.round(centres.reduce((sum, c) => sum + (c.est_wait_time_mins || 0), 0) / (centres.length || 1));";
content = content.replace(
  /const overloadedCentres = centres\.filter/g,
  waitCalc + '\n  const overloadedCentres = centres.filter'
);

// 3. Fix the active queues metric
content = content.replace(
  /AVG WAIT: 42 MINS/g,
  'AVG WAIT: {avgWaitTime} MINS'
);

// 4. Fix Trends Chart Fake Data
content = content.replace(
  /\{\/\* TRENDS: 3-Col Compact Charts \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<div className="mt-8/,
  `{/* TRENDS: 3-Col Compact Charts */}
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

          <div className="mt-8`
);

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', content);
console.log('Metrics dynamically updated');
