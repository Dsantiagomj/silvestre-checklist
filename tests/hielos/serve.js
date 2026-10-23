import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// El sitio del Hielos como en GitHub Pages: la app en /hielos/ (su build, en .hielos-test/)
// y, en la raíz, public/ con las imágenes que comparte con el Silvestre. vite preview solo
// sirve la carpeta del build, sin public/ al lado
const ROOT = path.resolve(import.meta.dirname, "../..");
const SITE = path.join(ROOT, ".hielos-test");
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.argv[2]) || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(rel.startsWith("/hielos/") ? SITE : PUBLIC, path.normalize(rel));
  if (!file.startsWith(SITE) && !file.startsWith(PUBLIC)) return res.writeHead(403).end();
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1");
