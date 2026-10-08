import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { createPluginArchive, normalizeAppId, PLUGIN_FILES } from '../scripts/package-plugin.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../plugins/biblioteca');
const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe('paquete personal de Biblioteca', () => {
  it('incluye únicamente los componentes revisados, sin credenciales ni catálogo local', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'biblioteca-package-'));
    temporaryDirectories.push(fixture);
    for (const relativePath of PLUGIN_FILES) {
      await mkdir(path.dirname(path.join(fixture, relativePath)), { recursive: true });
      await writeFile(path.join(fixture, relativePath), await readFile(path.join(pluginRoot, relativePath)));
    }
    await writeFile(path.join(fixture, '.env'), 'SECRET=must-not-be-packaged');
    await writeFile(path.join(fixture, 'catalog.json'), JSON.stringify({ privateDraft: 'must-not-be-packaged' }));
    await writeFile(path.join(fixture, '.app.json'), JSON.stringify({ apps: { accidental: { id: 'must-not-be-packaged' } } }));
    const { archive } = await createPluginArchive(fixture);
    const entries = unzipSync(archive);
    expect(Object.keys(entries).sort()).toEqual([...PLUGIN_FILES].sort());
    expect(Object.values(entries).map(entry => strFromU8(entry)).join('\n')).not.toContain('must-not-be-packaged');
    expect(JSON.parse(strFromU8(entries['plugin.json'])).extensions['com.openai'].apps).toBeUndefined();
  });

  it('añade la conexión real solo a la copia empaquetada y conserva intacto el manifiesto fuente', async () => {
    const sourceBefore = await readFile(path.join(pluginRoot, 'plugin.json'), 'utf8');
    const id = 'plugin_asdk_app_6a4c0062f3b88191855c0a80eac5d53d';
    const { archive } = await createPluginArchive(pluginRoot, { appId: id });
    const entries = unzipSync(archive);
    expect(JSON.parse(strFromU8(entries['.app.json']))).toEqual({ apps: { biblioteca: { id: id.replace(/^plugin_/, '') } } });
    expect(JSON.parse(strFromU8(entries['plugin.json'])).extensions['com.openai'].apps).toBe('./.app.json');
    expect(await readFile(path.join(pluginRoot, 'plugin.json'), 'utf8')).toBe(sourceBefore);
  });

  it('rechaza URLs y valores que no correspondan a un identificador técnico de aplicación', () => {
    for (const value of ['', 'biblioteca', 'https://chatgpt.com/plugins/plugin_asdk_app_123', '../asdk_app_123', 'plugin_asdk_app_']) {
      expect(() => normalizeAppId(value)).toThrow();
    }
  });
});
