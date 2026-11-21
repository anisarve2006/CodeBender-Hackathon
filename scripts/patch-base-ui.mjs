import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '../node_modules/@base-ui/react/package.json');
if (fs.existsSync(pkgPath)) {
  const content = fs.readFileSync(pkgPath, 'utf8');
  if (content.includes('.mjs')) {
    fs.writeFileSync(pkgPath, content.replace(/\.mjs/g, '.js'), 'utf8');
    console.log('Successfully patched @base-ui/react package.json exports to .js');
  }
}
