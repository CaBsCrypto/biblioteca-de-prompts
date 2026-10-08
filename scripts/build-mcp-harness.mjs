import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/mcp/dev/harness.ts'], bundle: true, format: 'iife', target: 'es2022',
  outfile: 'dist/mcp-harness.js', minify: true, define: { 'process.env.NODE_ENV': '"development"' } });
const js = (await readFile('dist/mcp-harness.js', 'utf8')).replace(/<\/script/gi, '<\\/script');
const shell = '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biblioteca · host MCP local</title>'
  + '<style>body{font-family:system-ui,sans-serif;background:#f6f7f8;color:#17202c;margin:0;padding:20px}header{max-width:1000px;margin:auto}h1{font-size:24px}button{padding:9px 14px;border:1px solid #b9c1cb;border-radius:8px;background:white;cursor:pointer;margin:0 6px 6px 0}button:disabled{opacity:.5}#host-status{line-height:1.5;padding:12px;border:1px solid #dce1e6;border-radius:8px}#panel{max-width:1000px;margin:16px auto;border:1px solid #dce1e6;border-radius:14px;background:white;overflow:hidden}#panel[data-mode=fullscreen]{max-width:none}#panel[data-mode=pip]{max-width:560px}iframe{width:100%;height:760px;border:0;display:block}section.receipts{max-width:1000px;margin:auto}#receipts{padding:0;list-style:none}#receipts li{background:white;border:1px solid #dce1e6;border-radius:8px;padding:12px;margin:8px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:300px;overflow:auto}small{color:#586575}</style></head>'
  + '<body><header><h1>Biblioteca: host MCP local</h1><p>Solo emuladores. Este host valida el widget y registra sus solicitudes; no es ChatGPT ni envía mensajes a otras personas.</p><div><button id="open-panel" data-host-action>Abrir panel</button><button id="reopen-panel" data-host-action>Reabrir panel</button><button id="close-panel" data-host-action>Cerrar panel</button><button id="clear-receipts">Limpiar registros</button></div><p id="host-status" role="status">Preparando el host MCP…</p></header>'
  + '<div id="panel" hidden></div><section class="receipts"><h2>Solicitudes recibidas por el host</h2><small>La restauración usa estado del host de prueba. La activación y persistencia reales deben comprobarse en ChatGPT.</small><ol id="receipts" aria-live="polite"></ol></section><script>' + js + '</script></body></html>';
await writeFile('dist/mcp-harness.html', shell);
console.log('Host MCP de emuladores: dist/mcp-harness.html');
