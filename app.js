/* ===== コエワ～プ app.js ===== */
'use strict';

/* ---------- 選択肢の定義 ---------- */
const THEMES = [
  {id:'rg', name:'レッド&グリーン', cols:['#e3350d','#3aa856','#ffcb05']},
  {id:'gs', name:'ゴールド&シルバー', cols:['#d4af37','#9aa4ad','#fffdf7']},
  {id:'rs', name:'チェリー&コバルト', cols:['#a5122a','#1f5fbf','#f2c14e']},
  {id:'dp', name:'アクア&ピーチ', cols:['#5b8dd9','#e79ac0','#eaf1fb']},
  {id:'bw', name:'ブラック&ホワイト', cols:['#1a1c22','#e7e9ee','#4a4f5a']},
  {id:'xy', name:'セルリアン&クリムゾン', cols:['#2f6fd0','#d6243c','#8fd0e6']},
  {id:'sm', name:'アプリコット&グレープ', cols:['#f2841c','#7a4fb5','#ffd28a']},
  {id:'ss', name:'ミント&ローズ', cols:['#00a5b5','#d61f8c','#8be3ec']},
  {id:'sv', name:'トマト&プラム', cols:['#e0453a','#7d4fc4','#f2b6a0']},
  {id:'legends', name:'オリーブ&カーキ', cols:['#7a8a44','#b08a2e','#d8c98a']},
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
const DEFAULT = {t:'gs', s:'circle', c:7, z:4, f:'pulse', u:'', ti:'コエワ～プ'};

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
  cfg.ti = DEFAULT.ti; // タイトルは固定（旧localStorageの名前を引き継がない）

  // 記録先URL
  const driveUrl = $('driveUrl');
  driveUrl.value = cfg.u || '';
  updateDriveStatus();
  driveUrl.addEventListener('input', ()=>{ cfg.u = driveUrl.value.trim(); updateDriveStatus(); saveLocal(cfg); });

  function updateDriveStatus(){
    const v = driveUrl.value.trim();
    const ok = /^https?:\/\//.test(v);
    // URLが有効なときだけ「🔍接続テスト」リンクを表示（ドット廃止）
    const tl = $('testLink');
    if(ok){ tl.hidden=false; tl.href=v; } else { tl.hidden=true; }
  }

  $('setupToggle').addEventListener('click',(e)=>{ e.preventDefault();
    const g=$('setupGuide'); g.hidden=false;
    g.scrollIntoView({behavior:'smooth', block:'start'}); });

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

  // 共有URL履歴（開閉）
  const histToggle=$('histToggle');
  if(histToggle){
    histToggle.addEventListener('click', ()=>{
      const p=$('histPanel'); p.hidden=!p.hidden;
      histToggle.classList.toggle('open', !p.hidden);
      if(!p.hidden) renderHistory();
    });
  }
  renderHistory();

  // 各種セレクタ変更時に反映
  window.__cfg = cfg;
}

const COLOR_NAMES=['レッド','ブルー','オレンジ','ティール','パープル','グリーン','マゼンタ','ゴールド','ブラック','コーラル'];
const FX_GLYPH={ripple:'◎',wave:'〜',pulse:'⊙',bars:'▮',glow:'✺',rotate:'↻',sparkle:'✦',orbit:'◍',concentric:'◉',aurora:'≋'};

