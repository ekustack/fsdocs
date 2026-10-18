import {createVFS} from './vfs.js';
import {registerXfcmd} from './xfcmd-lang.js';
/* ============================================================
   Helpers
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=n=>n.split('/').pop();
const ext=n=>(n.split('.').pop()||'').toLowerCase();
const isFscss=n=>['fscss','xfscss'].includes(ext(n));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const debounce=(f,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}};
const bytes=n=>n<1024?n+' B':(n/1024).toFixed(1)+' KB';
const store={
  get(k,d){try{const v=localStorage.getItem('fside:'+k);return v==null?d:JSON.parse(v)}catch{return d}},
  set(k,v){try{localStorage.setItem('fside:'+k,JSON.stringify(v))}catch{}}
};
const langOf=n=>({fscss:'fscss',xfscss:'fscss',css:'css',html:'html',js:'javascript',json:'json',md:'markdown',xfcmd:'xfcmd'}[ext(n)]||'plaintext');
const iconOf=n=>({fscss:['fa-solid fa-palette','#ff4081'],xfscss:['fa-solid fa-palette','#ff4081'],css:['fa-brands fa-css3-alt','#42a5f5'],html:['fa-brands fa-html5','#e65100'],js:['fa-brands fa-js','#f7df1e'],json:['fa-solid fa-code','#cbcb41'],md:['fa-brands fa-markdown','#9a9a9a'],xfcmd:['fa-solid fa-terminal','#0BCEAE']}[ext(n)]||['fa-regular fa-file','#9a9a9a']);

/* ============================================================
   Data
   ============================================================ */
const EXAMPLES={
basic:`@define center(elem){\`
  @use(elem){
    display: flex;
    justify-content: center;
    align-items: center;
  }
\`}

@center(.box)

.box {
  width: 200px;
  height: 120px;
  background: #1E2783;
  color: white;
  border-radius: 12px;
}`,
variables:`$primary: #0BCEAE;
$radius: 8px;

@arr palette[#1E2783, #8C29B2, #C41348, #0098d0]

.card {
  bg: @random(@arr.palette);
  color: white;
  padding: 16px 24px;
  size: 150px;
  max-size: 200px;
  min-size: 100px;
  rounded: $radius!;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.btn {
  bg: $primary!;
  color: #111;
  px: 10px;
  py: 20px;
  rounded: $radius!;
  border: none;
  fw: 600;
}`,
pattern:`pattern(0.6: "rounded primary button with color: white, bg: red", \`
  bg: @match(bg:?\\s([#\\w\\d-_]+)) @match(background:?\\s([#\\w\\d-_]+));
  color: @match(color:?\\s([#\\w\\d-_]+));
  rounded: 25px;
  padding: 10px 20px;
  fw: 700;
  border: 2px solid;
\`)

.primary {
  rounded primary button with color: #0BCEAE, background: midnightblue
}`,
imports:`/* Example import */
@import((*) from flex-control)

@arr colors[#1E2783, #8C29B2, #C41348]

.container {
  display: flex;
  gap: 12px;
  bg: @random(@arr.colors);
  padding: 24px;
  rounded: 12px;
  color: white;
}`,
debug:`exec(_log, 'Hello from FSCSS compiler')
exec(_warn, 'This is a compile-time warning')
exec(_info, 'Info message from pipeline')

$debug-color: #f0c14b;

.box {
  bg: $debug-color!;
  padding: 20px;
  rounded: 8px;
  color: #111;
}`};

const DEFAULT_HTML=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FSCSS Preview</title>
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0f0f12;color:#eee;min-height:100vh;display:flex;gap:16px;align-items:center;justify-content:center;padding:1rem;">
  <div class="card">Card</div>
  <button class="btn">Button</button>
