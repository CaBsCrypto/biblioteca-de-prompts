/** Development-only MCP host. The server must expose this shell only with local emulators. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import type { WidgetState } from '../ui/bridge';

const URI = 'ui://biblioteca/library-v7.html';
const status = document.getElementById('host-status')!;
const panel = document.getElementById('panel')!;
const receipts = document.getElementById('receipts')!;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[data-host-action]')];
let client: Client | undefined;
let html: string | undefined;
let bridge: AppBridge | undefined;
let iframe: HTMLIFrameElement | undefined;
let transitioning = false;
const availableHeight = 640;
const safeAreaBottom = 96;
let lastReportedHeight = 0;

function checked(id: string) { return (document.getElementById(id) as HTMLInputElement).checked; }
function hostModes(): ('inline' | 'fullscreen')[] { return checked('inline-only') ? ['inline'] : ['inline', 'fullscreen']; }
function hostDimensions(mode: string = 'inline') {
  const width = Math.max(1, Math.round(panel.clientWidth));
  return mode === 'fullscreen' ? { height: availableHeight, width } : { maxHeight: availableHeight, width };
}

function refreshHostContext() {
  if (!bridge) return;
  const mode = panel.dataset.mode === 'fullscreen' && !checked('inline-only') ? 'fullscreen' : 'inline';
  panel.dataset.mode = mode;
  bridge.setHostContext({ displayMode: mode, availableDisplayModes: hostModes(), containerDimensions: hostDimensions(mode),
    safeAreaInsets: { top: 0, right: 0, bottom: safeAreaBottom, left: 0 }, theme: checked('dark-theme') ? 'dark' : 'light' });
  if (iframe) iframe.style.height = (mode === 'fullscreen' ? availableHeight : Math.min(availableHeight, Math.max(120, lastReportedHeight || 420))) + 'px';
}

type TestHostWindow = Window & {
  __bibliotecaHarnessState?: WidgetState | { modelContent: unknown; privateContent: WidgetState };
  __bibliotecaHarnessClose?: () => void;
  __bibliotecaHarnessCopyBlocked?: () => boolean;
  __bibliotecaHarnessCopyReceipt?: (data: { method: string; success: boolean; blocked?: boolean; text?: string; message?: string }) => void;
};
const testHost = window as TestHostWindow;

function savedWidgetState(): WidgetState | undefined {
  const snapshot = testHost.__bibliotecaHarnessState;
  if (!snapshot) return undefined;
  if ('privateContent' in snapshot) return snapshot.privateContent;
  return snapshot;
}

function receipt(kind: string, data: unknown) {
  const item = document.createElement('li');
  const heading = document.createElement('strong');
  heading.textContent = kind;
  const content = document.createElement('pre');
  content.textContent = JSON.stringify(data, null, 2);
  item.append(heading, content);
  receipts.append(item);
}

function setBusy(value: boolean) {
  transitioning = value;
  for (const button of buttons) button.disabled = value;
}

async function connectClient(): Promise<Client> {
  if (client) return client;
  const next = new Client({ name: 'biblioteca-emulator-test-host', version: '0.1.0' }, { capabilities: {} });
  await next.connect(new StreamableHTTPClientTransport(new URL('/api/mcp', location.href)));
  client = next;
  const tools = await next.listTools();
  receipt('MCP conectado', tools.tools.map(tool => tool.name));
  return next;
}

async function closePanel() {
  if (transitioning || !bridge) return;
  setBusy(true);
  const closing = bridge;
  bridge = undefined;
  try { await closing.teardownResource({}, { timeout: 1500 }); }
  catch { /* A host close must work even when the view has already gone away. */ }
  await closing.close();
  iframe?.remove(); iframe = undefined;
  panel.replaceChildren();
  panel.hidden = true;
  status.textContent = 'Panel cerrado. Reabrir conserva la selección y los filtros del host de prueba.';
  receipt('Panel cerrado', { selectedId: savedWidgetState()?.selectedId || '' });
  setBusy(false);
}

