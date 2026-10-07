const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOperators.tsx', 'utf8');

content = content.replace(
  /const operatorId = `KSO-\$\{distCode\}-\$\{Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)\}`;([\s\S]*?)const tempPassword = `Ks@\$\{Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)\}X`;/,
  `const operatorId = \`KSO-\${distCode}-\${Math.floor(1000 + Math.random() * 9000)}\`;
      const tempPassword = \`Ks@\${Math.floor(1000 + Math.random() * 9000)}X\`;
      
      // Ensure assigned_centre_id is saved if the admin didn't manually change it
      if (!op.assigned_centre_id) {
          await supabase.from('operator_profiles').update({ assigned_centre_id: assignedCentre }).eq('id', op.id);
      }`
);

fs.writeFileSync('src/pages/admin/AdminOperators.tsx', content);
console.log('done');
