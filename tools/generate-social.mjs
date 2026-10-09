import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = new URL('../public/social-preview.svg', import.meta.url);
const target = new URL('../public/social-preview.png', import.meta.url);
await writeFile(target, await sharp(await readFile(source)).png().toBuffer());
console.log('Generated social-preview.png (1200 × 630).');
