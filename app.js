/* ===== コエワープ app.js ===== */
'use strict';

/* ---------- 選択肢の定義 ---------- */
const THEMES = [
  {id:'rg', name:'レッド&グリーン', cols:['#e3350d','#3aa856','#ffcb05']},
  {id:'gs', name:'ゴールド&シルバー', cols:['#d4af37','#9aa4ad','#fffdf7']},
  {id:'rs', name:'ルビー&サファイア', cols:['#a5122a','#1f5fbf','#f2c14e']},
  {id:'dp', name:'ダイヤ&パール', cols:['#5b8dd9','#e79ac0','#eaf1fb']},
  {id:'bw', name:'ブラック&ホワイト', cols:['#1a1c22','#e7e9ee','#4a4f5a']},
  {id:'xy', name:'エックス&ワイ', cols:['#2f6fd0','#d6243c','#8fd0e6']},
  {id:'sm', name:'サン&ムーン', cols:['#f2841c','#7a4fb5','#ffd28a']},
  {id:'ss', name:'ソード&シールド', cols:['#00a5b5','#d61f8c','#8be3ec']},
  {id:'sv', name:'スカーレット&バイオレット', cols:['#e0453a','#7d4fc4','#f2b6a0']},
  {id:'legends', name:'レジェンズ', cols:['#7a8a44','#b08a2e','#d8c98a']},
];
const SHAPES = [
  {id:'circle',name:'まる'},{id:'round',name:'角丸'},{id:'squircle',name:'たまご'},
  {id:'pill',name:'ピル'},{id:'hexagon',name:'六角'},{id:'octagon',name:'八角'},
  {id:'diamond',name:'ひし形'},{id:'shield',name:'シールド'},
  {id:'burst',name:'バースト'},{id:'ring',name:'リング'},
];
const COLORS = ['#e3350d','#3b4cca','#f2841c','#00a5b5','#7d4fc4',
                '#3aa856','#d61f8c','#d4af37','#1a1c22','#e0453a'];
const SIZES = [90,105,120,135,150,168,186,205,228,255]; // px, 10段階
const EFFECTS = [
  {id:'ripple',name:'波紋',n:3},{id:'wave',name:'波線',n:1},{id:'pulse',name:'同心円',n:1},
  {id:'bars',name:'音量バー',n:7},{id:'glow',name:'グロー',n:1},{id:'rotate',name:'回転リング',n:1},
  {id:'sparkle',name:'スパークル',n:8},{id:'orbit',name:'周回ドット',n:1},
  {id:'concentric',name:'拡散円',n:3},{id:'aurora',name:'オーロラ',n:1},
];

/* ---------- 既定設定 ---------- */
const DEFAULT = {t:'rg', s:'circle', c:0, z:4, f:'ripple', u:'', ti:'コエワープ'};

/* ---------- ユーティリティ ---------- */
const $ = (id)=>document.getElementById(id);
function encodeCfg(c){ return btoa(unescape(encodeURIComponent(JSON.stringify(c)))).replace(/=+$/,''); }
function decodeCfg(s){ try{ return JSON.parse(decodeURIComponent(escape(atob(s)))); }catch(e){ return null; } }

