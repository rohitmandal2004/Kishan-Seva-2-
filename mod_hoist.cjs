const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOverview.tsx', 'utf8');

// 1. Move state declarations to the top
const statesToMove = `  const [pendingOperators, setPendingOperators] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    const loadPending = async () => {
      const { data } = await supabase.from('operator_profiles').select('id').eq('status', 'PENDING');
      const operators = data || [];
      setPendingOperators(operators);
    };
    loadPending();
  }, []);`;

// Remove from old spot
content = content.replace(
  /const \[pendingOperators, setPendingOperators\] = useState<any\[\]>\(\[\]\);\s*const \[isApproving, setIsApproving\] = useState<string \| null>\(null\);\s*useEffect\(\(\) => \{\s*const loadPending = async \(\) => \{\s*const \{ data \} = await supabase\.from\('operator_profiles'\)\.select\('id'\)\.eq\('status', 'PENDING'\);\s*const operators = data \|\| \[\];\s*setPendingOperators\(operators\);\s*\};\s*loadPending\(\);\s*\}, \[\]\);/g,
  ''
);

// Insert before the variable usages
content = content.replace(
  /const sortedCentres = \[\.\.\.centres\]\.sort/,
  `${statesToMove}

  const sortedCentres = [...centres].sort`
);

// 2. Remove handleApprove which has setPendingFarmers error
content = content.replace(
  /const handleApprove = async \(farmerId: string\) => \{[\s\S]*?finally \{\s*setIsApproving\(null\);\s*\}\s*\};/g,
  ''
);

fs.writeFileSync('src/pages/admin/AdminOverview.tsx', content);
console.log('Fixed variable hoisting error');
