import fs from 'fs';
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
// The script replaced '                                </div>' with '                  </div>\n               </div>'
// I will revert it.
const fixed = content.split('                  </div>\n               </div>').join('                                </div>');
fs.writeFileSync('src/components/AdminDashboard.tsx', fixed);
