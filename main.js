import { Record, InitialPositionSFEN, importKIF, Color, PieceType, Square, pieceTypeToSFEN, standardPieceName } from "tsshogi";
import "./style.css";

const PNAME={pawn:"歩",lance:"香",knight:"桂",silver:"銀",gold:"金",bishop:"角",rook:"飛",king:"玉",promPawn:"と",promLance:"成香",promKnight:"成桂",promSilver:"成銀",horse:"馬",dragon:"竜"};
const HAND_TYPES=[PieceType.ROOK,PieceType.BISHOP,PieceType.GOLD,PieceType.SILVER,PieceType.KNIGHT,PieceType.LANCE,PieceType.PAWN];
const COLORS={black:Color.BLACK,white:Color.WHITE};
const ranks=["a","b","c","d","e","f","g","h","i"];
const strategyBook={
 "指定なし":[],
 "鬼殺し":["7g7f","3c3d","7i6h","8c8d","6h7g","4a3b"],
 "嬉野流":["7g7f","3c3d","5i6h","8c8d","6h7g","4a3b"],
 "村田システム":["7g7f","3c3d","6i7h","8c8d","7h6h","4a3b"]
};

let record=new Record();
let selected=null, targets=[], selectedHand=null;
let worker=null, engineReady=false, thinking=false, engineStarted=false;
let evalText="—", pvText="—", resultText="";
let settings={side:"black",strength:"初段",time:2,strategy:"指定なし"};

document.querySelector("#app").innerHTML=`
<div class="top"><div><h1>Browser Shogi AI</h1><div class="sub" id="status">AIを準備しています…</div></div><button id="new">新規対局</button></div>
<div class="layout">
 <div class="panel">
  <div id="board" class="board"></div>
  <div class="hands"><div id="whiteHand" class="hand"></div><div id="blackHand" class="hand"></div></div>
 </div>
 <div class="panel controls">
  <div class="grid2"><label>あなたの手番<select id="side"><option value="black">先手</option><option value="white">後手</option></select></label><label>AI強さ<select id="strength"><option>初段</option><option>中間</option><option>できるだけ強く</option></select></label></div>
  <div class="grid2"><label>思考時間<select id="time"><option value=".25">0.25秒</option><option value=".5">0.5秒</option><option value="1">1秒</option><option value="2" selected>2秒</option><option value="3">3秒</option></select></label><label>戦型<select id="strategy"><option>指定なし</option><option>鬼殺し</option><option>嬉野流</option><option>村田システム</option></select></label></div>
  <div class="grid2"><button id="undo">待った</button><button id="resign">投了</button></div>
  <div class="grid2"><button id="save">棋譜保存</button><button id="load">棋譜読み込み</button><input id="file" type="file" accept=".json,.kif,.kifu" hidden></div>
  <div><div>評価値（AI視点ではなく先手視点）</div><div id="eval" class="eval">—</div></div>
  <div><div>読み筋</div><div id="pv" class="pv">—</div></div>
  <div><div>棋譜</div><div id="moves" class="moves"></div></div>
  <div class="note">初回アクセス時はCOOP/COEPを有効にするService Workerのため、ページが1回自動更新されます。GitHub Pagesでもやねうら王WASMのSharedArrayBufferを使える構成です。</div>
 </div>
</div>`;

const $=id=>document.getElementById(id);
function myColor(){return COLORS[settings.side]}
function isMyTurn(){return record.position.color===myColor()}

function pieceAt(file,rank){return record.position.board.at(new Square(file,rank))}
function usi(file,rank){return `${file}${ranks[rank-1]}`}
function validMove(u){const m=record.position.createMoveByUSI(u);return m&&record.position.isValidMove(m)?m:null}

function legalFrom(file,rank){
 const out=[];
 const from=usi(file,rank);
 for(let f=1;f<=9;f++)for(let r=1;r<=9;r++){
  const to=usi(f,r);
  const a=validMove(from+to); if(a)out.push({file:f,rank:r,usi:a.usi});
  const b=validMove(from+to+"+"); if(b)out.push({file:f,rank:r,usi:b.usi});
 }
 return out;
}
function legalDrop(type){
 const out=[];
 const sf=pieceTypeToSFEN(type);
 for(let f=1;f<=9;f++)for(let r=1;r<=9;r++){
  const m=validMove(sf+"*"+usi(f,r));if(m)out.push({file:f,rank:r,usi:m.usi});
 }
 return out;
}

function renderHands(){
 for(const [id,color] of [["blackHand",Color.BLACK],["whiteHand",Color.WHITE]]){
  const hand=record.position.hand(color); const el=$(id); el.innerHTML=(color===Color.BLACK?"先手":"後手")+"：";
  for(const type of HAND_TYPES){
   const n=hand.count(type); if(!n)continue;
   const b=document.createElement("button"); b.textContent=PNAME[type]+(n>1?"×"+n:"");
   b.onclick=()=>{if(!isMyTurn()||thinking||record.position.color!==color)return;selected=null;selectedHand=type;targets=legalDrop(type);render()};
   el.appendChild(b);
  }
  if(el.children.length===0)el.textContent+=(color===Color.BLACK?"なし":"なし");
 }
}

