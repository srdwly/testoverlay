#!/usr/bin/env node
/* =====================================================================
   render.js — convierte una canción (.txt) en un video vertical MP4.

   Uso:
     node render.js canciones/mi-cancion.txt
     node render.js canciones/mi-cancion.txt --video toma.mp4
     node render.js canciones/mi-cancion.txt --audio audio.wav
     node render.js canciones/mi-cancion.txt --desde 20 --hasta 35   (prueba rápida)
     node render.js canciones/mi-cancion.txt --fps 24 --salida salida/x.mp4

   Si el .txt tiene "video:" o "audio:" se usan solos (rutas relativas al .txt).
   Además del MP4 genera .srt (subtítulos) y -descripcion.txt (texto para TikTok).
   Requiere: Node 18+, playwright (con Chromium) y ffmpeg.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const Teoria = require('./teoria.js');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
    else o._.push(a[i]);
  }
  return o;
}
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const srtT = s => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

(async () => {
  const o = args();
  const archivo = o._[0];
  if (!archivo) { console.log('Uso: node render.js canciones/mi-cancion.txt [--video x.mp4] [--audio x.wav]'); process.exit(1); }
  const texto = fs.readFileSync(archivo, 'utf8');
  const A = Teoria.parsearCancion(texto);
  const dirTxt = path.dirname(path.resolve(archivo));
  const rel = p => (p ? (path.isAbsolute(p) ? p : path.resolve(dirTxt, p)) : null);
  const video = o.video ? path.resolve(o.video) : rel(A.meta.video);
  const audio = o.audio ? path.resolve(o.audio) : rel(A.meta.audio);
  const voz = o.voz ? path.resolve(o.voz) : rel(A.meta.voz);
  for (const f of [video, audio, voz]) if (f && !fs.existsSync(f)) { console.error('No encuentro el archivo: ' + f); process.exit(1); }
  const fps = +(o.fps || 30);
  const nombre = slug(A.meta.titulo || path.basename(archivo, '.txt'));
  const salida = path.resolve(o.salida || path.join(__dirname, 'salida', nombre + '.mp4'));
  fs.mkdirSync(path.dirname(salida), { recursive: true });

  // ---- subtítulos y descripción ----
  const base = salida.replace(/\.mp4$/, '');
  fs.writeFileSync(base + '.srt', A.notas.map((n, i) => `${i + 1}\n${srtT(n.t)} --> ${srtT(n.fin)}\n${n.texto}\n`).join('\n'));
  const esp = A.resumen.especiales.map(a => `• ${a.simbolo} (${a.romano}): ${a.etiqueta}`).join('\n');
  fs.writeFileSync(base + '-descripcion.txt',
    `${A.meta.gancho || 'Análisis armónico'} 🎸\n\n${A.meta.titulo}${A.meta.artista ? ' – ' + A.meta.artista : ''}\n` +
    `Tonalidad: ${A.nombreTonalidad}\nProgresión: ${A.resumen.progresion}\n${esp}\n\n` +
    `${A.meta.cierre || ''}\n\n#guitarra #teoriamusical #armonia #acordes #musicabolivia #aprendeguitarra\n`);

  // ---- navegador ----
  const navegador = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? {} : {});
  const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await pagina.goto('file://' + path.join(__dirname, 'plantilla.html') + '?render=1');
  await pagina.waitForFunction(() => window.listo === true);
  await pagina.evaluate(([t, v]) => window.cargarTexto(t, { conVideo: v }), [texto, !!video]);
  await pagina.evaluate(() => document.fonts.ready);
  const duracion = await pagina.evaluate(() => window.duracion);
  const desde = +(o.desde || 0), hasta = Math.min(+(o.hasta || duracion), duracion);
  const total = Math.ceil((hasta - desde) * fps);

  // ---- ffmpeg ----
  const ff = ['-y', '-hide_banner', '-loglevel', 'error'];
  const formato = video ? 'png' : 'jpeg';
  if (video) ff.push('-ss', String(desde), '-i', video);
  ff.push('-f', 'image2pipe', '-framerate', String(fps), '-c:v', video ? 'png' : 'mjpeg', '-i', '-');
  if (audio && !video) ff.push('-ss', String(desde), '-i', audio);
  if (voz) ff.push('-ss', String(desde), '-i', voz);
  // índices de entrada: música (video o audio) y voz en off
  const filtros = [];
  let mapaV = video ? '[v]' : (video ? '' : '1:v');
  if (video) filtros.push('[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=' + fps + '[bg];[bg][1:v]overlay=0:0:shortest=1[v]');
  else mapaV = '0:v';
  let mapaA = null;
  const iM = video ? 0 : audio ? 1 : -1;            // la imagen del navegador entra antes que el audio
  const iV = voz ? (video ? 2 : audio ? 2 : 1) : -1;
  if (voz && iM >= 0) {
    // la guitarra baja sola cuando hablas (ducking) y luego se mezcla con la voz
    filtros.push(`[${iV}:a]aformat=channel_layouts=stereo,volume=1.4,asplit=2[vz][vzsc];[${iM}:a]aformat=channel_layouts=stereo[mu];[mu][vzsc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[mud];[mud][vz]amix=inputs=2:duration=first:normalize=0[a]`);
    mapaA = '[a]';
  } else if (voz) mapaA = iV + ':a';
  else if (iM >= 0) mapaA = video ? '0:a?' : '1:a';
  if (filtros.length) ff.push('-filter_complex', filtros.join(';'));
  ff.push('-map', mapaV);
  if (mapaA) ff.push('-map', mapaA);
  ff.push('-t', String(hasta - desde), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida);
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const terminado = new Promise((ok, mal) => proc.on('close', c => (c === 0 ? ok() : mal(new Error('ffmpeg salió con ' + c)))));

  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const t = desde + f / fps;
    await pagina.evaluate(x => window.renderAt(x), t);
    const img = await pagina.screenshot({ type: formato, quality: formato === 'jpeg' ? 92 : undefined, omitBackground: !!video });
    if (!proc.stdin.write(img)) await new Promise(r => proc.stdin.once('drain', r));
    if (f % fps === 0) process.stdout.write(`\r  cuadro ${f}/${total}  (${Math.round((f / total) * 100)}%)  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  proc.stdin.end();
  await terminado;
  await navegador.close();
  console.log(`\n✔ Listo: ${salida}\n  Subtítulos: ${base}.srt\n  Descripción: ${base}-descripcion.txt`);
})().catch(e => { console.error(e); process.exit(1); });
