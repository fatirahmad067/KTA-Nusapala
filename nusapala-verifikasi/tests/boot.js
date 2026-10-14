const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { makeDb } = require('./mock-db');

const PUB = path.join(__dirname, '..', 'public');

function stripExternal(html) {
  return html
    .replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '');
}

// Sisipkan epilog ke script inline terakhir agar variabel internal bisa diperiksa.
function appendEpilogue(html) {
  const epilog = `
;window.__internals = function() {
  return { dbSettings: typeof dbSettings !== 'undefined' ? dbSettings : null,
           dbAnggota: typeof dbAnggota !== 'undefined' ? dbAnggota : null,
           daftarDivisiEfektif: typeof daftarDivisiEfektif !== 'undefined' ? daftarDivisiEfektif : null,
           bersihkanDivisi: typeof bersihkanDivisi !== 'undefined' ? bersihkanDivisi : null,
           activePage: typeof activePage !== 'undefined' ? activePage : null };
};
`;
  const idx = html.lastIndexOf('</script>');
  if (idx < 0) return html;
  return html.slice(0, idx) + epilog + html.slice(idx);
}

async function boot(opts = {}) {
  const file = opts.file || 'admin.html';
  const raw = fs.readFileSync(path.join(PUB, file), 'utf8');
  const html = appendEpilogue(stripExternal(raw));

  const virtualConsole = new VirtualConsole();
  const consoleLogs = [];
  virtualConsole.on('jsdomError', e => consoleLogs.push(['jsdomError', e.message]));
  ['log', 'warn', 'error', 'info'].forEach(lvl =>
    virtualConsole.on(lvl, (...a) => consoleLogs.push([lvl, a.map(x => (x && x.message) || String(x)).join(' ')]))
  );

  const dbMock = makeDb(opts.db || {});
  const swalCalls = [];
  const swalQueue = (opts.swalQueue || []).slice();

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',        // supaya inline onclick="..." benar-benar dieksekusi
    pretendToBeVisual: true,
    url: 'http://localhost/admin',
    virtualConsole,
    beforeParse(window) {
      // Polyfill innerText (tidak ada di jsdom) — dipakai escapeHTML() di admin.html
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        configurable: true,
        get() { return this.textContent; },
        set(v) { this.textContent = v === null ? '' : String(v); }
      });
      window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      window.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
      window.cancelAnimationFrame = id => clearTimeout(id);
      window.scrollTo = () => {};
      window.print = () => {};
      window.URL.createObjectURL = () => 'blob:mock';

      window.supabase = { createClient: () => dbMock.client };
      window.html5Qrcode = class { async start() {} async stop() {} clear() {} };
      window.Html5Qrcode = window.html5Qrcode;
      window.bootstrap = {
        Modal: class {
          constructor(el) { this.el = el; window.bootstrap.Modal._last = this; }
          show() {} hide() {} dispose() {}
          static getInstance() { return window.bootstrap.Modal._last || null; }
          static getOrCreateInstance(el) { return new window.bootstrap.Modal(el); }
        },
        Dropdown: class { constructor() {} show() {} hide() {} static getInstance() { return null; } },
        Collapse: class { constructor() {} show() {} hide() {} toggle() {} },
        Tooltip: class { constructor() {} static getInstance() { return null; } },
        Popover: class { constructor() {} },
        Toast: class { constructor() {} show() {} }
      };

      function Swal() {}
      Swal.fire = async (arg) => {
        swalCalls.push(arg);
        const preset = swalQueue.shift();
        if (preset !== undefined) return preset;
        return { isConfirmed: true, value: (arg && arg.inputValue) || 'Konfirmasi' };
      };
      Swal.mixin = () => Swal;
      Swal.close = () => {};
      window.Swal = Swal;

      if (opts.user) window.sessionStorage.setItem('auth_user', JSON.stringify(opts.user));
      if (opts.activePage) window.sessionStorage.setItem('auth_active_page', opts.activePage);
    }
  });

  return { dom, window: dom.window, dbMock, swalCalls, consoleLogs };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { boot, sleep };
