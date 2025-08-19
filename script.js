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
// let franchisesPage = document.getElementById("franchisesPage");
let franchisePage = 1;
let loadingFranchises = false;



let hlsInstance = null;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  loadReleases(); // Загружаем франшизы в основную сетку (40 элементов)
  loadHorizontalReleases(); // Загружаем релизы для горизонтального скролла (15 элементов)
  // loadFranchises(); // Загружаем популярные франшизы
  setupEventListeners();
  setupScrollHeader();
  setupHorizontalScroll();
});

async function loadAllFranchises() {
  if (loadingFranchises) return;
  loadingFranchises = true;

  let res = await fetch(`${API_BASE}/franchises?page=${franchisePage}&limit=20`);
  let data = await res.json();

  if (franchisePage === 1) franchisesPage.innerHTML = "";

  data.list.forEach(fr => {
      let div = document.createElement("div");
      div.className = "franchise-card";
      div.textContent = fr.name;
      div.onclick = () => openFranchise(fr.id);
      franchisesPage.appendChild(div);
  });

  franchisePage++;
  loadingFranchises = false;
}

// следим за скроллом
// franchisesPage.addEventListener("scroll", () => {
//   if (franchisesPage.scrollTop + franchisesPage.clientHeight >= franchisesPage.scrollHeight - 50) {
//       loadAllFranchises();
//   }
// });


// при нажатии "Больше франшиз"
document.getElementById("moreFranchisesBtn").addEventListener("click", () => {
document.getElementById("mainContent").style.display = "none";
document.getElementById("franchisesPage").style.display = "block";
franchisesPage.innerHTML = `<div class="loading">Загрузка...</div>`;
loadAllFranchises();
});

// кнопка "Назад"
document.getElementById("backBtn").addEventListener("click", () => {
document.getElementById("franchisesPage").style.display = "none";
document.getElementById("mainContent").style.display = "block";
});


// Настройка горизонтального скролла
function setupHorizontalScroll() {
  const leftBtn = document.querySelector('.left-btn');
  const rightBtn = document.querySelector('.right-btn');
  const scrollContainer = document.querySelector('.horizontal-scroll');
  
  if (leftBtn && rightBtn && scrollContainer) {
    leftBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });
    
    rightBtn.addEventListener('click', () => {
      scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });
  }
}

// Setup event listeners
function setupEventListeners() {
  searchBtn.addEventListener('click', () => searchAnime(searchInput.value));
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchAnime(searchInput.value);
  });
  backBtn.addEventListener('click', goBackToList);
}

