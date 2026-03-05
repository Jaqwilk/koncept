import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public');

const staticFiles = [
  'index.html',
  'uslugi.html',
  'portfolio.html',
  'o-mnie.html',
  'kontakt.html',
  'polityka-prywatnosci.html',
  'robots.txt',
  'sitemap.xml'
];

const staticDirs = ['css', 'images', 'js', 'portal'];

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function buildStatic() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const file of staticFiles) {
    const source = path.join(root, file);
    if (await exists(source)) {
      await cp(source, path.join(outDir, file), { recursive: false });
    }
  }

  for (const dir of staticDirs) {
    const source = path.join(root, dir);
    if (await exists(source)) {
      await cp(source, path.join(outDir, dir), { recursive: true });
    }
  }

  console.log(`Static output generated in: ${outDir}`);
}

buildStatic().catch((error) => {
  console.error(error);
  process.exit(1);
});
