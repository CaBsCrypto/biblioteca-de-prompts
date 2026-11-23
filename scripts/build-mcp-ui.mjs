import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

async function widget(entry, basename, mount) {
  await build({ entryPoints: [entry], bundle: true, format: 'iife', target: 'es2022',
    outfile: `dist/${basename}.js`, minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
  const js = (await readFile(`dist/${basename}.js`, 'utf8')).replace(/<\/script/gi, '<\\/script');
  const css = (await readFile(`dist/${basename}.css`, 'utf8')).replace(/<\/style/gi, '<\\/style');
  // Both bundles are static. Any personal or untrusted text is rendered by React.
  await writeFile(`dist/${basename}.html`, '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biblioteca</title><style>' + css + '</style></head><body>' + mount + '<script>' + js + '</script></body></html>');
}

await Promise.all([
  widget('src/mcp/ui/main.tsx', 'mcp-widget', '<div id="biblioteca-widget"></div>'),
  widget('src/mcp/ui/promptMain.tsx', 'mcp-prompts', '<div id="biblioteca-prompts" data-biblioteca-extra="guest"></div>'),
]);
