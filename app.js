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
const DEFAULT = {t:'gs', s:'circle', c:7, z:4, f:'pulse', u:'', ti:'コエワープ'};

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

  // ---- ビジュアルピッカー生成 ----
  buildPickers(cfg);

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

/* ---- ビジュアルピッカー：普段は畳まれ，タップで展開して見た目から選ぶ ---- */
const PICKERS=[
  {kind:'theme', ic:'🎨'},
  {kind:'shape', ic:'🎙️'},
  {kind:'color', ic:'🌈'},
  {kind:'size',  ic:'📏'},
  {kind:'fx',    ic:'✨'},
];
function pkItems(kind){
  if(kind==='theme') return THEMES.map(t=>({v:t.id,label:t.name}));
  if(kind==='shape') return SHAPES.map(s=>({v:s.id,label:s.name}));
  if(kind==='color') return COLORS.map((c,i)=>({v:i,label:COLOR_NAMES[i]}));
  if(kind==='size')  return SIZES.map((z,i)=>({v:i,label:'大きさ'+(i+1)}));
  return EFFECTS.map(f=>({v:f.id,label:f.name}));
}
function pkGet(kind,cfg){
  return kind==='theme'?cfg.t:kind==='shape'?cfg.s:kind==='color'?cfg.c:kind==='size'?cfg.z:cfg.f;
}
function pkSet(kind,cfg,v){
  if(kind==='theme')cfg.t=v; else if(kind==='shape')cfg.s=v;
  else if(kind==='color')cfg.c=+v; else if(kind==='size')cfg.z=+v; else cfg.f=v;
}
function pkSwatch(kind,v){
  const el=document.createElement('span');
  if(kind==='theme'){
    el.className='sw-theme';
    const t=THEMES.find(x=>x.id===v)||THEMES[0];
    t.cols.forEach(c=>{ const i=document.createElement('i'); i.style.background=c; el.appendChild(i); });
  } else if(kind==='shape'){
    el.className='sw-shape shaped shape-'+v;
  } else if(kind==='color'){
    el.className='sw-color'; el.style.background=COLORS[+v]||COLORS[0];
  } else if(kind==='size'){
    el.className='sw-size'; const d=8+(+v)*2; el.style.width=d+'px'; el.style.height=d+'px';
  } else {
    el.className='sw-fx'; el.textContent=FX_GLYPH[v]||'✨';
  }
  return el;
}
function closeAllPickers(except){
  document.querySelectorAll('.picker.open').forEach(el=>{
    if(el===except) return;
    el.classList.remove('open');
    const g=el.querySelector('.picker-grid'); if(g) g.hidden=true;
  });
}
function makePicker(p, cfg){
  const kind=p.kind;
  const wrap=document.createElement('div'); wrap.className='picker'; wrap.dataset.kind=kind;
  const head=document.createElement('button'); head.type='button'; head.className='picker-head';
  const grid=document.createElement('div'); grid.className='picker-grid'; grid.hidden=true;

  function renderHead(){
    const v=pkGet(kind,cfg);
    head.innerHTML='';
    const ic=document.createElement('span'); ic.className='ph-ic'; ic.textContent=p.ic;
    const val=document.createElement('span'); val.className='ph-val';
    const mini=document.createElement('span'); mini.className='ph-mini'; mini.appendChild(pkSwatch(kind,v));
    val.appendChild(mini);
    const car=document.createElement('span'); car.className='ph-caret'; car.textContent='▾';
    head.append(ic,val,car);
  }
  function renderGrid(){
    grid.innerHTML='';
    const cur=pkGet(kind,cfg);
    pkItems(kind).forEach(it=>{
      const b=document.createElement('button'); b.type='button'; b.className='swatch'; b.title=it.label;
      if(String(it.v)===String(cur)) b.classList.add('on');
      b.appendChild(pkSwatch(kind,it.v));
      b.addEventListener('click',(e)=>{
        e.stopPropagation();
        pkSet(kind,cfg,it.v);
        grid.querySelectorAll('.swatch.on').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        renderHead();
        applyPreview(cfg); saveLocal(cfg);
        runFxOnce($('fxLayer'));   // 選ぶたびに変化をプレビュー再生
      });
      grid.appendChild(b);
    });
  }
  head.addEventListener('click',(e)=>{
    e.stopPropagation();
    const willOpen=!wrap.classList.contains('open');
    closeAllPickers();
    if(willOpen){ wrap.classList.add('open'); grid.hidden=false; }
  });

  renderHead(); renderGrid();
  wrap.append(head,grid);
  return wrap;
}
function buildPickers(cfg){
  const host=$('pickers'); host.innerHTML='';
  PICKERS.forEach(p=> host.appendChild(makePicker(p,cfg)));
  document.addEventListener('click',(e)=>{
    if(!e.target.closest('.picker')) closeAllPickers();
  });
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

  // ---- 音声向け設定（授業のグループ/ペア対話→Gemini/NotebookLM用）----
  const TARGET_SR=16000;    // 16kHz：音声認識に最適・軽量
  const KBPS=32;            // 声ならこれで十分クリア・さらに軽量
  const SEGMENT_SEC=90*60;  // 90分ごとに自動分割（1ファイル約21MB）

  let state='idle';         // idle | recording | processing
  let stream=null, audioCtx=null, srcNode=null, capNode=null;
  let lame=null, enc=null, mp3Parts=[], sampleRate=TARGET_SR;
  let segSamples=0, totalSamples=0, partNo=0, baseName='';
  let uploads=[];
  let startTime=0, timerId=null;

  mic.addEventListener('click', async ()=>{
    if(state==='idle'){ await startRec(); }
    else if(state==='recording'){ await stopRec(); }
  });

  // データ名のあとに自動タイムスタンプ：例）山田太郎_感想audio20260723_154210
  function nameNow(){
    const base = $('recName').value.trim() || 'コエワープ';
    return sanitize(base) + 'audio' + tstamp();
  }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function newEncoder(){ enc=new lame.Mp3Encoder(1, sampleRate, KBPS); mp3Parts=[]; segSamples=0; }
  function floatToInt16(f){
    const n=f.length, out=new Int16Array(n);
    for(let i=0;i<n;i++){ let v=f[i]; v=v<-1?-1:(v>1?1:v); out[i]=v<0?v*0x8000:v*0x7fff; }
    return out;
  }
  // 逐次エンコード：PCMブロックが届くたびにMP3化して溜める（生データは保持しない）
  function pushPcm(f){
    if(state!=='recording'||!enc) return;
    const buf=enc.encodeBuffer(floatToInt16(f));
    if(buf.length>0) mp3Parts.push(new Uint8Array(buf));
    segSamples+=f.length; totalSamples+=f.length;
    if(segSamples >= SEGMENT_SEC*sampleRate){ flushSegment(false); }
  }
  function currentBlob(){
    const end=enc.flush();
    if(end.length>0) mp3Parts.push(new Uint8Array(end));
    return new Blob(mp3Parts,{type:'audio/mpeg'});
  }
  // セグメント確定→送信。分割ありなら _01,_02… なしなら名前そのまま
  function flushSegment(isFinal){
    const blob=currentBlob();
    let name;
    if(isFinal && partNo===0){ name=baseName; }
    else { partNo++; name=baseName+'_'+pad2(partNo); }
    uploads.push(uploadMp3(cfg.u, blob, name));
    if(!isFinal){ setStatus('パート'+partNo+'を送信中…（録音は継続中）','busy'); newEncoder(); }
  }

  async function startRec(){
    if(!cfg.u){ setStatus('記録先が未設定です','err'); return; }
    if(/\/dev(\?|$)/.test(cfg.u) || /\/edit(\?|$)/.test(cfg.u)){
      setStatus('⚠ 記録先URLが正しくありません（末尾が /exec のURLを使ってください）','err'); return;
    }
    setStatus('準備しています…','busy');
    try{ lame=await loadLame(); }catch(e){ setStatus('変換モジュールの読み込みに失敗しました','err'); return; }
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{
        channelCount:1, echoCancellation:true, noiseSuppression:true, autoGainControl:true
      }});
    }catch(e){ setStatus('マイクの使用が許可されませんでした','err'); return; }

    const AC=window.AudioContext||window.webkitAudioContext;
    try{ audioCtx=new AC({sampleRate:TARGET_SR}); }catch(e){ audioCtx=new AC(); }
    sampleRate=audioCtx.sampleRate;               // 16kHz（対応外なら実レート）
    srcNode=audioCtx.createMediaStreamSource(stream);

    baseName=''; partNo=0; totalSamples=0; uploads=[];
    newEncoder();

    // キャプチャ：AudioWorklet優先（音声スレッドで安定）／不可ならScriptProcessor
    let usingWorklet=false;
    if(audioCtx.audioWorklet){
      try{
        const code="class P extends AudioWorkletProcessor{constructor(){super();this.b=[];this.n=0;}process(inp){const i=inp[0];if(i&&i[0]){const c=i[0];this.b.push(new Float32Array(c));this.n+=c.length;if(this.n>=2048){const o=new Float32Array(this.n);let k=0;for(const x of this.b){o.set(x,k);k+=x.length;}this.port.postMessage(o,[o.buffer]);this.b=[];this.n=0;}}return true;}}registerProcessor('cap',P);";
        const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
        await audioCtx.audioWorklet.addModule(url);
        capNode=new AudioWorkletNode(audioCtx,'cap');
        capNode.port.onmessage=(e)=>pushPcm(e.data);
        usingWorklet=true;
      }catch(e){ usingWorklet=false; }
    }
    if(!usingWorklet){
      capNode=audioCtx.createScriptProcessor(4096,1,1);
      capNode.onaudioprocess=(e)=>{ pushPcm(new Float32Array(e.inputBuffer.getChannelData(0))); };
    }
    srcNode.connect(capNode);
    capNode.connect(audioCtx.destination);        // 出力は無音（フィードバックなし）

    baseName=nameNow();                            // 開始時の名前を仮ロック（分割時に使用）
    state='recording';
    mic.classList.add('recording');
    fxLayer.classList.add('fx-run');
    setStatus('録音中… もう一度押すと停止','busy');
    startTimer();
  }

  async function stopRec(){
    state='processing';
    mic.classList.remove('recording');
    fxLayer.classList.remove('fx-run');
    stopTimer();
    setStatus('送信しています…','busy');
    try{
      try{ srcNode&&srcNode.disconnect(); }catch(e){}
      try{ capNode&&capNode.disconnect(); }catch(e){}
      if(stream){ stream.getTracks().forEach(t=>t.stop()); }
      if(partNo===0){ baseName=nameNow(); }        // 分割なし→停止時の入力名を採用
      flushSegment(true);
      await Promise.all(uploads);
      if(audioCtx){ try{ await audioCtx.close(); }catch(e){} }
      const tail=partNo>1?('（全'+partNo+'ファイル）'):'';
      setStatus('✅ 送信しました！ありがとうございました'+tail,'done');
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

function tstamp(){ const d=new Date(); const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }

/* ---------- MP3エンコード（lamejs） ---------- */
let _lame=null;
async function loadLame(){
  if(_lame) return _lame;
  _lame=await import('https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm');
  return _lame;
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
