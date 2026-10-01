import { appendFileSync } from 'node:fs';

// Read the deployment registered by Vercel on GitHub for this exact PR commit.
// CI only needs its existing read-only GitHub token; no Vercel credential is needed.
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.PREVIEW_SHA;
const project = process.env.PREVIEW_PROJECT || 'biblioteca-de-prompts';
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !sha || !/^[a-f0-9]{40}$/i.test(sha)) {
  throw new Error('Configura GITHUB_REPOSITORY y PREVIEW_SHA con el commit de la PR.');
}

async function github(path) {
  const response = await fetch('https://api.github.com/repos/' + repository + path, {
    headers: {
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Biblioteca-Preview-QA',
      ...(process.env.GH_TOKEN ? { Authorization: 'Bearer ' + process.env.GH_TOKEN } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('No se pudo consultar el deployment en GitHub (HTTP ' + response.status + ').');
  return response.json();
}

const deadline = Date.now() + 240000;
let preview;
while (Date.now() < deadline && !preview) {
  const deployments = await github('/deployments?sha=' + sha + '&per_page=30');
  const deployment = deployments.find(item => item.sha === sha && item.environment === 'Preview – ' + project);
  if (deployment) {
    const statuses = await github('/deployments/' + deployment.id + '/statuses');
    const latest = statuses[0];
    if (latest?.state === 'failure' || latest?.state === 'error') throw new Error('Vercel rechazó el deployment de este commit.');
    if (latest?.state === 'success' && latest.environment_url) {
      const url = new URL(latest.environment_url);
      if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.vercel\.app$/i.test(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('El deployment no devolvió un origen Vercel válido.');
      }
      preview = url.origin;
    }
  }
  if (!preview) await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!preview) throw new Error('Vercel Preview no estuvo listo en cuatro minutos para este commit.');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'url=' + preview + '\n');
console.log('Preview del commit ' + sha.slice(0, 7) + ': ' + preview);
