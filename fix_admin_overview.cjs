const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

code = code.replace(/className="\${([^}]+)} ([^"]+)"/g, 'className={`\\${$1} $2`}');
code = code.replace(/<span className="\${([^}]+)} font-bold">\${([^}]+)}<\/span>/g, '<span className={`\\${$1} font-bold`}>{\\$2}</span>');
code = code.replace(/<div className="\${([^}]+)} w-8 h-8([^"]*)">/g, '<div className={`\\${$1} w-8 h-8$2`}>');

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', code);
console.log('Fixed syntax in AdminOverview');
