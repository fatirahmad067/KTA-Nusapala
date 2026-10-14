// Mock Supabase client (supabase-js v2) untuk menguji admin.html tanpa internet.
// Builder bersifat thenable: filter (.eq/.ilike/...) boleh dirantai SETELAH
// .insert/.update/.upsert/.delete, persis seperti supabase-js asli.

function makeDb(initial = {}) {
  const store = {
    members: initial.members || [],
    iuran: [], kas_keluar: [], aset: [], permohonan_surat: [],
    peminjaman_aset: [], pengaduan_saran: [], kegiatan: [], posts: [],
    settings: initial.settings || [], kegiatan_operasional: [],
    notifications: []
  };
  const log = [];
  let failNext = null; // 'tabel:operasi' -> operasi itu mengembalikan error

  function builder(table) {
    const b = {
      _rows: null,          // null = seluruh tabel
      _op: null,
      _payload: null,
      _opts: null,
      _single: false,
      _maybeSingle: false,

      select() { b._op = b._op || 'select'; return b; },
      ilike(col, pat) { b._filter(r => String(r[col] ?? '').toLowerCase().includes(String(pat).replace(/%/g, '').toLowerCase())); return b; },
      eq(col, val) { b._filter(r => String(r[col]) === String(val)); return b; },
      neq(col, val) { b._filter(r => String(r[col]) !== String(val)); return b; },
      in(col, vals) { b._filter(r => vals.includes(r[col])); return b; },
      order() { return b; },
      limit(n) { b._limit = n; return b; },
      single() { b._single = true; return b; },
      maybeSingle() { b._maybeSingle = true; return b; },

      insert(payload) { b._op = 'insert'; b._payload = payload; return b; },
      update(payload) { b._op = 'update'; b._payload = payload; return b; },
      upsert(payload, opts) { b._op = 'upsert'; b._payload = payload; b._opts = opts; return b; },
      delete() { b._op = 'delete'; return b; },

      _filter(fn) { b._rows = (b._rows || store[table] || []).filter(fn); return b; },

      then(res, rej) { return b._run().then(res, rej); },
      catch(rej) { return b._run().catch(rej); },

      async _run() {
        if (!store[table]) store[table] = [];
        const target = b._rows || store[table];
        const op = b._op || 'select';
        log.push([op, table, b._payload, b._opts]);

        if (failNext === `${table}:${op}`) {
          return { data: null, error: { message: `mock ${op} gagal pada ${table}`, code: '42P10' } };
        }

        if (op === 'insert') {
          const arr = Array.isArray(b._payload) ? b._payload : [b._payload];
          arr.forEach(r => store[table].push({ id: store[table].length + 1, ...r }));
        } else if (op === 'update') {
          target.forEach(r => Object.assign(r, b._payload));
        } else if (op === 'upsert') {
          const conflict = (b._opts && b._opts.onConflict) || 'id';
          const arr = Array.isArray(b._payload) ? b._payload : [b._payload];
          arr.forEach(row => {
            const idx = store[table].findIndex(r => String(r[conflict]) === String(row[conflict]));
            if (idx >= 0) store[table][idx] = { ...store[table][idx], ...row };
            else store[table].push({ id: store[table].length + 1, ...row });
          });
        } else if (op === 'delete') {
          target.forEach(r => {
            const i = store[table].indexOf(r);
            if (i >= 0) store[table].splice(i, 1);
          });
        }

        const rows = b._rows || store[table];
        if (b._single) return { data: rows[0] || null, error: rows[0] ? null : { message: 'no rows' } };
        if (b._maybeSingle) return { data: rows[0] || null, error: null };
        const out = b._limit ? rows.slice(0, b._limit) : rows.slice();
        return { data: out, error: null };
      }
    };
    return b;
  }

  const client = {
    from(table) { return builder(table); },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    },
    rpc: async () => ({ data: null, error: null })
  };

  return { client, store, log, setFail(v) { failNext = v; } };
}

module.exports = { makeDb };
