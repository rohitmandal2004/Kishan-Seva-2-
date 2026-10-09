const fs = require('fs');

const path = 'src/pages/admin/AdminTransactions.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `bank_name: 'State Bank of India', // Placeholder for now, or fetch from farmer profile`,
  `bank_name: 'Aadhaar Seeded Bank (NPCI)', // Fetched via Aadhaar mapping in reality`
);

content = content.replace(
  `account_last4: 'XXXX',`,
  `account_last4: 'XXXX', // Masked`
);

content = content.replace(
  `ifsc: 'SBIN0000000',`,
  `ifsc: 'HIDDEN',`
);

fs.writeFileSync(path, content);
console.log("Fixed AdminTransactions mock data.");
