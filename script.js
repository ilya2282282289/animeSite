const API_BASE = "https://anilibria.top/api/v1";

// DOM Elements
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const animeDetail = document.getElementById("animeDetail");
const backBtn = document.getElementById("backBtn");
const detailPoster = document.getElementById("detailPoster");
const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailGenres = document.getElementById("detailGenres");
const detailYear = document.getElementById("detailYear");
const detailStatus = document.getElementById("detailStatus");
const detailEpisodes = document.getElementById("detailEpisodes");
const detailRating = document.getElementById("detailRating");
const episodeList = document.getElementById("episodeList");
const playerContainer = document.getElementById("player");
const recommendationsPopular = document.getElementById("recommendationsPopular");
const releasesHorizontal = document.getElementById("releasesHorizontal");
const logo = document.querySelector('header h1');

// ---- state vars (добавьте рядом с hlsInstance) ----
let currentMode = 'main'; // 'main' | 'search' | 'detail'
let lastSearchQuery = '';
let lastSearchResults = [];
let lastViewBeforeDetail = 'main';


let franchisePage = 1;
let loadingFranchises = false;

let hlsInstance = null;

// Settings (quality menu on detail view)
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");

if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    settingsMenu.style.display = settingsMenu.style.display === "block" ? "none" : "block";
  });
}

document.querySelectorAll(".quality-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const quality = btn.dataset.quality;
    console.log("Выбрано качество:", quality);
    if (settingsMenu) settingsMenu.style.display = "none";
    // при желании — здесь менять источник
  });
});

// Helper: переключитель режима поиска (скрывает/показывает секции recommendations)
function setSearchMode(on) {
  const recWrap = document.querySelector('.recommendations');
  const mainH2 = document.querySelector('.container > h2'); // заголовок "Рекомендации"
  if (recWrap) recWrap.style.display = on ? 'none' : '';
  if (mainH2) mainH2.style.display = on ? 'none' : '';
  // если выходим из режима поиска — снимем все inline display:none с секций
  if (!on) {
    document.querySelectorAll('.recommendation-section').forEach(s => s.style.display = '');
  }
}

// Полная реставрация главной страницы + повторная загрузка секций
function showHome() {
  // Скрываем детальную, показываем грид
  if (animeDetail) animeDetail.style.display = "none";
  if (grid) grid.style.display = "grid";

  // Снимаем режим поиска (покажем все секции)
  setSearchMode(false);

  // Сбрасываем пустой текст
  if (empty) { empty.style.display = "none"; empty.textContent = ""; }

  // Уничтожаем HLS если есть
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

  // Перезагружаем содержимое главной
  loadReleases();
  loadHorizontalReleases();
  // loadFranchises();
  // loadTopAnime();
  // loadUpcomingAnime();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Инициализация событий
function setupEventListeners() {
  if (searchBtn) searchBtn.addEventListener('click', () => searchAnime(searchInput.value));
  if (searchInput) {
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchAnime(searchInput.value); });
    // При очистке поля — возвращаем главную
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') showHome();
    });
  }
  if (backBtn) backBtn.addEventListener('click', goBackToList);
}

function setupScrollHeader() {
  const header = document.querySelector('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });
}

/* ----------------- Загрузка и рендер ----------------- */

async function loadReleases() {
  try {
    const res = await fetch(`${API_BASE}/anime/franchises/random?limit=40`);
    if (!res.ok) throw new Error("Ошибка API: " + res.status);
    const data = await res.json();
    if (!grid) return;
    grid.innerHTML = "";
    data.forEach(franchise => {
      const poster = franchise.image?.optimized?.preview 
        ? `https://anilibria.top${franchise.image.optimized.preview}`
        : "https://via.placeholder.com/200x280?text=No+Image";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${poster}" alt="${franchise.name}">
        <div class="card-content">
          <div class="card-title">${franchise.name}</div>
          <div class="card-meta">
            <span>${franchise.first_year} - ${franchise.last_year || "..."}</span>
            <span class="card-rating"><i class="fas fa-film"></i> ${franchise.total_releases}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openFranchise(franchise.id));
      grid.appendChild(card);
    });
  } catch (e) {
    console.error("Ошибка загрузки франшиз:", e);
    if (grid) grid.textContent = "Ошибка загрузки франшиз";
  }
}