// Header scroll effect
function setupScrollHeader() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// --- Загрузка франшиз (40 элементов) ---
async function loadReleases() {
  try {
    const res = await fetch(`${API_BASE}/anime/franchises/random?limit=40`);
    if (!res.ok) throw new Error("Ошибка API: " + res.status);
    const data = await res.json();

    if (!grid) return; // используем grid вместо recommendationsPopular
    
    grid.innerHTML = ""; // очищаем контейнер

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


// --- Рендер горизонтальных релизов ---
function renderHorizontalReleases(list) {
  if (!releasesHorizontal) return;
  
  releasesHorizontal.innerHTML = "";

  if (!list.length) {
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "horizontal-card";
    
    const img = document.createElement("img");
    img.src = item.poster?.preview
      ? `https://anilibria.top${item.poster.preview}`
      : "https://via.placeholder.com/300x400?text=No+Poster";
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

// --- Рендер сетки (франшизы) ---
function renderGrid(list) {
  grid.innerHTML = "";
  empty.style.display = "none";

  if (!list.length) {
    empty.style.display = "block";
    empty.textContent = "Ничего не найдено.";
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    
    const img = document.createElement("img");
    img.src = item.poster?.preview
      ? `https://anilibria.top${item.poster.preview}`
      : "https://via.placeholder.com/300x400?text=No+Poster";
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
    grid.appendChild(card);

    card.addEventListener('click', () => openAnimeDetail(item.id || item.alias));
  });
}

// --- Поиск ---
async function searchAnime(query) {
  if (!query) {
    loadReleases();
    loadHorizontalReleases();
    return;
  }
  
  try {
    empty.textContent = "Поиск...";
    empty.classList.add('loading');
    
    const url = `${API_BASE}/app/search/releases?query=${encodeURIComponent(query)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    const list = json.map(item => item.release || item).filter(r => r);
    renderGrid(list);

    // Скрываем горизонтальные релизы при поиске
    const recommendationSection = document.querySelector('.recommendation-section');
    if (recommendationSection) {
      recommendationSection.style.display = 'none';
    }
    
    empty.style.display = list.length ? "none" : "block";
    empty.textContent = list.length ? "" : "Ничего не найдено.";
    empty.classList.remove('loading');
  } catch (err) {
    console.error("Ошибка поиска:", err);
    empty.textContent = `Ошибка поиска: ${err.message}`;
    empty.classList.remove('loading');
  }
}

// --- Детальная страница ---
async function openAnimeDetail(idOrAlias) {
  try {
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

// --- Воспроизведение ---
function playEpisode(ep) {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  const sources = [];
  if (ep.hls_480) sources.push({ label: "480p", url: ep.hls_480 });
  if (ep.hls_720) sources.push({ label: "720p", url: ep.hls_720 });
  if (ep.hls_1080) sources.push({ label: "1080p", url: ep.hls_1080 });

  if (!sources.length) {
    playerContainer.innerHTML = `
      <div class="player-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Плеер недоступен для этой серии</p>
      </div>
    `;
    return;
  }

  playerContainer.innerHTML = `
    <video id="video" controls autoplay style="width:100%;max-width:800px;"></video>
    <div class="quality-selector"></div>
  `;
  const video = document.getElementById("video");
  const qualitySelector = playerContainer.querySelector(".quality-selector");

  function setSource(url) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    video.pause();
    video.src = "";

    if (Hls.isSupported()) {
      hlsInstance = new Hls();
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => video.play());
    } else {
      playerContainer.innerHTML = `
        <div class="player-placeholder">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Ваш браузер не поддерживает HLS</p>
        </div>
      `;
    }
  }

  sources.forEach(src => {
    const btn = document.createElement("button");
    btn.className = "quality-btn";
    btn.textContent = src.label;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setSource(src.url);
    });
    qualitySelector.appendChild(btn);
  });

  // Активируем первую кнопку качества
  const firstQualityBtn = qualitySelector.querySelector('.quality-btn');
  if (firstQualityBtn) firstQualityBtn.classList.add('active');
  
  setSource(sources[0].url);
  video.scrollIntoView({ behavior: "smooth" });
}

// --- Франшизы ---
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

    grid.style.display = "none";
    
    const recommendations = document.querySelector(".recommendations");
    if (recommendations) recommendations.style.display = "none";
    
    const recommendationSection = document.querySelector('.recommendation-section');
    if (recommendationSection) recommendationSection.style.display = 'none';
    
    animeDetail.style.display = "block";

    const lastRelease = franchise.franchise_releases?.[franchise.franchise_releases.length - 1]?.release;
    detailPoster.src = lastRelease?.poster?.src ? `https://anilibria.top${lastRelease.poster.src}` : "";
    detailTitle.textContent = franchise.name || "";
    detailDescription.textContent = lastRelease?.description || "Описание отсутствует";
    detailYear.textContent = franchise.first_year;
    detailStatus.textContent = "";
    detailEpisodes.textContent = `Релизов: ${franchise.total_releases}, Эпизодов: ${franchise.total_episodes}`;
    detailRating.textContent = "";

    // Очищаем жанры
    detailGenres.innerHTML = "";
    
    // Создаем элемент для отображения годов
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

// --- Назад ---
function goBackToList() {
  animeDetail.style.display = "none";
  grid.style.display = "grid";
  
  const recommendations = document.querySelector(".recommendations");
  if (recommendations) recommendations.style.display = "block";
  
  const recommendationSection = document.querySelector('.recommendation-section');
  if (recommendationSection) recommendationSection.style.display = 'block';

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  
  // Прокрутка к началу страницы
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Загрузка дополнительных рекомендаций ---
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

// --- Рендер рекомендаций ---
function renderRecommendationGrid(list, container) {
  if (!list.length) {
    container.innerHTML = "<p>Нет данных для отображения</p>";
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    
    const img = document.createElement("img");
    img.src = item.poster?.preview
      ? `https://anilibria.top${item.poster.preview}`
      : "https://via.placeholder.com/300x400?text=No+Poster";
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

// Обновляем инициализацию для загрузки всех рекомендаций
window.addEventListener('DOMContentLoaded', () => {
  loadReleases();
  // loadHorizontalReleaases();
  // loadFranchises();
  // loadTopAnime();
  // loadUpcomingAnime();
  setupEventListeners();
  setupScrollHeader();
  setupHorizontalScroll();
});


