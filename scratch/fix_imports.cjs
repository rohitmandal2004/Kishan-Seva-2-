const fs = require('fs');

const path = 'src/pages/farmer/FarmerDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { Link } from 'react-router-dom';", "import { Link, useNavigate } from 'react-router-dom';");

const weirdImport = `import { Link, useNavigate } from 'react-router-dom';\r\n  Banknote`;
const fix = `  FileText, CloudRain, ArrowRight, ShieldCheck,\r\n  Banknote`;

content = content.replace(weirdImport, fix);

const weirdImport2 = `import { Link, useNavigate } from 'react-router-dom';\n  Banknote`;
const fix2 = `  FileText, CloudRain, ArrowRight, ShieldCheck,\n  Banknote`;

content = content.replace(weirdImport2, fix2);

fs.writeFileSync(path, content);
console.log("Fixed.");