async function loadHorizontalReleases() {
  try {
    const url = `${API_BASE}/anime/catalog/releases?page=1&limit=15`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const list = json.data || [];
    renderHorizontalReleases(list);
  } catch (err) {
    console.error("Ошибка загрузки горизонтальных релизов:", err);
  }
}

function renderHorizontalReleases(list) {
  if (!releasesHorizontal) return;
  releasesHorizontal.innerHTML = "";
  if (!list.length) return;
  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "horizontal-card";
    const img = document.createElement("img");
    img.src = item.poster?.preview ? `https://anilibria.top${item.poster.preview}` : "https://via.placeholder.com/300x400?text=No+Poster";
    img.alt = item.name?.main || item.name?.english || "Аниме";
    img.loading = "lazy";
    const cardContent = document.createElement("div");
    cardContent.className = "horizontal-card-content";
    const title = document.createElement("div");
    title.className = "horizontal-card-title";
    title.textContent = item.name?.main || item.name?.english || "Без названия";
    const meta = document.createElement("div");
    meta.className = "horizontal-card-meta";
    const year = document.createElement("span");
    year.textContent = item.year || "—";
    const rating = document.createElement("span");
    rating.className = "card-rating";
    rating.innerHTML = `<i class="fas fa-star"></i> ${item.rating?.score || "—"}`;
    meta.appendChild(year);
    meta.appendChild(rating);
    cardContent.appendChild(title);
    cardContent.appendChild(meta);
    card.appendChild(img);
    card.appendChild(cardContent);
    releasesHorizontal.appendChild(card);
    card.addEventListener('click', () => openAnimeDetail(item.id || item.alias));
  });
}

function renderGrid(list) {
  if (!grid) return;
  grid.innerHTML = "";
  if (empty) { empty.style.display = "none"; empty.textContent = ""; }

  if (!list || !list.length) {
    if (empty) {
      empty.style.display = "block";
      empty.textContent = "Ничего не найдено.";
    }
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.src = item.poster?.preview ? `https://anilibria.top${item.poster.preview}` : "https://via.placeholder.com/300x400?text=No+Poster";
    img.alt = item.name?.main || item.name?.english || "Аниме";
    img.loading = "lazy";
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = item.name?.main || item.name?.english || "Без названия";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const year = document.createElement("span");
    year.textContent = item.year || "—";
    const rating = document.createElement("span");
    rating.className = "card-rating";
    rating.innerHTML = `<i class="fas fa-star"></i> ${item.rating?.score || "—"}`;
    meta.appendChild(year);
    meta.appendChild(rating);
    cardContent.appendChild(title);
    cardContent.appendChild(meta);
    card.appendChild(img);
    card.appendChild(cardContent);
    card.addEventListener('click', () => openAnimeDetail(item.id || item.alias));
    grid.appendChild(card);
  });
}

