/**
 * コエワ～プ 受け取り口 v2（Google Apps Script）
 * -------------------------------------------------
 * 共有リンクで録音されたMP3を，指定のGoogleドライブフォルダへ保存します。
 * ・保存時は「当日の日付(yyyyMMdd)」フォルダを自動作成し，その中へ格納します。
 * ・発行者が共有URLをオフにすると，そのURLからの送信は保存されません。
 * ・同じ録音が再送信されても二重に保存しません（v2）。
 * ・アプリからの「保存できた？」の確認に応えます（v2）。
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
 *
 * ■ v1 から更新するとき（URLを変えずに差し替える）
 *   コードを貼り替えて保存 →「デプロイ」→「デプロイを管理」→ 鉛筆アイコン
 *   → バージョン「新バージョン」→「デプロイ」
 *   ※「新しいデプロイ」を選ぶとURLが変わり，配布済みの共有URLが使えなくなります。
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

    var cache = CacheService.getScriptCache();
    var uid = /^[\w-]{8,64}$/.test(body.uid || '') ? 'u_' + body.uid : '';

    // オフにされた共有URLからの送信は保存しない
    var k = String(body.k || '');
    if (k) {
      var dis = JSON.parse(PropertiesService.getScriptProperties().getProperty('disabled') || '[]');
      if (dis.indexOf(k) >= 0) {
        if (uid) cache.put(uid, 'skipped', 21600);
        return json({ ok: false, skipped: true, reason: 'disabled' });
      }
    }

    // 重複チェックと日付フォルダの用意だけを短いロックの中で行う（保存そのものは並行して進む）
    var lock = LockService.getScriptLock();
    var locked = lock.tryLock(20000);
    var folder;
    try {
      if (uid) {
        if (cache.get(uid)) return json({ ok: true, duplicate: true });   // 保存済み／保存中の再送信
        cache.put(uid, 'pending', 600);
      }
      folder = dayFolder();
    } finally {
      if (locked) lock.releaseLock();
    }

    try {
      var filename = (body.filename || 'コエワ～プ.mp3').toString();
      var blob = Utilities.newBlob(Utilities.base64Decode(body.data), body.mimeType || 'audio/mpeg', filename);
      var file = folder.createFile(blob);
      if (uid) cache.put(uid, 'saved', 21600);
      return json({ ok: true, id: file.getId(), name: file.getName() });
    } catch (err) {
      if (uid) cache.remove(uid);   // 保存に失敗したら，再送信を受け付ける
      throw err;
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// 記録先フォルダ内の「当日の日付(yyyyMMdd)」フォルダ（なければ作成）
function dayFolder() {
  var parent = (FOLDER_ID && FOLDER_ID !== 'ここにフォルダIDを貼り付け')
    ? DriveApp.getFolderById(FOLDER_ID)
    : DriveApp.getRootFolder();
  var name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// 動作確認（ブラウザで /exec を開くと表示）と，アプリからの保存確認
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.check && /^[A-Za-z_$][\w$]{0,40}$/.test(p.callback || '')) {
    var v = /^[\w-]{8,64}$/.test(p.check) ? CacheService.getScriptCache().get('u_' + p.check) : null;
    return ContentService.createTextOutput(p.callback + '(' + JSON.stringify({ v: 2, state: v || 'none' }) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput('コエワ～プ 受け取り口は正常に動いています。')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
