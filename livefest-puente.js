/* ════════════════════════════════════════════════════════════════
   PUENTE LIVE FEST → OBS
   Con UN clic lee una vez tus puntos REALES de TikTok y los manda a livefest.html (OBS):
     · LIVE Fest 26 · Liga de poder: puntos, puesto, meta y cuánto falta
     · Futuros Reyes · ranking diario de tu liga: puntos, puesto y diferencia
   Por qué en Chrome: TikTok solo responde a páginas de tiktok.com y usa tu
   sesión (la Liga de poder la necesita). Corre en https://www.tiktok.com/robots.txt
   porque las páginas normales de TikTok no dejan conectarse a OBS.

   CÓMO USARLO
     1. Chrome con tu sesión de TikTok iniciada.
     2. Favorito con este enlace (nombre: "Puente LIVE Fest"):
        javascript:(()=>{if(location.href.indexOf('https://www.tiktok.com/robots.txt')){location.href='https://www.tiktok.com/robots.txt';return}var s=document.createElement('script');s.src='https://srdwly.github.io/testoverlay/livefest-puente.js?'+Date.now();document.body.appendChild(s)})()
     3. Clic en el favorito (abre robots.txt), y clic otra vez: lee y manda a OBS.
     4. La primera vez escribe la contraseña del WebSocket de OBS (se guarda).
     Para actualizar: vuelve a hacer clic en el favorito (o en "Leer ahora").
     NO lee solo: cada lectura la pides tú. Solo LEE datos; no toca tu cuenta.
   ════════════════════════════════════════════════════════════════ */
