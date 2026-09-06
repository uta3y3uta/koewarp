/* index.html + styles.css + app.js を1枚のHTMLにまとめる */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const css = read('styles.css');
const js = read('app.js');

const html = read('index.html')
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="app.js"></script>', `<script>\n${js}\n</script>`);

if (html.includes('styles.css') || html.includes('src="app.js"')) {
  throw new Error('インライン化に失敗しました（index.html のタグが想定と違います）');
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
fs.writeFileSync(path.join(root, 'koewarp.html'), html);

console.log(`単独HTML生成: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