/* ================================================================
   ルーティング：#r=... があれば録音画面，なければ設定画面
================================================================ */
function getHashCfg(){
  const m = location.hash.match(/[#&]r=([^&]+)/);
  return m ? decodeCfg(m[1]) : null;
}

window.addEventListener('DOMContentLoaded', ()=>{
  const rec = getHashCfg();
  if(rec){ initRecorder(rec); }
  else { initSettings(); }
});

/* ================================================================
   設定画面
================================================================ */
function initSettings(){
  const cfg = Object.assign({}, DEFAULT, loadLocal());

  // 記録先URL
  const driveUrl = $('driveUrl');
  driveUrl.value = cfg.u || '';
  updateDriveStatus();
  driveUrl.addEventListener('input', ()=>{ cfg.u = driveUrl.value.trim(); updateDriveStatus(); saveLocal(cfg); });

  function updateDriveStatus(){
    const v = driveUrl.value.trim();
    const dot = $('driveDot');
    const ok = /^https?:\/\//.test(v);
    dot.className = 'dot'+(ok?' ok':'');
    dot.title = ok ? '記録先を設定しました' : '未設定';
    const tl = $('testLink');
    if(ok){ tl.hidden=false; tl.href=v; } else { tl.hidden=true; }
  }

  $('setupToggle').addEventListener('click',(e)=>{ e.preventDefault();
    const g=$('setupGuide'); g.hidden=!g.hidden; });

  // ---- GAS設置ガイド：フォルダID自動埋め込み＋コードコピー ----
  const folderUrl=$('folderUrl');
  const folderStatus=$('folderStatus');
  let folderId='';
  folderUrl.addEventListener('input', ()=>{
    folderId=extractFolderId(folderUrl.value.trim());
    if(!folderUrl.value.trim()){ folderStatus.textContent='未入力'; folderStatus.className='sg-status'; }
    else if(folderId){ folderStatus.textContent='✔ フォルダIDを認識：'+folderId; folderStatus.className='sg-status ok'; }
    else { folderStatus.textContent='⚠ URLからフォルダIDを読み取れません'; folderStatus.className='sg-status ng'; }
  });
  $('copyGas').addEventListener('click', ()=>{
    const id=folderId || '';
    const code=GAS_TEMPLATE.replace('__FOLDER_ID__', id);
    doCopy(code);
    if(id){ $('copyGas').textContent='✅ コピーしました！Apps Scriptに貼り付けてください'; }
    else { $('copyGas').textContent='📋 コピーしました（フォルダID未設定→マイドライブ直下に保存されます）'; }
    setTimeout(()=>{ $('copyGas').textContent='📋 GASコードをコピー'; }, 4000);
  });

  // ---- プルダウン生成 ----
  buildSelects(cfg);

  applyPreview(cfg);

  // プレビューのマイクを押すとエフェクトを再生
  $('previewMic').addEventListener('click', ()=>{ runFxOnce($('fxLayer')); });

  // 共有URL発行
  $('publishBtn').addEventListener('click', ()=>publish(cfg));
  $('copyBtn').addEventListener('click', ()=>{
    const s=$('shareUrl'); s.select(); doCopy(s.value); $('shareMsg').textContent='コピーしました！';
  });

  // 各種セレクタ変更時に反映
  window.__cfg = cfg;
}

const COLOR_NAMES=['レッド','ブルー','オレンジ','ティール','パープル','グリーン','マゼンタ','ゴールド','ブラック','コーラル'];
const FX_GLYPH={ripple:'◎',wave:'〜',pulse:'⊙',bars:'▮',glow:'✺',rotate:'↻',sparkle:'✦',orbit:'◍',concentric:'◉',aurora:'≋'};

function opt(value,label,selected){
  const o=document.createElement('option');
  o.value=value; o.textContent=label; if(selected) o.selected=true; return o;
}
function buildSelects(cfg){
  const ts=$('themeSel'), ss=$('shapeSel'), cs=$('colorSel'), zs=$('sizeSel'), fs=$('fxSel');
  ts.innerHTML=''; ss.innerHTML=''; cs.innerHTML=''; zs.innerHTML=''; fs.innerHTML='';

  THEMES.forEach(t=> ts.appendChild(opt(t.id, '🎨 '+t.name, cfg.t===t.id)));
  SHAPES.forEach(s=> ss.appendChild(opt(s.id, '🎙 '+s.name, cfg.s===s.id)));
  COLORS.forEach((c,i)=> cs.appendChild(opt(i, '● '+COLOR_NAMES[i], cfg.c===i)));
  SIZES.forEach((z,i)=> zs.appendChild(opt(i, '大きさ '+(i+1), cfg.z===i)));
  EFFECTS.forEach(f=> fs.appendChild(opt(f.id, (FX_GLYPH[f.id]||'✨')+' '+f.name, cfg.f===f.id)));

  ts.onchange=()=>{ cfg.t=ts.value; applyPreview(cfg); saveLocal(cfg); };
  ss.onchange=()=>{ cfg.s=ss.value; applyPreview(cfg); saveLocal(cfg); };
  cs.onchange=()=>{ cfg.c=+cs.value; applyPreview(cfg); saveLocal(cfg); };
  zs.onchange=()=>{ cfg.z=+zs.value; applyPreview(cfg); saveLocal(cfg); };
  fs.onchange=()=>{ cfg.f=fs.value; applyPreview(cfg); saveLocal(cfg); runFxOnce($('fxLayer')); };
}

/* プレビュー反映 */
function applyPreview(cfg){
  const root=document.body;
  root.setAttribute('data-theme', cfg.t);
  const stage=$('preview');
  applyMicVisual(stage, cfg);
  buildFxLayer($('fxLayer'), cfg.f);
}
/* マイクの見た目（形・色・大きさ）を要素へ適用 */
function applyMicVisual(scope, cfg){
  const size=SIZES[cfg.z]||150;
  const color=COLORS[cfg.c]||COLORS[0];
  scope.style.setProperty('--micsize', size+'px');
  scope.style.setProperty('--mic', color);
  const mic=scope.querySelector('.mic-btn');
  if(mic){
    SHAPES.forEach(s=>mic.classList.remove('shape-'+s.id));
    mic.classList.add('shape-'+cfg.s);
  }
}
/* エフェクト要素をレイヤーに構築 */
function buildFxLayer(layer, fxId){
  const fx=EFFECTS.find(e=>e.id===fxId)||EFFECTS[0];
  layer.className='fx-layer fx-'+fx.id;
  layer.innerHTML='';
  const n = fx.id==='bars'? 9 : (fx.id==='sparkle'?8:fx.n);
  for(let i=0;i<n;i++){
    const el=document.createElement('div'); el.className='fx-el';
    if(fx.id==='sparkle'||fx.id==='bars'){
      // 散らす／並べる
      if(fx.id==='sparkle'){ el.style.left=(15+Math.random()*70)+'%'; el.style.top=(15+Math.random()*70)+'%'; el.style.animationDelay=(Math.random()).toFixed(2)+'s'; }
      if(fx.id==='bars'){ el.style.animationDelay=(i*0.08).toFixed(2)+'s'; }
    }
    layer.appendChild(el);
  }
  return layer;
}
/* エフェクトを一定時間だけ再生（プレビュー用） */
function runFxOnce(layer){
  layer.classList.add('fx-run');
  const mic=layer.parentElement.querySelector('.mic-btn');
  if(mic) mic.classList.add('recording');
  clearTimeout(layer.__t);
  layer.__t=setTimeout(()=>{ layer.classList.remove('fx-run'); if(mic) mic.classList.remove('recording'); }, 2600);
}

/* 共有URL発行 */
function publish(cfg){
  if(!cfg.u || !/^https?:\/\//.test(cfg.u)){
    $('shareMsg').textContent='⚠ 先にSTEP1で記録先URLを設定してください';
    $('driveCard').scrollIntoView({behavior:'smooth'});
    return;
  }
  const payload={t:cfg.t,s:cfg.s,c:cfg.c,z:cfg.z,f:cfg.f,u:cfg.u,ti:cfg.ti||'コエワープ'};
  const url=location.origin+location.pathname+'#r='+encodeCfg(payload);
  const out=$('shareOut'); out.hidden=false;
  $('shareUrl').value=url;
  doCopy(url);
  $('shareMsg').textContent='✅ 共有URLを発行し，クリップボードにコピーしました！';
}

function doCopy(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).catch(()=>{}); }
  else { const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); try{document.execCommand('copy');}catch(e){} t.remove(); }
}

