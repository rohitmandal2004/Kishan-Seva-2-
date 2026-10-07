const fs = require('fs');
let content = fs.readFileSync('src/pages/auth/OperatorLogin.tsx', 'utf8');

content = content.replace(
  /const res = await signIn\.create\(\{[\s\S]*?identifier: email,[\s\S]*?password: password,[\s\S]*?\}\);/,
  `let signinEmail = email;
      if (email.toUpperCase().startsWith('KSO-')) {
          const { data: opData } = await supabase.from('operator_profiles').select('email').eq('operator_code', email.toUpperCase()).maybeSingle();
          if (opData?.email) {
              signinEmail = opData.email;
          }
      }

      const res = await signIn.create({
        identifier: signinEmail,
        password: password,
      });`
);

content = content.replace(
  /toast\.error\('Your operator account has been suspended\.'\);\s*\} else \{/g,
  `toast.error('Your operator account has been suspended.');
            } else if (!profile.assigned_centre_id) {
                await clerk.signOut();
                await signOut();
                toast.error('You have not been assigned to a procurement centre.');
            } else {`
);

content = content.replace(
  /type="email"\s*placeholder="operator@kishanseva.gov.in"/,
  `type="text"
                placeholder="Email or Operator ID (e.g. KSO-BAS-0001)"`
);

content = content.replace(
  /Email Address<\/Label>/,
  `Email or Operator ID</Label>`
);

fs.writeFileSync('src/pages/auth/OperatorLogin.tsx', content);
console.log('done');
