const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

// Update select query to fetch all operator details
content = content.replace(
  /\.select\('id'\)\.eq\('status', 'PENDING'\)/,
  ".select('*').eq('status', 'PENDING')"
);

// Replace the entire Action Required list contents
const newActionRequiredList = `{pendingOperators.length === 0 ? (
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
              )}`;

content = content.replace(
  /\{pendingFarmers\.length > 0 && pendingFarmers\.map[\s\S]*?\{\/\* Alert 1 \*\/\}/,
  newActionRequiredList + '\n\n              {/* Grievance Ticket Alert */}\n              {/* Alert 1 */}'
);

content = content.replace(/pendingFarmers/g, 'pendingOperators');

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', content);
console.log('Fixed pending action list');