/* localStorage 保存（作業中の設定を保持） */
function saveLocal(cfg){ try{ localStorage.setItem('koewarp_cfg', JSON.stringify(cfg)); }catch(e){} }
function loadLocal(){ try{ return JSON.parse(localStorage.getItem('koewarp_cfg'))||{}; }catch(e){ return {}; } }

/* ================================================================
   録音画面（共有リンク先）
================================================================ */
function initRecorder(cfg){
  $('settings').hidden=true;
  $('recorder').hidden=false;
  document.body.setAttribute('data-theme', cfg.t||'rg');
  $('recTitle').textContent = cfg.ti || 'コエワープ';

  const stage=document.querySelector('.rec-stage');
  applyMicVisual(stage, cfg);
  buildFxLayer($('recFxLayer'), cfg.f);

  const mic=$('recMic');
  const status=$('recStatus');
  const timerEl=$('recTimer');
  const fxLayer=$('recFxLayer');

  let state='idle'; // idle | recording | processing
  let mediaRecorder=null, chunks=[], stream=null;
  let audioCtx=null, analyser=null, rafId=null;
  let startTime=0, timerId=null;

  mic.addEventListener('click', async ()=>{
    if(state==='idle'){ await startRec(); }
    else if(state==='recording'){ stopRec(); }
  });

  async function startRec(){
    if(!cfg.u){ setStatus('記録先が未設定です','err'); return; }
    if(/\/dev(\?|$)/.test(cfg.u) || /\/edit(\?|$)/.test(cfg.u)){
      setStatus('⚠ 記録先URLが正しくありません（末尾が /exec のURLを使ってください）','err'); return;
    }
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(e){ setStatus('マイクの使用が許可されませんでした','err'); return; }

    chunks=[];
    const mime = pickMime();
    mediaRecorder = mime ? new MediaRecorder(stream,{mimeType:mime}) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); };
    mediaRecorder.onstop=onStop;
    mediaRecorder.start();

    state='recording';
    mic.classList.add('recording');
    fxLayer.classList.add('fx-run');
    setStatus('録音中… もう一度押すと停止','busy');
    startTimer();
  }

  function stopRec(){
    if(mediaRecorder && mediaRecorder.state!=='inactive'){ mediaRecorder.stop(); }
    state='processing';
    mic.classList.remove('recording');
    fxLayer.classList.remove('fx-run');
    stopTimer();
    setStatus('MP3に変換しています…','busy');
  }

  async function onStop(){
    try{
      if(stream){ stream.getTracks().forEach(t=>t.stop()); }
      const blob=new Blob(chunks,{type:chunks[0]?.type||'audio/webm'});
      const mp3=await encodeToMp3(blob, setStatus);
      setStatus('ドライブへ送信しています…','busy');
      const name=($('recName').value.trim()||'コエワープ_'+tstamp());
      await uploadMp3(cfg.u, mp3, name);
      setStatus('✅ 送信しました！ありがとうございました','done');
      timerEl.hidden=true;
      $('recName').value='';
    }catch(err){
      console.error(err);
      setStatus('⚠ 送信に失敗しました：'+(err.message||err),'err');
    }finally{
      state='idle';
    }
  }

  function startTimer(){
    startTime=Date.now(); timerEl.hidden=false; timerEl.textContent='00:00';
    timerId=setInterval(()=>{
      const s=Math.floor((Date.now()-startTime)/1000);
      timerEl.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
    },250);
  }
  function stopTimer(){ clearInterval(timerId); }
  function setStatus(t,cls){ status.textContent=t; status.className='rec-status'+(cls?' '+cls:''); }
}

