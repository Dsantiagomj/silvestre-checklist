import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// Un build servido como en GitHub Pages: node tests/serve.js <carpeta> <puerto>. Cada archivo
// sale de la carpeta del build y, si no está ahí, de public/: los builds de debajo de la raíz
// (el Hielos en hielos/) no llevan public/ y usan las imágenes de la raíz. vite preview solo
// sirve la carpeta del build, sin public/ al lado. Una carpeta sirve su index.html
const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.resolve(ROOT, process.argv[2]);
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.argv[3]);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
};

const isFile = file => fs.existsSync(file) && fs.statSync(file).isFile();

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = [SITE, PUBLIC].map(dir => path.join(dir, path.normalize(rel))).find(isFile);
  if (!file) return res.writeHead(404).end();
  if (!file.startsWith(SITE + path.sep) && !file.startsWith(PUBLIC + path.sep)) return res.writeHead(403).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1");
