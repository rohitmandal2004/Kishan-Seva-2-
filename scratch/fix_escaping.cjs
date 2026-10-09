const fs = require('fs');

const path = 'src/pages/farmer/FarmerDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file literally has string: {\`w-full ... min-w-[44px]\`}
// We need to replace {\` with {` and \`} with `} and \${ with ${
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(path, content);
console.log("Fixed escaping.");