/* ---- ビジュアルピッカー：正方形アイコンを並べ，押すと下に見本が展開 ---- */
const PICKERS=[
  {kind:'theme', title:'テーマカラー'},
  {kind:'shape', title:'マイクの形'},
  {kind:'color', title:'マイクの色'},
  {kind:'size',  title:'大きさ'},
  {kind:'fx',    title:'エフェクト'},
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
function buildPickers(cfg){
  const host=$('pickers'); host.innerHTML='';
  const bar=document.createElement('div'); bar.className='picker-bar';
  const grid=document.createElement('div'); grid.className='picker-grid'; grid.hidden=true;
  let openKind=null;

  const heads={};
  function paintHead(kind){
    const h=heads[kind]; h.innerHTML=''; h.appendChild(pkSwatch(kind, pkGet(kind,cfg)));
  }
  function closeGrid(){
    openKind=null; grid.hidden=true;
    bar.querySelectorAll('.picker-head.on').forEach(h=>h.classList.remove('on'));
  }
  function openGrid(kind){
    openKind=kind;
    Object.values(heads).forEach(h=>h.classList.toggle('on', h===heads[kind]));
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
        paintHead(kind);
        applyPreview(cfg); saveLocal(cfg);
        runFxOnce($('fxLayer'));   // 選ぶたびに変化をプレビュー再生
      });
      grid.appendChild(b);
    });
    grid.hidden=false;
  }

  PICKERS.forEach(p=>{
    const h=document.createElement('button'); h.type='button'; h.className='picker-head';
    h.dataset.kind=p.kind; h.title=p.title; h.setAttribute('aria-label',p.title);
    heads[p.kind]=h;
    paintHead(p.kind);
    h.addEventListener('click',(e)=>{
      e.stopPropagation();
      if(openKind===p.kind) closeGrid(); else openGrid(p.kind);
    });
    bar.appendChild(h);
  });

  host.append(bar,grid);
  document.addEventListener('click',(e)=>{ if(!e.target.closest('#pickers')) closeGrid(); });
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
  const k=makeShareId();
  const payload={t:cfg.t,s:cfg.s,c:cfg.c,z:cfg.z,f:cfg.f,u:cfg.u,ti:cfg.ti||'コエワ～プ',k};
  const url=location.origin+location.pathname+'#r='+encodeCfg(payload);
  const out=$('shareOut'); out.hidden=false;
  $('shareUrl').value=url;
  doCopy(url);
  $('shareMsg').textContent='✅ 共有URLを発行し，クリップボードにコピーしました！';
  addHistory({k, u:cfg.u, url, ts:Date.now(), enabled:true});
  renderHistory();
}

/* 共有URLごとの固有ID（オン・オフ管理用） */
function makeShareId(){
  const s='abcdefghijklmnopqrstuvwxyz0123456789';
  let r=''; for(let i=0;i<10;i++){ r+=s[Math.floor(Math.random()*s.length)]; }
  return r;
}

/* ===== 共有URL履歴（各端末のローカル保存・最大30件） ===== */
const HISTORY_KEY='koewarp_history';
function loadHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]; }catch(e){ return []; } }
function saveHistory(a){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(a.slice(0,30))); }catch(e){} }
function addHistory(entry){ const a=loadHistory().filter(x=>x.k!==entry.k); a.unshift(entry); saveHistory(a); }
function fmtHistDate(ts){ const d=new Date(ts); const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }

function setShareEnabled(k, enabled){
  const a=loadHistory(); const i=a.findIndex(x=>x.k===k);
  if(i<0) return;
  a[i].enabled=enabled; saveHistory(a);
  const u=a[i].u;
  if(u && /^https?:\/\//.test(u)){
    fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'setEnabled',k,enabled})}).catch(()=>{});
  }
}

