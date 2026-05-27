import fs from 'fs';
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const open = (line.match(/\{/g) || []).length;
  const close = (line.match(/\}/g) || []).length;
  balance += open - close;
  if (i > 2450) {
     console.log(`${i+1}: balance=${balance} content=${line.trim()}`);
  }
}
console.log(`Final balance: ${balance}`);
