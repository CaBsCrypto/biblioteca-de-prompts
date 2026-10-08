import { createApp } from "../dist/server.mjs";
let appPromise = null;

export default async function handler(req, res) {
  appPromise ||= createApp({ enableVite: false, serveStatic: false });
  const app = await appPromise;
  return app(req, res);
}
