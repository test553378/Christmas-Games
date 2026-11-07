import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await rm(dist, { recursive:true, force:true });
await mkdir(dist, { recursive:true });
for (const file of ['index.html','styles.css','favicon.svg','src','.nojekyll']) await cp(path.join(root,file),path.join(dist,file),{recursive:true});
console.log('Built static game in dist/ (no dependencies).');
