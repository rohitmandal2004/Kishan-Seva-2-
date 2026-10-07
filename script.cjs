const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOperators.tsx', 'utf8');

content = content.replace(
  /const centre = centresList\.find\(c => c\.id === op\.centre_id\);\s*return \{\s*\.\.\.op,\s*procurement_centres: centre \|\| null\s*\};/,
  `const reqCentre = centresList.find(c => c.id === op.requested_centre_id);
        const assignedCentre = centresList.find(c => c.id === op.assigned_centre_id);
        return {
          ...op,
          requested_centre: reqCentre || null,
          assigned_centre: assignedCentre || null
        };`
);

content = content.replace(
  /const distCode = op\.procurement_centres\?\.district\?\.substring\(0, 3\)\.toUpperCase\(\) \|\| 'XXX';/,
  `const assignedCentre = op.assigned_centre_id || op.requested_centre_id;
      if (!assignedCentre) {
          toast.error('Please assign a centre before approving.');
          setApprovingId(null);
          return;
      }
      const centreData = centres.find(c => c.id === assignedCentre);
      const distCode = centreData?.district?.substring(0, 3).toUpperCase() || 'XXX';`
);

content = content.replace(
  /\.update\(\{ centre_id: centreId \}\)/,
  `.update({ assigned_centre_id: centreId })`
);

content = content.replace(
  /<div className="flex items-center gap-1\.5 text-slate-700">[\s\S]*?<select[\s\S]*?value=\{op\.centre_id \|\| ''\}[\s\S]*?onChange=\{\(e\) => handleUpdateCentre\(op\.id, e\.target\.value\)\}/,
  `<div className="flex flex-col text-slate-700 text-xs">
                          <span className="font-semibold text-slate-500">Requested:</span>
                          <span className="truncate max-w-[200px]" title={op.requested_centre?.name}>
                            {op.requested_centre?.name || 'Not assigned'}
                          </span>
                        </div>
                        <div className="flex flex-col text-slate-700 text-xs mt-1">
                          <span className="font-semibold text-slate-500">Assigned:</span>
                        </div>
                        <select
                          className="mt-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white max-w-[200px]"
                          value={op.assigned_centre_id || op.requested_centre_id || ''}
                          onChange={(e) => handleUpdateCentre(op.id, e.target.value)}`
);

fs.writeFileSync('src/pages/admin/AdminOperators.tsx', content);
console.log('done');
