export function publicSitePage(pathname: string) {
  switch (pathname.replace(/\/$/, '')) {
    case '/chatgpt': return 'chatgpt';
    case '/chatgpt/conectar': return 'chatgpt-consent';
    case '/crear': return 'guest-create';
    case '/recibir': return 'guest-receive';
    case '/checkout':
    case '/planes': return 'billing';
    default: return null;
  }
}

const PLUGIN_PATH = /^\/plugins\/[a-z0-9][a-z0-9_-]{0,127}\/?$/i;
const APP_PATH = /^\/apps\/[a-z0-9][a-z0-9-]{0,79}\/(?:asdk_app|connector)_[0-9a-f]{32}\/?$/i;

export function getChatGptListingUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.origin !== 'https://chatgpt.com' || url.username || url.password || url.search || url.hash) {
      return undefined;
    }
    if (PLUGIN_PATH.test(url.pathname) || APP_PATH.test(url.pathname)) return url.href;
  } catch {
    return undefined;
  }
}
