import fs from 'fs';

const fileContent = fs.readFileSync('lint.json', 'utf8');
const data = JSON.parse(fileContent);
const diagnostics = Array.isArray(data) ? data : (data.diagnostics || []);
const errors = diagnostics.filter(d => d.severity === 'error');
const warnings = diagnostics.filter(d => d.severity === 'warning');

console.log(`Found ${errors.length} errors and ${warnings.length} warnings.\n`);

console.log('--- ERRORS ---');
errors.forEach(e => {
  console.log(`${e.filename}:${e.labels?.[0]?.span?.line || 0} - ${e.message}`);
});