/* ----------------- Поиск ----------------- */
async function searchAnime(query) {
  query = (query || '').trim();

  // если пустой запрос — показываем главную
  if (!query) {
    currentMode = 'main';
    lastSearchResults = [];
    lastSearchQuery = '';

    showSearch();

    const recommendations = document.querySelector('.recommendations');
    if (recommendations) recommendations.style.display = 'block';

    grid.style.display = 'grid';
    grid.innerHTML = '';
    await loadReleases();
    await loadHorizontalReleases();
    return;
  }

  // Идём в режим поиска
  currentMode = 'search';
  lastSearchQuery = query;

  const recommendations = document.querySelector('.recommendations');
  if (recommendations) recommendations.style.display = 'none';

  grid.style.display = 'grid';
  grid.innerHTML = '';
  empty.textContent = 'Поиск...';
  empty.classList.add('loading');
  empty.style.display = 'none';

  try {
    const url = `${API_BASE}/app/search/releases?query=${encodeURIComponent(query)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    const list = (Array.isArray(json) ? json : (json.results || json.data || json.list || []) )
                  .map(item => item.release || item)
                  .filter(Boolean);

    lastSearchResults = list;

    if (!list.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'Ничего не найдено.';
    } else {
      animeDetail.style.display = "none"; // 🔹 прячем детальное меню
      grid.style.display = "grid";        // 🔹 показываем сетку результатов
      renderGrid(list);
    }
    

    if (!list.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'Ничего не найдено.';
    } else {
      renderGrid(list);
    }
  } catch (err) {
    console.error("Ошибка поиска:", err);
    grid.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = `Ошибка поиска: ${err.message || err}`;
  } finally {
    empty.classList.remove('loading');
  }
}



/* ----------------- Детальная страница ----------------- */
// Замените существующую openAnimeDetail этой версией
async function openAnimeDetail(idOrAlias) {
  try {
    // сохраняем откуда пришли
    lastViewBeforeDetail = currentMode || 'main';
    currentMode = 'detail';

    // Скрываем поиск при открытии карточки
    hideSearch();

    // скрываем список и рекомендации, показываем детальную страницу
    grid.style.display = "none";
    const recommendations = document.querySelector(".recommendations");
    if (recommendations) recommendations.style.display = "none";

    const recommendationSection = document.querySelector('.recommendation-section');
    if (recommendationSection) recommendationSection.style.display = 'none';

    animeDetail.style.display = "block";

    // Показываем скелетон загрузки
    detailPoster.src = "";
    detailTitle.textContent = "Загрузка...";
    detailDescription.textContent = "";
    detailGenres.innerHTML = "";
    detailYear.textContent = "";
    detailStatus.textContent = "";
    detailEpisodes.textContent = "";
    detailRating.textContent = "";
    episodeList.innerHTML = "";
    playerContainer.innerHTML = `
      <div class="player-placeholder">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Загрузка данных...</p>
      </div>
    `;

    const url = `${API_BASE}/anime/releases/${idOrAlias}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Заполняем данные
    detailPoster.src = data.poster?.src ? `https://anilibria.top${data.poster.src}` : "";
    detailTitle.textContent = data.name?.main || data.name?.english || "";
    detailDescription.textContent = data.description || "Описание отсутствует";
    detailYear.textContent = data.year || "—";
    detailStatus.textContent = data.status?.name || "—";
    detailEpisodes.textContent = `Эпизодов: ${data.episodes_total || "—"}`;
    detailRating.textContent = data.rating?.score || "—";

    // Жанры
    if (data.genres && data.genres.length) {
      detailGenres.innerHTML = "";
      data.genres.forEach(genre => {
        const genreSpan = document.createElement("span");
        genreSpan.textContent = genre.name;
        detailGenres.appendChild(genreSpan);
      });
    }

    // Группировка серий по сезонам
    const seasons = {};
    if (data.episodes && data.episodes.length) {
      data.episodes.forEach(ep => {
        const season = ep.season?.value || "1";
        if (!seasons[season]) seasons[season] = [];
        seasons[season].push(ep);
      });
    }

    episodeList.innerHTML = "";
    for (const [seasonKey, eps] of Object.entries(seasons)) {
      const seasonHeader = document.createElement("h4");
      seasonHeader.textContent = `Сезон ${seasonKey}`;
      seasonHeader.style.marginTop = "20px";
      seasonHeader.style.marginBottom = "10px";
      episodeList.appendChild(seasonHeader);

      const episodeContainer = document.createElement("div");
      episodeContainer.style.display = "flex";
      episodeContainer.style.flexWrap = "wrap";
      episodeContainer.style.gap = "10px";

      eps.forEach(ep => {
        const btn = document.createElement("button");
        btn.className = "episode-btn";
        btn.textContent = `Серия ${ep.ordinal}: ${ep.name || ""}`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          playEpisode(ep);
        });
        episodeContainer.appendChild(btn);
      });
      episodeList.appendChild(episodeContainer);
    }

    if (data.episodes?.[0]) {
      const firstBtn = episodeList.querySelector('.episode-btn');
      if (firstBtn) firstBtn.classList.add('active');
      playEpisode(data.episodes[0]);
    }
  } catch (err) {
    console.error("Ошибка при открытии аниме:", err);
    playerContainer.innerHTML = `<p>Не удалось загрузить данные: ${err.message}</p>`;
  }
}


