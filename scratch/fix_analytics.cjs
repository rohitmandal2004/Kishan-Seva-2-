const fs = require('fs');

const path = 'src/pages/admin/AdminAnalytics.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the target: 600 to be dynamic based on centre capacity
content = content.replace(
  `      target: 600,`,
  `      target: centres.reduce((sum, c) => sum + (c.daily_capacity_quintals || 0), 0),`
);

// Fix the cropData display which wrongly append '%'
content = content.replace(
  `<span className="font-bold font-mono text-slate-900">{c.value}%</span>`,
  `<span className="font-bold font-mono text-slate-900">{c.value} Q</span>`
);

fs.writeFileSync(path, content);
console.log("Fixed AdminAnalytics mock/display bugs.");
