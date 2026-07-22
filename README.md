# コエワープ（KoeWarp）

音声を，指定したドライブ（主にGoogleドライブ）へ回収するシンプルなWebアプリ。

設定画面でデザインを選び，**共有URLを1つ発行するだけ**。共有された人はマイクを押して話すだけで，MP3が自動的にあなたのドライブへ保存されます（共有相手のログイン不要）。

## 特長
- **1画面完結の設定** — 記録先URLを貼る → 見た目を選ぶ → 共有URLを発行
- **10テーマ** — ポケモン歴代作品を彷彿とさせる配色（キャラクターは登場しません）
- **マイクボタン** — 形10種 × 色10種 × 大きさ10段階
- **録音エフェクト** — 波紋・波線・同心円・音量バーなど10種
- **MP3自動変換** — ブラウザ内でMP3化してドライブへ保存

## 仕組み
静的サイト（GitHub Pages）だけでは他人の音声を無認証でドライブへ保存できないため，
**Google Apps Script（GAS）の受け取り口**を経由します。

```
共有相手 ──録音──▶ コエワープ(GitHub Pages) ──MP3──▶ GAS(/exec) ──保存──▶ あなたのGoogleドライブ
```

## セットアップ（初回のみ）
1. `gas/Code.gs` の手順に従い，Apps Scriptをウェブアプリとしてデプロイ
2. 発行された `…/exec` のURLを，設定画面STEP1に貼り付け
3. STEP2で見た目を調整
4. STEP3「共有URLを発行」→ コピーされたURLを配布

## 構成
| ファイル | 役割 |
|---|---|
| `index.html` | 設定画面＋録音画面（`#r=` で切替） |
| `styles.css` | 10テーマ・マイク形状・エフェクト |
| `app.js` | 設定生成・共有URL・録音・MP3変換・送信 |
| `gas/Code.gs` | Googleドライブ受け取り口 |

## 技術メモ
- MP3変換：[@breezystack/lamejs](https://www.npmjs.com/package/@breezystack/lamejs)（CDNから動的import）
- 録音：`MediaRecorder` → `decodeAudioData` → PCM → lamejsでMP3化
- 共有設定：URLハッシュにBase64で埋め込み（サーバー不要）
- 送信：`text/plain` でPOSTしCORSプリフライトを回避（Apps Scriptの定石）

---
© コエワープ
