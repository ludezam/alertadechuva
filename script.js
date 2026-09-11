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
    err => {
      console.error("Erro ao obter localização:", err);
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

/* ================= API ================= */
async function atualizar() {

  if (LAT === null || LON === null) {
    console.warn("Localização não definida");
    return;
  }

  try {

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability,weather_code&hourly=precipitation_probability`;

    console.log("Chamando API:", url);

    const r = await fetch(url);

    if (!r.ok) {
      throw new Error(`Erro na API: ${r.status}`);
    }

    const d = await r.json();

    console.log("Dados recebidos:", d);

    if (!d.current) {
      throw new Error("Dados current não encontrados");
    }

    const c = d.current;

    estadoAtual.intensidade = c.precipitation || 0;
    estadoAtual.prob = c.precipitation_probability || 0;
    estadoAtual.chuvaForte = c.precipitation > 3;

    atualizarUI(c);
    atualizarVisual();
    atualizarDescricao(d.hourly);

  } catch (e) {
    console.error("Erro ao atualizar clima:", e);
    el("statusChuva").textContent = "❌ Erro ao carregar";
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
    el("statusChuva").className = "status status-vermelho";
    el("statusChuva").textContent = "🔴 Chuva forte";
  } else if (estadoAtual.prob > 60) {
    document.body.style.filter = "brightness(1)";
    el("statusChuva").className = "status status-amarelo";
    el("statusChuva").textContent = "🟡 Chuva chegando";
  } else {
    document.body.style.filter = "brightness(1)";
    el("statusChuva").className = "status status-verde";
    el("statusChuva").textContent = "🟢 Tempo firme";
  }
}

/* ================= DESCRIÇÃO ================= */
function atualizarDescricao(h) {

  if (!h || !h.precipitation_probability) {
    el("descricaoAtual").textContent = "Sem dados disponíveis";
    return;
  }

  for (let i = 0; i < Math.min(6, h.precipitation_probability.length); i++) {
    if ((h.precipitation_probability[i] || 0) > 60) {
      el("descricaoAtual").textContent = `🌧️ Chuva em ${i + 1}h`;
      return;
    }
  }

  el("descricaoAtual").textContent = "Sem chuva nas próximas horas";
}

/* ================= GPS ================= */
function gps() {
  navigator.geolocation.getCurrentPosition(
    p => {
      LAT = p.coords.latitude;
      LON = p.coords.longitude;
      el("cidadeAtual").textContent = "Local atual";
      atualizar();
    },
    err => {
      console.error("Erro ao obter GPS:", err);
      el("cidadeAtual").textContent = "Erro ao obter localização";
    }
  );
}

/* ================= EVENTOS ================= */
el("btnGPS").onclick = gps;
el("btnRefresh").onclick = atualizar;

/* ================= LOOP ================= */
setInterval(() => {
  if (LAT !== null) atualizar();
}, 300000);

setInterval(atualizarCicloSolar, 60000);

/* ================= INIT ================= */
console.log("Inicializando aplicação...");
initLocalizacao();
atualizarCicloSolar();

});
