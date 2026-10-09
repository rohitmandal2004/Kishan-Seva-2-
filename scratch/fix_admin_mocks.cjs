const fs = require('fs');

const path = 'src/pages/admin/AdminOverview.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: The '4 ALERTS' counter
const alertCounterTarget = `<h3 className="text-xs font-semibold uppercase tracking-wider text-white">Action Required</h3>
            <span className="bg-red-600 text-white border border-red-200 rounded-md text-xs font-semibold font-mono px-2 py-0.5">4 ALERTS</span>`;
const alertCounterReplacement = `<h3 className="text-xs font-semibold uppercase tracking-wider text-white">Action Required</h3>
            <span className="bg-red-600 text-white border border-red-200 rounded-md text-xs font-semibold font-mono px-2 py-0.5">{pendingOperators.length + (pendingPayments > 0 ? 1 : 0) + overloadedCentres.length} ALERTS</span>`;
content = content.replace(alertCounterTarget, alertCounterReplacement);

// Fix 2: Remove fake alerts and replace with dynamic ones based on overloadedCentres and pendingPayments
const mockAlertsTarget = `{/* Grievance Ticket Alert */}
              {/* Alert 1 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-red-900 bg-red-100 px-2 py-0.5 border-2 border-red-900">[PAYMENT FAILED]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">10m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">DBT Bounce: Invalid Account</p>
                    <p className="text-xs font-bold text-slate-700">Farmer KSP-1032 payment of ₹85,000 bounced at RBI gateway.</p>
                    <button className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">REVIEW LOG</button>
                  </div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-200 rounded-lg">[CAPACITY WARN]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">22m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">Burdwan-02 Queue Overload</p>
                    <p className="text-xs font-bold text-slate-700">Queue capacity reached 98%. Recommended to divert incoming vehicles.</p>
                    <button className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">MANAGE QUEUE</button>
                  </div>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-200 rounded-lg">[CAPACITY WARN]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">45m ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">Ranaghat Queue Overload</p>
                    <p className="text-xs font-bold text-slate-700">Queue capacity reached 95%. Wait time exceeding 90 mins.</p>
                  </div>
                </div>
              </div>

              {/* Alert 4 */}
              <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 border border-slate-200 rounded-xl bg-slate-900 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold font-mono text-white bg-slate-900 px-2 py-0.5 border-2 border-slate-950">[SYSTEM]</span>
                      <span className="text-xs font-semibold font-mono text-slate-500">2h ago</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">API Latency Degraded</p>
                    <p className="text-xs font-bold text-slate-700">NIC Gateway response time &gt; 2000ms. Transactions may be delayed.</p>
                  </div>
                </div>
              </div>`;

const dynamicAlertsReplacement = `{pendingPayments > 0 && (
                <div className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 border border-slate-200 rounded-xl bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold font-mono text-red-900 bg-red-100 px-2 py-0.5 border-2 border-red-900">[PENDING PAYMENTS]</span>
                        <span className="text-xs font-semibold font-mono text-slate-500">Now</span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">{pendingPayments} Pending Disbursements</p>
                      <p className="text-xs font-bold text-slate-700">{pendingPayments} farmers have completed procurement but payments are pending.</p>
                      <button onClick={() => window.location.href='/admin/transactions'} className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">REVIEW TRANSACTIONS</button>
                    </div>
                  </div>
                </div>
              )}

              {overloadedCentres.map(c => (
                <div key={c.id} className="p-5 bg-white hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 border border-slate-200 rounded-xl bg-amber-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 border border-amber-200 rounded-lg">[CAPACITY WARN]</span>
                        <span className="text-xs font-semibold font-mono text-slate-500">Now</span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight mb-2">{c.name} Queue Overload</p>
                      <p className="text-xs font-bold text-slate-700">Queue has {c.current_queue_length} vehicles. Capacity limit risk.</p>
                      <button onClick={() => window.location.href='/admin/centres'} className="mt-3 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 border border-slate-200 rounded-xl transition-colors">MANAGE QUEUE</button>
                    </div>
                  </div>
                </div>
              ))}`;
content = content.replace(mockAlertsTarget, dynamicAlertsReplacement);

// Fix 3: Fix stats.activeCentres which is undefined
const activeCentresTarget = `<span className="text-3xl font-mono  font-semibold text-slate-900">{stats.activeCentres}</span>`;
const activeCentresReplacement = `<span className="text-3xl font-mono  font-semibold text-slate-900">{centres.filter(c => c.status === 'ACTIVE').length}</span>`;
content = content.replace(activeCentresTarget, activeCentresReplacement);

fs.writeFileSync(path, content);
console.log("Removed fake data from AdminOverview.");