function renderHistory(){
  const panel=$('histPanel'); if(!panel) return;
  const a=loadHistory();
  if(a.length===0){ panel.innerHTML='<div class="hist-empty">まだ履歴はありません。共有URLを発行すると，ここに最大30件まで記録されます。</div>'; return; }
  panel.innerHTML=a.map(e=>`
    <div class="hist-row" data-k="${e.k}">
      <div class="hist-info">
        <div class="hist-date">${fmtHistDate(e.ts)}</div>
        <div class="hist-url" title="${e.url}">${e.url}</div>
      </div>
      <div class="hist-acts">
        <label class="hist-sw"><input type="checkbox" class="hist-en" ${e.enabled!==false?'checked':''}><span>送信</span></label>
        <button type="button" class="hist-open">開く</button>
        <button type="button" class="hist-copy">コピー</button>
        <button type="button" class="hist-del" aria-label="削除">🗑</button>
      </div>
    </div>`).join('');
  panel.querySelectorAll('.hist-row').forEach(row=>{
    const k=row.getAttribute('data-k');
    const e=a.find(x=>x.k===k);
    row.querySelector('.hist-en').addEventListener('change',ev=>{
      const on=ev.target.checked; setShareEnabled(k,on);
      row.classList.toggle('off',!on);
    });
    row.classList.toggle('off', e.enabled===false);
    row.querySelector('.hist-open').addEventListener('click',()=>{ window.open(e.url,'_blank','noopener'); });
    row.querySelector('.hist-copy').addEventListener('click',()=>{ doCopy(e.url); });
    row.querySelector('.hist-del').addEventListener('click',()=>{
      const arr=loadHistory().filter(x=>x.k!==k); saveHistory(arr); renderHistory();
    });
  });
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
  $('recTitle').textContent = cfg.ti || 'コエワ～プ';

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

  let state='idle';         // idle | recording | processing | review（録音後：▶か💾を選ぶ）
  let stream=null, audioCtx=null, srcNode=null, capNode=null;
  let lame=null, enc=null, mp3Parts=[], sampleRate=TARGET_SR;
  let segSamples=0, totalSamples=0, partNo=0, baseName='';
  let uploads=[];
  let lastFiles=[];         // 直前の録音（💾で端末に保存する用）。▶で手放す
  let startTime=0, timerId=null;
  let lastFailed=false;     // 直前の録音が未送信 → 後から届いたら表示を更新する
  let wake=null;            // 録音・送信中は画面を消さない（スリープで通信が切れるのを防ぐ）
  const saveBtn=$('recSave');
  const isRest=()=>state==='idle'||state==='review';

  // 送信トレイ：録音は端末に保存してから送り，届くまで自動で再送信する
  const outbox=createOutbox({
    onChange: renderPending,
    onDrained: ()=>{ if(lastFailed && isRest()){ lastFailed=false; setStatus('✅ 未送信だった録音を送信しました','done'); } },
    canRun: isRest,
  });
  $('recPending').addEventListener('click', ()=>outbox.flush(true));
  outbox.start();

  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='visible' && !isRest()) keepAwake(true);
  });

  mic.addEventListener('click', async ()=>{
    if(state==='idle'){ await startRec(); }
    else if(state==='recording'){ await stopRec(); }
    else if(state==='review'){ goNext(); }
  });
  saveBtn.addEventListener('click', ()=>{
    if(state!=='review' || !lastFiles.length || saveBtn.classList.contains('saved')) return;
    downloadFiles(lastFiles);
    saveBtn.classList.add('saved');
    saveBtn.setAttribute('aria-label','端末に保存しました');
  });

  // 録音後：大きなボタンを ▶ に切り替え，その下に小さな 💾 を出す
  function showReview(){
    state='review';
    mic.classList.add('is-next');
    mic.setAttribute('aria-label','次へ進む');
    saveBtn.classList.remove('saved');
    saveBtn.setAttribute('aria-label','端末に保存');
    saveBtn.hidden = !lastFiles.length;
  }
  // ▶：これまでどおり次の録音へ。手元の音声データは持たない
  // （未送信のものだけは送信トレイが届くまで保持し，届いたら消える）
  function goNext(){
    lastFiles=[];
    saveBtn.hidden=true;
    mic.classList.remove('is-next');
    mic.setAttribute('aria-label','録音');
    timerEl.hidden=true;
    state='idle';
    setStatus('マイクを押して録音を開始');
  }

  // ファイル名＝データ名＋日付時刻＋audio（例）山田太郎_感想20260723_154210audio
  // データ名が空なら日付時刻audio（例）20260723_154210audio
  function nameNow(){
    const raw = $('recName').value.trim();
    const base = raw ? sanitize(raw) : '';
    return base + tstamp() + 'audio';
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
    const item={ uid:newUid(), endpoint:cfg.u, k:cfg.k||'', name, blob, at:Date.now() };
    lastFiles.push({ name, blob });
    outbox.add(item);                              // 送る前に端末へ保存（失敗しても消えない）
    uploads.push(outbox.send(item, 3, (n)=>{
      if(state==='processing') setStatus('つながりにくいため送り直しています…（'+n+'回目）','busy');
    }));
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

    baseName=''; partNo=0; totalSamples=0; uploads=[]; lastFiles=[];
    newEncoder();

    // キャプチャ：AudioWorklet優先（音声スレッドで安定）／不可ならScriptProcessor
    let usingWorklet=false;
    if(audioCtx.audioWorklet){
      try{
        const code="class P extends AudioWorkletProcessor{constructor(){super();this.b=[];this.n=0;}process(inp){const i=inp[0];if(i&&i[0]){const c=i[0];this.b.push(new Float32Array(c));this.n+=c.length;if(this.n>=2048){const o=new Float32Array(this.n);let k=0;for(const x of this.b){o.set(x,k);k+=x.length;}this.port.postMessage(o,[o.buffer]);this.b=[];this.n=0;}}return true;}}registerProcessor('cap',P);";
        const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
        try{ await audioCtx.audioWorklet.addModule(url); }finally{ URL.revokeObjectURL(url); }
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
    keepAwake(true);
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
      closeAudio();                                // 送信結果を待たずに解放（失敗時に残り続けないように）
      const ok=(await Promise.all(uploads)).every(Boolean);
      timerEl.hidden=true;
      if(ok){
        lastFailed=false;
        const tail=partNo>1?('（全'+partNo+'ファイル）'):'';
        setStatus('✅ 送信しました！ありがとうございました'+tail,'done');
        $('recName').value='';
      }else{
        lastFailed=true;
        setStatus('⚠ 回線が混み合っています。録音はこの端末に保存したので，つながり次第自動で送ります','err');
      }
    }catch(err){
      console.error(err);
      lastFailed=true;
      setStatus('⚠ 送信に失敗しました：'+(err.message||err),'err');
    }finally{
      closeAudio();
      keepAwake(false);
      showReview();
      renderPending();
    }
  }

  function closeAudio(){
    if(!audioCtx) return;
    try{ const p=audioCtx.close(); if(p&&p.catch) p.catch(()=>{}); }catch(e){}
    audioCtx=null;
  }

  async function keepAwake(on){
    try{
      if(on){
        if(!wake && navigator.wakeLock){
          wake=await navigator.wakeLock.request('screen');
          wake.addEventListener('release', ()=>{ wake=null; });
        }
      }else if(wake){ const w=wake; wake=null; await w.release(); }
    }catch(e){ wake=null; }
  }

  // 未送信の録音があるときだけ，ステータスの下に小さく表示する
  function renderPending(){
    const b=$('recPending'), n=outbox.count;
    b.hidden = n===0;
    if(!n) return;
    b.disabled = outbox.flushing;
    b.textContent = outbox.flushing ? '📦 未送信 '+n+'件を送信中…' : '📦 未送信 '+n+'件 ・ タップで再送信';
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

/* ---------- MP3エンコード（lamejs） ----------
   CDNを弾く学校ネットワークでも動くよう vendor/lamejs.iife.js を同梱し，
   グローバル lamejs として読み込む。 */
async function loadLame(){
  if(!window.lamejs) throw new Error('lamejs not loaded');
  return window.lamejs;
}
/* ================================================================
   送信トレイ
   ・録音は送る前に端末（IndexedDB）へ保存し，届いたら消す
   ・その場で数回再試行し，だめならバックグラウンドで間隔をあけて送り直す
   ・ページを閉じても残り，次に共有URLを開いたとき自動で送り直す
================================================================ */
function createOutbox(hooks){
  const items=new Map();   // uid → {uid,endpoint,k,name,blob,at, stale,fails,nextAt}
  const busy=new Set();    // いま送信中のuid
  let running=false;

  async function start(){
    for(const it of await idb.all()){
      if(Date.now()-it.at > 30*864e5){ idb.del(it.uid); continue; }   // 30日より前のものは破棄
      it.stale=true; it.fails=0; it.nextAt=Date.now()+2000+Math.random()*4000;
      items.set(it.uid, it);
    }
    hooks.onChange();
    setInterval(()=>flush(false), 5000);   // 送る時刻（nextAt）が来たものだけ送る
    window.addEventListener('online', ()=>flush(true));
  }
  function add(item){ items.set(item.uid, item); idb.put(item); }
  function done(uid){ items.delete(uid); idb.del(uid); hooks.onChange(); }

  async function send(item, tries, onRetry){
    busy.add(item.uid);
    try{
      const ok=await deliver(item, tries, onRetry);
      if(ok){ done(item.uid); }
      else{ item.stale=true; item.fails=(item.fails||0)+1; item.nextAt=Date.now()+backoff(item.fails); }
      return ok;
    }finally{ busy.delete(item.uid); hooks.onChange(); }
  }

  // 未送信分を1件ずつ順番に送る（同時に送って回線を詰まらせない）
  async function flush(force){
    if(running || !items.size) return;
    if(!force && !hooks.canRun()) return;
    running=true; hooks.onChange();
    try{
      for(const it of [...items.values()]){
        if(!it.stale || busy.has(it.uid)) continue;
        if(!force && it.nextAt>Date.now()) continue;
        await send(it, 1);
      }
    }finally{
      running=false; hooks.onChange();
      if(![...items.values()].some(it=>it.stale)) hooks.onDrained();
    }
  }

  return { start, add, send, flush,
    get count(){ return [...items.values()].filter(it=>it.stale).length; },
    get flushing(){ return running; } };
}

const RETRY_WAITS=[0,3,8];   // その場での再試行の間隔（秒）
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const jitter=(ms)=>ms*(0.7+Math.random()*0.6);   // 班ごとにタイミングをずらす
const backoff=(fails)=>jitter(Math.min(60000, 10000*Math.pow(2,fails-1)));   // 10秒→20秒→40秒→60秒…
function newUid(){
  return (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36)+Math.random().toString(36).slice(2,12));
}

/* 1件を最大 tries 回まで送る。届いた（または確認できない旧受け取り口で送れた）ら true */
async function deliver(item, tries, onRetry){
  const body=await buildBody(item);
  for(let i=0;i<tries;i++){
    if(i>0){ onRetry&&onRetry(i); await sleep(jitter(RETRY_WAITS[Math.min(i,RETRY_WAITS.length-1)]*1000)); }
    else{ await sleep(Math.random()*1500); }      // 一斉に停止した班が同時に送らないよう少しずらす
    // 前回「失敗」に見えても実は届いていることがある → 送り直す前に確認（二重保存を防ぐ）
    if((i>0 || item.stale) && await confirmSaved(item)==='saved') return true;
    try{ await postNoCors(item.endpoint, body, Math.min(300000, 45000+body.length/1e6*15000)); }
    catch(e){ continue; }                          // 通信エラー → 次の試行へ
    // 'none'＝受け取り口に届いていない。それ以外（保存済み・確認できない旧版）は送信完了とみなす
    if(await confirmSaved(item)!=='none') return true;
  }
  return false;
}

async function buildBody(item){
  const payload={ filename: sanitize(item.name)+'.mp3', mimeType:'audio/mpeg',
                  data: await blobToBase64(item.blob), uid: item.uid };
  if(item.k) payload.k=item.k;
  return JSON.stringify(payload);
}

/* Apps Scriptの /exec は応答時に googleusercontent.com へ302リダイレクトするため，
   通常のfetch(cors)ではレスポンスを読めず "Failed to fetch" になる。
   no-cors で送り，保存できたかは下の confirmSaved で別途確かめる。 */
async function postNoCors(endpoint, body, ms){
  const ac=window.AbortController ? new AbortController() : null;
  const t=ac && setTimeout(()=>ac.abort(), ms);
  try{
    await fetch(endpoint,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body,
      redirect:'follow',
      signal: ac ? ac.signal : undefined,
    });
  }finally{ if(t) clearTimeout(t); }
}

