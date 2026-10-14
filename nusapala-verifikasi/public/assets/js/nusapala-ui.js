/* =============================================================================
   NUSAPALA UI KIT — perilaku bersama untuk semua halaman
   -----------------------------------------------------------------------------
   Berisi:
   • Master data DIVISI (Gunung Hutan, Rock Climbing, Olahraga Arus Deras)
     + metadata ikon/warna/deskripsi agar konsisten di seluruh situs.
   • Gerak halus: scroll progress, reveal-on-scroll, stagger, counter angka,
     navbar state, scroll-spy, ripple tombol, back-to-top.
   • Combobox "bisa ketik divisi baru" yang membungkus <select> lama tanpa
     mengubah logika halaman (select tetap jadi sumber kebenaran).
   • Toast ringan & helper kecil lainnya.

   Semua efek otomatis nonaktif bila pengguna memilih prefers-reduced-motion.
   ============================================================================= */
(function (window, document) {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================= 1. MASTER DATA DIVISI ========================== */
  var DIVISI_DEFAULT = ['Gunung Hutan', 'Rock Climbing', 'Olahraga Arus Deras'];

  var DIVISI_META = {
    'gunung hutan': {
      kode: 'DIV-01',
      icon: 'fa-mountain',
      theme: 'np-div-gp',
      nama: 'Gunung Hutan',
      tagline: 'Mountaineering & Jungle Survival',
      desc: 'Pendakian, navigasi darat, survival, dan konservasi kawasan hutan gunung.'
    },
    'rock climbing': {
      kode: 'DIV-02',
      icon: 'fa-person-hiking',
      theme: 'np-div-rc',
      nama: 'Rock Climbing',
      tagline: 'Vertical Adventure',
      desc: 'Panjat tebing, bouldering, single & multi pitch, hingga rescue vertikal.'
    },
    'olahraga arus deras': {
      kode: 'DIV-03',
      icon: 'fa-water',
      theme: 'np-div-or',
      nama: 'Olahraga Arus Deras',
      tagline: 'Whitewater & River Rescue',
      desc: 'Arung jeram, kayak, susur sungai, dan keselamatan di air berarus deras.'
    }
  };

  /* Aliases lama supaya data lawas tetap dikenali */
  var DIVISI_ALIAS = {
    'rafting/orad': 'olahraga arus deras',
    'rafting': 'olahraga arus deras',
    'orad': 'olahraga arus deras',
    'arus deras': 'olahraga arus deras',
    'panjat tebing': 'rock climbing',
    'rock climbing / panjat tebing': 'rock climbing',
    'gunung-hutan': 'gunung hutan',
    'mountaineering': 'gunung hutan'
  };

  function normalizeDivisi(name) {
    var key = String(name || '').trim().toLowerCase();
    if (DIVISI_ALIAS[key]) key = DIVISI_ALIAS[key];
    return DIVISI_META[key] || {
      kode: 'DIV-XX',
      icon: 'fa-compass',
      theme: 'np-div-gp',
      nama: String(name || 'Umum'),
      tagline: 'Bidang Kegiatan',
      desc: ''
    };
  }

  /**
   * Melebur daftar divisi mentah menjadi daftar kanonik:
   *  - nama alias/lama (Rafting/Orad, Panjat Tebing, ...) digabung ke nama baku;
   *  - duplikat karena beda huruf besar/kecil atau spasi dibuang;
   *  - jumlah anggota dari semua varian dijumlahkan.
   * countsByRaw bersifat opsional: { namaMentah: jumlah }.
   */
  function foldDivisi(list, countsByRaw) {
    var order = [], seen = {}, counts = {};
    (list || []).forEach(function (raw) {
      var nama = normalizeDivisi(raw).nama;
      var key = String(nama).toLowerCase();
      if (seen[key] === undefined) {
        seen[key] = true;
        order.push(nama);
        counts[nama] = 0;
      }
      if (countsByRaw && countsByRaw[raw] !== undefined) counts[nama] += countsByRaw[raw];
    });
    return { names: order, counts: counts };
  }

  /* ============================ 2. UTILITAS =============================== */
  function esc(str) {
    if (str === null || str === undefined) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ====================== 3. SCROLL PROGRESS BAR ========================== */
  function initScrollProgress() {
    if (document.querySelector('.np-scroll-progress')) return;
    var bar = document.createElement('div');
    bar.className = 'np-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ========================== 4. BACK TO TOP ============================== */
  function initBackToTop() {
    if (document.querySelector('.sidebar')) return; // panel admin punya layout sendiri
    if (document.querySelector('.np-backtotop')) return;
    var btn = document.createElement('button');
    btn.className = 'np-backtotop';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Kembali ke atas');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        btn.classList.toggle('is-visible', window.scrollY > 520);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ======================= 5. REVEAL ON SCROLL ============================ */
  var revealObserver = null;
  function initReveal() {
    if (REDUCED || !('IntersectionObserver' in window)) {
      qsa('.reveal, .np-reveal, .np-reveal-left, .np-reveal-scale, .np-stagger')
        .forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    }
    qsa('.reveal:not(.is-visible), .np-reveal:not(.is-visible), .np-reveal-left:not(.is-visible), .np-reveal-scale:not(.is-visible), .np-stagger:not(.is-visible)')
      .forEach(function (el) { revealObserver.observe(el); });
  }

  /* Panggil ulang setelah konten dinamis dirender */
  function scan(root) {
    initReveal();
    initCounters(root);
  }

  /* ======================= 6. COUNTER ANGKA =============================== */
  function initCounters(root) {
    var els = qsa('[data-count]', root);
    els.forEach(function (el) {
      if (el.dataset.npCountDone === '1') return;
      el.dataset.npCountDone = '1';
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-count-suffix') || '';
      var prefix = el.getAttribute('data-count-prefix') || '';
      var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);

      if (REDUCED || target === 0) {
        el.textContent = prefix + formatNumber(target, decimals) + suffix;
        return;
      }
      var start = null, dur = 1200;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + formatNumber(target * eased, decimals) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = prefix + formatNumber(target, decimals) + suffix;
      }
      window.requestAnimationFrame(step);
    });
  }

  function formatNumber(n, decimals) {
    if (decimals > 0) return n.toFixed(decimals);
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* =================== 7. NAVBAR STATE + SCROLL SPY ======================= */
  function initNavbar() {
    var nav = document.querySelector('.landing-navbar');
    if (nav) {
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          nav.classList.toggle('is-scrolled', window.scrollY > 12);
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var links = qsa('.nav-link-landing[href^="#"]').filter(function (a) { return a.getAttribute('href').length > 1; });
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { map[t.id] = a; targets.push(t); }
    });
    if (!targets.length) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); });
        if (map[e.target.id]) map[e.target.id].classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ========================= 8. RIPPLE TOMOL ============================== */
  function initRipple() {
    if (REDUCED) return;
    document.addEventListener('pointerdown', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.btn, .btn-forest, .btn-brass, .service-grid-btn') : null;
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.6;
      var ripple = document.createElement('span');
      ripple.style.cssText =
        'position:absolute;border-radius:50%;pointer-events:none;left:' + (ev.clientX - rect.left - size / 2) + 'px;' +
        'top:' + (ev.clientY - rect.top - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;' +
        'background:radial-gradient(circle, rgba(255,255,255,0.42), rgba(255,255,255,0) 68%);' +
        'transform:scale(0);opacity:0.85;transition:transform .6s cubic-bezier(0.22,1,0.36,1),opacity .6s ease;z-index:0;';
      var prevPos = btn.style.position;
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      window.requestAnimationFrame(function () { ripple.style.transform = 'scale(1)'; ripple.style.opacity = '0'; });
      window.setTimeout(function () {
        ripple.remove();
        if (!prevPos) btn.style.position = '';
      }, 620);
    });
  }

  /* ============ 9. COMBOBOX (select yang bisa diketik nilai baru) ======== */
  /**
   * Membungkus <select> dengan input + daftar pilihan kustom.
   * - Nilai tetap disimpan di <select> asli → logika lama tidak perlu diubah.
   * - creatable:true  → pengguna boleh mengetik nilai baru (mis. divisi baru);
   *   nilai itu otomatis ditambahkan sebagai <option> lalu dipilih.
   * - Perubahan isi <select> dari kode lain dipantau lewat MutationObserver.
   */
  function enhanceSelect(select, opts) {
    if (!select || select.dataset.npCombo === '1') return null;
    opts = opts || {};
    select.dataset.npCombo = '1';

    var wrap = document.createElement('div');
    wrap.className = 'np-combo';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.autocomplete = 'off';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.placeholder = opts.placeholder || (select.options[0] && select.options[0].text) || 'Ketik untuk mencari…';
    if (select.required) input.required = false; // validasi ditangani lewat select
    if (select.disabled) input.disabled = true;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'np-combo-toggle';
    toggle.setAttribute('aria-label', 'Tampilkan pilihan');
    toggle.tabIndex = -1;
    toggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    var panel = document.createElement('div');
    panel.className = 'dropdown-menu w-100';
    panel.style.cssText = 'max-height:240px;overflow-y:auto;display:none;';

    wrap.appendChild(input);
    wrap.appendChild(toggle);
    wrap.appendChild(panel);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    var hint = null;
    if (opts.creatable) {
      hint = document.createElement('div');
      hint.className = 'np-combo-hint';
      hint.innerHTML = '<i class="fa-solid fa-circle-info"></i> Ketik nama baru lalu tekan <b>Enter</b> untuk menambahkannya.';
      wrap.appendChild(hint);
    }

    var open = false;

    function options() {
      return Array.prototype.slice.call(select.options).filter(function (o) { return o.value !== ''; });
    }

    function syncFromSelect() {
      var sel = select.options[select.selectedIndex];
      input.value = sel ? sel.text : '';
      if (sel && select.value === '') input.value = '';
    }

    function render(filter) {
      var f = String(filter || '').trim().toLowerCase();
      var list = options().filter(function (o) { return !f || o.text.toLowerCase().indexOf(f) !== -1; });
      var html = '';

      if (list.length) {
        html += '<h6 class="dropdown-header np-label" style="font-size:0.62rem;">Pilihan tersedia</h6>';
        list.forEach(function (o) {
          var active = o.value === select.value;
          html += '<button type="button" class="dropdown-item d-flex align-items-center justify-content-between gap-2' + (active ? ' active fw-bold' : '') + '" data-value="' + esc(o.value) + '">' +
            '<span>' + esc(o.text) + '</span>' +
            (active ? '<i class="fa-solid fa-check text-success" style="font-size:0.7rem;"></i>' : '') +
            '</button>';
        });
      }

      if (opts.creatable && f && !options().some(function (o) { return o.text.toLowerCase() === f; })) {
        html += '<div class="dropdown-divider"></div>';
        html += '<button type="button" class="dropdown-item d-flex align-items-center gap-2" data-create="' + esc(filter.trim()) + '">' +
          '<span style="width:22px;height:22px;border-radius:7px;background:var(--gold-100);color:var(--gold-700);display:inline-flex;align-items:center;justify-content:center;font-size:0.62rem;"><i class="fa-solid fa-plus"></i></span>' +
          '<span>Tambahkan <b>"' + esc(filter.trim()) + '"</b> sebagai pilihan baru</span></button>';
      }

      if (!html) html = '<div class="dropdown-item disabled small">Tidak ada pilihan cocok</div>';
      panel.innerHTML = html;
    }

    function setOpen(v) {
      open = v;
      panel.style.display = v ? 'block' : 'none';
      input.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) render(input.value === (select.options[select.selectedIndex] || {}).text ? '' : input.value);
    }

    function pick(value, text, isNew) {
      if (isNew) {
        var o = document.createElement('option');
        o.value = value; o.text = text;
        select.appendChild(o);
      }
      select.value = value;
      syncFromSelect();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof opts.onCreate === 'function' && isNew) opts.onCreate(text);
      setOpen(false);
    }

    input.addEventListener('focus', function () { render(''); setOpen(true); });
    input.addEventListener('input', function () { render(input.value); setOpen(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var v = input.value.trim();
        if (!v) return;
        var match = options().filter(function (o) { return o.text.toLowerCase() === v.toLowerCase(); })[0];
        if (match) { e.preventDefault(); pick(match.value, match.text, false); }
        else if (opts.creatable) { e.preventDefault(); pick(v, v, true); }
        else { e.preventDefault(); setOpen(false); syncFromSelect(); }
      } else if (e.key === 'Escape') { setOpen(false); syncFromSelect(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { render(''); setOpen(true); return; }
        var items = qsa('.dropdown-item:not(.disabled)', panel);
        if (!items.length) return;
        var idx = items.indexOf(document.activeElement);
        var next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next].focus();
      }
    });
    toggle.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (open) { setOpen(false); } else { input.focus(); } });
    panel.addEventListener('mousedown', function (e) { e.preventDefault(); });
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.dropdown-item');
      if (!item) return;
      if (item.dataset.create) { pick(item.dataset.create, item.dataset.create, true); return; }
      if (item.dataset.value) {
        var opt = options().filter(function (o) { return o.value === item.dataset.value; })[0];
        pick(item.dataset.value, opt ? opt.text : item.dataset.value, false);
      }
    });
    document.addEventListener('click', function (e) { if (open && !wrap.contains(e.target)) { setOpen(false); syncFromSelect(); } });

    select.addEventListener('change', syncFromSelect);
    // form.reset() tidak memicu 'change' pada <select> -> sinkronkan manual
    var form = select.form || (select.closest ? select.closest('form') : null);
    if (form) {
      form.addEventListener('reset', function () { window.setTimeout(syncFromSelect, 0); });
    }
    if ('MutationObserver' in window) {
      new MutationObserver(function () { syncFromSelect(); if (open) render(''); })
        .observe(select, { childList: true, subtree: true, characterData: true });
    }

    syncFromSelect();
    return { input: input, panel: panel, refresh: syncFromSelect };
  }

  /* ============================= 10. TOAST ================================ */
  function toast(message, type) {
    type = type || 'success';
    if (window.Swal && window.Swal.mixin) {
      window.Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2800, timerProgressBar: true,
        background: type === 'error' ? '#a4482e' : (type === 'warning' ? '#b98f27' : '#123321'),
        color: '#fff'
      }).fire({ icon: type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'success'), title: message });
      return;
    }
    var host = document.querySelector('.np-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'np-toast-host';
      host.style.cssText = 'position:fixed;top:18px;right:18px;z-index:20000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(host);
    }
    var t = document.createElement('div');
    t.style.cssText = 'background:#123321;color:#fff;padding:0.8rem 1.1rem;border-radius:12px;box-shadow:0 16px 34px -16px rgba(10,31,20,.6);font-size:.86rem;font-weight:600;max-width:340px;animation:npPop .2s cubic-bezier(.22,1,.36,1);border:1px solid rgba(224,194,119,.25);';
    t.textContent = message;
    host.appendChild(t);
    window.setTimeout(function () {
      t.style.transition = 'opacity .3s ease, transform .3s ease';
      t.style.opacity = '0'; t.style.transform = 'translateY(-8px)';
      window.setTimeout(function () { t.remove(); }, 320);
    }, 2600);
  }

  /* ==================== 11. TIKER AGENDA BERJALAN ========================= */
  function buildTicker(host, items) {
    if (!host) return;
    if (!items || !items.length) { host.style.display = 'none'; return; }
    host.style.display = '';
    var one = items.map(function (it) {
      return '<span class="np-ticker-item"><i class="fa-solid fa-' + (it.icon || 'calendar-day') + '"></i>' +
        '<b>' + esc(it.title) + '</b> · ' + esc(it.meta || '') + '</span>';
    }).join('');
    host.innerHTML = '<div class="np-ticker-track">' + one + one + '</div>';
  }

  /* ========================= 12. KARTU DIVISI ============================= */
  /**
   * Merender kartu divisi ke kontainer. counts = { namaDivisi: jumlah }
   */
  function renderDivisiCards(container, names, counts, opts) {
    if (!container) return;
    opts = opts || {};
    // Lebur alias & duplikat terlebih dahulu (mis. "Rafting/Orad" + "Olahraga Arus Deras")
    var folded = foldDivisi((names && names.length) ? names : DIVISI_DEFAULT.slice(), counts);
    var list = folded.names;
    counts = folded.counts;
    var total = list.reduce(function (a, n) { return a + (counts[n] || 0); }, 0);

    container.innerHTML = list.map(function (name) {
      var m = normalizeDivisi(name);
      var c = counts && counts[name] !== undefined ? counts[name] : 0;
      return '' +
        '<article class="np-divisi-card np-reveal-scale ' + m.theme + ' np-sheen">' +
          '<div class="topo-layer" style="opacity:.35;"></div>' +
          '<div>' +
            '<div class="d-flex align-items-start justify-content-between gap-3 mb-3">' +
              '<span class="np-divisi-icon"><i class="fa-solid ' + m.icon + '"></i></span>' +
              '<span class="np-divisi-kode">' + esc(m.kode) + '</span>' +
            '</div>' +
            '<h3 class="np-divisi-nama">' + esc(m.nama) + '</h3>' +
            '<p class="np-divisi-desc">' + esc(m.tagline) + (m.desc ? ' — ' + esc(m.desc) : '') + '</p>' +
          '</div>' +
          '<div class="np-divisi-foot">' +
            '<span class="np-divisi-count">' + c + '<small>anggota</small></span>' +
            (opts.linkLabel
              ? '<a class="np-divisi-link" href="' + opts.link + '">' + esc(opts.linkLabel) + ' <i class="fa-solid fa-arrow-right"></i></a>'
              : '<span class="np-divisi-link" style="cursor:default;"><i class="fa-solid fa-shield-halved"></i> ' + (total ? Math.round((c / total) * 100) : 0) + '% kekuatan</span>') +
          '</div>' +
        '</article>';
    }).join('');

    scan(container);
  }

  /* ==================== 13. TEMA TERANG / GELAP =========================== */
  /* Pilihan pengguna disimpan di localStorage; bila belum pernah memilih,
     tema mengikuti preferensi sistem (prefers-color-scheme).                  */
  var THEME_KEY = 'np-theme';

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function readStoredTheme() {
    try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-np-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(mode, animate) {
    var root = document.documentElement;
    var pakai = (mode === 'dark' || mode === 'light') ? mode : systemTheme();

    if (animate && !REDUCED) {
      root.classList.add('np-theme-anim');
      window.setTimeout(function () { root.classList.remove('np-theme-anim'); }, 500);
    }

    if (pakai === 'dark') root.setAttribute('data-np-theme', 'dark');
    else root.removeAttribute('data-np-theme');

    // bilah alamat di HP ikut menyesuaikan
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', pakai === 'dark' ? '#0c1420' : '#f8f3e7');

    qsa('[data-np-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(pakai === 'dark'));
      btn.setAttribute('title', pakai === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
      btn.setAttribute('aria-label', pakai === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    });
    return pakai;
  }

  function initTheme() {
    applyTheme(readStoredTheme() || 'auto', false);

    qsa('[data-np-theme-toggle]').forEach(function (btn) {
      if (btn.dataset.npThemeBound === '1') return;
      btn.dataset.npThemeBound = '1';
      btn.addEventListener('click', function () {
        var baru = currentTheme() === 'dark' ? 'light' : 'dark';
        try { window.localStorage.setItem(THEME_KEY, baru); } catch (e) { /* mode privat */ }
        applyTheme(baru, true);
      });
    });

    // bila pengguna belum memilih, ikut perubahan tema sistem
    var m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (m) {
      var ikutSistem = function () { if (!readStoredTheme()) applyTheme('auto', true); };
      if (m.addEventListener) m.addEventListener('change', ikutSistem);
      else if (m.addListener) m.addListener(ikutSistem);
    }
  }

  /* ============================ 14. INIT ================================== */
  function init() {
    document.documentElement.classList.add('np-js');
    initTheme();
    initScrollProgress();
    initBackToTop();
    initReveal();
    initCounters();
    initNavbar();
    initRipple();
  }

  ready(init);

  /* Ekspor */
  window.NusapalaUI = {
    DIVISI_DEFAULT: DIVISI_DEFAULT,
    DIVISI_META: DIVISI_META,
    normalizeDivisi: normalizeDivisi,
    foldDivisi: foldDivisi,
    renderDivisiCards: renderDivisiCards,
    enhanceSelect: enhanceSelect,
    buildTicker: buildTicker,
    toast: toast,
    scan: scan,
    applyTheme: applyTheme,
    getTheme: currentTheme,
    initTheme: initTheme,
    initReveal: initReveal,
    initCounters: initCounters,
    esc: esc,
    reducedMotion: REDUCED,
    init: init
  };
})(window, document);
