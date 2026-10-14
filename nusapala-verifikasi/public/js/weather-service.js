/**
 * ============================================================================
 * NUSAPALA - Weather Service (Live, No Hardcoded Data)
 * ============================================================================
 * Sumber data   : Open-Meteo (https://open-meteo.com) - API publik, GRATIS,
 *                 tanpa API key, terdokumentasi (https://open-meteo.com/en/docs),
 *                 dan diperbarui langsung dari model cuaca operasional.
 * ============================================================================
 */
(function (global) {
  "use strict";

  const API_BASE = "https://api.open-meteo.com/v1/forecast";
  const CACHE_KEY = "nusapala_cuaca_cache_v2"; // Versi cache dinaikkan karena struktur data berubah
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
  const BATCH_SIZE = 25;

  const CURRENT_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "weather_code",
    "pressure_msl",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "is_day",
  ].join(",");

  const HOURLY_VARS = ["visibility", "uv_index", "precipitation_probability"].join(",");

  // Diperbarui untuk kebutuhan Prakiraan 7 Hari
  const DAILY_VARS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_direction_10m_dominant"
  ].join(",");

  // WMO Weather interpretation codes
  const WMO_CODE_MAP = {
    0: { label: "Cerah", icon: "fa-sun", warna: "#a36f17" },
    1: { label: "Cerah Sebagian", icon: "fa-cloud-sun", warna: "#a36f17" },
    2: { label: "Berawan Sebagian", icon: "fa-cloud-sun", warna: "#6c7c70" },
    3: { label: "Berawan Tebal", icon: "fa-cloud", warna: "#6b7a70" },
    45: { label: "Berkabut", icon: "fa-smog", warna: "#707b73" },
    48: { label: "Kabut Es", icon: "fa-smog", warna: "#707b73" },
    51: { label: "Gerimis Ringan", icon: "fa-cloud-rain", warna: "#4f7ea8" },
    53: { label: "Gerimis Sedang", icon: "fa-cloud-rain", warna: "#4f7ea8" },
    55: { label: "Gerimis Lebat", icon: "fa-cloud-rain", warna: "#3f6f9a" },
    56: { label: "Gerimis Beku Ringan", icon: "fa-cloud-rain", warna: "#4f7ea8" },
    57: { label: "Gerimis Beku Lebat", icon: "fa-cloud-rain", warna: "#3f6f9a" },
    61: { label: "Hujan Ringan", icon: "fa-cloud-showers-heavy", warna: "#3f6f9a" },
    63: { label: "Hujan Sedang", icon: "fa-cloud-showers-heavy", warna: "#345f88" },
    65: { label: "Hujan Lebat", icon: "fa-cloud-showers-heavy", warna: "#284d73" },
    66: { label: "Hujan Beku Ringan", icon: "fa-cloud-showers-heavy", warna: "#345f88" },
    67: { label: "Hujan Beku Lebat", icon: "fa-cloud-showers-heavy", warna: "#284d73" },
    71: { label: "Salju Ringan", icon: "fa-snowflake", warna: "#487eaa" },
    73: { label: "Salju Sedang", icon: "fa-snowflake", warna: "#4e7ca3" },
    75: { label: "Salju Lebat", icon: "fa-snowflake", warna: "#557ea0" },
    77: { label: "Butiran Salju", icon: "fa-snowflake", warna: "#487eaa" },
    80: { label: "Hujan Lokal Ringan", icon: "fa-cloud-showers-heavy", warna: "#3f6f9a" },
    81: { label: "Hujan Lokal Sedang", icon: "fa-cloud-showers-heavy", warna: "#345f88" },
    82: { label: "Hujan Sangat Lebat", icon: "fa-cloud-showers-heavy", warna: "#1f3d5c" },
    85: { label: "Salju Lokal Ringan", icon: "fa-snowflake", warna: "#487eaa" },
    86: { label: "Salju Lokal Lebat", icon: "fa-snowflake", warna: "#557ea0" },
    95: { label: "Badai Petir", icon: "fa-bolt", warna: "#5c4a8a" },
    96: { label: "Badai Petir Hujan Es", icon: "fa-cloud-bolt", warna: "#4c3a7a" },
    99: { label: "Badai Petir Lebat", icon: "fa-cloud-bolt", warna: "#3c2a6a" },
  };

  function wmoInfo(code) {
    if (code === null || code === undefined || !WMO_CODE_MAP[code]) {
      return { label: "Tidak Tersedia", icon: "fa-question", warna: "#707b73" };
    }
    return WMO_CODE_MAP[code];
  }

  const COMPASS_16 = [
    "Utara", "Utara-Timur Laut", "Timur Laut", "Timur-Timur Laut",
    "Timur", "Timur-Tenggara", "Tenggara", "Selatan-Tenggara",
    "Selatan", "Selatan-Barat Daya", "Barat Daya", "Barat-Barat Daya",
    "Barat", "Barat-Barat Laut", "Barat Laut", "Utara-Barat Laut",
  ];

  function derajatKeArahMataAngin(deg) {
    if (typeof deg !== "number" || isNaN(deg)) return null;
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return COMPASS_16[idx];
  }

  // ---------------------------------------------------------------- cache --
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeCache(cacheObj) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (e) {}
  }

  function isFresh(entry) {
    return entry && (Date.now() - entry.fetchedAt) < CACHE_TTL_MS;
  }

  // ------------------------------------------------------------- fetch API --
  function buildBatchUrl(gunungChunk) {
    const lats = gunungChunk.map((g) => g.lat).join(",");
    const lons = gunungChunk.map((g) => g.lon).join(",");
    const params = new URLSearchParams({
      latitude: lats,
      longitude: lons,
      current: CURRENT_VARS,
      hourly: HOURLY_VARS,
      daily: DAILY_VARS,
      wind_speed_unit: "kmh",
      timezone: "auto",
      forecast_days: "7", // Diubah menjadi 7 Hari
    });
    return `${API_BASE}?${params.toString()}`;
  }

  function pickHourlyForCurrentTime(hourly, currentTimeIso) {
    if (!hourly || !Array.isArray(hourly.time)) return {};
    let idx = hourly.time.indexOf(currentTimeIso);
    if (idx === -1) {
      const target = new Date(currentTimeIso).getTime();
      let bestIdx = -1;
      let bestDiff = Infinity;
      hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t).getTime() - target);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      });
      idx = bestIdx;
    }
    if (idx === -1) return {};
    return {
      visibility: hourly.visibility ? hourly.visibility[idx] : null,
      uv_index: hourly.uv_index ? hourly.uv_index[idx] : null,
      precipitation_probability: hourly.precipitation_probability ? hourly.precipitation_probability[idx] : null,
    };
  }

  function normalizeResult(gunung, apiResult) {
    if (!apiResult || apiResult.error || !apiResult.current) {
      return {
        gunungId: gunung.id,
        tersedia: false,
        error: (apiResult && apiResult.reason) || "Data cuaca tidak tersedia dari penyedia.",
        fetchedAt: Date.now(),
      };
    }
    const cur = apiResult.current;
    const daily = apiResult.daily || {};
    const hourlyPick = pickHourlyForCurrentTime(apiResult.hourly, cur.time);
    const wmo = wmoInfo(cur.weather_code);

    // Membangun array Prakiraan Cuaca 7 Hari
    let forecast7Days = [];
    if (daily && daily.time) {
      for (let i = 0; i < daily.time.length; i++) {
        const fWmo = wmoInfo(daily.weather_code[i]);
        forecast7Days.push({
          tanggal: daily.time[i],
          kondisi: fWmo.label,
          ikon: fWmo.icon,
          warnaIkon: fWmo.warna,
          temp_max: numOrNull(daily.temperature_2m_max[i]),
          temp_min: numOrNull(daily.temperature_2m_min[i]),
          feels_max: numOrNull(daily.apparent_temperature_max[i]),
          feels_min: numOrNull(daily.apparent_temperature_min[i]),
          sunrise: daily.sunrise[i],
          sunset: daily.sunset[i],
          uv_index_max: numOrNull(daily.uv_index_max[i]),
          precip_sum: numOrNull(daily.precipitation_sum[i]),
          precip_prob: numOrNull(daily.precipitation_probability_max[i]),
          wind_speed: numOrNull(daily.wind_speed_10m_max[i]),
          wind_dir_deg: numOrNull(daily.wind_direction_10m_dominant[i]),
          wind_dir_label: derajatKeArahMataAngin(daily.wind_direction_10m_dominant[i])
        });
      }
    }

    return {
      gunungId: gunung.id,
      tersedia: true,
      fetchedAt: Date.now(),
      waktuData: cur.time || null,
      timezone: apiResult.timezone || null,
      kondisi: wmo.label,
      ikon: wmo.icon,
      warnaIkon: wmo.warna,
      suhu: numOrNull(cur.temperature_2m),
      suhuTerasa: numOrNull(cur.apparent_temperature),
      kelembapan: numOrNull(cur.relative_humidity_2m),
      curahHujan: numOrNull(cur.precipitation),
      peluangHujan: numOrNull(hourlyPick.precipitation_probability),
      tekananUdara: numOrNull(cur.pressure_msl != null ? cur.pressure_msl : cur.surface_pressure),
      kecepatanAngin: numOrNull(cur.wind_speed_10m),
      hembusanAngin: numOrNull(cur.wind_gusts_10m),
      arahAnginDerajat: numOrNull(cur.wind_direction_10m),
      arahAnginLabel: derajatKeArahMataAngin(cur.wind_direction_10m),
      jarakPandangMeter: numOrNull(hourlyPick.visibility),
      indeksUV: numOrNull(hourlyPick.uv_index),
      indeksUVMaksHariIni: numOrNull(Array.isArray(daily.uv_index_max) ? daily.uv_index_max[0] : null),
      sunrise: Array.isArray(daily.sunrise) ? daily.sunrise[0] : null,
      sunset: Array.isArray(daily.sunset) ? daily.sunset[0] : null,
      isSiangHari: cur.is_day === 1,
      forecast: forecast7Days // Meneruskan data prakiraan ke UI
    };
  }

  function numOrNull(v) {
    return (typeof v === "number" && !isNaN(v)) ? v : null;
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function ambilCuacaBatch(gunungList, forceRefresh) {
    const cache = readCache();
    const hasil = {};
    const perluFetch = [];
    gunungList.forEach((g) => {
      const cached = cache[g.id];
      if (!forceRefresh && isFresh(cached)) {
        hasil[g.id] = cached;
      } else {
        perluFetch.push(g);
      }
    });

    if (perluFetch.length === 0) return hasil;
    const batches = chunk(perluFetch, BATCH_SIZE);

    for (const batch of batches) {
      try {
        const url = buildBatchUrl(batch);
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const arrData = Array.isArray(data) ? data : [data];
        batch.forEach((g, i) => {
          const normalized = normalizeResult(g, arrData[i]);
          hasil[g.id] = normalized;
          cache[g.id] = normalized;
        });
      } catch (err) {
        batch.forEach((g) => {
          const staleCache = cache[g.id];
          if (staleCache) {
            hasil[g.id] = Object.assign({}, staleCache, { basi: true, errorRefresh: err.message });
          } else {
            hasil[g.id] = {
              gunungId: g.id,
              tersedia: false,
              error: "Gagal menghubungi layanan cuaca (" + err.message + ")",
              fetchedAt: Date.now(),
            };
          }
        });
      }
    }
    writeCache(cache);
    return hasil;
  }

  async function ambilCuacaSatu(gunung, forceRefresh) {
    const hasil = await ambilCuacaBatch([gunung], forceRefresh);
    return hasil[gunung.id];
  }

  function formatWaktuRelatif(timestampMs) {
    if (!timestampMs) return "belum pernah";
    const detik = Math.floor((Date.now() - timestampMs) / 1000);
    if (detik < 15) return "baru saja";
    if (detik < 60) return `${detik} detik lalu`;
    const menit = Math.floor(detik / 60);
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    const hari = Math.floor(jam / 24);
    return `${hari} hari lalu`;
  }

  function formatJamISO(isoString) {
    if (!isoString) return null;
    const match = /T(\d{2}):(\d{2})/.exec(isoString);
    return match ? `${match[1]}:${match[2]}` : isoString;
  }

  global.NusapalaWeather = {
    ambilCuacaBatch,
    ambilCuacaSatu,
    formatWaktuRelatif,
    formatJamISO,
    CACHE_TTL_MS,
  };
})(window);