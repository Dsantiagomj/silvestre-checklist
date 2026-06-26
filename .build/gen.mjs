// Generador de los 3 HTML standalone de "Dofus Silvestre".
// Comparte data + CSS + JS base; sólo cambian hero y headline por versión.
import { readFileSync, writeFileSync } from "fs";

const STEPS_JS = readFileSync(
  new URL("./steps.js", import.meta.url),
  "utf8",
);

const ROOT = new URL("../", import.meta.url);
const out = (name) => new URL(name, ROOT);

// ---------------------------------------------------------------------------
// CSS compartido (tema Dofus dashboard, claro/oscuro)
// ---------------------------------------------------------------------------
const CSS = `
:root{
  --bg:#0a0e1a; --bg2:#131829; --card:#161c30; --card2:#1c2640;
  --txt:#e8e8e8; --txt-dim:#9aa6c0; --line:#26304d;
  --turq:#00d4d4; --turq2:#00a4a4; --gold:#f4c430; --gold2:#d4a017;
  --green:#3fbf6f; --blue:#3f8fdf; --yellow:#e6b13a; --orange:#e07a2f; --purple:#a05cd6;
  --shadow:0 6px 24px rgba(0,0,0,.45);
  --radius:14px;
  --maxw:980px;
  --fontstack:'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
}
[data-theme="light"]{
  --bg:#f5ecd9; --bg2:#faf5e6; --card:#fffaf0; --card2:#f3e9d2;
  --txt:#1a1a1a; --txt-dim:#6b5d44; --line:#e0d3b4;
  --turq:#0a8a8a; --turq2:#0a6f6f; --gold:#b8860b; --gold2:#9c7009;
  --green:#2f9d57; --blue:#2f6fbf; --yellow:#bf8f15; --orange:#c2641f; --purple:#7e44b0;
  --shadow:0 6px 20px rgba(120,90,30,.18);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; font-family:var(--fontstack); background:var(--bg); color:var(--txt);
  line-height:1.5; transition:background .4s ease, color .4s ease;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:var(--maxw); margin:0 auto; padding:0 16px}

/* Header */
header{
  position:sticky; top:0; z-index:50; backdrop-filter:blur(10px);
  background:color-mix(in srgb, var(--bg) 86%, transparent);
  border-bottom:1px solid var(--line); transition:background .4s ease, border-color .4s ease;
}
.hbar{display:flex; align-items:center; gap:12px; padding:12px 0; max-width:var(--maxw); margin:0 auto; padding-left:16px; padding-right:16px}
.logo{font-weight:800; letter-spacing:3px; font-size:18px; display:flex; align-items:center; gap:10px}
.logo .dot{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,var(--turq),var(--gold));box-shadow:0 0 12px var(--turq)}
.logo b{background:linear-gradient(90deg,var(--turq),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
.spacer{flex:1}
.hbtn{
  background:var(--card); color:var(--txt); border:1px solid var(--line);
  border-radius:10px; padding:8px 12px; cursor:pointer; font-size:14px; font-family:inherit;
  transition:all .2s ease; display:inline-flex; align-items:center; gap:6px;
}
.hbtn:hover{border-color:var(--turq); box-shadow:0 0 10px color-mix(in srgb,var(--turq) 40%,transparent); transform:translateY(-1px)}

/* Notice */
.notice{
  background:color-mix(in srgb,var(--gold) 14%, var(--card)); border:1px solid color-mix(in srgb,var(--gold) 45%,var(--line));
  border-radius:12px; padding:10px 14px; margin:16px 0; font-size:13.5px; color:var(--txt);
  display:flex; gap:10px; align-items:flex-start;
}
.notice .ic{font-size:16px; line-height:1.3}

.tagline{text-align:center; color:var(--txt-dim); font-size:14px; margin:14px 0 4px; font-style:italic}

/* Hero */
.hero{
  background:linear-gradient(160deg,var(--card),var(--card2)); border:1px solid var(--line);
  border-radius:var(--radius); padding:22px; margin:14px 0 20px; box-shadow:var(--shadow);
}
.hero h1{margin:0 0 4px; font-size:15px; letter-spacing:1px; text-transform:uppercase; color:var(--txt-dim); font-weight:700}
.headline{font-size:clamp(30px,6vw,46px); font-weight:800; margin:2px 0 14px; letter-spacing:1px}
.headline .big{background:linear-gradient(90deg,var(--turq),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
.bar-outer{background:color-mix(in srgb,var(--line) 70%, transparent); border-radius:999px; height:22px; overflow:hidden; position:relative; border:1px solid var(--line)}
.bar-fill{height:100%; border-radius:999px; background:linear-gradient(90deg,var(--turq),var(--gold)); width:0%; transition:width .7s cubic-bezier(.22,1,.36,1); box-shadow:0 0 14px color-mix(in srgb,var(--turq) 50%,transparent)}
.bar-fill.gold{background:linear-gradient(90deg,var(--gold2),var(--gold))}
.bar-fill.turq{background:linear-gradient(90deg,var(--turq2),var(--turq))}
.bar-label{display:flex; justify-content:space-between; font-size:13px; color:var(--txt-dim); margin:4px 2px 0}
.bar-block{margin:14px 0}
.bar-block .cap{font-weight:700; font-size:14px; margin-bottom:6px; display:flex; align-items:center; gap:8px}

/* V3 dual explanation */
.dual-note{font-size:13px; color:var(--txt-dim); margin-top:10px; border-top:1px dashed var(--line); padding-top:10px}

/* Zone breakdown (V1) */
.zbreak{margin-top:16px; border-top:1px solid var(--line); padding-top:14px}
.zbreak h2{font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--txt-dim); margin:0 0 10px}
.zrow{display:grid; grid-template-columns:1fr; gap:4px; margin-bottom:10px}
.zrow .zmeta{display:flex; justify-content:space-between; align-items:baseline; font-size:13px; gap:8px; flex-wrap:wrap}
.zrow .zname{font-weight:600}
.zrow .zsub{color:var(--txt-dim); font-size:12px}
.zmini-outer{background:color-mix(in srgb,var(--line) 70%,transparent); border-radius:999px; height:9px; overflow:hidden}
.zmini-fill{height:100%; border-radius:999px; transition:width .6s cubic-bezier(.22,1,.36,1)}

/* Tier stacked (V2) */
.tierstack{margin-top:16px; border-top:1px solid var(--line); padding-top:14px}
.tierstack h2{font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--txt-dim); margin:0 0 10px}
.stack-outer{display:flex; height:26px; border-radius:8px; overflow:hidden; border:1px solid var(--line); background:var(--bg2)}
.stack-seg{height:100%; transition:flex-grow .6s ease; min-width:0; display:flex; align-items:center; justify-content:center; font-size:11px; color:#0a0e1a; font-weight:700; overflow:hidden}
.stack-legend{display:flex; flex-wrap:wrap; gap:10px 16px; margin-top:10px; font-size:12.5px}
.stack-legend .li{display:flex; align-items:center; gap:6px}
.stack-legend .sw{width:12px;height:12px;border-radius:3px;display:inline-block}

/* Stats row */
.stats{display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:0 0 18px}
.stat{background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; text-align:center}
.stat .num{font-size:22px; font-weight:800; color:var(--turq)}
.stat.gold .num{color:var(--gold)}
.stat .lab{font-size:12px; color:var(--txt-dim); margin-top:2px}
.stat.act{cursor:pointer; transition:all .2s}
.stat.act:hover{border-color:var(--gold); transform:translateY(-2px); box-shadow:0 0 12px color-mix(in srgb,var(--gold) 35%,transparent)}

/* Filters */
.filters{background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; margin-bottom:16px; display:flex; flex-direction:column; gap:10px}
.frow{display:flex; gap:8px; flex-wrap:wrap; align-items:center}
.filters label{font-size:12px; color:var(--txt-dim)}
.filters select, .filters input[type=text]{
  background:var(--bg2); color:var(--txt); border:1px solid var(--line); border-radius:8px; padding:7px 10px; font-size:13px; font-family:inherit;
}
.filters input[type=text]{flex:1; min-width:160px}
.chk{display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--txt); cursor:pointer; user-select:none}
.chk input{accent-color:var(--turq); width:16px;height:16px}

/* Steps list */
.list{display:flex; flex-direction:column; gap:12px}
.card{
  background:var(--card); border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px;
  display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:start; cursor:pointer;
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, opacity .3s ease, background .3s ease;
  position:relative;
}
.card:hover{transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.35); border-color:color-mix(in srgb,var(--turq) 55%,var(--line))}
.card.done{opacity:.62; border-color:color-mix(in srgb,var(--gold) 45%,var(--line)); background:color-mix(in srgb,var(--gold) 6%,var(--card))}
.card.done .stext{text-decoration:line-through; text-decoration-color:color-mix(in srgb,var(--gold) 70%,transparent)}
.card.pulse{animation:pulse 1.2s ease}
@keyframes pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--turq) 70%,transparent)}50%{box-shadow:0 0 0 8px color-mix(in srgb,var(--turq) 0%,transparent); border-color:var(--turq)}100%{box-shadow:0 0 0 0 transparent}}

.snum{
  font-size:26px; font-weight:800; min-width:46px; text-align:center; line-height:1;
  color:var(--turq); background:var(--bg2); border:1px solid var(--line); border-radius:10px; padding:8px 6px;
}
.card.done .snum{color:var(--gold); border-color:color-mix(in srgb,var(--gold) 50%,var(--line))}
.snum small{display:block; font-size:9px; letter-spacing:1px; color:var(--txt-dim); font-weight:700; margin-top:3px}

.smain{min-width:0}
.stext{font-size:14.5px; white-space:pre-wrap; word-wrap:break-word}
.badges{display:flex; flex-wrap:wrap; gap:6px; margin-top:10px}
.badge{font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; display:inline-flex; align-items:center; gap:4px; border:1px solid transparent; white-space:nowrap}
.zbadge{background:transparent; border-color:currentColor}
.tbadge{color:#0a0e1a}
.t-trivial{background:var(--green)} .t-corto{background:var(--blue)} .t-medio{background:var(--yellow)} .t-largo{background:var(--orange)} .t-epico{background:var(--purple); color:#fff}
.tmbadge{background:var(--bg2); color:var(--txt-dim); border-color:var(--line)}
.wbadge{background:var(--bg2); color:var(--gold); border-color:color-mix(in srgb,var(--gold) 40%,var(--line))}

.toggle{
  width:30px; height:30px; border-radius:50%; border:2px solid var(--line); background:var(--bg2);
  display:flex; align-items:center; justify-content:center; font-size:16px; color:transparent; transition:all .25s ease; flex-shrink:0;
}
.card.done .toggle{background:linear-gradient(135deg,var(--gold2),var(--gold)); border-color:var(--gold); color:#0a0e1a}
.card:hover .toggle{border-color:var(--turq)}

.empty{text-align:center; color:var(--txt-dim); padding:40px 10px; font-style:italic}

footer{margin:30px 0 24px; padding-top:16px; border-top:1px solid var(--line); text-align:center; color:var(--txt-dim); font-size:12.5px}
footer a{color:var(--turq); text-decoration:none}

@media(max-width:640px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .card{grid-template-columns:auto 1fr; }
  .toggle{grid-column:1; grid-row:2; margin-top:6px}
  .snum{font-size:22px; min-width:40px}
  .headline{font-size:30px}
}
`;

