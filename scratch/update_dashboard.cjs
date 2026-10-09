const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/farmer/FarmerDashboard.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

lines[8] = "import { Link, useNavigate } from 'react-router-dom';";
let lucideIndex = lines.findIndex(l => l.includes("TrendingUp, TrendingDown, Sun, Cloud, Bell, Building, BellRing, CreditCard, Edit2"));
if (lucideIndex !== -1) {
  lines[lucideIndex] = "  TrendingUp, TrendingDown, Sun, Cloud, Bell, Building, BellRing, CreditCard, Edit2, Activity, WifiOff, FileArchive, AlertTriangle";
}

const returnIndex = lines.findIndex((l, i) => l.includes('return (') && lines[i+1] && lines[i+1].includes('<div className="relative w-full min-h-full flex flex-col">'));
const historyIndex = lines.findIndex(l => l.includes('{/* RECENT PROCUREMENT HISTORY & PAYMENT TRACKER */}'));

if (returnIndex !== -1 && historyIndex !== -1) {
  const beforeReturn = lines.slice(0, returnIndex).join('\n');
  const afterHistory = lines.slice(historyIndex).join('\n');
  const newMiddle = fs.readFileSync(path.join(__dirname, 'new_middle.txt'), 'utf8');
  fs.writeFileSync(filePath, beforeReturn + '\n' + newMiddle + '\n' + afterHistory);
  console.log("Successfully patched FarmerDashboard.tsx");
} else {
  console.log("Could not find insertion points: " + returnIndex + ", " + historyIndex);
}
