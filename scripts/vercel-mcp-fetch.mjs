import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);

/** Developer-only smoke transport: uses the existing Vercel CLI login, without exporting its credentials. */
export function createVercelMcpFetch(endpoint) {
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.vercel.app') || endpoint.pathname !== '/api/mcp') {
    throw new Error('La comprobación autenticada solo admite el endpoint MCP de un Preview Vercel.');
  }
  if (process.platform === 'win32' && !process.env.VERCEL_CLI_ENTRY) {
    throw new Error('Configura VERCEL_CLI_ENTRY con el archivo JS de tu instalación oficial de Vercel CLI.');
  }
  return async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== endpoint.origin || url.pathname !== endpoint.pathname || url.search) throw new Error('El smoke no permite cambiar de destino.');
    const directory = await mkdtemp(path.join(tmpdir(), 'biblioteca-mcp-smoke-'));
    try {
      const args = [...(process.env.VERCEL_CLI_ENTRY ? [process.env.VERCEL_CLI_ENTRY] : []),
        'curl', endpoint.pathname, '--deployment', endpoint.origin];
      if (process.env.VERCEL_SCOPE) args.push('--scope', process.env.VERCEL_SCOPE);
      args.push('--', '--silent', '--request', options.method || 'GET', '--write-out', '\n__biblioteca_status__:%{http_code}');
      for (const [name, value] of new Headers(options.headers)) args.push('--header', name + ': ' + value);
      if (options.body) {
        if (typeof options.body !== 'string') throw new Error('El smoke MCP solo admite cuerpos JSON de texto.');
        const bodyFile = path.join(directory, 'request.json');
        await writeFile(bodyFile, options.body);
        args.push('--data-binary', '@' + bodyFile);
      }
      const { stdout } = await execute(process.env.VERCEL_CLI_ENTRY ? process.execPath : 'vercel', args,
        { timeout: 30_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
      const marker = stdout.lastIndexOf('\n__biblioteca_status__:');
      if (marker < 0) throw new Error('Vercel CLI no devolvió una respuesta HTTP verificable.');
      const status = Number(stdout.slice(marker).split(':')[1].trim());
      return new Response(status === 204 ? null : stdout.slice(0, marker),
        { status, headers: { 'Content-Type': 'application/json' } });
    } finally {
      const absoluteDirectory = path.resolve(directory);
      if (path.dirname(absoluteDirectory) !== path.resolve(tmpdir()) || !path.basename(absoluteDirectory).startsWith('biblioteca-mcp-smoke-')) {
        throw new Error('El directorio temporal no corresponde a este smoke.');
      }
      await rm(absoluteDirectory, { recursive: true, force: true });
    }
  };
}