(() => {
  if (window.__lfPuente) { window.__lfPuente(); return; }      // otro clic en el favorito = leer otra vez
  const CFG = {
    uid: '7040203089512875014',                 // tu id de TikTok (Rodrigo Veliz Guitarra)
    obs: 'ws://localhost:4455',
    fest: { id: '2026_11_eoy_revenue', activity: '2026_11_eoy' },
    reyes: { activity: 'op_component-open-2-7704377515875568402', feature: 'compfbf9418beea0',
             ligas: ['Diamante', 'Platino', 'Oro', 'Plata', 'Bronce', 'Hierro', 'Ascenso'] },
  };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ── Panel ─────────────────────────────────────────────── */
  document.title = 'Puente LIVE Fest';
  document.body.innerHTML = `
  <style>
    body{margin:0;background:#160826;color:#fff;font:16px/1.45 "Segoe UI",Arial,sans-serif}
    .w{max-width:560px;margin:30px auto;padding:22px;border-radius:20px;background:#22103a;border:2px solid #25f4ee}
    h1{margin:0 0 4px;font-size:22px} .m{color:#cbb9e6;font-size:14px}
    .r{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #3a2458}
    .ok{color:#5cf2a0} .bad{color:#ff6b81} .warn{color:#ffd36b}
    input{font-size:16px;padding:6px 8px;border-radius:8px;border:0;width:200px}
    button{font-size:15px;font-weight:700;padding:7px 12px;border-radius:10px;border:0;background:#25f4ee;cursor:pointer}
    b{font-size:20px}
  </style>
  <div class="w">
    <h1>Puente LIVE Fest → OBS</h1>
    <div class="m">Lee tus puntos solo cuando tú lo pides: botón de abajo o clic otra vez en el favorito.</div>
    <div class="r"><span></span><span><button id="now">Leer ahora</button></span></div>
    <div class="r"><span>OBS</span><span id="sObs" class="warn">conectando…</span></div>
    <div class="r"><span>Contraseña WebSocket de OBS</span><span><input id="pass" type="password"> <button id="save">Guardar</button></span></div>
    <div class="r"><span>Liga de poder</span><span id="sFest">—</span></div>
    <div class="r"><span>Futuros Reyes</span><span id="sReyes">—</span></div>
    <div class="r"><span>Última lectura</span><span id="sT">—</span></div>
    <div class="r"><span>Enviados a OBS</span><span id="sN">0</span></div>
  </div>`;
  const $ = id => document.getElementById(id);
  const set = (id, html, cls = '') => { const e = $(id); e.innerHTML = html; e.className = cls; };
  const fmt = n => Number(n).toLocaleString('es-BO');

  /* ── OBS WebSocket ─────────────────────────────────────── */
  let obsPass = store.get('livefest-obspass') || '';
  $('pass').value = obsPass;
  let ws = null, ready = false, req = 0, timer = null, sent = 0, last = null;
  const sha = async s => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))));
  function connect() {
    clearTimeout(timer); try { ws && ws.close(); } catch (e) {}
    ready = false; set('sObs', 'conectando…', 'warn');
    let w; try { w = ws = new WebSocket(CFG.obs); } catch (e) { set('sObs', 'no se pudo', 'bad'); return; }
    w.onmessage = async m => {
      let msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
      if (msg.op === 0) {
        const d = { rpcVersion: 1, eventSubscriptions: 0 }, au = msg.d.authentication;
        if (au) {
          if (!obsPass) { set('sObs', 'OBS pide contraseña: escríbela abajo', 'bad'); w.close(); return; }
          d.authentication = await sha(await sha(obsPass + au.salt) + au.challenge);
        }
        w.send(JSON.stringify({ op: 1, d }));
      } else if (msg.op === 2) { ready = true; set('sObs', 'conectado ✓', 'ok'); if (last) send(last); }
    };
    w.onclose = e => {
      if (w !== ws) return; ready = false;
      if (e.code === 4009) set('sObs', 'contraseña incorrecta', 'bad');
      else if (!/contraseña/.test($('sObs').textContent)) set('sObs', 'sin conexión (¿OBS abierto con WebSocket activado?)', 'bad');
      timer = setTimeout(connect, 4000);
    };
    w.onerror = () => {};
  }
  $('save').onclick = () => { obsPass = $('pass').value; store.set('livefest-obspass', obsPass); connect(); };
  connect();

  function send(pkt) {
    if (!ready || ws.readyState !== 1) return;
    const txt = JSON.stringify(pkt);
    // 1) evento para TODAS las fuentes de navegador de OBS  2) evento del WebSocket (Live Studio / Chrome)
    ws.send(JSON.stringify({ op: 6, d: { requestType: 'CallVendorRequest', requestId: 'l' + (++req),
      requestData: { vendorName: 'obs-browser', requestType: 'emit_event', requestData: { event_name: 'livefest', event_data: { j: txt } } } } }));
    ws.send(JSON.stringify({ op: 6, d: { requestType: 'BroadcastCustomEvent', requestId: 'l' + (++req), requestData: { eventData: { livefest: { j: txt } } } } }));
    sent++; $('sN').textContent = sent;
  }

  /* ── Lectura de TikTok ─────────────────────────────────── */
  const post = async (url, body) => {
    const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };
  async function readFest() {
    const u = `https://webcast.tiktok.com/webcast/livefest/gather?livefest_id=${CFG.fest.id}&anchor_id=${CFG.uid}&user_id=${CFG.uid}&room_id=0&activity_name=${CFG.fest.activity}&aid=1233`;
    const j = await post(u, {});
    const d = j && j.data && (j.data[CFG.fest.id] || Object.values(j.data)[0]);
    const lr = d && d.latestRank;
    if (!lr) throw new Error('sin datos (¿sesión de TikTok iniciada en este Chrome?)');
    const c = lr.comparison || {};
    return { stage: lr.stageId, round: lr.roundId, score: +lr.score || 0, rank: +lr.rank || 0,
             targetRank: +c.target_rank || +(lr.promotionLine || {}).rank || 0,
             targetScore: +c.target_score || +(lr.promotionLine || {}).score || 0,
             delta: c.delta_score != null ? +c.delta_score : null };
  }
  let liga = store.get('livefest-liga') != null ? +store.get('livefest-liga') : null, ligaAt = liga != null ? Date.now() : 0;
  const reyesCall = data => post(`https://webcast.tiktok.com/webcast/activity/dispatchv2/?aid=1233&activity=${CFG.reyes.activity}`,
    { query: { anchor_id: CFG.uid, aid: 1233, activity: CFG.reyes.activity }, data: Object.assign({ activity: CFG.reyes.activity }, data) });
  const reyesState = async idx => {
    const j = await reyesCall({ user_rank__player_state: [{ uid: CFG.uid, base: { request_key: '', feature_name: CFG.reyes.feature + '_r_0_' + idx, scene: '' } }] });
    const p = j.data && j.data.user_rank__player_state && j.data.user_rank__player_state[0];
    return p && p.state && +p.state.rank > 0 ? p.state : null;
  };
  async function readReyes() {
    let st = liga != null ? await reyesState(liga) : null;
    if (!st) {                                   // buscar en qué liga estás (Ascenso, Hierro…); se recuerda
      liga = null;
      for (let i = CFG.reyes.ligas.length - 1; i >= 0 && !st; i--) { st = await reyesState(i); if (st) { liga = i; ligaAt = Date.now(); store.set('livefest-liga', i); } }
      if (!st) throw new Error('hoy todavía no apareces en el ranking diario');
    }
    const c = st.comparison || {};
    return { liga: CFG.reyes.ligas[liga] || 'Liga ' + liga, score: +st.score || 0, rank: +st.rank || 0,
             targetRank: +c.target_rank || 0, delta: c.delta_score != null ? +c.delta_score : null };
  }
  let busy = false;
  async function tick() {
    if (busy) return; busy = true; $('now').disabled = true;
    const pkt = { t: Date.now(), s: 'puente' };
    try { pkt.fest = await readFest();
      const f = pkt.fest;
      set('sFest', `<b>${fmt(f.score)}</b> pts · núm. ${f.rank || '3000+'}` + (f.delta != null ? ` · faltan ${fmt(f.delta)} para el núm. ${f.targetRank}` : ''), 'ok');
    } catch (e) { set('sFest', e.message, 'bad'); }
    try { pkt.reyes = await readReyes();
      const r = pkt.reyes;
      set('sReyes', `<b>${fmt(r.score)}</b> pts · puesto ${r.rank} (${r.liga})` + (r.delta != null && r.targetRank ? ` · ${fmt(r.delta)} para el ${r.targetRank}` : ''), 'ok');
    } catch (e) { set('sReyes', e.message, 'bad'); }
    $('sT').textContent = new Date().toLocaleTimeString('es-BO');
    if (pkt.fest || pkt.reyes) { last = pkt; send(pkt); }
    busy = false; $('now').disabled = false;
  }
  $('now').onclick = tick;
  window.__lfPuente = tick;
  tick();
  window.__lfPuenteState = () => ({ last, ready, sent, liga });
})();