/* 保存されたかを受け取り口に問い合わせる。保存処理中なら終わるまで待つ。
   'saved' | 'none'（届いていない） | 'unknown'（旧版の受け取り口・通信不可など） */
async function confirmSaved(item){
  for(let n=0;n<12;n++){
    const s=await checkSaved(item.endpoint, item.uid);
    if(s!=='pending') return s;
    await sleep(5000);
  }
  return 'unknown';
}

/* JSONPで問い合わせる（Apps ScriptはCORSでレスポンスを読めないため） */
const noCheckEndpoints=new Set();   // 確認に対応していない旧版の受け取り口
function checkSaved(endpoint, uid){
  if(noCheckEndpoints.has(endpoint)) return Promise.resolve('unknown');
  return new Promise((resolve)=>{
    const cb='_kw'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    let fin=false;
    const end=(v)=>{ if(fin) return; fin=true; clearTimeout(t); delete window[cb]; s.remove(); resolve(v); };
    const t=setTimeout(()=>end('unknown'), 10000);
    window[cb]=(d)=>{
      const st=d&&d.state;
      end(st==='saved'||st==='skipped' ? 'saved' : (st==='pending'||st==='none' ? st : 'unknown'));
    };
    s.onload=()=>{ if(!fin){ noCheckEndpoints.add(endpoint); end('unknown'); } };   // 旧版：スクリプトは読めたが応答なし
    s.onerror=()=>end('unknown');
    s.src=endpoint+(endpoint.indexOf('?')<0?'?':'&')+'check='+encodeURIComponent(uid)+'&callback='+cb+'&t='+Date.now();
    document.head.appendChild(s);
  });
}

