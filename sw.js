/* Service worker: app shell precached; OCR data and runtime cached on first use. Translation models are cached by mt.js in Cache storage. */
const VERSION = "tv-v9";
const SHELL = ["./", "./index.html", "./app.js", "./mt.js", "./glossary.js", "./asr-worker.js", "./manifest.webmanifest",
  "./vendor/bergamot/translator-worker.js", "./vendor/bergamot/bergamot-translator-worker.js", "./vendor/bergamot/bergamot-translator-worker.wasm",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./tessdata/eng.traineddata.gz",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
  "https://cdn.jsdelivr.net/npm/pinyin-pro@3.26.0/dist/index.min.js", "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js"];
const RUNTIME_HOSTS = ["cdn.jsdelivr.net"];
self.addEventListener("install", e => { e.waitUntil((async () => { const c = await caches.open(VERSION); await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: "reload" })).catch(err => console.warn("precache miss", u)))); self.skipWaiting(); })()); });
self.addEventListener("activate", e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION && k !== "tv-models-v1" && !k.startsWith("transformers")) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url); if (e.request.method !== "GET") return;
  if (url.hostname.includes("huggingface.co") || url.hostname.includes("hf.co")) return;
  const same = url.origin === self.location.origin;
  if (same && url.pathname.includes("/models/")) return; // mt.js keeps its own cache of model parts
  if (!same && !RUNTIME_HOSTS.includes(url.hostname)) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION); const hit = await c.match(e.request, { ignoreSearch: same });
    if (hit) { if (same && /\.(html|js|webmanifest)$|\/$/.test(url.pathname)) e.waitUntil(fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); }).catch(() => {})); return hit; }
    try { const r = await fetch(e.request); if (r.ok && (r.type === "basic" || r.type === "cors")) c.put(e.request, r.clone()); return r; }
    catch (err) { if (e.request.mode === "navigate") return (await c.match("./index.html")) || Response.error(); throw err; }
  })());
});
