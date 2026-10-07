const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

// Replace the Global Alert Strip with the Needs Attention Area
content = content.replace(
  /\{\/\* Global Alert Strip - Dynamically bound to data \*\/\}([\s\S]*?)\{\/\* PRIMARY OPERATIONS: 4-Col Grid \*\/\}/,
  `{/* Global Alert Strip - Dynamically bound to data */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          Needs Attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-600 font-bold">🟡</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">12 Operator Applications</p>
              <p className="text-slate-500 text-xs mt-0.5">Awaiting admin approval</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-600 font-bold">🔴</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Barasat Centre</p>
              <p className="text-slate-500 text-xs mt-0.5">Has reached 91% capacity</p>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <span className="text-orange-600 font-bold">🟠</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Bongaon Queue</p>
              <p className="text-slate-500 text-xs mt-0.5">Waiting time is 126 min</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-600 font-bold">🟡</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">4 Payments</p>
              <p className="text-slate-500 text-xs mt-0.5">Require immediate attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY OPERATIONS: 4-Col Grid */}`
);

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', content);
console.log('done');
