document.addEventListener("DOMContentLoaded", () => {

/* =========================
   TEMA AUTOMÁTICO (iOS STYLE)
========================= */

function setThemeByTime() {
  const hour = new Date().getHours();

  document.body.classList.remove("day", "afternoon", "night");

  if (hour >= 6 && hour < 12) {
    document.body.classList.add("day");
  } else if (hour >= 12 && hour < 18) {
    document.body.classList.add("afternoon");
  } else {
    document.body.classList.add("night");
  }
}

setThemeByTime();
setInterval(setThemeByTime, 60000);

/* =========================
   CHUVA DINÂMICA
========================= */

function startRain(intensity = 60) {
  const rain = document.getElementById("rain");
  rain.innerHTML = "";

  for (let i = 0; i < intensity; i++) {
    const drop = document.createElement("div");
    drop.classList.add("drop");

    drop.style.left = Math.random() * 100 + "vw";
    drop.style.animationDuration = (0.4 + Math.random()) + "s";
    drop.style.opacity = Math.random();

    rain.appendChild(drop);
  }
}

function stopRain() {
  document.getElementById("rain").innerHTML = "";
}

  // ================= CONFIGURAÇÃO =================
  let LAT = -20.8113;
  let LON = -49.3758;
  let nomeCidadeAtual = "São José do Rio Preto-SP";

  // ================= ELEMENTOS =================
  const mapaRadarEl = document.getElementById("mapaRadar");

  const cidadeInput = document.getElementById("cidade");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnGPS = document.getElementById("btnGPS");
  const btnRefresh = document.getElementById("btnRefresh");

  const previsao12hEl = document.getElementById("previsao12h");

  // ⚠️ NOVO: elementos do resumo (faltavam no seu script)
  const cidadeAtualEl = document.getElementById("cidadeAtual");
  const tempAtualEl = document.getElementById("tempAtual");
  const sensacaoEl = document.getElementById("sensacaoAtual");
  const umidadeEl = document.getElementById("umidadeAtual");
  const ventoEl = document.getElementById("ventoAtual");
  const statusEl = document.getElementById("statusChuva");
  const descricaoEl = document.getElementById("descricaoAtual");

  // ================= EVENTOS =================
  btnBuscar.addEventListener("click", buscarCidade);
  btnGPS.addEventListener("click", usarGPS);
  btnRefresh.addEventListener("click", atualizarTudo);

  // ================= UTIL =================
  const UF_POR_ESTADO = {
    "São Paulo": "SP",
    "Rio de Janeiro": "RJ",
    "Minas Gerais": "MG",
    "Paraná": "PR",
    "Bahia": "BA",
    "Rio Grande do Sul": "RS",
    "Santa Catarina": "SC"
  };

  function mostrarCidade(nome) {
    nomeCidadeAtual = nome;
    if (cidadeAtualEl) cidadeAtualEl.textContent = nome;
  }

  function atualizarMapa(nomeCidade = nomeCidadeAtual) {
    if (!mapaRadarEl) return;

    mapaRadarEl.src = `https://www.rainviewer.com/map.html?loc=${LAT},${LON},10&oCS=1&c=3&o=83&lm=1&layer=radar&sm=1&sn=1`;
    mapaRadarEl.title = `Radar de ${nomeCidade}`;
  }

  function statusChuva(prob, precip) {
    const risco = (prob || 0) + (precip || 0) * 10;

    if (risco > 80) return { texto: "🔴 Chuvas fortes", classe: "status-vermelho" };
    if (risco > 40) return { texto: "🟡 Possibilidade de chuva", classe: "status-amarelo" };
    return { texto: "🟢 Pode sair tranquilo", classe: "status-verde" };
  }

  function atualizarResumoAgora(dados) {
    if (!dados) return;

    const temp = dados.temperature_2m ?? "--";
    const wind = dados.wind_speed_10m ?? "--";
    const humidity = dados.relative_humidity_2m ?? "--";
    const feels = dados.apparent_temperature ?? temp;

    if (tempAtualEl) tempAtualEl.textContent = `${Math.round(temp)}°`;
    if (sensacaoEl) sensacaoEl.textContent = `${Math.round(feels)}°`;
    if (umidadeEl) umidadeEl.textContent = `${humidity}%`;
    if (ventoEl) ventoEl.textContent = `${Math.round(wind)} km/h`;

    const st = statusChuva(dados.precipitation_probability, dados.precipitation);
    if (statusEl) {
      statusEl.textContent = st.texto;
      statusEl.className = `status ${st.classe}`;
    }

    if (descricaoEl) {
      descricaoEl.textContent =
        dados.precipitation_probability > 40
          ? "Possibilidade de chuva nas próximas horas."
          : "Sem previsão de chuva imediata.";
    }
  }

  // ================= PREVISÃO =================
  function renderizarPrevisao12h(hourly, timezone) {
    if (!previsao12hEl || !hourly?.time) return;

    const agora = new Date();

    const indice = hourly.time.findIndex(t => new Date(t) > agora);
    const start = Math.max(indice, 0);

    const dados = hourly.time.slice(start, start + 12).map((time, i) => ({
      time,
      temp: hourly.temperature_2m[start + i],
      precip: hourly.precipitation[start + i],
      prob: hourly.precipitation_probability[start + i],
      windSpeed: hourly.wind_speed_10m[start + i],
      windDirection: hourly.wind_direction_10m[start + i]
    }));

    previsao12hEl.innerHTML = dados.map(item => {

      const hora = item.time.slice(11, 16);

      return `
        <article class="previsao-card">
          <div class="hora">${hora}</div>
          <div class="icone-clima">🌤️</div>
          <div class="temperatura">${Math.round(item.temp)}°C</div>
          <div class="chuva">${item.prob}% · ${item.precip.toFixed(1)} mm</div>

          <div class="vento-card">
            <span class="seta-vento" style="--direcao-vento:${item.windDirection || 0}deg">↑</span>
            <span class="velocidade-vento">${Math.round(item.windSpeed)} km/h</span>
          </div>
        </article>
      `;
    }).join("");
  }

  // ================= API =================
  async function atualizarPrevisao() {
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=precipitation_probability,precipitation,temperature_2m,wind_speed_10m,wind_direction_10m&current=temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );

      const data = await r.json();

      if (data.current) atualizarResumoAgora(data.current);
      renderizarPrevisao12h(data.hourly, data.timezone);

    } catch (e) {
      console.error("Erro previsão:", e);
    }
  }

  async function atualizarTudo() {
    await atualizarPrevisao();
  }

  // ================= BUSCA =================
  async function buscarCidade() {
    const nome = cidadeInput.value.trim();
    if (!nome) return;

    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=1&language=pt`
    );

    const data = await r.json();
    if (!data.results?.length) return;

    LAT = data.results[0].latitude;
    LON = data.results[0].longitude;

    mostrarCidade(`${data.results[0].name}-${data.results[0].country_code}`);
    atualizarMapa();
    atualizarTudo();
  }

  // ================= GPS =================
  function usarGPS() {
    navigator.geolocation.getCurrentPosition(async pos => {

      LAT = pos.coords.latitude;
      LON = pos.coords.longitude;

      mostrarCidade("Local atual");
      atualizarMapa();
      atualizarTudo();

    });
  }

  // ================= INIT =================
  mostrarCidade(nomeCidadeAtual);
  atualizarMapa();
  atualizarTudo();

});