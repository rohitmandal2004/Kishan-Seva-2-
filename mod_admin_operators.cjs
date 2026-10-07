const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminOperators.tsx', 'utf8');

code = code.replace(
  /const centreData = centres\.find[\s\S]*?Math\.random[\s\S]*?;\s*/,
  ''
);

code = code.replace(
  /email: op\.email,\s*operatorId: operatorId,\s*fullName: op\.full_name/,
  'email: op.email,\n          assignedCentreId: assignedCentre,\n          fullName: op.full_name'
);

code = code.replace(
  /setGeneratedCredentials\({ id: operatorId, setupUrl: data\.setupUrl, email: op\.email }\);/,
  'setGeneratedCredentials({ id: data.operatorId, setupUrl: data.setupUrl, email: op.email });'
);

fs.writeFileSync('src/pages/admin/AdminOperators.tsx', code);
console.log('Fixed ID generation in AdminOperators.tsx');
