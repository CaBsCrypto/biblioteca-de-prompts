import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

await build({ entryPoints: ['src/mcp/ui/main.tsx'], bundle: true, format: 'iife', target: 'es2022',
  outfile: 'dist/mcp-widget.js', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
const js = (await readFile('dist/mcp-widget.js', 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = (await readFile('dist/mcp-widget.css', 'utf8')).replace(/<\/style/gi, '<\\/style');
// No catalog content is interpolated into this shell; React renders untrusted text.
await writeFile('dist/mcp-widget.html', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biblioteca</title><style>' + css + '</style></head><body><div id="biblioteca-widget"></div><script>' + js + '</script></body></html>');