function render(){
 const b=$("board");b.innerHTML="";
 for(let rank=1;rank<=9;rank++)for(let file=1;file<=9;file++){
  const c=document.createElement("div");c.className="cell";
  if(selected&&selected.file===file&&selected.rank===rank)c.classList.add("sel");
  if(targets.some(t=>t.file===file&&t.rank===rank))c.classList.add("target");
  const p=pieceAt(file,rank);
  if(p){const s=document.createElement("span");s.textContent=PNAME[p.type]||standardPieceName(p.type);if(p.color===Color.WHITE)s.classList.add("gote");if(p.type.startsWith("prom")||p.type==="horse"||p.type==="dragon")s.classList.add("prom");c.appendChild(s)}
  c.onclick=()=>clickSquare(file,rank);
  b.appendChild(c);
 }
 renderHands();
 $("eval").textContent=evalText;$("pv").textContent=pvText;
 const r=new Record(record.initialPosition), lines=[];let ply=0;
 while(r.goForward()){ply++;lines.push(`${ply}. ${r.current.displayText}`)}
 $("moves").textContent=lines.join("\n");
 $("status").textContent=thinking?"AI思考中…":(resultText||(!engineReady?"AI準備中…":(isMyTurn()?"あなたの手番":"AIの手番")));
}

function clickSquare(file,rank){
 if(thinking||!isMyTurn())return;
 const t=targets.filter(x=>x.file===file&&x.rank===rank);
 if(t.length){
  let chosen=t[0];
  if(t.length>1){const promoted=t.find(x=>x.usi.endsWith("+"));if(promoted)chosen=confirm("成りますか？")?promoted:t.find(x=>!x.usi.endsWith("+"))||promoted}
  play(chosen.usi);return;
 }
 selectedHand=null;
 const p=pieceAt(file,rank);
 if(p&&p.color===record.position.color){selected={file,rank};targets=legalFrom(file,rank)}else{selected=null;targets=[]}
 render();
}

function play(u){
 const m=record.position.createMoveByUSI(u);if(!m||!record.position.isValidMove(m))return;
 if(!record.append(m)){return}
 selected=null;targets=[];selectedHand=null;evalText="—";pvText="—";resultText="";render();
 if(!isMyTurn())setTimeout(aiMove,80);
}

function strengthLevel(){return settings.strength==="初段"?7:settings.strength==="中間"?14:20}
function bookMove(){
 const seq=strategyBook[settings.strategy]||[];const ply=record.current?record.current.ply:0;
 if(ply>=seq.length)return null;
 const candidate=seq[ply];const m=validMove(candidate);return m?m.usi:null;
}
function aiMove(){
 if(!engineReady||isMyTurn()||thinking)return;
 const book=bookMove();if(book){play(book);return}
 thinking=true;render();
 worker.postMessage({type:"command",command:`setoption name Skill Level value ${strengthLevel()}`});
 worker.postMessage({type:"command",command:`position sfen ${record.position.sfen}`});
 worker.postMessage({type:"command",command:`go movetime ${Math.max(1,Math.round(Number(settings.time)*1000))}`});
}

function newGame(){
 record=new Record();selected=null;targets=[];selectedHand=null;thinking=false;evalText="—";pvText="—";resultText="";render();
 if(!isMyTurn())setTimeout(aiMove,250);
}

$("new").onclick=newGame;
$("side").onchange=e=>{settings.side=e.target.value;newGame()};
$("strength").onchange=e=>settings.strength=e.target.value;
$("time").onchange=e=>settings.time=Number(e.target.value);
$("strategy").onchange=e=>settings.strategy=e.target.value;

$("undo").onclick=()=>{
 if(thinking)return;
 record.goBack();
 if(!isMyTurn()&&record.current)record.goBack();
 selected=null;targets=[];selectedHand=null;render();
};
$("resign").onclick=()=>{if(!thinking)resultText="投了しました。";render()};
$("save").onclick=()=>{
 const r=new Record(record.initialPosition.sfen),moves=[];
 while(r.goForward())moves.push(r.current.usi);
 const blob=new Blob([JSON.stringify({initial:record.initialPosition.sfen,moves,settings},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="shogi-game.json";a.click();URL.revokeObjectURL(a.href);
};
$("load").onclick=()=>$("file").click();
$("file").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  let rec;
  if(/\.kif$|\.kifu$/i.test(f.name)){rec=importKIF(await f.text());if(rec instanceof Error)throw rec}
  else{const d=JSON.parse(await f.text());rec=new Record(d.initial||InitialPositionSFEN.STANDARD);for(const u of d.moves||[]){const m=rec.position.createMoveByUSI(u);if(!m||!rec.position.isValidMove(m))throw new Error("不正な指し手: "+u);rec.append(m)}if(d.settings)settings={...settings,...d.settings}}
  record=rec;selected=null;targets=[];selectedHand=null;resultText="";render();
 }catch(err){alert("棋譜を読み込めませんでした。\\n"+err)}
};

worker=new Worker(new URL("./engine.worker.js",import.meta.url),{type:"module"});
worker.onmessage=e=>{
 const m=e.data;
 if(m.type==="error"){
  thinking=false;
  resultText="AI初期化エラー: "+(m.error || "原因不明");
  render();
  console.error("AI error:",m.error);
  console.error("name:",m.name);
  console.error("stack:",m.stack);
  return;
}
 if(m.type!=="line")return;
 const line=m.line;
 if(line==="usiok"){worker.postMessage({type:"command",command:"setoption name USI_Ponder value false"});worker.postMessage({type:"command",command:"isready"});return}
 if(line==="readyok"){engineReady=true;render();if(!isMyTurn())setTimeout(aiMove,150);return}
 if(line.startsWith("info ")){
  const cp=line.match(/score cp (-?\d+)/);if(cp){let v=Number(cp[1])/100;if(record.position.color===Color.WHITE)v=-v;evalText=(v>=0?"+":"")+v.toFixed(2)}
  const pv=line.match(/\spv (.+)$/);if(pv)pvText=pv[1];render();return
 }
 if(line.startsWith("bestmove ")){
  const u=line.split(/\s+/)[1];thinking=false;if(u&&u!=="0000")play(u);else render();
 }
};
worker.postMessage({type:"init"});
render();