/* ----------------- Плеер ----------------- */
function playEpisode(ep) {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  const sources = [];
  if (ep.hls_480) sources.push({ label: "480p", url: ep.hls_480 });
  if (ep.hls_720) sources.push({ label: "720p", url: ep.hls_720 });
  if (ep.hls_1080) sources.push({ label: "1080p", url: ep.hls_1080 });

  const container = document.getElementById("player");
  if (!sources.length) {
    container.innerHTML = `
      <div class="player-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Для этой серии нет HLS дорожек</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="video-wrapper">
      <video id="video" playsinline></video>

      <div class="controls">
        <div class="controls-top">
          <input class="seek" type="range" min="0" max="100" step="0.1" value="0" title="Перемотка">
        </div>
        
        <div class="controls-bottom">
          <div class="controls-left">
            <button class="btn btn-play" title="Play/Pause"><i class="fas fa-play"></i></button>
            <span class="time">00:00 / 00:00</span>
          </div>
          
          <div class="controls-right">
            <input class="volume" type="range" min="0" max="1" step="0.01" value="1" title="Громкость">
            <button class="btn btn-pip" title="Картинка в картинке"><i class="fas fa-clone"></i></button>
            <div class="menu">
              <button class="btn btn-settings" title="Настройки"><i class="fas fa-ellipsis-v"></i></button>
              <div class="menu-panel">
                <div class="menu-group">
                  <div class="menu-title">Качество</div>
                  <div class="menu-quality"></div>
                </div>
                <div class="menu-group">
                  <div class="menu-title">Скорость</div>
                  <div class="menu-speed"></div>
                </div>
              </div>
            </div>
            <button class="btn btn-fullscreen" title="На весь экран"><i class="fas fa-expand"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;

  const video = container.querySelector("#video");
  const btnPlay = container.querySelector(".btn-play");
  const seek = container.querySelector(".seek");
  const timeLabel = container.querySelector(".time");
  const volume = container.querySelector(".volume");
  const btnPip = container.querySelector(".btn-pip");
  const btnFs = container.querySelector(".btn-fullscreen");
  const btnSettings = container.querySelector(".btn-settings");
  const panel = container.querySelector(".menu-panel");
  const qWrap = container.querySelector(".menu-quality");
  const sWrap = container.querySelector(".menu-speed");
  const wrapper = container.querySelector(".video-wrapper");

  let hideControlsTimeout;
  let isSettingSource = false;
  let lastClickTime = 0;

  function formatTime(sec) {
    sec = Math.max(sec || 0, 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const mm = (h ? String(m).padStart(2,"0") : m);
    return (h ? `${h}:${mm}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`);
  }

  function updateTimeUI() {
    const cur = video.currentTime || 0;
    const dur = video.duration || 0;
    timeLabel.textContent = `${formatTime(cur)} / ${dur ? formatTime(dur) : "00:00"}`;
    if (dur) seek.value = (cur / dur) * 100;
    updateSeekBackground();
  }

  function updateSeekBackground() {
    const val = seek.value;
    seek.style.background = `linear-gradient(to right, #005ac7 0%, #8a0000 ${val}%, rgba(255,255,255,0.2) ${val}%, rgba(255,255,255,0.2) 100%)`;
    const sound = volume.value * 100;
    volume.style.background = `linear-gradient(to right, #005ac7 0%, #8a0000 ${sound}%, rgba(255,255,255,0.2) ${sound}%, rgba(255,255,255,0.2) 100%)`;
  }

  function setSource(url, resumeTime=0, shouldPlay=true) {
    isSettingSource = true;
    const rate = video.playbackRate;
    const vol = video.volume;

    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    video.pause();
    video.removeAttribute("src");

    if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls({ capLevelToPlayerSize: false });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        if (resumeTime) video.currentTime = resumeTime;
        video.playbackRate = rate;
        video.volume = vol;
        if (shouldPlay) video.play().catch(()=>{});
        isSettingSource = false;
        updateSeekBackground();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (resumeTime) video.currentTime = resumeTime;
        video.playbackRate = rate;
        video.volume = vol;
        if (shouldPlay) video.play().catch(()=>{});
        isSettingSource = false;
        updateSeekBackground();
      }, { once:true });
    } else {
      container.innerHTML = `
        <div class="player-placeholder">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ваш браузер не поддерживает HLS</p>
        </div>`;
      isSettingSource = false;
    }
  }

  function togglePlayPause() {
    const now = Date.now();
    if (now - lastClickTime < 300) return;
    lastClickTime = now;
    
    if (video.paused) {
      video.play().catch(()=>{});
    } else {
      video.pause();
    }
  }

  function isFullscreen() {
    return document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement ||
           document.msFullscreenElement;
  }

  // Качества
  qWrap.innerHTML = "";
  sources.forEach((src, idx) => {
    const b = document.createElement("button");
    b.className = "menu-btn" + (idx === 0 ? " active" : "");
    b.textContent = src.label;
    b.addEventListener("click", () => {
      qWrap.querySelectorAll(".menu-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      const wasPaused = video.paused;
      const t = video.currentTime || 0;
      setSource(src.url, t, !wasPaused);
      panel.classList.remove("open");
    });
    qWrap.appendChild(b);
  });

  // Скорости
  [0.5, 0.75, 1, 1.25, 1.5, 2].forEach(sp => {
    const b = document.createElement("button");
    b.className = "menu-btn" + (sp === 1 ? " active" : "");
    b.textContent = `${sp}×`;
    b.addEventListener("click", () => {
      sWrap.querySelectorAll(".menu-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      video.playbackRate = sp;
      panel.classList.remove("open");
    });
    sWrap.appendChild(b);
  });

  // Первый запуск
  setSource(sources[0].url, 0, true);

  // UI events
  btnPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  video.addEventListener("play", () => {
    btnPlay.innerHTML = `<i class="fas fa-pause"></i>`;
    if (isFullscreen()) showControlsTemporarily();
  });

  video.addEventListener("pause", () => {
    if (!isSettingSource) {
      btnPlay.innerHTML = `<i class="fas fa-play"></i>`;
      if (isFullscreen()) showControls();
    }
  });

  video.addEventListener("timeupdate", updateTimeUI);
  video.addEventListener("loadedmetadata", updateTimeUI);
  video.addEventListener("durationchange", updateTimeUI);

  seek.addEventListener("input", () => {
    if (!video.duration) return;
    video.currentTime = (seek.value / 100) * video.duration;
    updateSeekBackground();
  });

  volume.addEventListener("input", () => {
    video.volume = volume.value; 
    updateSeekBackground(); 
  });

  // Обработчик клика на видео
  video.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isFullscreen()) {
      togglePlayPause();
    } else {
      showControlsTemporarily();
    }
  });

  btnPip.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
    } catch(e){}
  });

  btnFs.addEventListener("click", (e) => {
    e.stopPropagation();
    if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen();
    else if (video.msRequestFullscreen) video.msRequestFullscreen && video.msRequestFullscreen();
  });

  btnSettings.addEventListener("click", e => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== btnSettings) {
      panel.classList.remove('open');
    }
  });

  // События полноэкранного режима
  document.addEventListener('fullscreenchange', updateControlsBehavior);
  document.addEventListener('webkitfullscreenchange', updateControlsBehavior);

  function updateControlsBehavior() {
    if (isFullscreen()) {
      showControlsTemporarily();
    } else {
      wrapper.classList.add("show-controls");
      clearTimeout(hideControlsTimeout);
    }
  }

  // Двойная скорость при touch у краёв
  video.addEventListener("touchstart", (e) => {
    const rect = video.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    if (x < rect.width*0.2 || x > rect.width*0.8) video.playbackRate = 2.0;
  });
  
  video.addEventListener("touchend", () => {
    const active = sWrap.querySelector(".menu-btn.active");
    const val = active ? parseFloat(active.textContent) : 1;
    video.playbackRate = val || 1;
  });

  // Контролы
  function showControls() {
    wrapper.classList.add("show-controls");
    clearTimeout(hideControlsTimeout);
  }
  
  function showControlsTemporarily() {
    wrapper.classList.add("show-controls");
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(() => {
      if (isFullscreen()) {
        wrapper.classList.remove("show-controls");
      }
    }, 5000);
  }

  wrapper.addEventListener("mousemove", () => {
    if (isFullscreen()) {
      showControlsTemporarily();
    }
  });
  
  wrapper.addEventListener("click", (e) => {
    if (isFullscreen()) {
      showControlsTemporarily();
    }
  });

  // по-умолчанию показываем контролы
  wrapper.classList.add("show-controls");
}