/* 端末内の保存先（IndexedDB）。使えない環境では何もしない（送信自体は続ける） */
const idb=(()=>{
  let dbp=null;
  function open(){
    if(!dbp) dbp=new Promise((res,rej)=>{
      const r=indexedDB.open('koewarp',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('outbox',{keyPath:'uid'});
      r.onsuccess=()=>res(r.result);
      r.onerror=()=>rej(r.error);
    });
    return dbp;
  }
  function run(mode, fn){
    return open().then(db=>new Promise((res,rej)=>{
      const tx=db.transaction('outbox', mode);
      const req=fn(tx.objectStore('outbox'));
      tx.oncomplete=()=>res(req.result);
      tx.onerror=tx.onabort=()=>rej(tx.error);
    }));
  }
  return {
    put:(it)=>run('readwrite', s=>s.put({uid:it.uid, endpoint:it.endpoint, k:it.k, name:it.name, blob:it.blob, at:it.at})).catch(()=>{}),
    del:(uid)=>run('readwrite', s=>s.delete(uid)).catch(()=>{}),
    all:()=>run('readonly', s=>s.getAll()).then(a=>a||[]).catch(()=>[]),
  };
})();
function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(',')[1]);
    r.onerror=reject;
    r.readAsDataURL(blob);
  });
}
function sanitize(n){ return n.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)||'コエワ～プ'; }

