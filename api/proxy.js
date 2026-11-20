const ALLOWED = ['opendata.adsb.fi', 'api.adsb.lol', 'api.airplanes.live', 'opensky-network.org', 'api.adsbdb.com'];
const HEAD = { 'User-Agent': 'Fleyet-personal-app/1.0', 'Accept': 'application/json' };
const TESTS = [
  ['adsb.fi', 'https://opendata.adsb.fi/api/v3/lat/41.88/lon/-87.63/dist/25', [200]],
  ['adsb.lol', 'https://api.adsb.lol/v2/point/41.88/-87.63/25', [200]],
  ['adsbdb (flight routes)', 'https://api.adsbdb.com/v0/callsign/UAL1', [200, 404]],
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, body, type) => { res.statusCode = code; if (type) res.setHeader('Content-Type', type); res.end(body); };
  const plain = (code, body) => send(code, body, 'text/plain; charset=utf-8');

  if (req.method === 'OPTIONS') return send(204, '');
  const q = new URL(req.url, 'http://localhost').searchParams;

  if (q.get('test')) {
    const lines = await Promise.all(TESTS.map(async ([name, url, okCodes]) => {
      try {
        const r = await fetch(url, { headers: HEAD });
        const body = await r.text();
        if (!okCodes.includes(r.status)) return `NO  ${name}: refused with HTTP ${r.status}  ${body.slice(0, 70).replace(/\s+/g, ' ')}`;
        let n = '';
        try { const j = JSON.parse(body), a = j.ac || j.aircraft; if (Array.isArray(a)) n = `, ${a.length} aircraft near Chicago`; } catch (e) {}
        return `YES ${name}: works (HTTP ${r.status}${n})`;
      } catch (e) { return `NO  ${name}: could not connect (${e.message})`; }
    }));
    return plain(200, 'Fleyet proxy test (Vercel)\n\n' + lines.join('\n') + '\n\nIf adsb.fi says YES, you are done.');
  }

  const target = q.get('u');
  if (!target) return plain(200, 'Fleyet proxy is alive. Add ?test=1 to the address to test the flight feeds.');

  let t;
  try { t = new URL(target); } catch (e) { return plain(400, 'bad url'); }
  if (t.protocol !== 'https:' || !ALLOWED.includes(t.hostname)) return plain(403, 'host not allowed');

  try {
    const up = await fetch(t.toString(), { headers: HEAD });
    const body = await up.text();
    return send(up.status, body, up.headers.get('content-type') || 'application/json');
  } catch (e) { return plain(502, 'upstream error: ' + e.message); }
};
