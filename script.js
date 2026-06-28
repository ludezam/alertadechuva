document.addEventListener("DOMContentLoaded", () => {

/* ================= ESTADO ================= */
let LAT = null;
let LON = null;

let estadoAtual = {
  intensidade: 0,
  prob: 0,
  chuvaForte: false
};

let estrelasGeradas = false;

/* ================= UTIL ================= */
function el(id) {
  return document.getElementById(id);
}

/* ================= GEOLOCALIZAÇÃO ================= */
function initLocalizacao() {

  el("cidadeAtual").textContent = "Buscando localização...";

  if (!navigator.geolocation) {
    el("cidadeAtual").textContent = "GPS não suportado";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      LAT = pos.coords.latitude;
      LON = pos.coords.longitude;

      el("cidadeAtual").textContent = "Local atual";
      atualizar();
    },
    () => {
      el("cidadeAtual").textContent = "Permissão negada";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/* ================= CICLO SOL/LUA ================= */
function atualizarCicloSolar() {

  const sun = document.querySelector(".sun");
  const moon = document.querySelector(".moon");
  const stars = el("stars");

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

    stars.style.opacity = estadoAtual.chuvaForte ? 0.3 : 1;
  }
}

/* ================= ESTRELAS ================= */
function gerarEstrelas(qtd = 80) {

  const layer = el("stars");
  layer.innerHTML = "";

  for (let i = 0; i < qtd; i++) {
    const s = document.createElement("div");
    s.className = "star";

    s.style.left = Math.random() * 100 + "vw";
    s.style.top = Math.random() * 100 + "vh";

    const size = Math.random() * 2 + 1;
    s.style.width = size + "px";
    s.style.height = size + "px";

    s.style.animationDuration = (1 + Math.random() * 2) + "s";

    layer.appendChild(s);
  }
}

/* ================= CHUVA ================= */
function startRain(intensidade = 60) {

  const rain = el("rain");
  rain.innerHTML = "";

  for (let i = 0; i < intensidade; i++) {

    const drop = document.createElement("div");
    drop.className = "drop";

    drop.style.left = Math.random() * 100 + "vw";
    drop.style.animationDuration = (0.4 + Math.random()) + "s";

    rain.appendChild(drop);
  }
}

function stopRain() {
  el("rain").innerHTML = "";
}

/* ================= ÍCONES DINÂMICOS ================= */
function getIcon(codigo, prob) {

  if (codigo === 0) return "☀️";
  if ([1, 2, 3].includes(codigo)) return "🌤️";
  if ([45, 48].includes(codigo)) return "🌫️";
  if ([51, 53, 55].includes(codigo)) return "🌦️";
  if ([61, 63, 65].includes(codigo)) return "🌧️";
  if ([71, 73, 75].includes(codigo)) return "❄️";
  if ([95, 96, 99].includes(codigo)) return "⛈️";

  if (prob > 70) return "🌧️";

  return "🌤️";
}

/* ================= API ================= */
async function atualizar() {

  if (LAT === null || LON === null) return;

  try {

    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,precipitation,weathercode&current=temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`
    );

    const d = await r.json();

    if (!d.current || !d.hourly) return;

    const c = d.current;

    estadoAtual.intensidade = c.precipitation || 0;
    estadoAtual.prob = c.precipitation_probability || 0;
    estadoAtual.chuvaForte = c.precipitation > 3;

    atualizarUI(c);
    atualizarVisual();
    atualizarDescricao(d.hourly);
    atualizarMapa();
    renderizar12h(d.hourly);

  } catch (e) {
    console.error("Erro ao atualizar clima:", e);
  }
}

/* ================= UI ================= */
function atualizarUI(d) {
  el("tempAtual").textContent = Math.round(d.temperature_2m || 0) + "°";
  el("sensacaoAtual").textContent = Math.round(d.apparent_temperature || 0) + "°";
  el("umidadeAtual").textContent = (d.relative_humidity_2m || 0) + "%";
  el("ventoAtual").textContent = Math.round(d.wind_speed_10m || 0) + " km/h";
}

/* ================= VISUAL ================= */
function atualizarVisual() {

  if (estadoAtual.intensidade > 0.5) {
    startRain(Math.min(estadoAtual.intensidade * 80, 120));
  } else {
    stopRain();
  }

  if (estadoAtual.chuvaForte) {
    document.body.style.filter = "brightness(0.85)";
    el("statusChuva").textContent = "🔴 Chuva forte";
  } else if (estadoAtual.prob > 60) {
    el("statusChuva").textContent = "🟡 Chuva chegando";
  } else {
    document.body.style.filter = "brightness(1)";
    el("statusChuva").textContent = "🟢 Tempo firme";
  }
}

/* ================= DESCRIÇÃO ================= */
function atualizarDescricao(h) {

  for (let i = 0; i < 6; i++) {
    if ((h.precipitation_probability[i] || 0) > 60) {
      el("descricaoAtual").textContent = `🌧️ Chuva em ${i + 1}h`;
      return;
    }
  }

  el("descricaoAtual").textContent = "Sem chuva nas próximas horas";
}

/* ================= PREVISÃO 12H ================= */
function renderizar12h(h) {

  const container = el("previsao12h");

  let agora = new Date();
  let start = h.time.findIndex(t => new Date(t) > agora);

  if (start === -1) start = 0;

  const html = h.time.slice(start, start + 12).map((t, i) => {

    const temp = h.temperature_2m[start + i] ?? "--";
    const prob = h.precipitation_probability[start + i] ?? "--";
    const codigo = h.weathercode[start + i];

    const icone = getIcon(codigo, prob);

    return `
      <div class="previsao-card">
        <div class="hora">${t.slice(11,16)}</div>
        <div>${icone}</div>
        <div class="temp">${Math.round(temp)}°</div>
        <div>${prob}% chuva</div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

/* ================= MAPA ================= */
function atualizarMapa() {
  el("mapaRadar").src =
    `https://www.rainviewer.com/map.html?loc=${LAT},${LON},10&layer=radar&tm=${Date.now()}`;
}

/* ================= BUSCA ================= */
async function buscarCidade() {

  const nome = el("cidade").value;
  if (!nome) return;

  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=1`
  );

  const d = await r.json();

  if (!d.results?.length) return;

  LAT = d.results[0].latitude;
  LON = d.results[0].longitude;

  el("cidadeAtual").textContent = d.results[0].name;

  atualizar();
}

/* ================= GPS ================= */
function gps() {

  navigator.geolocation.getCurrentPosition(p => {

    LAT = p.coords.latitude;
    LON = p.coords.longitude;

    el("cidadeAtual").textContent = "Local atual";
    atualizar();

  });
}

/* ================= EVENTOS ================= */
el("btnBuscar").onclick = buscarCidade;
el("btnGPS").onclick = gps;
el("btnRefresh").onclick = atualizar;

/* ================= LOOP ================= */
setInterval(() => {
  if (LAT !== null) atualizar();
}, 300000);

setInterval(atualizarCicloSolar, 60000);

/* ================= INIT ================= */
initLocalizacao();
atualizarCicloSolar();

});
