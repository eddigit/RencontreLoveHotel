import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function deploymentVersion() {
  return (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || process.env.NEXT_BUILD_ID || 'local').replace(/[^a-zA-Z0-9._-]/g, '-')
}

/** Caches anonymous immutable build assets only; member content is never cached. */
export async function GET() {
  const version = deploymentVersion()
  const source = `/* LHR service worker: ${version} */
const VERSION = ${JSON.stringify(version)};
const PUBLIC_ASSET_CACHE = 'lhr-public-assets-' + VERSION;
const OFFLINE_HTML = '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion indisponible</title><body style="background:#121318;color:#ecebe7;font:1rem system-ui;padding:8vw"><main><h1>Connexion indisponible</h1><p>Reconnectez-vous pour retrouver Joug Rencontre.</p></main></body></html>';
self.addEventListener('install', () => {});
self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter(key => key.startsWith('lhr-public-assets-') && key !== PUBLIC_ASSET_CACHE).map(key => caches.delete(key))); await self.clients.claim(); })()); });
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(fetch(request).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }))); return; }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/messages') || url.pathname.startsWith('/account') || url.pathname.startsWith('/members') || url.pathname.startsWith('/profile') || url.pathname.startsWith('/notifications') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/private-album')) return;
  if (request.method === 'GET' && url.pathname.startsWith('/_next/static/')) event.respondWith(caches.open(PUBLIC_ASSET_CACHE).then(async cache => { const cached = await cache.match(request); if (cached) return cached; const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; }));
});`
  return new NextResponse(source, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Service-Worker-Allowed': '/', 'X-Content-Type-Options': 'nosniff' } })
}
