document.addEventListener("DOMContentLoaded", () => {

let estadoAtual = {
  intensidade: 0,
  prob: 0,
  chuvaForte: false
};

let estrelasGeradas = false;

/* ================= PEGAR LOCAL AUTOMÁTICO ================= */
function initLocalizacao() {

  if (!navigator.geolocation) {
    atualizar(); // fallback
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      LAT = pos.coords.latitude;
      LON = pos.coords.longitude;

      document.getElementById("cidadeAtual").textContent = "Local atual";

      atualizar();
    },
    err => {
      console.warn("GPS negado ou indisponível");

      document.getElementById("cidadeAtual").textContent = "Local padrão";

      atualizar(); // usa padrão
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000
    }
  );
}

/* ================= SOL / LUA ================= */
function atualizarCicloSolar() {
  const sun = document.querySelector(".sun");
  const moon = document.querySelector(".moon");
  const stars = document.getElementById("stars");

  const agora = new Date();
  const hora = agora.getHours() + agora.getMinutes() / 60;

  if (hora >= 6 && hora <= 18) {

    const p = (hora - 6) / 12;

    sun.style.left = (10 + p * 80) + "vw";
    sun.style.top = (70 - Math.sin(p * Math.PI) * 60) + "vh";
    sun.style.opacity = 1;
    sun.style.filter = `brightness(${0.6 + p * 0.6})`;

    moon.style.opacity = 0;
    stars.style.opacity = 0;
    estrelasGeradas = false;

  } else {

    let h = hora < 6 ? hora + 24 : hora;
    const p = (h - 18) / 12;

    moon.style.left = (10 + p * 80) + "vw";
    moon.style.top = (70 - Math.sin(p * Math.PI) * 60) + "vh";
    moon.style.opacity = 0.5 + Math.sin(p * Math.PI) * 0.3;

    sun.style.opacity = 0;

    if (!estrelasGeradas) {
      gerarEstrelas();
      estrelasGeradas = true;
    }

    stars.style.opacity = estadoAtual.chuvaForte ? 0.2 : 1;
  }
}

/* ================= ESTRELAS ================= */
function gerarEstrelas(qtd = 80) {
  const layer = document.getElementById("stars");
  layer.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = Math.random()*100+"vw";
    s.style.top = Math.random()*100+"vh";
    s.style.animationDuration = (1 + Math.random()*2)+"s";
    layer.appendChild(s);
  }
}

/* ================= CHUVA ================= */
function startRain(i=60){
  const r = document.getElementById("rain");
  r.innerHTML="";
  for(let x=0;x<i;x++){
    const d=document.createElement("div");
    d.className="drop";
    d.style.left=Math.random()*100+"vw";
    r.appendChild(d);
  }
}

function stopRain(){
  document.getElementById("rain").innerHTML="";
}

/* ================= API ================= */
async function atualizar(){

  const resp = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,precipitation&current=temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`
  );

  const d = await resp.json();

  const c = d.current;

  estadoAtual.intensidade = c.precipitation;
  estadoAtual.prob = c.precipitation_probability;
  estadoAtual.chuvaForte = c.precipitation > 3;

  atualizarUI(c);
  atualizarVisual();
  atualizarDescricao(d.hourly);
  atualizarMapa();
  renderizar12h(d.hourly);
}

/* ================= UI ================= */
function atualizarUI(d){
  el("tempAtual").textContent=Math.round(d.temperature_2m)+"°";
  el("sensacaoAtual").textContent=Math.round(d.apparent_temperature)+"°";
  el("umidadeAtual").textContent=d.relative_humidity_2m+"%";
  el("ventoAtual").textContent=d.wind_speed_10m+" km/h";
}

/* ================= VISUAL ================= */
function atualizarVisual(){

  if (estadoAtual.intensidade > 0.5){
    startRain(Math.min(estadoAtual.intensidade*80,120));
  } else {
    stopRain();
  }

  if (estadoAtual.chuvaForte){
    document.body.style.filter="brightness(0.8)";
    el("statusChuva").textContent="🔴 Chuva forte";
  } else if (estadoAtual.prob > 60){
    el("statusChuva").textContent="🟡 Chuva chegando";
  } else {
    el("statusChuva").textContent="🟢 Tempo firme";
  }
}

/* ================= PREVISÃO ================= */
function atualizarDescricao(h){

  for(let i=0;i<6;i++){
    if(h.precipitation_probability[i]>60){
      el("descricaoAtual").textContent="🌧️ Chuva em "+(i+1)+"h";
      return;
    }
  }

  el("descricaoAtual").textContent="Sem chuva nas próximas horas";
}

/* ================= MAPA ================= */
function atualizarMapa(){
  document.getElementById("mapaRadar").src =
  `https://www.rainviewer.com/map.html?loc=${LAT},${LON},10&layer=radar&tm=${Date.now()}`;
}

/* ================= BUSCA ================= */
async function buscarCidade(){
  const nome=el("cidade").value;
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${nome}&count=1`);
  const d=await r.json();

  if(!d.results)return;

  LAT=d.results[0].latitude;
  LON=d.results[0].longitude;
  el("cidadeAtual").textContent=d.results[0].name;

  atualizar();
}

/* ================= GPS ================= */
function gps(){
  navigator.geolocation.getCurrentPosition(p=>{
    LAT=p.coords.latitude;
    LON=p.coords.longitude;
    el("cidadeAtual").textContent="Local atual";
    atualizar();
  });
}

/* ================= UTIL ================= */
function el(id){ return document.getElementById(id); }

/* ================= EVENTOS ================= */
el("btnBuscar").onclick=buscarCidade;
el("btnGPS").onclick=gps;
el("btnRefresh").onclick=atualizar;

/* ================= LOOPS ================= */
setInterval(atualizar,300000);
setInterval(atualizarCicloSolar,60000);

/* ================= INIT ================= */
initLocalizacao(); // ✅ AGORA COMEÇA PELO GPS
atualizarCicloSolar();

function renderizar12h(h) {
  const elPrev = document.getElementById("previsao12h");

  if (!h || !h.time) return;

  const agora = new Date();

  let startIndex = h.time.findIndex(t => new Date(t) > agora);

  // ✅ CORREÇÃO PRINCIPAL
  if (startIndex === -1) startIndex = 0;

  const dados = h.time.slice(startIndex, startIndex + 12);

  elPrev.innerHTML = dados.map((t, idx) => {
    const temp = h.temperature_2m[startIndex + idx];
    const prob = h.precipitation_probability[startIndex + idx];

    return `
      <div class="previsao-card">
        <div class="hora">${t.slice(11,16)}</div>
        <div>🌤️</div>
        <div class="temp">${Math.round(temp)}°</div>
        <div>${prob}% chuva</div>
      </div>
    `;
  }).join("");
}
  
});