// ---------------------------------------------------------------------------
// JS base de la app (lógica común). El cálculo de progreso y render de hero
// se inyecta por versión vía window.SILVESTRE_VERSION + funciones hook.
// ---------------------------------------------------------------------------
const APP_JS = String.raw`
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// Estado persistente
const LS_KEY = VERSION_KEY + ":done";
const LS_THEME = "silvestre:theme";
let done = {};
try { done = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch(e){ done = {}; }

// Tema
function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  $("#themeBtn").textContent = t === "light" ? "🌙 Modo oscuro" : "☀️ Modo claro";
  localStorage.setItem(LS_THEME, t);
}
let theme = localStorage.getItem(LS_THEME) || "dark";

// Zonas: color HSL consistente
const ZONES = [...new Set(STEPS.map(s=>s.zone))];
function zoneColor(zone){
  const i = ZONES.indexOf(zone);
  const hue = Math.round((i / ZONES.length) * 360);
  return "hsl(" + hue + ",55%,55%)";
}

// Cálculos
function totalPoints(){ return STEPS.reduce((a,s)=>a+TIER_POINTS[s.effort],0); }
function donePoints(){ return STEPS.reduce((a,s)=>a+(done[s.n]?TIER_POINTS[s.effort]:0),0); }
function doneCount(){ return STEPS.filter(s=>done[s.n]).length; }

// Peso por zona (V1): cada zona aporta su peso relativo; pasos equiponderados dentro de la zona.
function zoneWeights(){
  const tp = totalPoints();
  const zp = {}, zs = {}, zd = {};
  STEPS.forEach(s=>{
    zp[s.zone]=(zp[s.zone]||0)+TIER_POINTS[s.effort];
    zs[s.zone]=(zs[s.zone]||0)+1;
    zd[s.zone]=(zd[s.zone]||0)+(done[s.n]?1:0);
  });
  return ZONES.map(z=>({
    zone:z, points:zp[z], steps:zs[z], doneSteps:zd[z],
    weight: zp[z]/tp*100,
    contrib: (zd[z]/zs[z]) * (zp[z]/tp*100), // % global aportado
  })).sort((a,b)=>b.weight-a.weight);
}
function weightedByZonePct(){
  return zoneWeights().reduce((a,z)=>a+z.contrib,0);
}

// % "peso por esfuerzo" (V2/V3) = puntos hechos / puntos totales
function weightedByEffortPct(){ return donePoints()/totalPoints()*100; }

// Tiempo estimado restante (rango sumado de tiers pendientes)
const TIER_HOURS = { trivial:[0.17,0.5], corto:[1,2], medio:[3,5], largo:[8,15], epico:[20,40] };
function remainingTime(){
  let lo=0, hi=0;
  STEPS.forEach(s=>{ if(!done[s.n]){ lo+=TIER_HOURS[s.effort][0]; hi+=TIER_HOURS[s.effort][1]; }});
  const f = (x)=> x>=1 ? Math.round(x)+"h" : Math.round(x*60)+"min";
  if(lo===0 && hi===0) return "¡Completo!";
  return f(lo) + "–" + f(hi);
}
function nextPending(){ const s = STEPS.find(s=>!done[s.n]); return s ? s.n : null; }

// Filtros
const state = { zone:"", tier:"", onlyPending:false, q:"" };

function renderStats(){
  $("#stDone").textContent = doneCount();
  $("#stPend").textContent = 100 - doneCount();
  const np = nextPending();
  $("#stNext").textContent = np ? ("Paso " + np) : "—";
  $("#stTime").textContent = remainingTime();
}

function matchFilters(s){
  if(state.zone && s.zone !== state.zone) return false;
  if(state.tier && s.effort !== state.tier) return false;
  if(state.onlyPending && done[s.n]) return false;
  if(state.q){
    const q = state.q.toLowerCase();
    if(!s.text.toLowerCase().includes(q) && !("paso "+s.n).includes(q) && !s.zone.toLowerCase().includes(q)) return false;
  }
  return true;
}

function stepCard(s){
  const tm = TIER_META[s.effort];
  const zc = zoneColor(s.zone);
  const tp = totalPoints();
  const pct = (TIER_POINTS[s.effort]/tp*100).toFixed(1);
  const card = document.createElement("div");
  card.className = "card" + (done[s.n] ? " done" : "");
  card.dataset.n = s.n;
  card.innerHTML =
    '<div class="snum">' + s.n + '<small>PASO</small></div>' +
    '<div class="smain">' +
      '<div class="stext"></div>' +
      '<div class="badges">' +
        '<span class="badge zbadge" style="color:'+zc+'">📍 '+s.zone+'</span>' +
        '<span class="badge tbadge '+tm.cls+'">'+tm.icon+' '+tm.label+'</span>' +
        '<span class="badge tmbadge">⏱ '+TIER_TIME[s.effort]+'</span>' +
        '<span class="badge wbadge">vale '+pct+'% del total</span>' +
      '</div>' +
    '</div>' +
    '<div class="toggle">✓</div>';
  card.querySelector(".stext").textContent = s.text; // verbatim, sin HTML
  card.addEventListener("click", ()=>toggle(s.n, card));
  return card;
}

function renderList(){
  const list = $("#list");
  list.innerHTML = "";
  const shown = STEPS.filter(matchFilters);
  if(shown.length === 0){
    list.innerHTML = '<div class="empty">No hay pasos que coincidan con los filtros.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  shown.forEach(s=>frag.appendChild(stepCard(s)));
  list.appendChild(frag);
}

function toggle(n, card){
  done[n] = !done[n];
  if(!done[n]) delete done[n];
  localStorage.setItem(LS_KEY, JSON.stringify(done));
  if(card){
    card.classList.toggle("done", !!done[n]);
    const tg = card.querySelector(".toggle");
  }
  // si "sólo pendientes" está activo y se marca, ocúltalo suavemente
  if(state.onlyPending && done[n] && card){
    card.style.opacity = "0";
    setTimeout(()=>{ if(matchFilters.length) renderList(); else renderList(); }, 280);
  }
  refresh();
}

function refresh(){
  renderStats();
  renderHero();   // definido por versión
}

function gotoNext(){
  const np = nextPending();
  if(np == null){ alert("¡Ya completaste los 100 pasos! 🎉"); return; }
  // limpia filtros que puedan ocultarlo
  if(state.onlyPending){ /* sigue visible, es pendiente */ }
  // si hay filtro de zona/tier que lo oculta, lo quitamos
  const s = STEPS.find(x=>x.n===np);
  if((state.zone && s.zone!==state.zone) || (state.tier && s.effort!==state.tier) || state.q){
    state.zone=""; state.tier=""; state.q="";
    $("#fZone").value=""; $("#fTier").value=""; $("#fSearch").value="";
    renderList();
  }
  requestAnimationFrame(()=>{
    const card = $('.card[data-n="'+np+'"]');
    if(card){
      card.scrollIntoView({behavior:"smooth", block:"center"});
      card.classList.remove("pulse"); void card.offsetWidth; card.classList.add("pulse");
    }
  });
}

function resetAll(){
  if(!confirm("¿Seguro que quieres reiniciar TODO tu progreso? Esta acción no se puede deshacer.")) return;
  done = {};
  localStorage.removeItem(LS_KEY);
  renderList();
  refresh();
}

// Init
function initFilters(){
  const zsel = $("#fZone");
  zoneWeights().slice().sort((a,b)=>a.zone.localeCompare(b.zone)).forEach(z=>{
    const o = document.createElement("option"); o.value=z.zone; o.textContent=z.zone; zsel.appendChild(o);
  });
  zsel.addEventListener("change", e=>{ state.zone=e.target.value; renderList(); });
  $("#fTier").addEventListener("change", e=>{ state.tier=e.target.value; renderList(); });
  $("#fPending").addEventListener("change", e=>{ state.onlyPending=e.target.checked; renderList(); });
  $("#fSearch").addEventListener("input", e=>{ state.q=e.target.value.trim(); renderList(); });
}

document.addEventListener("DOMContentLoaded", ()=>{
  applyTheme(theme);
  $("#themeBtn").addEventListener("click", ()=>{ theme = (document.documentElement.getAttribute("data-theme")==="light")?"dark":"light"; applyTheme(theme); });
  $("#resetBtn").addEventListener("click", resetAll);
  $("#nextBtn").addEventListener("click", gotoNext);
  $("#stNextBox").addEventListener("click", gotoNext);
  initFilters();
  renderList();
  refresh();
});
`;