/* ----------------- Франшизы / рекомендации ----------------- */

async function loadFranchises() {
  try {
    const res = await fetch(`${API_BASE}/anime/franchises/random?limit=4`);
    if (!res.ok) throw new Error("Ошибка API: " + res.status);
    const data = await res.json();
    if (!recommendationsPopular) return;
    recommendationsPopular.innerHTML = "";
    data.forEach(franchise => {
      const poster = franchise.image?.optimized?.preview 
        ? `https://anilibria.top${franchise.image.optimized.preview}`
        : "https://via.placeholder.com/200x280?text=No+Image";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${poster}" alt="${franchise.name}">
        <div class="card-content">
          <div class="card-title">${franchise.name}</div>
          <div class="card-meta">
            <span>${franchise.first_year} - ${franchise.last_year || "..."}</span>
            <span class="card-rating"><i class="fas fa-film"></i> ${franchise.total_releases}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openFranchise(franchise.id));
      recommendationsPopular.appendChild(card);
    });
  } catch (e) {
    console.error("Ошибка загрузки франшиз:", e);
  }
}

async function openFranchise(franchiseId) {
  try {
    const url = `${API_BASE}/anime/franchises/${franchiseId}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const franchise = await resp.json();

    hideSearch();

    if (grid) grid.style.display = "none";
    const recommendations = document.querySelector(".recommendations");
    if (recommendations) recommendations.style.display = "none";
    document.querySelectorAll('.recommendation-section').forEach(s => s.style.display = 'none');

    animeDetail.style.display = "block";

    const lastRelease = franchise.franchise_releases?.[franchise.franchise_releases.length - 1]?.release;
    detailPoster.src = lastRelease?.poster?.src ? `https://anilibria.top${lastRelease.poster.src}` : "";
    detailTitle.textContent = franchise.name || "";
    detailDescription.textContent = lastRelease?.description || "Описание отсутствует";
    detailYear.textContent = franchise.first_year;
    detailStatus.textContent = "";
    detailEpisodes.textContent = `Релизов: ${franchise.total_releases}, Эпизодов: ${franchise.total_episodes}`;
    detailRating.textContent = "";

    detailGenres.innerHTML = "";
    const yearsSpan = document.createElement("span");
    yearsSpan.textContent = `Годы: ${franchise.first_year} - ${franchise.last_year || "..."}`;
    detailGenres.appendChild(yearsSpan);

    playerContainer.innerHTML = `
      <div class="player-placeholder">
        <i class="fas fa-info-circle"></i>
        <p>Выберите серию из списка выше</p>
      </div>
    `;

    episodeList.innerHTML = "";
    franchise.franchise_releases.forEach(fr => {
      const release = fr.release;
      const seasonHeader = document.createElement("h4");
      seasonHeader.textContent = release.name?.main || "Без названия";
      seasonHeader.style.marginTop = "20px";
      seasonHeader.style.marginBottom = "10px";
      episodeList.appendChild(seasonHeader);

      const episodeContainer = document.createElement("div");
      episodeContainer.style.display = "flex";
      episodeContainer.style.flexWrap = "wrap";
      episodeContainer.style.gap = "10px";

      if (release.episodes_total && release.episodes_total > 0) {
        for (let i = 1; i <= release.episodes_total; i++) {
          const epBtn = document.createElement("button");
          epBtn.className = "episode-btn";
          epBtn.textContent = `Серия ${i}`;
          epBtn.addEventListener('click', () => openAnimeDetail(release.id));
          episodeContainer.appendChild(epBtn);
        }
      } else {
        const noEp = document.createElement("p");
        noEp.textContent = "Серии отсутствуют";
        noEp.style.color = "var(--text-secondary)";
        episodeContainer.appendChild(noEp);
      }
      episodeList.appendChild(episodeContainer);
    });

  } catch (err) {
    console.error("Ошибка загрузки франшизы:", err);
    playerContainer.innerHTML = `
      <div class="player-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Ошибка: ${err.message}</p>
      </div>
    `;
  }
}

