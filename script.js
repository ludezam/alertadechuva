document.addEventListener("DOMContentLoaded", () => {

/* ================= TEMA ================= */
function setThemeByTime() {
  const h = new Date().getHours();
  document.body.className =
    h < 12 ? "day" :
    h < 18 ? "afternoon" : "night";
}
setThemeByTime();
setInterval(setThemeByTime, 60000);

/* ================= CHUVA ================= */
function startRain(intensity = 60) {
  const rain = document.getElementById("rain");
  rain.innerHTML = "";

  for (let i = 0; i < intensity; i++) {
    const d = document.createElement("div");
    d.className = "drop";
    d.style.left = Math.random() * 100 + "vw";
    d.style.animationDuration = (0.4 + Math.random()) + "s";
    d.style.opacity = Math.random();
    rain.appendChild(d);
  }
}
function stopRain() {
  document.getElementById("rain").innerHTML = "";
}

/* ================= CONFIG ================= */
let LAT = -20.8113;
let LON = -49.3758;
let ultimoStatus = "";

/* ELEMENTOS */
const el = id => document.getElementById(id);

/* ================= STATUS INTELIGENTE ================= */
function statusChuva(prob, precip) {
  if (precip > 4) return ["🔴 Chuva forte agora", "status-vermelho"];
  if (prob > 70) return ["🟡 Chuva chegando", "status-amarelo"];
  if (prob > 40) return ["🟡 Possibilidade de chuva", "status-amarelo"];
  return ["🟢 Tempo firme", "status-verde"];
}

/* ================= PREVISÃO FUTURA ================= */
function preverChuva(hourly) {
  for (let i = 0; i < 6; i++) {
    if (hourly.precipitation_probability[i] > 60)
      return `🌧️ Chuva em ${i + 1}h`;
  }
  return "Sem chuva nas próximas horas";
}

/* ================= ATUALIZAR UI ================= */
function atualizarAgora(d) {

  el("tempAtual").textContent = Math.round(d.temperature_2m) + "°";
  el("sensacaoAtual").textContent = Math.round(d.apparent_temperature) + "°";
  el("umidadeAtual").textContent = d.relative_humidity_2m + "%";
  el("ventoAtual").textContent = Math.round(d.wind_speed_10m) + " km/h";

  const [txt, cls] = statusChuva(d.precipitation_probability, d.precipitation);

  el("statusChuva").textContent = txt;
  el("statusChuva").className = "status " + cls;

  /* ALERTA */
  if (txt !== ultimoStatus) {
    ultimoStatus = txt;
    if (cls === "status-vermelho") alert("🌧️ Chuva forte iniciando!");
  }

  /* CHUVA VISUAL */
  const intensidade = Math.min(
    Math.round(d.precipitation * 120 + d.precipitation_probability),
    120
  );

  intensidade > 15 ? startRain(intensidade) : stopRain();
}

/* ================= PREVISÃO GRID ================= */
function renderizar12h(h) {
  const now = new Date();

  const i = h.time.findIndex(t => new Date(t) > now);

  const dados = h.time.slice(i, i + 12);

  el("previsao12h").innerHTML = dados.map((t, idx) => `
    <div class="previsao-card">
      <div class="hora">${t.slice(11,16)}</div>
      <div>🌤️</div>
      <div>${Math.round(h.temperature_2m[i+idx])}°</div>
      <div>${h.precipitation_probability[i+idx]}%</div>
    </div>
  `).join("");
}

/* ================= API ================= */
async function atualizar() {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,precipitation&current=temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`
  );

  const d = await r.json();

  atualizarAgora(d.current);
  renderizar12h(d.hourly);

  el("descricaoAtual").textContent = preverChuva(d.hourly);
}

/* ================= MAPA ================= */
function atualizarMapa() {
  el("mapaRadar").src =
    `https://www.rainviewer.com/map.html?loc=${LAT},${LON},10&layer=radar`;
}

/* ================= BUSCA ================= */
async function buscarCidade() {
  const nome = el("cidade").value;

  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${nome}&count=1`
  );

  const d = await r.json();

  if (!d.results?.length) return;

  LAT = d.results[0].latitude;
  LON = d.results[0].longitude;

  el("cidadeAtual").textContent = d.results[0].name;

  atualizarMapa();
  atualizar();
}

/* ================= GPS ================= */
function gps() {
  navigator.geolocation.getCurrentPosition(p => {
    LAT = p.coords.latitude;
    LON = p.coords.longitude;
    el("cidadeAtual").textContent = "Local atual";
    atualizarMapa();
    atualizar();
  });
}

/* ================= EVENTOS ================= */
el("btnBuscar").onclick = buscarCidade;
el("btnGPS").onclick = gps;
el("btnRefresh").onclick = atualizar;

/* AUTO UPDATE */
setInterval(atualizar, 300000);

/* INIT */
atualizarMapa();
atualizar();

});