function pickMime(){
  const cand=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
  for(const m of cand){ if(window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m; }
  return '';
}
function tstamp(){ const d=new Date(); const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

/* ---------- MP3エンコード（lamejs） ---------- */
let _lame=null;
async function loadLame(){
  if(_lame) return _lame;
  _lame=await import('https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm');
  return _lame;
}
async function encodeToMp3(blob, setStatus){
  const lame=await loadLame();
  const buf=await blob.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctx=new AC();
  const audio=await ctx.decodeAudioData(buf);
  const sampleRate=audio.sampleRate;
  // モノラルにダウンミックス
  const ch=audio.numberOfChannels;
  const L=audio.getChannelData(0);
  const R=ch>1?audio.getChannelData(1):null;
  const len=L.length;
  const mono=new Int16Array(len);
  for(let i=0;i<len;i++){
    let v=R?(L[i]+R[i])/2:L[i];
    v=Math.max(-1,Math.min(1,v));
    mono[i]=v<0?v*0x8000:v*0x7fff;
  }
  ctx.close();
  const enc=new lame.Mp3Encoder(1, sampleRate, 128);
  const block=1152; const out=[];
  for(let i=0;i<mono.length;i+=block){
    const slice=mono.subarray(i,i+block);
    const mp3buf=enc.encodeBuffer(slice);
    if(mp3buf.length>0) out.push(new Uint8Array(mp3buf));
    if(setStatus && i%(block*200)===0){ setStatus(`MP3に変換中… ${Math.round(i/mono.length*100)}%`,'busy'); }
  }
  const end=enc.flush();
  if(end.length>0) out.push(new Uint8Array(end));
  return new Blob(out,{type:'audio/mpeg'});
}

/* ---------- アップロード（Google Apps Script受け取り口へ） ----------
   Apps Scriptの /exec は応答時に googleusercontent.com へ302リダイレクトするため，
   通常のfetch(cors)ではレスポンスを読めず "Failed to fetch" になる。
   no-cors で送信すると，レスポンスは読めないが保存自体は確実に行われる。 */
async function uploadMp3(endpoint, mp3Blob, name){
  const b64=await blobToBase64(mp3Blob);
  const body=JSON.stringify({ filename: sanitize(name)+'.mp3', mimeType:'audio/mpeg', data:b64 });
  await fetch(endpoint,{
    method:'POST',
    mode:'no-cors',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body,
    redirect:'follow',
  });
  return { ok:true };
}
function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(',')[1]);
    r.onerror=reject;
    r.readAsDataURL(blob);
  });
}
function sanitize(n){ return n.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)||'コエワープ'; }

/* フォルダURL/IDからフォルダIDを取り出す */
function extractFolderId(v){
  if(!v) return '';
  let m=v.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);          // …/folders/ID
  if(m) return m[1];
  m=v.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);                   // …?id=ID
  if(m) return m[1];
  if(/^[a-zA-Z0-9_-]{20,}$/.test(v)) return v;                // ID直貼り
  return '';
}

/* Apps Scriptに貼り付けるコード（__FOLDER_ID__ は自動置換） */
const GAS_TEMPLATE = `/**
 * コエワープ 受け取り口（このコードをそのまま貼り付けてください）
 */
var FOLDER_ID = '__FOLDER_ID__';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var filename = (body.filename || 'コエワープ.mp3').toString();
    var mimeType = body.mimeType || 'audio/mpeg';
    var bytes = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(bytes, mimeType, filename);
    var folder = FOLDER_ID ? DriveApp.getFolderById(FOLDER_ID) : DriveApp.getRootFolder();
    var file = folder.createFile(blob);
    return json({ ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('コエワープ 受け取り口は正常に動いています。')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
