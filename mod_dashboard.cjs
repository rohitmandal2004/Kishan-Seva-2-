const fs = require('fs');
let content = fs.readFileSync('src/pages/operator/OperatorDashboard.tsx', 'utf8');

// Remove the "SECONDARY ANALYTICS" section
content = content.replace(
  /\{\/\* 4\. SECONDARY ANALYTICS \*\/\}([\s\S]*?)<\/div>\s*<\/div>/,
  `</div>`
);
content = content.replace(
  /import \{ QueueAnalyticsChart \} from '@\/components\/ui\/QueueAnalyticsChart';/,
  ''
);

// Simplify the header
content = content.replace(
  /KSP-001 \| Live Operations/,
  `OPERATOR ONLINE • TODAY`
);

fs.writeFileSync('src/pages/operator/OperatorDashboard.tsx', content);
console.log('done');