// ---------------------------------------------------------------------------
// Hero render por versión
// ---------------------------------------------------------------------------
const HERO_V1 = String.raw`
function renderHero(){
  const pct = weightedByZonePct();
  $("#headlineNum").textContent = pct.toFixed(1) + "%";
  $("#mainBar").style.width = pct.toFixed(2) + "%";
  $("#mainBarPct").textContent = pct.toFixed(1) + "%";
  // breakdown por zona
  const zb = $("#zoneBreak");
  zb.innerHTML = "";
  zoneWeights().forEach(z=>{
    const zc = zoneColor(z.zone);
    const fillPct = z.steps ? (z.doneSteps/z.steps*100) : 0;
    const row = document.createElement("div");
    row.className = "zrow";
    row.innerHTML =
      '<div class="zmeta">' +
        '<span class="zname" style="color:'+zc+'">'+z.zone+'</span>' +
        '<span class="zsub">'+z.doneSteps+'/'+z.steps+' pasos · peso '+z.weight.toFixed(1)+'%</span>' +
      '</div>' +
      '<div class="zmini-outer"><div class="zmini-fill" style="width:'+fillPct.toFixed(1)+'%;background:'+zc+'"></div></div>';
    zb.appendChild(row);
  });
}
`;

const HERO_V2 = String.raw`
function renderHero(){
  const dp = donePoints(), tp = totalPoints();
  const pct = dp/tp*100;
  $("#headlineNum").textContent = dp + " / " + tp + " pts (" + pct.toFixed(1) + "%)";
  $("#mainBar").style.width = pct.toFixed(2) + "%";
  $("#mainBarPct").textContent = pct.toFixed(1) + "%";
  // stacked por tier
  const tiers = ["trivial","corto","medio","largo","epico"];
  const tpts = {}, dpts = {};
  tiers.forEach(t=>{ tpts[t]=0; dpts[t]=0; });
  STEPS.forEach(s=>{ tpts[s.effort]+=TIER_POINTS[s.effort]; if(done[s.n]) dpts[s.effort]+=TIER_POINTS[s.effort]; });
  const stack = $("#tierStack");
  stack.innerHTML = "";
  const colorVar = {trivial:"--green",corto:"--blue",medio:"--yellow",largo:"--orange",epico:"--purple"};
  tiers.forEach(t=>{
    const seg = document.createElement("div");
    seg.className = "stack-seg";
    seg.style.flexGrow = tpts[t];
    const c = getComputedStyle(document.documentElement).getPropertyValue(colorVar[t]).trim();
    // porción hecha en color sólido, pendiente atenuada
    const donePctInTier = tpts[t] ? (dpts[t]/tpts[t]*100) : 0;
    seg.style.background = "linear-gradient(90deg,"+c+" "+donePctInTier+"%, color-mix(in srgb,"+c+" 22%, var(--bg2)) "+donePctInTier+"%)";
    seg.title = TIER_META[t].label + ": " + dpts[t] + "/" + tpts[t] + " pts";
    seg.textContent = tpts[t] >= 60 ? (TIER_META[t].label) : "";
    stack.appendChild(seg);
  });
  // leyenda
  const leg = $("#tierLegend");
  leg.innerHTML = "";
  tiers.forEach(t=>{
    const c = "var("+colorVar[t]+")";
    const dc = STEPS.filter(s=>s.effort===t && done[s.n]).length;
    const tc = STEPS.filter(s=>s.effort===t).length;
    const li = document.createElement("span");
    li.className = "li";
    li.innerHTML = '<span class="sw" style="background:'+c+'"></span>' + TIER_META[t].icon + ' ' + TIER_META[t].label + ' · ' + dc + '/' + tc + ' (' + dpts[t] + '/' + tpts[t] + ' pts)';
    leg.appendChild(li);
  });
}
`;

