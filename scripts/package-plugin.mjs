#!/usr/bin/env node

import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(projectRoot, 'plugins', 'biblioteca');
// Explicit payload: adding any new component requires reviewing this allowlist.
export const PLUGIN_FILES = ['plugin.json', 'mcp.json', 'skills/usar-biblioteca/SKILL.md'];

export function normalizeAppId(value) {
  if (typeof value !== 'string' || !/^(?:plugin_)?asdk_app_[a-zA-Z0-9]+$/.test(value)) {
    throw new Error('Usa el identificador real plugin_asdk_app_… de la conexión creada en ChatGPT.');
  }
  // ChatGPT URLs identify the plugin; .app.json maps its underlying MCP app.
  return value.replace(/^plugin_/, '');
}

export async function createPluginArchive(sourceRoot, { appId } = {}) {
  const sourceRealPath = await realpath(sourceRoot);
  const files = {};
  for (const relativePath of PLUGIN_FILES) {
    const absolutePath = path.join(sourceRoot, relativePath);
    const entry = await lstat(absolutePath);
    const entryRealPath = await realpath(absolutePath);
    if (!entry.isFile() || entry.isSymbolicLink() || !entryRealPath.startsWith(`${sourceRealPath}${path.sep}`)) {
      throw new Error(`El componente debe ser un archivo dentro del plugin: ${relativePath}`);
    }
    files[relativePath] = new Uint8Array(await readFile(absolutePath));
  }
  const manifest = JSON.parse(Buffer.from(files['plugin.json']).toString('utf8'));
  const mcp = JSON.parse(Buffer.from(files['mcp.json']).toString('utf8'));
  if (manifest.name !== 'biblioteca' || manifest.version !== '0.1.0' || manifest.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
    throw new Error('El manifiesto de Biblioteca debe usar el formato portable y versión 0.1.0.');
  }
  const server = mcp.mcpServers?.biblioteca;
  if (mcp.$schema !== 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json' || server?.type !== 'streamable-http' || server.url !== 'https://biblioteca.browns.studio/api/mcp' || Object.keys(server).some(key => !['type', 'url'].includes(key))) {
    throw new Error('La configuración MCP debe contener únicamente el endpoint público de producción.');
  }
  if (appId) {
    manifest.extensions['com.openai'].apps = './.app.json';
    files['.app.json'] = strToU8(`${JSON.stringify({ apps: { biblioteca: { id: normalizeAppId(appId) } } }, null, 2)}\n`);
  } else {
    delete manifest.extensions['com.openai'].apps;
  }
  files['plugin.json'] = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
  return { archive: zipSync(files, { level: 6 }), entries: Object.keys(files), version: manifest.version };
}

async function main() {
  const args = process.argv.slice(2);
  let appId;
  let portable = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--app-id' && args[i + 1]) appId = normalizeAppId(args[++i]);
    else if (args[i] === '--portable') portable = true;
    else throw new Error('Uso: npm run package:plugin -- --app-id plugin_asdk_app_… | --portable');
  }
  if ((!appId && !portable) || (appId && portable)) {
    throw new Error('Indica --app-id con la conexión real, o --portable para generar el paquete sin una conexión personal.');
  }
  const { archive, entries, version } = await createPluginArchive(pluginRoot, { appId });
  const outputDir = path.join(projectRoot, 'build', 'plugin');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `biblioteca-${version}-${appId ? 'personal' : 'portable'}.zip`);
  await writeFile(outputPath, archive);
  console.log(`Paquete: ${outputPath}`);
  console.log(`Archivos permitidos: ${entries.join(', ')}`);
  console.log(appId ? 'Incluye la conexión MCP registrada; instalar y probar en ChatGPT.' : 'Paquete portable; falta vincular la conexión personal antes de activar en ChatGPT.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
