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

  // Replace zinc with slate
  content = content.replace(/bg-zinc-/g, 'bg-slate-');
  content = content.replace(/text-zinc-/g, 'text-slate-');
  content = content.replace(/border-zinc-/g, 'border-slate-');
  content = content.replace(/ring-zinc-/g, 'ring-slate-');
  content = content.replace(/divide-zinc-/g, 'divide-slate-');
  content = content.replace(/from-zinc-/g, 'from-slate-');
  content = content.replace(/to-zinc-/g, 'to-slate-');
  content = content.replace(/via-zinc-/g, 'via-slate-');
  
  // Replace green/teal with emerald
  content = content.replace(/bg-green-/g, 'bg-emerald-');
  content = content.replace(/text-green-/g, 'text-emerald-');
  content = content.replace(/border-green-/g, 'border-emerald-');
  content = content.replace(/ring-green-/g, 'ring-emerald-');
  content = content.replace(/bg-teal-/g, 'bg-emerald-');
  content = content.replace(/text-teal-/g, 'text-emerald-');
  content = content.replace(/border-teal-/g, 'border-emerald-');
  content = content.replace(/ring-teal-/g, 'ring-emerald-');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced colors in ${changedCount} files.`);