const HERO_V3 = String.raw`
function renderHero(){
  const dc = doneCount();
  const flatPct = dc; // 0..100
  const wPct = weightedByEffortPct();
  $("#headlineCount").textContent = dc + "/100";
  $("#headlineW").textContent = wPct.toFixed(1) + "%";
  $("#flatBar").style.width = flatPct.toFixed(2) + "%";
  $("#flatBarPct").textContent = flatPct + "%";
  $("#wBar").style.width = wPct.toFixed(2) + "%";
  $("#wBarPct").textContent = wPct.toFixed(1) + "%";
  $("#wBarPts").textContent = donePoints() + " / " + totalPoints() + " pts";
}
`;

// ---------------------------------------------------------------------------
// Markup de hero por versión
// ---------------------------------------------------------------------------
const HEROHTML = {
  v1: `
  <div class="hero">
    <h1>Progreso ponderado por zona</h1>
    <div class="headline"><span class="big" id="headlineNum">0%</span> <span style="font-size:.5em;color:var(--txt-dim)">completado</span></div>
    <div class="bar-outer"><div class="bar-fill" id="mainBar"></div></div>
    <div class="bar-label"><span>Avance real (peso por zona)</span><span id="mainBarPct">0%</span></div>
    <div class="zbreak">
      <h2>Desglose por zona</h2>
      <div id="zoneBreak"></div>
    </div>
  </div>`,
  v2: `
  <div class="hero">
    <h1>Progreso ponderado por esfuerzo</h1>
    <div class="headline"><span class="big" id="headlineNum">0 / 0 pts</span></div>
    <div class="bar-outer"><div class="bar-fill" id="mainBar"></div></div>
    <div class="bar-label"><span>Avance real (puntos de esfuerzo)</span><span id="mainBarPct">0%</span></div>
    <div class="tierstack">
      <h2>Reparto por nivel de esfuerzo</h2>
      <div class="stack-outer" id="tierStack"></div>
      <div class="stack-legend" id="tierLegend"></div>
    </div>
  </div>`,
  v3: `
  <div class="hero">
    <h1>Doble barra: conteo vs. progreso real</h1>
    <div class="headline"><span class="big" id="headlineCount">0/100</span> <span style="color:var(--txt-dim);font-size:.6em">pasos ·</span> <span class="big" id="headlineW" style="background:linear-gradient(90deg,var(--gold2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent">0%</span> <span style="color:var(--txt-dim);font-size:.6em">real</span></div>
    <div class="bar-block">
      <div class="cap">📊 Pasos completados <span style="color:var(--txt-dim);font-weight:400">(sistema actual)</span></div>
      <div class="bar-outer"><div class="bar-fill turq" id="flatBar"></div></div>
      <div class="bar-label"><span>Cada paso cuenta como 1%</span><span id="flatBarPct">0%</span></div>
    </div>
    <div class="bar-block">
      <div class="cap">🏆 Progreso real <span style="color:var(--txt-dim);font-weight:400">(peso por esfuerzo)</span></div>
      <div class="bar-outer"><div class="bar-fill gold" id="wBar"></div></div>
      <div class="bar-label"><span id="wBarPts">0 / 0 pts</span><span id="wBarPct">0%</span></div>
    </div>
    <div class="dual-note">El sistema actual (arriba) cuenta cada paso como 1%. El nuevo sistema (abajo) refleja el esfuerzo real: un logro épico de 30 horas no pesa lo mismo que una misión de 15 minutos.</div>
  </div>`,
};

