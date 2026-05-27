import fs from 'fs';
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let stack: string[] = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i < 936 || i >= 2462) continue;
  
  const tags = line.match(/<[a-zA-Z0-9.]+[^>]*>|<\/[a-zA-Z0-9.]+>/g) || [];
  for (const tag of tags) {
    if (tag.startsWith('</')) {
      const tagName = tag.substring(2, tag.length - 1);
      if (stack.length > 0 && stack[stack.length - 1] === tagName) {
        stack.pop();
      } else {
        console.log(`${i+1}: Mismatch! closing ${tagName} but stack has ${stack[stack.length-1]}`);
      }
    } else if (!tag.endsWith('/>') && !tag.startsWith('<img') && !tag.startsWith('<input') && !tag.startsWith('<br')) {
        const tagName = tag.match(/<([a-zA-Z0-9.]+)/)[1];
        stack.push(tagName);
    }
  }
}
console.log('Final stack:', stack);