/* Назад — полностью восстановить главную */
function goBackToList() {
  if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
  }

  animeDetail.style.display = "none";

  if (lastViewBeforeDetail === 'search' && currentMode === 'detail' && lastSearchResults.length) {
      // Пользователь пришёл из поиска → возвращаем результаты поиска
      currentMode = 'search';
      showSearch();
      grid.style.display = "grid";
      renderGrid(lastSearchResults);

      // Скрываем рекомендации при поиске
      const recommendations = document.querySelector(".recommendations");
      if (recommendations) recommendations.style.display = "none";
      const recommendationSection = document.querySelector(".recommendation-section");
      if (recommendationSection) recommendationSection.style.display = "none";

  } else {
      // Пользователь пришёл с главной → просто показываем сетку и рекомендации без перезагрузки
      currentMode = 'main';
      showSearch();
      grid.style.display = "grid";

      const recommendations = document.querySelector(".recommendations");
      if (recommendations) recommendations.style.display = "block";
      const recommendationSection = document.querySelector(".recommendation-section");
      if (recommendationSection) recommendationSection.style.display = "block";

      // ❌ Не очищаем grid и не вызываем loadReleases() / loadHorizontalReleases()
      // grid.innerHTML = '';
      // loadReleases();
      // loadHorizontalReleases();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}





function hideSearch() {
  if (searchInput) searchInput.style.display = 'none';
  if (searchBtn) searchBtn.style.display = 'none';
}

function showSearch() {
  if (searchInput) searchInput.style.display = '';
  if (searchBtn) searchBtn.style.display = '';
}


/* Top / Upcoming */
async function loadTopAnime() {
  try {
    const url = `${API_BASE}/anime/catalog/top?limit=8`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const list = json.data || [];
    const container = document.getElementById("recommendationsTop");
    if (!container) return;
    container.innerHTML = "";
    renderRecommendationGrid(list, container);
  } catch (err) {
    console.error("Ошибка загрузки топа аниме:", err);
  }
}

async function loadUpcomingAnime() {
  try {
    const url = `${API_BASE}/anime/catalog/upcoming?limit=8`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const list = json.data || [];
    const container = document.getElementById("recommendationsUpcoming");
    if (!container) return;
    container.innerHTML = "";
    renderRecommendationGrid(list, container);
  } catch (err) {
    console.error("Ошибка загрузки upcoming аниме:", err);
  }
}

function renderRecommendationGrid(list, container) {
  if (!list || !list.length) {
    container.innerHTML = "<p>Нет данных для отображения</p>";
    return;
  }
  container.innerHTML = "";
  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.src = item.poster?.preview ? `https://anilibria.top${item.poster.preview}` : "https://via.placeholder.com/300x400?text=No+Poster";
    img.alt = item.name?.main || item.name?.english || "Аниме";
    img.loading = "lazy";
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = item.name?.main || item.name?.english || "Без названия";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const year = document.createElement("span");
    year.textContent = item.year || "—";
    const rating = document.createElement("span");
    rating.className = "card-rating";
    rating.innerHTML = `<i class="fas fa-star"></i> ${item.rating?.score || "—"}`;
    meta.appendChild(year);
    meta.appendChild(rating);
    cardContent.appendChild(title);
    cardContent.appendChild(meta);
    card.appendChild(img);
    card.appendChild(cardContent);
    container.appendChild(card);
    card.addEventListener('click', () => openAnimeDetail(item.id || item.alias));
  });
}