const TAGLINE = {
  v1: "Sistema: peso por zona — cada zona contribuye proporcionalmente a su volumen real",
  v2: "Sistema: peso por esfuerzo — cada paso pesa según el tiempo real que requiere",
  v3: "Sistema: doble barra — compara el conteo plano con el progreso real ponderado",
};
const HEROFN = { v1: HERO_V1, v2: HERO_V2, v3: HERO_V3 };
const VKEY = { v1: "silvestre-v1", v2: "silvestre-v2", v3: "silvestre-v3" };
const TITLE = {
  v1: "Dofus Silvestre · Checklist (Peso por Zona)",
  v2: "Dofus Silvestre · Checklist (Peso por Esfuerzo)",
  v3: "Dofus Silvestre · Checklist (Doble Barra)",
};

function buildHTML(v){
  return `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE[v]}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="hbar">
    <div class="logo"><span class="dot"></span>DOFUS <b>SILVESTRE</b></div>
    <div class="spacer"></div>
    <button class="hbtn" id="nextBtn" title="Ir al siguiente paso pendiente">⤵️ Siguiente pendiente</button>
    <button class="hbtn" id="themeBtn">☀️ Modo claro</button>
    <button class="hbtn" id="resetBtn" title="Reiniciar progreso">🗑️ Reiniciar</button>
  </div>
</header>

<div class="wrap">
  <p class="tagline">${TAGLINE[v]}</p>

  <div class="notice">
    <span class="ic">⚠️</span>
    <span><b>Importante:</b> el progreso se guarda en tu navegador. Si entras desde otro dispositivo o borras la caché, el progreso no se conservará.</span>
  </div>

  ${HEROHTML[v]}

  <div class="stats">
    <div class="stat"><div class="num" id="stDone">0</div><div class="lab">Completados</div></div>
    <div class="stat"><div class="num" id="stPend">100</div><div class="lab">Pendientes</div></div>
    <div class="stat act" id="stNextBox"><div class="num" id="stNext">Paso 1</div><div class="lab">Siguiente pendiente ↗</div></div>
    <div class="stat gold"><div class="num" id="stTime">—</div><div class="lab">Tiempo estimado restante</div></div>
  </div>

  <div class="filters">
    <div class="frow">
      <label>Zona:</label>
      <select id="fZone"><option value="">Todas</option></select>
      <label>Esfuerzo:</label>
      <select id="fTier">
        <option value="">Todos</option>
        <option value="trivial">🌱 Trivial</option>
        <option value="corto">🕐 Corto</option>
        <option value="medio">⚔️ Medio</option>
        <option value="largo">🛡️ Largo</option>
        <option value="epico">👑 Épico</option>
      </select>
      <label class="chk"><input type="checkbox" id="fPending"> Sólo pendientes</label>
    </div>
    <div class="frow">
      <input type="text" id="fSearch" placeholder="🔎 Buscar en los pasos (texto, zona, &quot;paso 42&quot;…)">
    </div>
  </div>

  <div class="list" id="list"></div>

  <footer>
    Guía original por <b>Sandglass</b> · Rediseño del sistema de progreso ·
    Contenido de los pasos reproducido textualmente.<br>
    Dofus es una marca de Ankama. Esta es una herramienta no oficial hecha por y para la comunidad.
  </footer>
</div>

<script>
${STEPS_JS}
const VERSION_KEY = ${JSON.stringify(VKEY[v])};
${APP_JS}
${HEROFN[v]}
</script>
</body>
</html>`;
}

const files = {
  "silvestre-v1-pesos-zona.html": "v1",
  "silvestre-v2-pesos-esfuerzo.html": "v2",
  "silvestre-v3-doble-barra.html": "v3",
};
for(const [name, v] of Object.entries(files)){
  const html = buildHTML(v);
  writeFileSync(out(name), html, "utf8");
  console.log("Wrote", name, (html.length/1024).toFixed(1)+"KB");
}
