const fs = require('fs');
let content = fs.readFileSync('src/pages/farmer/FarmerDashboard.tsx', 'utf8');

const progressHTML = `
            {/* SERVICE PROGRESS TIMELINE */}
            <div className="mt-5 pt-5 border-t border-slate-100/80 relative z-10">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Service Progress</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { step: 'Booking', key: 'BOOKED', done: true },
                  { step: 'Check-in', key: 'CHECKED_IN', done: ['CHECKED_IN', 'QUALITY_TESTING', 'WEIGHMENT', 'PROCUREMENT', 'COMPLETED'].includes(activeBooking.status) },
                  { step: 'Queue', key: 'QUEUE', active: activeBooking.status === 'CHECKED_IN', done: ['QUALITY_TESTING', 'WEIGHMENT', 'PROCUREMENT', 'COMPLETED'].includes(activeBooking.status) },
                  { step: 'Quality', key: 'QUALITY_TESTING', active: activeBooking.status === 'QUALITY_TESTING', done: ['WEIGHMENT', 'PROCUREMENT', 'COMPLETED'].includes(activeBooking.status) },
                  { step: 'Weighment', key: 'WEIGHMENT', active: activeBooking.status === 'WEIGHMENT', done: ['PROCUREMENT', 'COMPLETED'].includes(activeBooking.status) },
                  { step: 'Payment', key: 'COMPLETED', active: false, done: activeBooking.status === 'COMPLETED' },
                ].map((s, idx) => (
                  <div key={idx} className={\`flex-1 flex items-center gap-2 p-2 rounded-lg border \${
                    s.done ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                    s.active ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm' : 
                    'bg-slate-50 border-slate-200 text-slate-400'
                  }\`}>
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : 
                       s.active ? <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span> : 
                       <span className="w-2 h-2 rounded-full bg-slate-300"></span>}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{s.step}</span>
                  </div>
                ))}
              </div>
            </div>
`;

content = content.replace(
  /<\/div>\s*<\/Card>\s*\)\s*:\s*\(\s*recLoading \? \(/,
  `</div>
            ${progressHTML}
          </Card>
        ) : (
          recLoading ? (`
);

fs.writeFileSync('src/pages/farmer/FarmerDashboard.tsx', content);
console.log('done');