/* MP3を端末に保存（ダウンロード）。分割された長時間録音は少し間をあけて順に保存 */
function downloadFiles(files){
  files.forEach((f,i)=>setTimeout(()=>{
    const url=URL.createObjectURL(f.blob);
    const a=document.createElement('a');
    a.href=url; a.download=sanitize(f.name)+'.mp3';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }, i*500));
}

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

/* Apps Scriptに貼り付けるコード（__FOLDER_ID__ は自動置換）
   String.raw：正規表現の \w などがそのまま貼り付けられるように */
const GAS_TEMPLATE = String.raw`/**
 * コエワ～プ 受け取り口 v2（このコードをそのまま貼り付けてください）
 * ・同じ録音が再送信されても二重に保存しません
 * ・アプリからの「保存できた？」の確認に応えます
 */
var FOLDER_ID = '__FOLDER_ID__';

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
  var parent = FOLDER_ID ? DriveApp.getFolderById(FOLDER_ID) : DriveApp.getRootFolder();
  var name = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  // 保存確認（アプリが送り直すかどうかを判断するのに使う）
  if (p.check && /^[A-Za-z_$][\w$]{0,40}$/.test(p.callback || '')) {
    var v = /^[\w-]{8,64}$/.test(p.check) ? CacheService.getScriptCache().get('u_' + p.check) : null;
    return ContentService.createTextOutput(p.callback + '(' + JSON.stringify({ v: 2, state: v || 'none' }) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput('コエワ～プ 受け取り口は正常に動いています。')
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
