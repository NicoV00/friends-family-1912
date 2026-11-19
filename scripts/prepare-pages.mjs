import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base='/friends-family-1912/';
async function visit(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())await visit(file);
    else if(/\.(html|css|js)$/.test(file)){
      const source=await readFile(file,'utf8');
      await writeFile(file,source.replace(/(["'(`])\/(fonts|_astro|brand|downloads)\//g,`$1${base}$2/`));
    }
  }
}
await visit('dist');
await writeFile('dist/.nojekyll','');
