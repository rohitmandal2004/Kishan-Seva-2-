import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Add aria-label if title exists but aria-label doesn't
  content = content.replace(/(<button[^>]*?title=({[^}]+}|"[^"]+")[^>]*?)>/g, (match, p1, p2) => {
    if (!match.includes('aria-label')) {
      return `${p1} aria-label=${p2}>`;
    }
    return match;
  });
  
  // Also for <Button>
  content = content.replace(/(<Button[^>]*?title=({[^}]+}|"[^"]+")[^>]*?)>/g, (match, p1, p2) => {
    if (!match.includes('aria-label')) {
      return `${p1} aria-label=${p2}>`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Added aria-label in ${changedCount} files.`);
