#!/usr/bin/env node

import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(projectRoot, 'plugins', 'biblioteca');
// Explicit payloads: adding a component requires reviewing its allowlist.
export const PLUGIN_FILES = ['plugin.json', 'mcp.json', 'skills/usar-biblioteca/SKILL.md'];
const submissionIcon = 'assets/biblioteca.png';
const submissionAssets = [submissionIcon, 'assets/LICENSE-lucide.txt'];
const listingUrls = ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL'];
const requiredSubmissionFields = [...listingUrls, 'demoRecordingURL', 'countries', 'developerName'];

export function normalizeAppId(value) {
  if (typeof value !== 'string' || !/^(?:plugin_)?asdk_app_[a-zA-Z0-9]+$/.test(value)) {
    throw new Error('Usa el identificador real plugin_asdk_app_… de la conexión creada en ChatGPT.');
  }
  // ChatGPT URLs identify the plugin; .app.json maps its underlying MCP app.
  return value.replace(/^plugin_/, '');
}

async function readPackageFile(sourceRoot, relativePath) {
  const absolutePath = path.join(sourceRoot, relativePath);
  const entry = await lstat(absolutePath);
  const entryRealPath = await realpath(absolutePath);
  if (!entry.isFile() || entry.isSymbolicLink() || !entryRealPath.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(`El componente debe ser un archivo dentro del plugin: ${relativePath}`);
  }
  return readFile(absolutePath);
}

function validateSubmissionConfig(config) {
  if (config === undefined) return;
  if (config === null || typeof config !== 'object' || Array.isArray(config)
    || Object.keys(config).some(field => !requiredSubmissionFields.includes(field))) {
    throw new Error(`La configuración de envío admite estos campos: ${requiredSubmissionFields.join(', ')}.`);
  }
  for (const field of [...listingUrls, 'demoRecordingURL']) {
    const value = config[field];
    const url = typeof value === 'string' && value.length <= 1024 && value === value.trim() ? URL.parse(value) : null;
    if (!url || url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')
      || /(?:^|\.)(?:localhost|test|invalid|example|local)$/.test(url.hostname)
      || /(?:^|\.)example\.(?:com|net|org)$/.test(url.hostname)) {
      throw new Error(`${field} requiere una URL pública HTTPS verificada, sin credenciales ni dominios de ejemplo.`);
    }
  }
  const { countries, developerName } = config;
  if (!Array.isArray(countries) || countries.some(code => typeof code !== 'string' || !/^[A-Z]{2}$/.test(code))
    || new Set(countries).size !== countries.length) {
    throw new Error('countries requiere códigos de país únicos en mayúsculas o [] para publicar en todos los disponibles.');
  }
  if (typeof developerName !== 'string' || !developerName.trim() || developerName.length > 80 || /[\r\n]/.test(developerName)) {
    throw new Error('developerName requiere el nombre de la identidad que se seleccionará en el portal, con hasta 80 caracteres.');
  }
}

function validateSubmissionIcon(icon) {
  if (icon.length < 33 || icon.length > 5 * 1024 * 1024 || icon.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || icon.subarray(12, 16).toString('ascii') !== 'IHDR' || icon.readUInt32BE(16) !== icon.readUInt32BE(20)
    || icon.readUInt32BE(16) < 256) {
    throw new Error('El icono de envío debe ser un PNG cuadrado de al menos 256 px por lado y hasta 5 MiB.');
  }
}