</body>
</html>
`;

const defaultFiles=()=>({
  'main.fscss':EXAMPLES.variables,
  'index.html':DEFAULT_HTML,
  'app.js':"// Runs inside the preview page\nconsole.log('Preview ready');\n"
});

const SNIPS=[
 {k:'def',t:'@define',d:'Reusable mixin block',b:'@define ${1:name}(${2:a, b}){\n  ${3:property}: @use(${2:a});\n}'},
 {k:'use',t:'@use()',d:'Use a mixin parameter',b:'@use(${1:arg})'},
 {k:'var',t:'$variable',d:'Declare a variable',b:'\\$${1:name}: ${2:value};'},
 {k:'arr',t:'@arr',d:'Define an array',b:'@arr ${1:name}[${2:a, b, c}]'},
 {k:'rand',t:'@random()',d:'Pick a random value',b:'${1:color}: @random([${2:red, blue, yellow}]);'},
 {k:'randarr',t:'@random(@arr)',d:'Random item from an array',b:'@random(@arr.${1:name})'},
 {k:'imp',t:'@import',d:'Import a module',b:'@import((${1:module}) from ${2:lib})'},
 {k:'impw',t:'@import (*)',d:'Import everything from a module',b:'@import((*) from ${1:lib})'},
 {k:'kf',t:'$(@keyframes)',d:'Keyframes for several elements',b:'\\$(@keyframes ${1:name}, ${2:elem1}, ${3:elem2} &[${4:1s linear infinite}]){\n  from{${5}}\n  to{${6}}\n}'},
 {k:'pfx',t:'-*-',d:'Vendor prefixes',b:'-*-${1:prop}: ${2:value};'},
 {k:'multi',t:'%n()',d:'One value, many properties',b:'%${1:2}(${2:width, height} [: ${3:200px;}])'},
 {k:'event',t:'@event',d:'Event with conditions',b:'@event ${1:name}(${2:e}){\n  if ${2:e}>=${3:8}{\n    return: num(${4:8*2});\n  }\n}'},
 {k:'obj',t:'@obj',d:'Define an object',b:'@obj ${1:name}{ ${2} }'},
 {k:'fun',t:'@fun',d:'Define a function',b:'@fun(${1:name}){\n  ${2}\n}'},
 {k:'pat',t:'pattern()',d:'Pattern matching block',b:'pattern(${1:0.5}: "${2:description}", `\n  ${3}\n`)'},
 {k:'num',t:'num()',d:'Math expression',b:'num(${1:expr})'},
 {k:'log',t:'exec(_log)',d:'Console log at compile time',b:"exec(_log, '${1:message}')"},
 {k:'warn',t:'exec(_warn)',d:'Console warn at compile time',b:"exec(_warn, '${1:message}')"}
];
const BUILTIN_LIBS=['flex-control','icon-mask','st-core@v2','circle-progress', 'fscss:micros'];
const LIBS_URL='https://raw.githubusercontent.com/fscss-ttr/FSCSS/refs/heads/main/assets/scripts/libs.json';
const FALLBACK_REMOTES=['https://github.com/fscss-ttr/st-core.fscss','https://github.com/Figsh/Circle-progress.fscss','https://github.com/Figsh/counterx.fscss'];

/* ============================================================
   State
   ============================================================ */
const DEF_SET={theme:'dark',fontSize:14,wrap:true,minimap:false,auto:false,version:'1.2.6',entry:'main.fscss'};
const S={
  files:store.get('files',null)||defaultFiles(),
  open:store.get('open',[]),
  active:store.get('active',null),
  settings:{...DEF_SET,...store.get('settings',{})},
  layout:{sbw:260,split:.5,bph:200,side:true,view:'files',bot:true,botTab:'term',outTab:'css',...store.get('layout',{})},
  collapsed:store.get('collapsed',{}),
  css:{}, outFile:null
};
S.open=(Array.isArray(S.open)?S.open:[]).filter(n=>n in S.files);
if(!S.open.length&&Object.keys(S.files).length)S.open=[Object.keys(S.files)[0]];
if(!(S.active in S.files))S.active=S.open[0]||null;
if(!(S.settings.entry in S.files))S.settings.entry=Object.keys(S.files).find(isFscss)||'';
document.documentElement.dataset.theme=S.settings.theme;
S.page=null;
const VFS=createVFS(S);

let ed=null,outEd=null,xf=null;
const models={},views={};

/* ============================================================
   Splash, toasts, dialogs
   ============================================================ */
function splash(p,t){$('#spBar').style.width=p+'%';$('#spTxt').textContent=t}

window.toast = function toast(msg,type='',ms=2600){const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),ms)}

let modalDone=null;
function modal(title,html,o={}){
  return new Promise(resolve=>{
    const w=$('#modal'),btns=o.buttons||[{label:'Close',value:true,primary:true}];
    w.innerHTML=`<div class="dlg ${o.wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dh"><b>${esc(title)}</b><button class="ib" data-x aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><div class="db">${html}</div><div class="df">${btns.map((b,i)=>`<button class="btn ${b.primary?'':'ghost'} ${b.danger?'danger':''}" data-b="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    w.hidden=false;
    const done=v=>{w.hidden=true;w.innerHTML='';modalDone=null;resolve(v)};
    modalDone=done;
    w.onmousedown=e=>{if(e.target===w)done(null)};
    w.onclick=e=>{
      if(e.target.closest('[data-x]'))return done(null);
      const b=e.target.closest('[data-b]');if(!b)return;
      const val=btns[b.dataset.b].value;
      done(val==='ok'&&o.collect?o.collect(w):val);
    };
    w.onkeydown=e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type==='text'){e.preventDefault();$('.btn:not(.ghost)',w)?.click()}};
    o.onOpen?.(w,done);
    const f=$('input,select',w);if(f){f.focus();f.select?.()}
  });
}
const askInput=(title,val='')=>modal(title,`<input class="in" type="text" value="${esc(val)}" spellcheck="false">`,{buttons:[{label:'Cancel',value:null},{label:'OK',primary:true,value:'ok'}],collect:w=>$('input',w).value.trim()||null});
const confirmBox=(title,msg,danger)=>modal(title,`<p>${esc(msg)}</p>`,{buttons:[{label:'Cancel',value:null},{label:'Confirm',primary:true,danger,value:true}]});

/* ============================================================
   Logging
   ============================================================ */
const termLog=$('#termLog');
const LOGS=[];let lf='all';
const LV={all:null,info:['log','info','system','cmd','out'],warn:['warn'],error:['error']};
const fmtArg=a=>typeof a==='string'?a:a instanceof Error?a.message:(()=>{try{return JSON.stringify(a)}catch{return String(a)}})();
const lineHtml=e=>`<div class="ll ${e.level}"><span class="ts">${e.t.toLocaleTimeString()}</span><span class="lv">${e.level}</span><span class="msg">${esc(e.msg)}</span></div>`;
const logMatch=e=>!LV[lf]||LV[lf].includes(e.level);
function log(level,...a){
  const e={t:new Date(),level,msg:a.map(fmtArg).join(' ')};
  LOGS.push(e);if(LOGS.length>600)LOGS.shift();
  if(logMatch(e)){termLog.insertAdjacentHTML('beforeend',lineHtml(e));termLog.scrollTop=termLog.scrollHeight}
}
function renderLogs(){termLog.innerHTML=LOGS.filter(logMatch).map(lineHtml).join('')}
function clearLogs(){LOGS.length=0;termLog.innerHTML='';log('system','Terminal cleared')}
const orig={log:console.log,warn:console.warn,info:console.info,error:console.error};
function intercept(){for(const k of Object.keys(orig))console[k]=(...a)=>{orig[k].apply(console,a);log(k,...a)};return()=>Object.assign(console,orig)}
window.addEventListener('error',e=>{
  if(/ResizeObserver loop/.test(e.message)){e.stopImmediatePropagation();return}
  log('error','Uncaught: '+e.message);
});
window.addEventListener('unhandledrejection',e=>log('error','Unhandled rejection: '+fmtArg(e.reason)));
window.addEventListener('message',e=>{
  const d=e.data;if(!d||!d.fside||e.source!==$('#prev').contentWindow)return;
  if(d.nav){
    const f=VFS.resolve(S.page||'',d.nav);
    if(f&&VFS.isPage(f)){S.page=f;refreshPreview();renderPages()}
    else if(/^(https?:)?\/\//i.test(d.nav))window.open(d.nav,'_blank','noopener');
    else log('warn','[preview] no workspace page for '+d.nav);
    return;
  }
  log(d.level==='log'?'out':d.level,'[preview] '+d.args.join(' '));
});

/* ============================================================
   Persistence
   ============================================================ */
function persist(){
  store.set('files',S.files);store.set('open',S.open);store.set('active',S.active);
  store.set('settings',S.settings);store.set('layout',S.layout);store.set('collapsed',S.collapsed);
  $('#stSave').textContent='Saved '+new Date().toLocaleTimeString();
}
const persistSoon=debounce(persist,400);

/* ============================================================
   Monaco
   ============================================================ */
const MB='https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min';
function loadMonaco(){
  return new Promise((res,rej)=>{
    if(!window.require)return rej(new Error('Monaco loader did not load. Check your connection.'));
    window.MonacoEnvironment={getWorkerUrl:()=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(`self.MonacoEnvironment={baseUrl:'${MB}/'};importScripts('${MB}/vs/base/worker/workerMain.js');`)};
    window.require.config({paths:{vs:MB+'/vs'}});
    window.require(['vs/editor/editor.main'],()=>res(),rej);
  });
}

const FSCSS_MONARCH={
  defaultToken:'',tokenPostfix:'.fscss',
  brackets:[{open:'{',close:'}',token:'delimiter.bracket'},{open:'(',close:')',token:'delimiter.parenthesis'},{open:'[',close:']',token:'delimiter.square'}],
  tokenizer:{
    root:[
      [/\/\*/,'comment','@comment'],[/\/\/.*$/,'comment'],
      [/`/,'string','@backtick'],
      [/"([^"\\]|\\.)*$/,'string.invalid'],[/"/,'string','@string_double'],
      [/'([^'\\]|\\.)*$/,'string.invalid'],[/'/,'string','@string_single'],
      [/@@define\s+[a-zA-Z_][\w-]*/,'keyword'],[/@@arr\s+[a-zA-Z_][\w-]*/,'keyword'],
      [/@@obj\s+[a-zA-Z_][\w-]*/,'keyword'],[/@@event\s+[a-zA-Z_][\w-]*/,'keyword'],
      [/@@(?:arr|event|obj)\.[a-zA-Z_][\w-]*/,'keyword'],
      [/@@(?:import|use|random|ext|fun|match|define|arr|obj|event)\b/,'keyword'],
      [/@@[a-zA-Z_][\w-]*(?=\s*\()/,'entity.name.function'],
      [/@@[a-zA-Z-]+\b/,'keyword'],
      [/\$\/?[a-zA-Z_][\w-]*!?/,'variable'],[/--[a-zA-Z_][\w-]*/,'variable'],
      [/\bpattern(?=\s*\()/,'keyword'],[/%[0-9]+(?=\()/,'number'],
      [/\.[a-zA-Z_][\w-]*(?=\s*[{,])/,'entity.name.class'],
      [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/,'number.hex'],
      [/-?\d+(?:\.\d+)?(px|em|rem|ex|ch|pt|pc|vw|vh|vmin|vmax|%|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx|fr)\b/,'number'],
      [/-?\d+(?:\.\d+)?\b/,'number'],
      [/\.(length|last|reverse|first|list|indices|randint|segment|map|sum|unique|sort|shuffle|min|max|obj|xfscss)\b/,'entity.name.function'],
      [/\b(cos|cin|inline|exec|find|pick|length|count|copy|str|re|store|join|prefix|surround|unit|block|num|rpt|mx|mxs|linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient|conic-gradient|var|calc|min|max|clamp|rgb|rgba|hsl|hsla|hwb|lch|lab|color-mix|color|url|attr|counter|counters|image-set|fit-content|minmax|repeat|steps|cubic-bezier|matrix|translate|translateX|translateY|translateZ|scale|scaleX|scaleY|scaleZ|rotate|rotateX|rotateY|rotateZ|skew|skewX|skewY|perspective)(?=\s*\()/,'support.function'],
      [/\b(_init|if|el-if|el|return|_log|_warn|_info|_error|from|as|to|default|export)\b/,'keyword'],
      [/[a-zA-Z_-][\w-]*(?=\s*:)/,'support.type.property-name'],
      [/!important\b/,'keyword'],[/\|\|/,'keyword'],
      [/[{}()\[\]]/,'@brackets'],[/[;:,.]/,'delimiter'],[/[ \t\r\n]+/,'white']
    ],
    comment:[[/[^\/*]+/,'comment'],[/\*\//,'comment','@pop'],[/[\/*]/,'comment']],
    string_double:[[/[^\\"]+/,'string'],[/\\./,'string.escape'],[/"/,'string','@pop']],
    string_single:[[/[^\\']+/,'string'],[/\\./,'string.escape'],[/'/,'string','@pop']],
    backtick:[[/[^\\`]+/,'string'],[/\\./,'string.escape'],[/`/,'string','@pop']]
  }
};

function setupMonaco(){
  registerXfcmd(monaco);
  monaco.languages.register({id:'fscss',extensions:['.fscss','.xfscss'],aliases:['FSCSS']});
  monaco.languages.setMonarchTokensProvider('fscss',FSCSS_MONARCH);
  monaco.languages.setLanguageConfiguration('fscss',{
    comments:{lineComment:'//',blockComment:['/*','*/']},
    brackets:[['{','}'],['[',']'],['(',')']],
    autoClosingPairs:[{open:'{',close:'}'},{open:'[',close:']'},{open:'(',close:')'},{open:'"',close:'"'},{open:"'",close:"'"},{open:'`',close:'`'}]
  });
  monaco.editor.defineTheme('fscss-dark',{base:'vs-dark',inherit:true,rules:[
    {token:'keyword',foreground:'C586C0'},{token:'entity.name.function',foreground:'DCDCAA'},{token:'support.function',foreground:'DCDCAA'},
    {token:'variable',foreground:'9CDCFE'},{token:'number',foreground:'B5CEA8'},{token:'number.hex',foreground:'B5CEA8'},
    {token:'string',foreground:'CE9178'},{token:'comment',foreground:'6A9955'},{token:'support.type.property-name',foreground:'9CDCFE'},{token:'entity.name.class',foreground:'4EC9B0'}
  ],colors:{'editor.background':'#1e1e1e','editor.foreground':'#e8e8e8'}});
  monaco.editor.defineTheme('fscss-light',{base:'vs',inherit:true,rules:[
    {token:'keyword',foreground:'AF00DB'},{token:'entity.name.function',foreground:'795E26'},{token:'support.function',foreground:'795E26'},
    {token:'variable',foreground:'001080'},{token:'number',foreground:'098658'},{token:'number.hex',foreground:'098658'},
    {token:'string',foreground:'A31515'},{token:'comment',foreground:'008000'},{token:'support.type.property-name',foreground:'001080'},{token:'entity.name.class',foreground:'267F99'}
  ],colors:{'editor.background':'#ffffff'}});
  monaco.languages.registerCompletionItemProvider('fscss',{provideCompletionItems(model,pos){
    const w=model.getWordUntilPosition(pos);
    const range={startLineNumber:pos.lineNumber,endLineNumber:pos.lineNumber,startColumn:w.startColumn,endColumn:w.endColumn};
    return{suggestions:SNIPS.map(s=>({label:s.k,detail:s.t,documentation:s.d,kind:monaco.languages.CompletionItemKind.Snippet,insertText:s.b,insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,range}))};
  }});
}
const themeName=()=>S.settings.theme==='dark'?'fscss-dark':'fscss-light';

function modelFor(n){
  let m=models[n];
  if(!m||m.isDisposed()){
    m=models[n]=monaco.editor.createModel(S.files[n],langOf(n),monaco.Uri.parse('file:///'+encodeURI(n)));
    m.onDidChangeContent(()=>{
      S.files[n]=m.getValue();persistSoon();
      if(isFscss(n)&&S.settings.auto)autoCompile();
      else if(!isFscss(n)&&S.layout.outTab==='preview')autoPreview();
    });
    markers(n);
  }
  return m;
}

function initEditors(){
  setupMonaco();
  const common={theme:themeName(),automaticLayout:true,fontSize:S.settings.fontSize,minimap:{enabled:S.settings.minimap},wordWrap:S.settings.wrap?'on':'off',tabSize:2,scrollBeyondLastLine:false,padding:{top:8},bracketPairColorization:{enabled:true},smoothScrolling:true,renderWhitespace:'selection'};
  ed=monaco.editor.create($('#edHost'),{...common,model:S.active?modelFor(S.active):null,ariaLabel:'Code editor'});
  outEd=monaco.editor.create($('#cssHost'),{...common,language:'css',value:'/* Compiled CSS appears here */',readOnly:true,minimap:{enabled:false},wordWrap:'on',ariaLabel:'Compiled CSS'});
  ed.onDidChangeCursorPosition(e=>{$('#stPos').textContent=`Ln ${e.position.lineNumber}, Col ${e.position.column}`});
}

/* ============================================================
   Files
   ============================================================ */
const cleanName=n=>{
  let s=n.trim().replace(/\\/g,'/').replace(/\s+/g,'-').replace(/[^\w.\-\/]/g,'').replace(/\/{2,}/g,'/').replace(/^\/+/,'');
  if(s&&!/\.[a-z0-9]+$/i.test(s))s+='.fscss';
  return s;
};
function uniqueName(n){
  if(!(n in S.files))return n;
  const m=n.match(/^(.*?)(\.[^./]+)?$/);let i=1,c;
  do{c=`${m[1]}-${i++}${m[2]||''}`}while(c in S.files);
  return c;
}
function addFile(name,content='',open=true){
  name=uniqueName(cleanName(name));if(!name)return null;
  S.files[name]=content;
  if(!S.settings.entry&&isFscss(name))S.settings.entry=name;
  if(open)openFile(name);else{renderTree();persistSoon()}
  return name;
}
function openFile(n,focus=true){
  if(!(n in S.files))return;
  if(ed&&S.active&&models[S.active]&&!models[S.active].isDisposed())views[S.active]=ed.saveViewState();
  if(!S.open.includes(n))S.open.push(n);
  S.active=n;
  if(ext(n)==='html'){S.page=n;if(S.layout.outTab==='preview')refreshPreview()}
  if(ed){ed.setModel(modelFor(n));if(views[n])ed.restoreViewState(views[n])}
  renderTabs();renderTree();updateLang();persistSoon();
  if(focus&&ed)ed.focus();
}
function closeFile(n){
  const i=S.open.indexOf(n);if(i<0)return;
  S.open.splice(i,1);
  if(S.active===n){
    if(S.open.length)openFile(S.open[Math.min(i,S.open.length-1)]);
    else{S.active=null;ed.setModel(null);renderTabs();renderTree();updateLang();persistSoon()}
  }else{renderTabs();persistSoon()}
}
/* update imports, links and module paths in other files when a file moves */
function fixRefs(o,n){
  const changed=VFS.moveRefs(o,n);
  changed.filter(f=>f!==o).forEach(f=>{const m=models[f];if(m&&!m.isDisposed())m.setValue(S.files[f])});
  if(changed.length)log('system','Updated references in '+changed.join(', '));
}
async function renameFile(o){
  const v=await askInput('Rename file',o);if(!v)return;
  const n=cleanName(v);if(!n||n===o)return;
  if(n in S.files)return toast('That name is already used','err');
  fixRefs(o,n);
  const content=S.files[o];delete S.files[o];S.files[n]=content;
  if(models[o]){models[o].dispose();delete models[o]}
  if(S.css[o]!==undefined){S.css[n]=S.css[o];delete S.css[o]}
  delete views[o];
  S.open=S.open.map(x=>x===o?n:x);
  if(S.settings.entry===o)S.settings.entry=n;
  if(S.page===o)S.page=n;
  PROBS=PROBS.filter(p=>p.file!==o&&p.root!==o);
  if(S.active===o){S.active=n;ed.setModel(modelFor(n))}
  renderAll();persistSoon();
}
async function deleteFile(n){
  if(!await confirmBox('Delete file',`Delete ${n}? This cannot be undone.`,true))return;
  const wasActive=S.active===n;
  const refs=VFS.refsTo(n);
  delete S.files[n];delete S.css[n];delete views[n];
  if(models[n]){models[n].dispose();delete models[n]}
  PROBS=PROBS.filter(p=>p.file!==n&&p.root!==n);
  S.open=S.open.filter(x=>x!==n);
  if(S.settings.entry===n)S.settings.entry=Object.keys(S.files).find(isFscss)||'';
  if(wasActive){S.active=null;if(S.open.length)openFile(S.open[S.open.length-1]);else{ed.setModel(null)}}
  if(refs.length)log('warn',`${n} was referenced by: ${refs.join(', ')}`);
  renderAll();persistSoon();
}
function dupFile(n){const m=n.match(/^(.*?)(\.[^./]+)?$/);addFile(`${m[1]}-copy${m[2]||''}`,S.files[n])}
function loadExample(k){addFile(`examples/${k}.fscss`,EXAMPLES[k]);toast('Loaded example: '+k,'ok')}

/* ============================================================
   Rendering
   ============================================================ */
function renderTabs(){
  $('#tabs').innerHTML=S.open.map(n=>{const [c,col]=iconOf(n);return`<div class="tab ${n===S.active?'on':''}" role="tab" aria-selected="${n===S.active}" data-n="${esc(n)}" title="${esc(n)}"><i class="${c}" style="color:${col}"></i><span>${esc(base(n))}</span>${n===S.settings.entry?'<i class="fa-solid fa-star" style="color:var(--warn);font-size:9px" title="Entry file"></i>':''}<button class="x" data-close aria-label="Close ${esc(n)}"><i class="fa-solid fa-xmark"></i></button></div>`}).join('');
  $('#tabs .on')?.scrollIntoView({block:'nearest',inline:'nearest'});
  $('#welcome').hidden=!!S.active;
}
function renderTree(){
  const root={dirs:{},files:[]};
  for(const n of Object.keys(S.files).sort()){
    let cur=root;
    n.split('/').slice(0,-1).forEach(p=>{cur=cur.dirs[p]??={dirs:{},files:[],path:(cur.path?cur.path+'/':'')+p}});
    cur.files.push(n);
  }
  const draw=(node,d)=>Object.keys(node.dirs).sort().map(k=>{
    const dn=node.dirs[k],open=!S.collapsed[dn.path];
    return`<div class="row" style="--d:${d}" data-dir="${esc(dn.path)}"><i class="fa-solid fa-chevron-${open?'down':'right'} chev"></i><i class="fa-solid fa-folder${open?'-open':''}" style="color:#dcb67a"></i><span class="nm">${esc(k)}</span></div>`+(open?draw(dn,d+1):'');
  }).join('')+node.files.map(n=>{
    const [c,col]=iconOf(n);
    return`<div class="row ${n===S.active?'on':''}" style="--d:${d}" data-f="${esc(n)}" title="${esc(n)}"><i class="${c}" style="color:${col};width:14px;text-align:center"></i><span class="nm">${esc(base(n))}</span>${n===S.settings.entry?'<i class="fa-solid fa-star star" title="Entry file"></i>':''}<span class="acts">${isFscss(n)?'<button data-act="entry" title="Set as entry" aria-label="Set as entry"><i class="fa-regular fa-star"></i></button>':''}<button data-act="rename" title="Rename" aria-label="Rename"><i class="fa-solid fa-pen"></i></button><button data-act="dup" title="Duplicate" aria-label="Duplicate"><i class="fa-regular fa-clone"></i></button><button data-act="del" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash-can"></i></button></span></div>`;
  }).join('');
  $('#tree').innerHTML=draw(root,0)||'<div class="empty">No files yet</div>';
  $('#exList').innerHTML=Object.keys(EXAMPLES).map(k=>`<div class="row" data-ex="${k}"><i class="fa-solid fa-flask" style="color:var(--pink);width:14px;text-align:center"></i><span class="nm">${k}</span><i class="fa-solid fa-plus" style="color:var(--mut);font-size:11px"></i></div>`).join('');
  renderPages();
}
function renderPages(){
  const sel=$('#pageSel');if(!sel)return;
  const pg=VFS.pages();
  sel.innerHTML=pg.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')||'<option value="">default page</option>';
  sel.value=VFS.pickPage(S.page)||'';
}
function updateLang(){const m=ed?.getModel();$('#stLang').textContent=m?m.getLanguageId().replace('javascript','JavaScript').replace(/^./,c=>c.toUpperCase()).replace('Fscss','FSCSS'):'-'}
function renderAll(){renderTabs();renderTree();renderProblems();updateLang()}

/* ============================================================
   Problems
   ============================================================ */
let PROBS=[];
function addProblem(file,err,b){
  const msg=err?.message||String(err);
  const m=msg.match(/line\s*(\d+)(?:\D+(\d+))?/i);
  const o=b&&m?b.map[+m[1]-1]:null;
  const at=o?{file:o.file,line:o.line}:{file,line:m?+m[1]:1};
  const old=PROBS.filter(x=>x.root===file).map(x=>x.file);
  PROBS=PROBS.filter(x=>x.root!==file);
  PROBS.push({file:at.file,root:file,line:at.line,col:m&&m[2]?+m[2]:1,msg:at.file!==file?`${msg} (in ${at.file}, imported by ${file})`:msg});
  new Set([file,at.file,...old]).forEach(f=>markers(f));renderProblems();
}
function clearProblems(file){
  const old=PROBS.filter(x=>x.root===file||x.file===file).map(x=>x.file);
  PROBS=PROBS.filter(x=>x.root!==file&&x.file!==file);
  new Set([file,...old]).forEach(f=>markers(f));renderProblems();
}
function markers(file){
  const m=models[file];if(!m||m.isDisposed())return;
  const lc=m.getLineCount();
  monaco.editor.setModelMarkers(m,'fscss',PROBS.filter(p=>p.file===file).map(p=>{const l=clamp(p.line,1,lc);return{severity:monaco.MarkerSeverity.Error,message:p.msg,startLineNumber:l,startColumn:p.col,endLineNumber:l,endColumn:m.getLineMaxColumn(l)}}));
}
function renderProblems(){
  const n=PROBS.length;
  $('#probBadge').hidden=!n;$('#probBadge').textContent=n;$('#stProbN').textContent=n;
  $('#probs').innerHTML=n?PROBS.map((p,i)=>`<div class="pr" data-p="${i}"><i class="fa-solid fa-circle-xmark"></i><span>${esc(p.msg.split('\n')[0])}</span><small>${esc(p.file)}:${p.line}</small></div>`).join(''):'<div class="empty">No problems found</div>';
}

/* ============================================================
   Compiler
   ============================================================ */
function setStatus(state,text){$('#stComp').innerHTML=`<i class="dot ${state}"></i>${esc(text)}`}
function setBusy(b){const i=$('#btnRun i');i.className=b?'fa-solid fa-spinner spin':'fa-solid fa-play';$('#btnRun').disabled=b;if(b)setStatus('busy','Compiling...')}
async function loadCompiler(v){
  setStatus('busy','Loading compiler '+v+'...');
  try{
    const mod=await import(`https://cdn.jsdelivr.net/npm/fscss@${v}/esm.min.js`);
    xf=mod.default||mod;window.xfscss=xf;
    if(typeof xf.process!=='function')throw new Error('xfscss.process not found in this version');
    setStatus('ok','Compiler ready');$('#stVer').textContent='fscss@'+v;
    log('system','Loaded fscss@'+v);return true;
  }catch(e){
    xf=null;setStatus('err','Compiler unavailable');$('#stVer').textContent='fscss: offline';
    log('error','Failed to load fscss@'+v+': '+e.message);return false;
  }
}
async function build(name){
  if(!xf){log('error','Compiler is not loaded. Check your network or the version in Settings.');return null}
  const restore=intercept();
  const b=VFS.bundle(name);
  b.warnings.forEach(w=>log('warn',w));
  try{
    const t0=performance.now();
    const css=await xf.process(b.text);
    S.css[name]=css||'';clearProblems(name);
    return{ok:true,css:S.css[name],ms:performance.now()-t0,deps:b.deps};
  }catch(err){
    addProblem(name,err,b);
    return{ok:false,err};
  }finally{restore()}
}
const target=()=>isFscss(S.active||'')?S.active:S.settings.entry;
function showOutput(name){
  S.outFile=name;
  outEd.setValue(S.css[name]||'/* (empty) */');
  $('#outName').textContent=name?base(name).replace(/\.x?fscss$/,'')+'.css':'';
}
async function compile({preview=false}={}){
  const name=target();
  if(!name||!(name in S.files))return toast('Open an .fscss file first','warn');
  setBusy(true);log('system','Compiling '+name+'...');
  const r=await build(name);
  setBusy(false);
  if(!r){setStatus('err','Compiler unavailable');return}
  if(r.ok){
    showOutput(name);setStatus('ok','OK '+r.ms.toFixed(0)+' ms');
    log('system',`Compiled ${name} in ${r.ms.toFixed(1)} ms`);
    if(r.deps?.length)log('system','Bundled imports: '+r.deps.join(', '));
    stats(name,r.ms);
    if(preview)setOut('preview');else if(S.layout.outTab==='preview')refreshPreview();
  }else{
    setStatus('err','Error');log('error',r.err?.message||String(r.err));
    if(!S.settings.auto)setBottom('probs');
  }
}
async function compileAll(quiet=false){
  const names=VFS.roots();if(!names.length)return;
  if(!quiet){setBusy(true);log('system',`Compiling ${names.length} file(s)...`)}
  let ok=0,bad=0;
  for(const n of names){const r=await build(n);r?.ok?ok++:bad++}
  setBusy(false);
  const cur=target();if(cur&&S.css[cur]!==undefined)showOutput(cur);
  setStatus(bad?'err':xf?'ok':'err',bad?`${bad} failed`:xf?'Compiler ready':'Compiler unavailable');
  if(!quiet)log(bad?'warn':'system',`Compile all: ${ok} ok, ${bad} failed`);
  if(S.layout.outTab==='preview')refreshPreview();
}
const autoCompile=debounce(()=>VFS.isPartial(target())?compileAll(true):compile(),700);
const autoPreview=debounce(()=>refreshPreview(),700);

async function gz(str){
  try{const cs=new CompressionStream('gzip'),w=cs.writable.getWriter();w.write(new TextEncoder().encode(str));w.close();return(await new Response(cs.readable).arrayBuffer()).byteLength}catch{return null}
}
async function stats(name,ms){
  const inp=S.files[name]||'',out=S.css[name]||'',g=await gz(out);
  $('#stats').innerHTML=`<table><tr><td>File</td><td>${esc(base(name))}</td></tr><tr><td>Input</td><td>${bytes(new Blob([inp]).size)}</td></tr><tr><td>Output</td><td>${bytes(new Blob([out]).size)}</td></tr><tr><td>Gzipped</td><td>${g==null?'n/a':bytes(g)}</td></tr><tr><td>Lines</td><td>${inp.split('\n').length} to ${out.split('\n').length}</td></tr><tr><td>Rules</td><td>${(out.match(/\{/g)||[]).length}</td></tr><tr><td>Time</td><td>${ms.toFixed(1)} ms</td></tr></table>`;
}

/* ============================================================
   Preview
   ============================================================ */
const BRIDGE="(function(){['log','warn','info','error'].forEach(function(l){var o=console[l];console[l]=function(){var a=[].slice.call(arguments).map(function(x){try{return typeof x==='string'?x:JSON.stringify(x)}catch(e){return String(x)}});o.apply(console,arguments);parent.postMessage({fside:1,level:l,args:a},'*')}});addEventListener('error',function(e){parent.postMessage({fside:1,level:'error',args:[e.message]},'*')});document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)==='#')return;e.preventDefault();parent.postMessage({fside:1,nav:h},'*')})})();";
function buildPreview(bridge=true){
  S.page=VFS.pickPage(S.page);
  const r=VFS.buildPage({page:S.page,css:S.css,defaultHtml:DEFAULT_HTML,bridge,bridgeJs:BRIDGE});
  r.warnings.forEach(w=>log('warn','[preview] '+w));
  return r.html;
}
async function refreshPreview(){
  $('#prevLoad').hidden=false;
  S.page=VFS.pickPage(S.page);
  for(const n of VFS.neededFscss(S.page))if(S.css[n]===undefined)await build(n);
  $('#prev').onload=()=>{$('#prevLoad').hidden=true};
  $('#prev').srcdoc=buildPreview();
  setTimeout(()=>{$('#prevLoad').hidden=true},2500);
}
function openPreviewTab(){const u=URL.createObjectURL(new Blob([buildPreview(false)],{type:'text/html'}));window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
function setOut(t){
  S.layout.outTab=t;
  $$('[data-out]').forEach(b=>b.classList.toggle('on',b.dataset.out===t));
  $('#cssHost').hidden=t!=='css';$('#outPrev').hidden=t!=='preview';
  ['#pageSel','#devSel','#btnPrevTab','#btnPrevRef'].forEach(s=>{const el=$(s);if(el)el.hidden=t!=='preview'});
  if(t==='preview')refreshPreview();
  persistSoon();
}

/* ============================================================
   Terminal
   ============================================================ */
const HIST=[];let hi=0;
const out=(...a)=>log('out',...a);
const TERM={
  help:()=>out('Commands:\n  ls                  list files\n  cat <file>          print a file\n  open <file>         open in editor\n  new <file>          create a file\n  rm <file>           delete a file\n  mv <old> <new>      rename a file (updates imports and links)\n  compile | run       compile active file\n  all                 compile every root .fscss file\n  preview             compile and show preview\n  fscss <code>        compile a snippet inline\n  routes              list preview pages\n  deps [file]         show imports, links and who uses a file\n  resolve <from> <ref>  test how a path resolves\n  libs [query]        search components\n  theme dark|light    switch theme\n  version [x.y.z]     show or change compiler version\n  export              download project zip\n  clear               clear terminal'),
  ls:()=>Object.keys(S.files).sort().forEach(n=>out(n+(n===S.settings.entry?'  (entry)':'')+(VFS.isPartial(n)?'  (partial)':'')+'  '+bytes(S.files[n].length))),
  cat:([n])=>n in S.files?out(S.files[n]):log('error','No such file: '+n),
  open:([n])=>n in S.files?openFile(n):log('error','No such file: '+n),
  new:([n])=>n?out('Created '+addFile(n)):log('error','Usage: new <file>'),
  rm:async([n])=>{if(!(n in S.files))return log('error','No such file: '+n);await deleteFile(n)},
  mv:async([a,b])=>{if(!(a in S.files)||!b)return log('error','Usage: mv <old> <new>');const n=cleanName(b);if(n in S.files)return log('error','Target exists');
    fixRefs(a,n);
    S.files[n]=S.files[a];delete S.files[a];if(models[a]){models[a].dispose();delete models[a]}S.open=S.open.map(x=>x===a?n:x);if(S.active===a){S.active=n;ed.setModel(modelFor(n))}if(S.settings.entry===a)S.settings.entry=n;if(S.page===a)S.page=n;renderAll();persistSoon();out(a+' to '+n)},
  compile:()=>compile(),run:()=>compile(),all:()=>compileAll(),preview:()=>compile({preview:true}),
  fscss:async(_,rest)=>{if(!rest)return log('error','Usage: fscss <code>');if(!xf)return log('error','Compiler not loaded');const r=intercept();try{out(await xf.process(rest)||'(empty)')}catch(e){log('error',e.message)}finally{r()}},
  routes:()=>{const r=VFS.routes();r.length?r.forEach(x=>out(x.route.padEnd(22)+x.file)):out('No html pages yet')},
  deps:([f])=>{f=f||S.active;if(!f||!(f in S.files))return log('error','Usage: deps <file>');const d=VFS.deps(f);if(d.length)d.forEach(x=>out(x.kind.padEnd(7)+x.ref+'  ->  '+(x.to||(x.kind==='remote'?'remote library':'not in workspace'))));else out('No references in '+f);const by=VFS.refsTo(f);if(by.length)out('Referenced by: '+by.join(', '))},
  resolve:([from,ref])=>from&&ref?out(VFS.resolve(from,ref)||'not found'):log('error','Usage: resolve <from-file> <ref>'),
  libs:async([q])=>{if(!LIBS.length)await loadLibs();const l=LIBS.filter(x=>!q||(x.name+x.description).toLowerCase().includes(q.toLowerCase()));l.forEach(x=>out(`${x.name}${x.version?'@'+x.version:''}  ${x.repoUrl}`));if(!l.length)out('No matches')},
  theme:([t])=>{if(!['dark','light'].includes(t))return log('error','Usage: theme dark|light');S.settings.theme=t;applySettings()},
  version:async([v])=>{if(!v)return out('fscss@'+S.settings.version);S.settings.version=v;persistSoon();if(await loadCompiler(v))compileAll(true)},
  export:()=>CMD.dlZip.run(),clear:()=>clearLogs()
};
async function runTerm(line){
  log('cmd','$ '+line);
  const [cmd,...args]=line.split(/\s+/);
  const rest=line.slice(cmd.length).trim();
  const f=TERM[cmd];
  if(!f)return log('error',`Unknown command: ${cmd}. Type help.`);
  try{await f(args,rest)}catch(e){log('error',e.message)}
}
$('#termIn').addEventListener('keydown',e=>{
  const i=e.target;
  if(e.key==='Enter'){const v=i.value.trim();i.value='';if(v){HIST.push(v);hi=HIST.length;runTerm(v)}}
  else if(e.key==='ArrowUp'){e.preventDefault();if(hi>0)i.value=HIST[--hi]||''}
  else if(e.key==='ArrowDown'){e.preventDefault();hi=Math.min(HIST.length,hi+1);i.value=HIST[hi]||''}
  else if(e.key==='Tab'){e.preventDefault();const p=i.value.split(/\s+/);const last=p[p.length-1];const pool=p.length===1?Object.keys(TERM):Object.keys(S.files);const m=pool.filter(x=>x.startsWith(last));if(m.length===1){p[p.length-1]=m[0];i.value=p.join(' ')+' '}else if(m.length>1)out(m.join('  '))}
});

/* ============================================================
   Components (public libs.json)
   ============================================================ */
let LIBS=[],libsLoading=false;
const parseGH=u=>{const m=u.trim().match(/github\.com\/([^\/]+)\/([^\/\s]+?)(?:\.git)?\/?$/i);return m?{owner:m[1],repo:m[2]}:null};
const libStub=(u,d)=>{const p=parseGH(u);return{repoUrl:u,owner:p?.owner||'?',repo:p?.repo||u,name:p?.repo||u,description:d||'See the repository for details.',version:null,author:null,keywords:[]}};
async function fetchLib(u){
  const lib=libStub(u);const p=parseGH(u);if(!p)return libStub(u,'Invalid GitHub URL');
  for(const br of['main','master']){
    try{
      const r=await fetch(`https://raw.githubusercontent.com/${p.owner}/${p.repo}/${br}/package.json`);
      if(!r.ok)continue;
      
      const j=await r.json();
      
      if(j.name)lib.name=j.name;if(j.version)lib.version=j.version;if(j.description)lib.description=j.description;
      if(j.author)lib.author=typeof j.author==='string'?j.author:j.author?.name||null;
      if(Array.isArray(j.keywords))lib.keywords=j.keywords;
      const f=j.file?.remote||j.file?.modules?.[0];if(f)lib.imp=f.split('/').pop().replace(/\.x?fscss$/,'');
      break;
    }catch{}
  }
  return lib;
}
const impName=l=>l.imp||l.name.replace(/\.fscss$/,'');
function libSkeleton(n){$('#libGrid').innerHTML=Array.from({length:n},()=>'<div class="card"><div class="sk" style="height:14px;width:55%;margin-bottom:10px"></div><div class="sk" style="height:10px;margin-bottom:6px"></div><div class="sk" style="height:10px;width:75%;margin-bottom:12px"></div><div class="sk" style="height:22px;width:40%"></div></div>').join('')}
async function loadLibs(force=false){
  if(libsLoading)return;
  const c=store.get('libs',null);
  if(!force&&c&&Date.now()-c.t<18e5){LIBS=c.list;renderLibs();return}
  libsLoading=true;libSkeleton(4);$('#libCount').textContent='Loading components...';$('#btnLibsRefresh i').classList.add('spin');
  let remotes=FALLBACK_REMOTES;
  try{const r=await fetch(LIBS_URL);if(r.ok){const j=await r.json();if(Array.isArray(j.remotes)&&j.remotes.length)remotes=j.remotes}}
  catch{log('warn','Could not fetch libs.json, using fallback list')}
  let done=0;
  const res=await Promise.allSettled(remotes.map(async u=>{const l=await fetchLib(u);$('#libCount').textContent=`Loading ${++done}/${remotes.length}...`;return l}));
  LIBS=res.map((r,i)=>r.status==='fulfilled'?r.value:libStub(remotes[i],'Could not load package.json'));
  store.set('libs',{t:Date.now(),list:LIBS});
  libsLoading=false;$('#btnLibsRefresh i').classList.remove('spin');renderLibs();
  log('system',`Loaded ${LIBS.length} components`);
}
function renderLibs(){
  const q=$('#libSearch').value.trim().toLowerCase();
  const list=LIBS.filter(l=>!q||[l.name,l.description,l.author,l.owner,...l.keywords].some(x=>(x||'').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
  $('#libCount').textContent=list.length===1?'1 component':list.length+' components';
  $('#libGrid').innerHTML=list.length?list.map(l=>`<div class="card"><h4><span><i class="fa-solid fa-cube" style="opacity:.6"></i> ${esc(l.name)}</span>${l.version?`<small>v${esc(l.version)}</small>`:''}</h4><p>${esc(l.description)}</p>${l.keywords.length?`<div class="kw">${l.keywords.slice(0,5).map(k=>`<span>#${esc(k)}</span>`).join('')}</div>`:''}<div class="bt"><button class="btn sm" data-imp="${esc(impName(l))}"><i class="fa-solid fa-file-import"></i>Import</button><button class="btn sm ghost" data-copy="@import((*) from ${esc(impName(l))})"><i class="fa-regular fa-copy"></i>Copy</button><a class="btn sm ghost" href="${esc(l.repoUrl)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>Repo</a></div></div>`).join(''):'<div class="empty">No matching components</div>';
}
function insertImport(name){
  let t=target();
  if(!t){t=addFile('main.fscss','',false);}
  if(S.active!==t)openFile(t);
  const m=modelFor(t);
  if(new RegExp('from\\s+'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\)').test(m.getValue()))return toast(name+' is already imported','warn');
  ed.executeEdits('import',[{range:new monaco.Range(1,1,1,1),text:`@import((*) from ${name})\n`}]);
  toast('Added import: '+name,'ok');log('system','Inserted import for '+name);
}

/* ============================================================
   Snippets, tools
   ============================================================ */
function renderSnips(){
  const q=$('#snipSearch').value.trim().toLowerCase();
  $('#snipList').innerHTML=SNIPS.filter(s=>!q||(s.k+s.t+s.d).toLowerCase().includes(q)).map(s=>`<div class="snip" data-snip="${s.k}"><b><span>${esc(s.t)}</span><em>${s.k}</em></b><p>${esc(s.d)}</p></div>`).join('')||'<div class="empty">No snippets</div>';
}
function insertSnippet(b){
  if(!ed?.getModel())return toast('Open a file first','warn');
  ed.focus();
  const c=ed.getContribution('snippetController2');
  if(c?.insert)c.insert(b);else ed.trigger('keyboard','type',{text:b.replace(/\$\{\d+:?([^}]*)\}/g,'$1')});
}
function fmt(src){
  let depth=0,inTick=false;const o=[];
  for(const raw of src.replace(/\r/g,'').split('\n')){
    let tick=(raw.match(/`/g)||[]).length%2===1;
    if(inTick){if(!tick){o.push(raw);continue}inTick=false;tick=false}
    const line=raw.trim();
    if(!line){if(o.length&&o[o.length-1]!=='')o.push('');continue}
    const code=line.replace(/\/\*.*?\*\//g,'').replace(/(^|\s)\/\/.*$/,'').replace(/(["']).*?\1/g,'');
    const opens=(code.match(/[{(\[]/g)||[]).length,closes=(code.match(/[})\]]/g)||[]).length;
    const lead=(code.match(/^[})\]]+/)||[''])[0].length;
    o.push('  '.repeat(Math.max(0,depth-lead))+line);
    depth=Math.max(0,depth+opens-closes);
    if(tick)inTick=true;
  }
  return o.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}
const minify=c=>c.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{};,])\s*/g,'$1').replace(/:\s+/g,':').replace(/;}/g,'}').trim();
function formatActive(){
  const m=ed?.getModel();if(!m)return toast('Open a file first','warn');
  if(['css','fscss','plaintext'].includes(m.getLanguageId())){ed.pushUndoStop();ed.executeEdits('fmt',[{range:m.getFullModelRange(),text:fmt(m.getValue())}]);ed.pushUndoStop();toast('Formatted','ok')}
  else ed.getAction('editor.action.formatDocument')?.run();
}

/* ============================================================
   Export, import
   ============================================================ */
function download(name,data,type='text/plain'){
  const b=data instanceof Blob?data:new Blob([data],{type});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=-1;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);return(c^-1)>>>0};
function makeZip(entries){
  const enc=new TextEncoder(),chunks=[],central=[];let off=0;
  for(const[name,text]of entries){
    const nb=enc.encode(name),d=enc.encode(text),crc=crc32(d);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(12,0x21,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nb.length,true);
    chunks.push(new Uint8Array(lh.buffer),nb,d);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nb.length,true);ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer),nb);
    off+=30+nb.length+d.length;
  }
  const cs=central.reduce((a,b)=>a+b.length,0),end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);end.setUint32(12,cs,true);end.setUint32(16,off,true);
  return new Blob([...chunks,...central,new Uint8Array(end.buffer)],{type:'application/zip'});
}
async function ensureCss(){
  if(!VFS.roots().some(n=>S.css[n]===undefined))return;
  await compileAll(true);
}
async function importFiles(list){
  let last=null;
  for(const f of list){
    let text;try{text=await f.text()}catch{log('error','Could not read '+f.name);continue}
    if(ext(f.name)==='json'){
      let j=null;try{j=JSON.parse(text)}catch{}
      if(j&&j.fside&&j.files){
        const choice=await modal('Import project',`<p>${Object.keys(j.files).length} files found in ${esc(f.name)}.</p>`,{buttons:[{label:'Cancel',value:null},{label:'Merge',value:'merge'},{label:'Replace all',primary:true,danger:true,value:'replace'}]});
        if(!choice)continue;
        if(choice==='replace'){Object.keys(models).forEach(k=>{models[k].dispose();delete models[k]});S.files={};S.open=[];S.active=null;S.css={};PROBS=[]}
        for(const[n,c]of Object.entries(j.files))last=addFile(n,String(c),false);
        if(j.entry&&j.entry in S.files)S.settings.entry=j.entry;
        log('system','Imported project from '+f.name);continue;
      }
    }
    last=addFile(f.name,text,false);log('system','Imported '+f.name);
  }
  if(last){openFile(last);renderAll();toast('Import complete','ok')}
}

/* ============================================================
   Commands
   ============================================================ */
const sel=(m)=>({run:m});
const CMD={};
const cmds=[
 ['run','Compile active file','play','Ctrl+Enter',()=>compile()],
 ['runPrev','Compile and preview','eye','Ctrl+Shift+Enter',()=>compile({preview:true})],
 ['runAll','Compile all FSCSS files','layer-group','',()=>compileAll()],
 ['save','Save workspace','floppy-disk','Ctrl+S',()=>{persist();toast('Workspace saved','ok')}],
 ['palette','Command palette','terminal','Ctrl+Shift+P',()=>openPal(),'F1'],
 ['newFile','New file','file-circle-plus','Alt+N',async()=>{const v=await askInput('New file name','untitled.fscss');if(v)addFile(v)}],
 ['closeTab','Close tab','xmark','Alt+W',()=>S.active&&closeFile(S.active)],
 ['nextTab','Next tab','arrow-right','Alt+]',()=>cycleTab(1)],
 ['prevTab','Previous tab','arrow-left','Alt+[',()=>cycleTab(-1)],
 ['importFiles','Import files','file-import','',()=>$('#fileIn').click()],
 ['dlFile','Download current file','file-arrow-down','Ctrl+Shift+S',()=>{if(!S.active)return;download(base(S.active),S.files[S.active])}],
 ['dlCss','Download compiled CSS','download','',async()=>{const n=target();if(!n)return toast('No FSCSS file','warn');if(S.css[n]===undefined)await compile();if(S.css[n]!==undefined)download(base(n).replace(/\.x?fscss$/,'')+'.css',S.css[n],'text/css')}],
 ['dlMin','Download minified CSS','compress','',async()=>{const n=target();if(!n)return;if(S.css[n]===undefined)await compile();if(S.css[n]!==undefined)download(base(n).replace(/\.x?fscss$/,'')+'.min.css',minify(S.css[n]),'text/css')}],
 ['dlHtml','Download standalone HTML page','file-code','',async()=>{await ensureCss();download('index-standalone.html',buildPreview(false),'text/html')}],
 ['dlZip','Download project (ZIP with compiled CSS)','file-zipper','',async()=>{await ensureCss();const e=Object.entries(S.files);for(const n of VFS.roots())if(S.css[n])e.push(['dist/'+n.replace(/\.x?fscss$/,'')+'.css',S.css[n]]);download('fscss-project.zip',makeZip(e));log('system','Exported ZIP with '+e.length+' files')}],
 ['dlJson','Download project (JSON backup)','database','',()=>download('fscss-project.json',JSON.stringify({fside:1,entry:S.settings.entry,files:S.files},null,2),'application/json')],
 ['copyCss','Copy compiled CSS','copy','',async()=>{try{await navigator.clipboard.writeText(outEd.getValue());toast('CSS copied','ok')}catch{toast('Clipboard blocked by the browser','err')}}],
 ['share','Copy share link for active file','link','',async()=>{if(!S.active)return;const u=location.href.split('#')[0]+'#code='+encodeURIComponent(S.files[S.active]);try{await navigator.clipboard.writeText(u);toast(u.length>4000?'Link copied (long, may not work everywhere)':'Share link copied','ok')}catch{toast('Clipboard blocked by the browser','err')}}],
 ['format','Format document','align-left','Alt+Shift+F',formatActive],
 ['beautify','Beautify CSS output','indent','',()=>{outEd.setValue(fmt(outEd.getValue()));toast('Output beautified','ok')}],
 ['minify','Minify CSS output','compress','',()=>{outEd.setValue(minify(outEd.getValue()));toast('Output minified','ok')}],
 ['entry','Set active file as entry','star','',()=>{if(S.active&&isFscss(S.active)){S.settings.entry=S.active;renderAll();persistSoon();toast('Entry: '+S.active,'ok')}else toast('Pick an .fscss file','warn')}],
 ['toggleSide','Toggle sidebar','table-columns','Ctrl+B',()=>{S.layout.side=!S.layout.side;applyLayout();persistSoon()}],
 ['toggleBottom','Toggle terminal panel','window-minimize','Ctrl+J',()=>{S.layout.bot=!S.layout.bot;applyLayout();persistSoon()}],
 ['focusTerm','Focus terminal','terminal','Ctrl+`',()=>{setBottom('term',true);$('#termIn').focus()}],
 ['showProblems','Show problems','circle-exclamation','',()=>setBottom('probs',true)],
 ['clearLogs','Clear terminal','trash-can','',clearLogs],
 ['viewFiles','Show files','folder-open','Alt+1',()=>setView('files',true)],
 ['viewLibs','Search components','cubes','Alt+2',()=>setView('libs',true)],
 ['viewSnips','Show snippets','wand-magic-sparkles','Alt+3',()=>setView('snips',true)],
 ['viewTools','Show tools','screwdriver-wrench','Alt+4',()=>setView('tools',true)],
 ['outCss','Show CSS output','file-code','',()=>setOut('css')],
 ['outPrev','Show preview','eye','Alt+P',()=>{S.layout.outTab==='preview'?setOut('css'):compile({preview:true})}],
 ['openPrev','Open preview in new tab','arrow-up-right-from-square','',openPreviewTab],
 ['refreshPrev','Reload preview','rotate','',refreshPreview],
 ['toggleAuto','Toggle compile on type','bolt','Alt+A',()=>{S.settings.auto=!S.settings.auto;applySettings();toast('Auto compile '+(S.settings.auto?'on':'off'))}],
 ['theme','Toggle light and dark theme','circle-half-stroke','Alt+T',()=>{S.settings.theme=S.settings.theme==='dark'?'light':'dark';applySettings()}],
 ['wrap','Toggle word wrap','text-width','',()=>{S.settings.wrap=!S.settings.wrap;applySettings()}],
 ['minimap','Toggle minimap','map','',()=>{S.settings.minimap=!S.settings.minimap;applySettings()}],
 ['fontUp','Increase font size','plus','',()=>{S.settings.fontSize=Math.min(28,S.settings.fontSize+1);applySettings()}],
 ['fontDown','Decrease font size','minus','',()=>{S.settings.fontSize=Math.max(10,S.settings.fontSize-1);applySettings()}],
 ['reloadLibs','Refresh component list','rotate','',()=>loadLibs(true)],
 ['settings','Settings','gear','',openSettings],
 ['keys','Keyboard shortcuts','keyboard','Alt+/',openKeys],
 ['docs','Open FSCSS documentation','book','',()=>window.open('https://fscss.devtem.org/docs','_blank','noopener')],
 ['reset','Reset workspace','triangle-exclamation','',resetWorkspace]
];
const KEYMAP={};
cmds.forEach(([id,label,icon,key,run,key2])=>{CMD[id]={id,label,icon,key,run};if(key)KEYMAP[key]=CMD[id];if(key2)KEYMAP[key2]=CMD[id]});
const runCmd=id=>CMD[id]?.run();

function cycleTab(d){if(S.open.length<2)return;const i=S.open.indexOf(S.active);openFile(S.open[(i+d+S.open.length)%S.open.length])}
async function resetWorkspace(){
  if(!await confirmBox('Reset workspace','This replaces all files with the defaults and clears saved settings. Export a backup first if you need one.',true))return;
  try{Object.keys(localStorage).filter(k=>k.startsWith('fside:')).forEach(k=>localStorage.removeItem(k))}catch{}
  location.reload();
}

function combo(e){
  let k=e.code||'';
  if(k.startsWith('Key'))k=k.slice(3);else if(k.startsWith('Digit'))k=k.slice(5);
  else if(k==='Backquote')k='`';else if(k==='BracketLeft')k='[';else if(k==='BracketRight')k=']';else if(k==='Slash')k='/';
  else if(k==='NumpadEnter')k='Enter';
  return[(e.ctrlKey||e.metaKey)&&'Ctrl',e.altKey&&'Alt',e.shiftKey&&'Shift',k].filter(Boolean).join('+');
}
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(modalDone){modalDone(null);return}
    if(!$('#pal').hidden){closePal();return}
    $$('.dd.open').forEach(d=>d.classList.remove('open'));return;
  }
  const c=KEYMAP[combo(e)];if(!c)return;
  e.preventDefault();e.stopPropagation();c.run();
},true);

/* palette */
let palIdx=0,palItems=[];
function palBuild(q){
  const toks=q.toLowerCase().split(/\s+/).filter(Boolean);
  const all=[
    ...Object.values(CMD).map(c=>({label:c.label,ic:'fa-solid fa-'+c.icon,key:c.key,run:c.run})),
    ...Object.keys(S.files).map(n=>({label:'Open '+n,ic:iconOf(n)[0],hint:'File',run:()=>openFile(n)})),
    ...Object.keys(EXAMPLES).map(k=>({label:'Load example: '+k,ic:'fa-solid fa-flask',hint:'Example',run:()=>loadExample(k)})),
    ...SNIPS.map(s=>({label:'Insert snippet: '+s.t,ic:'fa-solid fa-wand-magic-sparkles',hint:s.k,run:()=>insertSnippet(s.b)}))
  ];
  return all.filter(it=>toks.every(t=>it.label.toLowerCase().includes(t))).slice(0,60);
}
function palRender(){
  palItems=palBuild($('#palIn').value);palIdx=clamp(palIdx,0,Math.max(0,palItems.length-1));
  $('#palList').innerHTML=palItems.map((it,i)=>`<div class="pi ${i===palIdx?'on':''}" data-i="${i}"><i class="${it.ic}"></i><span>${esc(it.label)}</span>${it.key?`<kbd>${esc(it.key)}</kbd>`:it.hint?`<small>${esc(it.hint)}</small>`:''}</div>`).join('')||'<div class="empty">Nothing matches</div>';
  $('.pi.on')?.scrollIntoView({block:'nearest'});
}
function openPal(){$('#pal').hidden=false;$('#palIn').value='';palIdx=0;palRender();$('#palIn').focus()}
function closePal(){$('#pal').hidden=true;ed?.focus()}
function palRun(i){const it=palItems[i];if(!it)return;$('#pal').hidden=true;it.run()}
$('#palIn').addEventListener('input',()=>{palIdx=0;palRender()});
$('#palIn').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();palIdx=Math.min(palItems.length-1,palIdx+1);palRender()}
  else if(e.key==='ArrowUp'){e.preventDefault();palIdx=Math.max(0,palIdx-1);palRender()}
  else if(e.key==='Enter'){e.preventDefault();palRun(palIdx)}
});
$('#palList').addEventListener('click',e=>{const r=e.target.closest('.pi');if(r)palRun(+r.dataset.i)});
$('#pal').addEventListener('mousedown',e=>{if(e.target.id==='pal')closePal()});

/* settings, keys */
function openSettings(){
  const s=S.settings,fs=Object.keys(S.files).filter(isFscss);
  modal('Settings',`
    <div class="fr"><label for="sTheme">Theme</label><select id="sTheme"><option value="dark">Dark</option><option value="light">Light</option></select></div>
    <div class="fr"><label for="sFont">Font size</label><input id="sFont" type="number" min="10" max="28" value="${s.fontSize}"></div>
    <div class="fr"><label for="sWrap">Word wrap</label><input id="sWrap" type="checkbox" ${s.wrap?'checked':''}></div>
    <div class="fr"><label for="sMap">Minimap</label><input id="sMap" type="checkbox" ${s.minimap?'checked':''}></div>
    <div class="fr"><label for="sAuto">Compile while typing</label><input id="sAuto" type="checkbox" ${s.auto?'checked':''}></div>
    <div class="fr"><label for="sEntry">Entry file</label><select id="sEntry">${fs.map(n=>`<option ${n===s.entry?'selected':''}>${esc(n)}</option>`).join('')||'<option value="">None</option>'}</select></div>
    <div class="fr"><label for="sVer">Compiler version</label><span style="display:flex;gap:6px"><input id="sVer" type="text" value="${esc(s.version)}" style="width:90px"><button class="btn sm" id="sLoad">Load</button></span></div>`,
  {onOpen:w=>{
    $('#sTheme',w).value=s.theme;
    const bind=(id,fn)=>$(id,w).addEventListener('change',e=>{fn(e.target);applySettings()});
    bind('#sTheme',t=>s.theme=t.value);bind('#sFont',t=>s.fontSize=clamp(+t.value||14,10,28));
    bind('#sWrap',t=>s.wrap=t.checked);bind('#sMap',t=>s.minimap=t.checked);bind('#sAuto',t=>s.auto=t.checked);bind('#sEntry',t=>s.entry=t.value);
    $('#sLoad',w).onclick=async e=>{const b=e.currentTarget;b.innerHTML='<i class="fa-solid fa-spinner spin"></i>';s.version=$('#sVer',w).value.trim()||DEF_SET.version;persistSoon();const ok=await loadCompiler(s.version);b.textContent='Load';toast(ok?'Compiler loaded':'Could not load that version',ok?'ok':'err');if(ok)compileAll(true)};
  }});
}
function openKeys(){
  const rows=Object.values(CMD).filter(c=>c.key).map(c=>`<div><span>${esc(c.label)}</span><kbd>${esc(c.key)}</kbd></div>`).join('');
  modal('Keyboard shortcuts',`<div class="kg">${rows}<div><span>Run terminal history</span><kbd>Up / Down</kbd></div><div><span>Terminal completion</span><kbd>Tab</kbd></div></div>`,{wide:true});
}
function applySettings(){
  const s=S.settings;
  document.documentElement.dataset.theme=s.theme;
  $('#btnTheme i').className='fa-solid fa-'+(s.theme==='dark'?'moon':'sun');
  $('#autoChk').checked=s.auto;
  if(window.monaco&&ed){
    monaco.editor.setTheme(themeName());
    ed.updateOptions({fontSize:s.fontSize,wordWrap:s.wrap?'on':'off',minimap:{enabled:s.minimap}});
    outEd.updateOptions({fontSize:s.fontSize});
  }
  renderTabs();renderTree();persistSoon();
}

/* ============================================================
   Layout
   ============================================================ */
function setView(v,show){
  if(!show&&S.layout.view===v&&S.layout.side)S.layout.side=false;
  else{S.layout.view=v;S.layout.side=true}
  applyLayout();persistSoon();
  if(v==='libs'&&S.layout.side&&!LIBS.length)loadLibs();
  if(S.layout.side&&show){$('.view.on input')?.focus()}
}
function setBottom(t,show){
  S.layout.botTab=t;if(show)S.layout.bot=true;
  applyLayout();persistSoon();
}
function applyLayout(){
  const L=S.layout;
  document.body.classList.toggle('side-off',!L.side);
  document.body.classList.toggle('bot-off',!L.bot);
  document.documentElement.style.setProperty('--sbw',L.sbw+'px');
  document.documentElement.style.setProperty('--bph',L.bph+'px');
  $('#pL').style.flex='0 0 '+(L.split*100)+'%';
  $$('.view').forEach(v=>v.classList.toggle('on',v.dataset.v===L.view));
  $$('#act [data-view]').forEach(b=>b.classList.toggle('on',L.side&&b.dataset.view===L.view));
  $$('[data-bt]').forEach(b=>b.classList.toggle('on',b.dataset.bt===L.botTab));
  $('#bpTerm').classList.toggle('on',L.botTab==='term');$('#bpProbs').classList.toggle('on',L.botTab==='probs');
  $('#logFilter').hidden=L.botTab!=='term';
}
function drag(el,fn){
  el.addEventListener('pointerdown',e=>{
    el.setPointerCapture(e.pointerId);el.classList.add('drag');document.body.classList.add('dragging');
    const mv=ev=>fn(ev);
    const up=()=>{el.releasePointerCapture?.(e.pointerId);el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.classList.remove('drag');document.body.classList.remove('dragging');persistSoon()};
    el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);e.preventDefault();
  });
}
function initResizers(){
  drag($('#rsSide'),e=>{S.layout.sbw=clamp(e.clientX-$('#side').getBoundingClientRect().left,170,520);applyLayout()});
  drag($('#rsSplit'),e=>{const r=$('#split').getBoundingClientRect();S.layout.split=clamp((e.clientX-r.left)/r.width,.2,.8);applyLayout()});
  drag($('#rsBot'),e=>{const r=$('#wb').getBoundingClientRect();S.layout.bph=clamp(r.bottom-e.clientY,70,r.height*.7);applyLayout()});
}

/* ============================================================
   UI wiring
   ============================================================ */
function fillMenu(sel,ids){
  $(sel).innerHTML=ids.map(id=>{const c=CMD[id];return`<button data-cmd="${id}"><i class="fa-solid fa-${c.icon}"></i><span>${esc(c.label)}</span>${c.key?`<kbd>${esc(c.key)}</kbd>`:''}</button>`}).join('');
}
function bindUI(){
  fillMenu('#menuExp',['dlFile','dlCss','dlMin','dlHtml','dlZip','dlJson','copyCss','share']);
  $('#toolGrid').innerHTML=['format','beautify','minify','copyCss','share','runAll','entry','wrap','minimap','openPrev','docs','reset'].map(id=>`<button data-cmd="${id}"><i class="fa-solid fa-${CMD[id].icon}"></i><span>${esc(CMD[id].label.replace('Compile all FSCSS files','Compile all').replace('Set active file as entry','Set as entry').replace('Open preview in new tab','Open preview').replace('Open FSCSS documentation','Docs'))}</span></button>`).join('');
  $('#builtin').innerHTML=BUILTIN_LIBS.map(n=>`<button class="chip" data-imp="${n}" title="Insert import">${n}</button>`).join('');

  const ps=document.createElement('select');ps.id='pageSel';ps.title='Preview page';ps.hidden=true;ps.style.maxWidth='130px';$('#devSel').before(ps);
  ps.addEventListener('change',e=>{S.page=e.target.value;refreshPreview()});

  document.addEventListener('click',e=>{
    const dd=e.target.closest('[data-dd]');
    if(dd){const p=dd.closest('.dd');const was=p.classList.contains('open');$$('.dd.open').forEach(x=>x.classList.remove('open'));p.classList.toggle('open',!was);return}
    if(!e.target.closest('.menu'))$$('.dd.open').forEach(x=>x.classList.remove('open'));
    const c=e.target.closest('[data-cmd]');if(c){$$('.dd.open').forEach(x=>x.classList.remove('open'));runCmd(c.dataset.cmd);return}
    const v=e.target.closest('[data-view]');if(v){setView(v.dataset.view);return}
    const imp=e.target.closest('[data-imp]');if(imp){insertImport(imp.dataset.imp);return}
    const cp=e.target.closest('[data-copy]');if(cp){navigator.clipboard.writeText(cp.dataset.copy).then(()=>toast('Copied','ok'),()=>toast('Clipboard blocked','err'));return}
    const sn=e.target.closest('[data-snip]');if(sn){insertSnippet(SNIPS.find(s=>s.k===sn.dataset.snip).b);return}
    const ex=e.target.closest('[data-ex]');if(ex){loadExample(ex.dataset.ex);return}
    const ot=e.target.closest('[data-out]');if(ot){setOut(ot.dataset.out);return}
    const bt=e.target.closest('[data-bt]');if(bt){setBottom(bt.dataset.bt);return}
    const fl=e.target.closest('#logFilter [data-f]');if(fl){lf=fl.dataset.f;$$('#logFilter button').forEach(b=>b.classList.toggle('on',b===fl));renderLogs();return}
    const pr=e.target.closest('[data-p]');if(pr){const p=PROBS[+pr.dataset.p];openFile(p.file);ed.revealLineInCenter(p.line);ed.setPosition({lineNumber:p.line,column:p.col});return}
  });

  $('#tabs').addEventListener('click',e=>{
    const t=e.target.closest('.tab');if(!t)return;
    if(e.target.closest('[data-close]'))closeFile(t.dataset.n);else openFile(t.dataset.n);
  });
  $('#tabs').addEventListener('auxclick',e=>{if(e.button!==1)return;const t=e.target.closest('.tab');if(t){e.preventDefault();closeFile(t.dataset.n)}});

  $('#tree').addEventListener('click',e=>{
    const row=e.target.closest('.row');if(!row)return;
    if(row.dataset.dir!==undefined){const d=row.dataset.dir;S.collapsed[d]=!S.collapsed[d];renderTree();persistSoon();return}
    const n=row.dataset.f,a=e.target.closest('[data-act]')?.dataset.act;
    if(a==='rename')renameFile(n);else if(a==='del')deleteFile(n);else if(a==='dup')dupFile(n);
    else if(a==='entry'){S.settings.entry=n;renderAll();persistSoon();toast('Entry: '+n,'ok')}
    else{openFile(n);if(matchMedia('(max-width:860px)').matches){S.layout.side=false;applyLayout()}}
  });

  $('#libSearch').addEventListener('input',renderLibs);
  $('#snipSearch').addEventListener('input',renderSnips);
  $('#autoChk').addEventListener('change',e=>{S.settings.auto=e.target.checked;persistSoon()});
  $('#devSel').addEventListener('change',e=>{$('#prev').style.width=e.target.value==='full'?'100%':e.target.value+'px'});
  $('#fileIn').addEventListener('change',e=>{importFiles([...e.target.files]);e.target.value=''});

  let dc=0;
  addEventListener('dragenter',e=>{if(e.dataTransfer?.types?.includes('Files')){dc++;$('#dropHint').hidden=false}});
  addEventListener('dragleave',()=>{dc=Math.max(0,dc-1);if(!dc)$('#dropHint').hidden=true});
  addEventListener('dragover',e=>e.preventDefault());
  addEventListener('drop',e=>{e.preventDefault();dc=0;$('#dropHint').hidden=true;if(e.dataTransfer?.files?.length)importFiles([...e.dataTransfer.files])});
  addEventListener('beforeunload',persist);
  initResizers();
}

function readHash(){
  const h=location.hash;let code=null;
  if(h.startsWith('#run?code='))code=h.slice(10);else if(h.startsWith('#code='))code=h.slice(6);
  else code=new URLSearchParams(location.search).get('code');
  if(!code)return;
  try{addFile('shared.fscss',decodeURIComponent(code).trim());log('system','Loaded code from URL as shared.fscss')}
  catch{log('error','The code in the URL could not be decoded')}
}

/* ============================================================
   Boot
   ============================================================ */
async function boot(){
  applyLayout();$('#btnTheme i').className='fa-solid fa-'+(S.settings.theme==='dark'?'moon':'sun');$('#autoChk').checked=S.settings.auto;
  log('system','FSCSS IDE starting');
  splash(10,'Loading editor...');
  try{await loadMonaco()}catch(e){splash(10,'Editor failed to load: '+e.message);log('error',e.message);return}
  splash(50,'Preparing workspace...');
  initEditors();bindUI();renderAll();renderSnips();setOut(S.layout.outTab);
  if(S.active)openFile(S.active,false);
  splash(70,'Loading FSCSS compiler...');
  await loadCompiler(S.settings.version);
  splash(90,'Compiling...');
  readHash();
  await compileAll(true);
  if(S.layout.view==='libs')loadLibs();
  persist();
  splash(100,'Ready');
  setTimeout(()=>{$('#splash').classList.add('out');setTimeout(()=>$('#splash').remove(),500)},250);
  log('system','Ready. Press Ctrl+Shift+P for commands or type help below.');
}

window.IDE={S,TERM,SNIPS,VFS,log,out,toast,addFile,openFile,renderAll,renderSnips,persistSoon,compile,compileAll,insertImport,setView,setBottom,setOut,runTerm,loadLibs,parseGH,store,cleanName,getLibs:()=>LIBS};
import('./xfcmds.js').catch(e=>log('warn','xfcmds.js not loaded: '+e.message));

boot();



  /* ============================================================
   PWA Install Prompt (Chrome-style)
   ============================================================ */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  deferredPrompt = e;

  // Show your custom install button / toast
  showInstallButton();
});

function showInstallButton() {
  // Example: toast + permanent button in the status bar
  /* toast('Install FSCSS IDE as an app for a better experience', 'ok', 8000); */

  // Or create a permanent button (recommended)
  if ($('#btnInstall')) return;          // already exists

  const btn = document.createElement('button');
  btn.id = 'btnInstall';
  btn.className = 'ib';
  btn.title = 'Install as app';
  btn.innerHTML = '<i class="fa-solid fa-download"></i>';
  btn.style.marginLeft = '4px';

  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();               // shows the native Chrome dialog
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast('Thanks! FSCSS IDE is now installed', 'ok');
      btn.remove();
    }
    deferredPrompt = null;
  });

  // Put it next to the theme/settings buttons in the header
  $('#top').appendChild(btn);
}

// Optional: detect if already installed
window.addEventListener('appinstalled', () => {
  toast('FSCSS IDE installed successfully!', 'ok');
  $('#btnInstall')?.remove();
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

