/**
 * コエワープ 受け取り口（Google Apps Script）
 * -------------------------------------------------
 * 共有リンクで録音されたMP3を，指定のGoogleドライブフォルダへ保存します。
 *
 * ■ 使い方（初回のみ）
 *   1. https://script.google.com/home で「新しいプロジェクト」を作成
 *   2. このファイルの中身を全部コピーして貼り付け
 *   3. 下の FOLDER_ID を，保存したいフォルダのIDに書き換える
 *        フォルダのURL: https://drive.google.com/drive/folders/XXXXXXXX
 *                                                        ↑この XXXXXXXX が FOLDER_ID
 *   4. 右上「デプロイ」→「新しいデプロイ」→歯車から「ウェブアプリ」を選択
 *        - 次のユーザーとして実行：自分
 *        - アクセスできるユーザー：全員
 *   5. 「デプロイ」を押し，表示された「ウェブアプリのURL（…/exec）」をコピー
 *   6. そのURLをコエワープの設定画面STEP1に貼り付ければ完了！
 */

// ★ ここに保存先フォルダのIDを入れてください ★
var FOLDER_ID = 'ここにフォルダIDを貼り付け';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var filename = (body.filename || 'コエワープ.mp3').toString();
    var mimeType = body.mimeType || 'audio/mpeg';
    var bytes = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(bytes, mimeType, filename);

    var folder = (FOLDER_ID && FOLDER_ID !== 'ここにフォルダIDを貼り付け')
      ? DriveApp.getFolderById(FOLDER_ID)
      : DriveApp.getRootFolder();

    var file = folder.createFile(blob);

    return json({ ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// 動作確認用（ブラウザで /exec を開くと表示）
function doGet() {
  return ContentService
    .createTextOutput('コエワープ 受け取り口は正常に動いています。')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