async function applySubmission(sourceRoot, manifest, files, config) {
  validateSubmissionConfig(config);
  const overlay = JSON.parse(await readPackageFile(sourceRoot, 'submission.json'));
  for (const path of submissionAssets) files[path] = await readPackageFile(sourceRoot, path);
  validateSubmissionIcon(files[submissionIcon]);
  const extension = manifest.extensions['com.openai'];
  if (extension.hooks != null || manifest.hooks != null) throw new Error('El directorio no admite hooks en el ZIP de envío.');
  delete manifest.apps;
  delete extension.apps;
  extension.interface = { ...extension.interface, ...overlay.interface };
  extension.review = overlay.review;
  extension.publication = overlay.publication;
  if (config) {
    for (const field of listingUrls) extension.interface[field] = config[field];
    extension.interface.developerName = config.developerName;
    manifest.author.name = config.developerName;
    extension.review.demo_recording_url = config.demoRecordingURL;
    extension.publication.countries = config.countries;
  }
}

/** @param {string} sourceRoot
 *  @param {{appId?: string, submission?: boolean, submissionConfig?: unknown}} [options]
 */
export async function createPluginArchive(sourceRoot, { appId, submission = false, submissionConfig } = {}) {
  if ((appId && submission) || (!submission && submissionConfig !== undefined)) {
    throw new Error('La copia para el directorio no admite conexiones personales.');
  }
  const sourceRealPath = await realpath(sourceRoot);
  const files = {};
  for (const relativePath of PLUGIN_FILES) files[relativePath] = await readPackageFile(sourceRealPath, relativePath);
  const manifest = JSON.parse(Buffer.from(files['plugin.json']).toString('utf8'));
  const mcp = JSON.parse(Buffer.from(files['mcp.json']).toString('utf8'));
  if (manifest.name !== 'biblioteca' || manifest.version !== '0.1.0' || manifest.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
    throw new Error('El manifiesto de Biblioteca debe usar el formato portable y versión 0.1.0.');
  }
  const server = mcp.mcpServers?.biblioteca;
  if (mcp.$schema !== 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json' || server?.type !== 'streamable-http' || server.url !== 'https://biblioteca.browns.studio/api/mcp' || Object.keys(server).some(key => !['type', 'url'].includes(key))) {
    throw new Error('La configuración MCP debe contener únicamente el endpoint público de producción.');
  }
  if (submission) {
    await applySubmission(sourceRealPath, manifest, files, submissionConfig);
  } else if (appId) {
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
  let submission = false;
  let configPath;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--app-id' && args[i + 1]) appId = normalizeAppId(args[++i]);
    else if (args[i] === '--portable') portable = true;
    else if (args[i] === '--submission') submission = true;
    else if (args[i] === '--config' && args[i + 1] && !args[i + 1].startsWith('--')) configPath = args[++i];
    else throw new Error('Uso: npm run package:plugin -- --app-id plugin_asdk_app_… | --portable | --submission [--config ruta.json]');
  }
  if ([Boolean(appId), portable, submission].filter(Boolean).length !== 1 || (configPath && !submission)) {
    throw new Error('Elige --app-id, --portable o --submission. --config solo se admite con --submission.');
  }
  const submissionConfig = configPath ? JSON.parse(await readFile(configPath, 'utf8')) : undefined;
  const { archive, entries, version } = await createPluginArchive(pluginRoot, { appId, submission, submissionConfig });
  const outputDir = path.join(projectRoot, 'build', 'plugin');
  await mkdir(outputDir, { recursive: true });
  const variant = submission ? configPath ? 'submission' : 'submission-draft' : appId ? 'personal' : 'portable';
  const outputPath = path.join(outputDir, `biblioteca-${version}-${variant}.zip`);
  await writeFile(outputPath, archive);
  console.log(`Paquete: ${outputPath}`);
  console.log(`Archivos permitidos: ${entries.join(', ')}`);
  if (submission) {
    console.log(configPath
      ? 'Copia para el directorio. Verifica el contenido de las URLs y los requisitos del portal antes de enviar.'
      : 'Borrador para el directorio. Faltan las URLs de soporte, privacidad y términos, el video, la confirmación de países y la identidad de publicación.');
  } else {
    console.log(appId ? 'Incluye la conexión MCP registrada; instalar y probar en ChatGPT.' : 'Paquete portable; falta vincular la conexión personal antes de activar en ChatGPT.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
