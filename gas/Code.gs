/**
 * コエワ～プ 受け取り口（Google Apps Script）
 * -------------------------------------------------
 * 共有リンクで録音されたMP3を，指定のGoogleドライブフォルダへ保存します。
 * ・保存時は「当日の日付(yyyyMMdd)」フォルダを自動作成し，その中へ格納します。
 * ・発行者が共有URLをオフにすると，そのURLからの送信は保存されません。
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
 *   6. そのURLをコエワ～プの設定画面に貼り付ければ完了！
 */

// ★ ここに保存先フォルダのIDを入れてください ★
var FOLDER_ID = 'ここにフォルダIDを貼り付け';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // 共有URLのオン・オフ切り替え（発行者だけが操作）
    if (body.action === 'setEnabled') {
      var props = PropertiesService.getScriptProperties();
      var list = JSON.parse(props.getProperty('disabled') || '[]');
      var key = String(body.k || '');
      if (body.enabled) {
        list = list.filter(function (x) { return x !== key; });
      } else if (key && list.indexOf(key) < 0) {
        list.push(key);
      }
      props.setProperty('disabled', JSON.stringify(list));
      return json({ ok: true, disabled: !body.enabled });
    }

    // オフにされた共有URLからの送信は保存しない
    var k = String(body.k || '');
    if (k) {
      var dis = JSON.parse(PropertiesService.getScriptProperties().getProperty('disabled') || '[]');
      if (dis.indexOf(k) >= 0) {
        return json({ ok: false, skipped: true, reason: 'disabled' });
      }
    }

    var filename = (body.filename || 'コエワ～プ.mp3').toString();
    var mimeType = body.mimeType || 'audio/mpeg';
    var bytes = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(bytes, mimeType, filename);

    var parent = (FOLDER_ID && FOLDER_ID !== 'ここにフォルダIDを貼り付け')
      ? DriveApp.getFolderById(FOLDER_ID)
      : DriveApp.getRootFolder();

    // 当日の日付(yyyyMMdd)フォルダを自動作成して，その中へ保存
    var dayName = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
    var it = parent.getFoldersByName(dayName);
    var folder = it.hasNext() ? it.next() : parent.createFolder(dayName);

    var file = folder.createFile(blob);

    return json({ ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// 動作確認用（ブラウザで /exec を開くと表示）
function doGet() {
  return ContentService
    .createTextOutput('コエワ～プ 受け取り口は正常に動いています。')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