async function openPanel() {
  if (transitioning || bridge) return;
  setBusy(true);
  status.textContent = 'Conectando el servidor MCP del emulador…';
  try {
    const mcp = await connectClient();
    if (!html) {
      const resource = await mcp.readResource({ uri: URI });
      const shell = resource.contents.find(content => 'text' in content);
      if (!shell || !('text' in shell)) throw new Error('No se recibió el recurso UI de Biblioteca.');
      html = shell.text;
    }
    // ChatGPT replays the original entrypoint result after reopening or reloading a widget.
    // Keep it different from later UI selections so this host catches restoration regressions.
    const initialArguments = { kind: 'all' };
    const initialResult = CallToolResultSchema.parse(await mcp.callTool({ name: 'open_library', arguments: initialArguments }));
    if (initialResult.isError) throw new Error('open_library no pudo abrir el catálogo del emulador.');
    const frame = document.createElement('iframe');
    frame.title = 'Biblioteca MCP App';
    frame.id = 'biblioteca-app';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');
    frame.setAttribute('allow', 'clipboard-write');
    panel.hidden = false;
    panel.append(frame);
    iframe = frame;
    lastReportedHeight = 0;
    panel.dataset.mode = 'inline';
    const safeArea = document.createElement('div');
    safeArea.className = 'host-safearea';
    safeArea.textContent = 'Zona reservada al cuadro de escritura del host (96 px)';
    panel.append(safeArea);

    const hostBridge = new AppBridge(null, { name: 'Biblioteca Local Test Host', version: '0.1.0' }, {
      serverTools: {}, serverResources: {}, openLinks: {}, downloadFile: {}, logging: {},
      updateModelContext: { text: {} }, message: { text: {} },
    }, { hostContext: { theme: checked('dark-theme') ? 'dark' : 'light', locale: 'es', platform: 'web', displayMode: 'inline',
      availableDisplayModes: hostModes(), containerDimensions: hostDimensions(), safeAreaInsets: { top: 0, right: 0, bottom: safeAreaBottom, left: 0 } } });
    bridge = hostBridge;
    hostBridge.oncalltool = async params => {
      if (params.name === 'get_resource_content' && checked('delay-content')) {
        receipt('tools/call pendiente', { name: params.name, id: params.arguments?.id, delayMs: 2000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      const result = CallToolResultSchema.parse(await mcp.callTool(params));
      receipt('tools/call', { name: params.name, isError: Boolean(result.isError) });
      return result;
    };
    hostBridge.onlistresources = params => mcp.listResources(params);
    hostBridge.onreadresource = params => mcp.readResource(params);
    hostBridge.onmessage = async params => {
      if (checked('reject-message')) { receipt('ui/message rechazado', { reason: 'Fallo simulado del host' }); return { isError: true }; }
      receipt('ui/message', params); return {};
    };
    hostBridge.onupdatemodelcontext = async params => { receipt('ui/update-model-context', params); return {}; };
    hostBridge.onloggingmessage = params => receipt('ui/logging', params);
    hostBridge.onrequestteardown = () => { void closePanel(); };
    hostBridge.onrequestdisplaymode = async ({ mode }) => {
      if (!hostModes().includes(mode as 'inline' | 'fullscreen')) {
        receipt('ui/request-display-mode rechazado', { mode });
        return { mode: panel.dataset.mode === 'fullscreen' ? 'fullscreen' : 'inline' };
      }
      panel.dataset.mode = mode;
      refreshHostContext();
      receipt('ui/request-display-mode', { mode });
      return { mode };
    };
    hostBridge.onsizechange = ({ width, height }) => {
      if (!Number.isFinite(height) || height < 1 || !iframe) return;
      lastReportedHeight = Math.ceil(height);
      const applied = panel.dataset.mode === 'fullscreen' ? availableHeight : Math.min(availableHeight, Math.max(120, lastReportedHeight));
      if (iframe.style.height !== applied + 'px') {
        iframe.style.height = applied + 'px';
        receipt('ui/size-changed', { width, requestedHeight: lastReportedHeight, appliedHeight: applied, safeAreaBottom });
      }
    };
    hostBridge.onopenlink = async ({ url }) => {
      const target = new URL(url);
      if (target.protocol !== 'https:' || target.username || target.password) return { isError: true };
      // Receipt lets browser tests verify the reviewed destination without leaving the test host.
      receipt('ui/open-link', { url: target.href });
      return {};
    };
    hostBridge.ondownloadfile = async ({ contents }) => {
      const embedded = contents.find(content => content.type === 'resource' && 'text' in content.resource);
      if (!embedded || embedded.type !== 'resource' || !('text' in embedded.resource)) return { isError: true };
      const text = embedded.resource.text;
      if (text.length > 50_000) return { isError: true };
      const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'SKILL.md'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      receipt('ui/download-file', { filename: 'SKILL.md', text });
      return {};
    };
    hostBridge.oninitialized = () => {
      status.textContent = 'Panel conectado al MCP real del emulador. Los mensajes se registran aquí, sin enviarlos a ChatGPT.';
      void hostBridge.sendToolInput({ arguments: initialArguments })
        .then(() => hostBridge.sendToolResult(initialResult))
        .then(() => receipt('Panel inicializado', { kind: initialArguments.kind }))
        .catch(error => { status.textContent = 'Error al inicializar el panel: ' + String(error); });
    };
    await hostBridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
    // This shim belongs only to the test host. Production widget HTML remains unchanged.
    testHost.__bibliotecaHarnessClose = () => { void closePanel(); };
    testHost.__bibliotecaHarnessCopyBlocked = () => checked('block-copy');
    testHost.__bibliotecaHarnessCopyReceipt = data => receipt('Portapapeles del host de prueba', data);
    const shim = '<script>window.openai={get widgetState(){return window.parent.__bibliotecaHarnessState},setWidgetState(state){window.parent.__bibliotecaHarnessState=state},requestClose(){window.parent.__bibliotecaHarnessClose()}};'
      + 'const copyBlocked=()=>window.parent.__bibliotecaHarnessCopyBlocked?.()===true;const copyReceipt=data=>window.parent.__bibliotecaHarnessCopyReceipt?.(data);'
      + 'try{const originalCopy=document.execCommand.bind(document);Object.defineProperty(document,"execCommand",{configurable:true,writable:true,value:function(command,...args){'
      + 'if(command!=="copy")return originalCopy(command,...args);if(copyBlocked()){copyReceipt({method:"execCommand",blocked:true,success:false});return false}'
      + 'const active=document.activeElement;const text=active&&"value" in active?String(active.value):document.getSelection()?.toString()||"";'
      + 'const success=originalCopy(command,...args)===true;copyReceipt({method:"execCommand",success,...success?{text}:{}});return success}});'
      + 'if(navigator.clipboard?.writeText){const originalWrite=navigator.clipboard.writeText.bind(navigator.clipboard);Object.defineProperty(navigator.clipboard,"writeText",{configurable:true,writable:true,value:async text=>{'
      + 'if(copyBlocked()){copyReceipt({method:"writeText",blocked:true,success:false});throw new Error("Copia bloqueada por el host de prueba")}try{await originalWrite(text);copyReceipt({method:"writeText",success:true,text})}catch(error){copyReceipt({method:"writeText",success:false});throw error}}})}'
      + 'copyReceipt({method:"instrumentation",success:true})}catch(error){copyReceipt({method:"instrumentation",success:false,message:String(error)})};<\/script>';
    frame.srcdoc = html.replace(/<head\b[^>]*>/i, head => head + shim);
  } catch (error) {
    status.textContent = 'Error del host de prueba: ' + (error instanceof Error ? error.message : String(error));
    receipt('Host error', { message: status.textContent });
    iframe?.remove(); iframe = undefined;
    if (bridge) await bridge.close();
    bridge = undefined;
    panel.replaceChildren();
    panel.hidden = true;
  } finally { setBusy(false); }
}

document.getElementById('open-panel')!.addEventListener('click', () => { void openPanel(); });
document.getElementById('reopen-panel')!.addEventListener('click', () => { void openPanel(); });
document.getElementById('close-panel')!.addEventListener('click', () => { void closePanel(); });
document.getElementById('clear-receipts')!.addEventListener('click', () => { receipts.replaceChildren(); });
for (const id of ['inline-only', 'dark-theme']) document.getElementById(id)!.addEventListener('change', refreshHostContext);
document.getElementById('present-resource')!.addEventListener('click', () => {
  const id = (document.getElementById('host-resource-id') as HTMLInputElement).value.trim();
  if (!id || !bridge || !client) return;
  const activeBridge = bridge;
  const activeClient = client;
  void activeClient.callTool({ name: 'open_library', arguments: { id } }).then(async result => {
    const parsed = CallToolResultSchema.parse(result);
    if (parsed.isError) { receipt('Presentación rechazada', { id }); return; }
    await activeBridge.sendToolInput({ arguments: { id } });
    await activeBridge.sendToolResult(parsed);
    receipt('Ficha presentada por el host', { id });
  }).catch(error => receipt('Presentación fallida', { message: String(error) }));
});
window.addEventListener('resize', refreshHostContext);
void openPanel();
