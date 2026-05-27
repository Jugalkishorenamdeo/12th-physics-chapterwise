import fs from 'fs';
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

// Find the last line of the component
for (let i = lines.length - 1; i >= 0; i--) {
   if (lines[i].includes('};') && lines[i].length < 10) {
      lines[i-1] = '      </div>\n    </div>\n  );';
      break;
   }
}

fs.writeFileSync('src/components/AdminDashboard.tsx', lines.join('\n'));
