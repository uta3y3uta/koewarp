# コエワープ（KoeWarp）

音声を，指定したドライブ（主にGoogleドライブ）へ回収するシンプルなWebアプリ。

設定画面でデザインを選び，**共有URLを1つ発行するだけ**。共有された人はマイクを押して話すだけで，MP3が自動的にあなたのドライブへ保存されます（共有相手のログイン不要）。

## 公開URL（中身は同じ・どちらでも動きます）
| URL | 用途 |
|---|---|
| https://koewarp.web.app/ | **推奨。** Googleのドメインなので，github.io がブロックされる自治体でも開けます |
| https://koewarp.firebaseapp.com/ | 上の予備（同じ配信元） |
| https://uta3y3uta.github.io/koewarp/ | 従来のGitHub Pages版 |

共有URLは「開いているページのドメイン」を引き継ぎます。配布したい環境に合わせたドメインで開いてから発行してください。

## 特長
- **1画面完結の設定** — 記録先URLを貼る → 見た目を選ぶ → 共有URLを発行
- **10テーマ** — ポケモン歴代作品を彷彿とさせる配色（キャラクターは登場しません）
- **マイクボタン** — 形10種 × 色10種 × 大きさ10段階
- **録音エフェクト** — 波紋・波線・同心円・音量バーなど10種
- **MP3自動変換** — ブラウザ内でMP3化してドライブへ保存
- **送信の取りこぼし防止** — 録音は送る前に端末へ保存。回線が混んでも自動で送り直し，届くまで消えない
- **録音後は ▶ か 💾** — 大きな▶で次の録音へ（端末にファイルは残さない）。小さな💾を押したときだけMP3を端末に保存

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

### 受け取り口を v2 に更新する（2026年10月〜）
v1 のままでも録音・送信・自動再送信は動きますが，v2 にすると**再送信しても二重保存されず**，アプリが**保存できたかを確認**できるようになります。

1. 設定画面の「?」→「GASコードをコピー」で最新コードをコピー
2. Apps Script のコードを全部貼り替えて 💾保存
3. 「デプロイ」→ **「デプロイを管理」** → 鉛筆アイコン → バージョン「新バージョン」→「デプロイ」

※「新しいデプロイ」を選ぶとURLが変わり，配布済みの共有URLが使えなくなります。

## 構成
| ファイル | 役割 |
|---|---|
| `index.html` | 設定画面＋録音画面（`#r=` で切替） |
| `styles.css` | 10テーマ・マイク形状・エフェクト |
| `app.js` | 設定生成・共有URL・録音・MP3変換・送信 |
| `gas/Code.gs` | Googleドライブ受け取り口 |
| `vendor/lamejs.iife.js` | MP3エンコーダ（同梱。外部CDNに依存しない） |
| `build.js` | 上のファイルを1枚にまとめる（`dist/index.html`・`koewarp.html`） |
| `koewarp.html` | CSS・JS全部入りの単独HTML（配布・別ホストへの設置用） |

## 更新のしかた
`index.html` / `styles.css` / `app.js` を編集したあと：

```bash
node build.js                      # 単独HTMLを再生成
firebase deploy --only hosting     # koewarp.web.app へ反映
git push                           # GitHub Pages へ反映
```

## 技術メモ
- MP3変換：[@breezystack/lamejs](https://www.npmjs.com/package/@breezystack/lamejs)（`vendor/lamejs.iife.js` に同梱。CDNを弾く学校ネットワークでも動くようにするため）
- 録音：`MediaRecorder` → `decodeAudioData` → PCM → lamejsでMP3化
- 共有設定：URLハッシュにBase64で埋め込み（サーバー不要）
- 送信：`text/plain` でPOSTしCORSプリフライトを回避（Apps Scriptの定石）
- 送信トレイ：録音ごとに固有ID（uid）を付けて IndexedDB に保存 → 送信 → JSONP（`/exec?check=uid`）で保存を確認できたら削除
  - その場で3回まで再試行（間隔に揺らぎを入れ，一斉に停止した班が同時に送らないようにする）
  - だめなら 10秒→20秒→40秒→60秒… の間隔でバックグラウンド再送信。ページを閉じても次回開いたときに送る
  - GAS v2 は uid で重複を判定（CacheService・6時間）。応答だけ途切れて「失敗」に見えたケースでも二重保存しない
- 録音・送信中は Screen Wake Lock で画面を消さない（スリープで通信が切れるのを防ぐ）

---
© コエワープ
