// Copia o app para a pasta www/ (usada pelo Capacitor). mobile.html vira o index.html.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..");
const out = path.join(src, "www");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "icons"), { recursive: true });

for (const f of [
  "styles.css",
  "mobile.css",
  "app.js",
  "extras.js",
  "assistant.js",
  "config.js",
  "cloud.js",
  "extras.css",
  "manifest.webmanifest",
]) {
  fs.copyFileSync(path.join(src, f), path.join(out, f));
}
for (const f of fs.readdirSync(path.join(src, "icons"))) {
  fs.copyFileSync(path.join(src, "icons", f), path.join(out, "icons", f));
}
fs.copyFileSync(path.join(src, "mobile.html"), path.join(out, "index.html"));
console.log("www/ pronta.");
