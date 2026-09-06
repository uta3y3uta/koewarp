/* index.html + styles.css + app.js を1枚のHTMLにまとめる */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const css = read('styles.css');
const js = read('app.js');
const lame = read('vendor/lamejs.iife.js');

// 置換テキストは必ず関数で渡す。文字列で渡すと中の $& や $` が特殊記号として展開され，
// lamejs のような minify 済みコードが静かに壊れる。
const inline = (html, tag, code) => {
  if (!html.includes(tag)) throw new Error(`index.html に ${tag} が見つかりません`);
  return html.replace(tag, () => code);
};

let html = read('index.html');
html = inline(html, '<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`);
html = inline(html, '<script src="vendor/lamejs.iife.js"></script>', `<script>\n${lame}\n</script>`);
html = inline(html, '<script src="app.js"></script>', `<script>\n${js}\n</script>`);

if (/<link[^>]+styles\.css|<script src="/.test(html)) {
  throw new Error('インライン化に失敗しました（index.html のタグが想定と違います）');
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
fs.writeFileSync(path.join(root, 'koewarp.html'), html);

console.log(`単独HTML生成: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