/* Горизонтальный скролл (один раз) */
function setupHorizontalScroll() {
  const leftBtn = document.querySelector('.left-btn');
  const rightBtn = document.querySelector('.right-btn');
  const scrollContainer = document.querySelector('.horizontal-scroll');
  if (leftBtn && rightBtn && scrollContainer) {
    leftBtn.addEventListener('click', () => scrollContainer.scrollBy({ left: -300, behavior: 'smooth' }));
    rightBtn.addEventListener('click', () => scrollContainer.scrollBy({ left: 300, behavior: 'smooth' }));
  }
}

async function goHome() {
  // Если был HLS-плеер — уничтожаем
  if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
  }

  // Скрываем детальное меню
  animeDetail.style.display = "none";

  // Сбрасываем поиск
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  showSearch()
  lastSearchResults = [];
  lastSearchQuery = '';

  // Показываем главную сетку
  grid.style.display = "grid";
  grid.innerHTML = ''; // очищаем старый контент

  // Показываем рекомендации
  const recommendations = document.querySelector(".recommendations");
  if (recommendations) recommendations.style.display = "block";

  const recommendationSections = document.querySelectorAll(".recommendation-section");
  recommendationSections.forEach(section => section.style.display = "block");

  // Загружаем главные релизы
  await loadReleases();
  await loadHorizontalReleases();

  currentMode = 'main';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Привязываем клик на логотип
logo.addEventListener('click', goHome);


/* ---------- Запуск ---------- */
window.addEventListener('DOMContentLoaded', () => {
  // запускаем домашнее состояние (подгрузит все секции)
  showHome();
  setupEventListeners();
  setupScrollHeader();
  setupHorizontalScroll();
});
