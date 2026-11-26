import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'site-config.js', 'assets', 'images', 'concepts']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log('Valoria built successfully in dist/');
