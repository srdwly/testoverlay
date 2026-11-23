/* =====================================================================
   teoria.js — motor de análisis armónico para los videos de Rodrigo
   Funciona en el navegador (window.Teoria) y en Node (require).

   Entrada: el texto de una canción (ver canciones/ejemplo.txt)
   Salida:  lista de acordes con tiempo, grado (romano), función
            (T / SD / D), tipo (diatónico, préstamo, dominante
            secundaria...), explicación en español y digitación.
   ===================================================================== */
(function (root) {
  'use strict';

  const LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const SEMI_LETRA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LATINO = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
  const ESCALA_MAYOR = [0, 2, 4, 5, 7, 9, 11];
  const ESCALA_MENOR = [0, 2, 3, 5, 7, 8, 10];
  const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const mod = (n, m) => ((n % m) + m) % m;

  /* ---------- nombres de notas ---------- */
  const latinoDe = (letra, alt) =>
    LATINO[letra] + (alt > 0 ? '#'.repeat(alt) : alt < 0 ? 'b'.repeat(-alt) : '');
  const americanoDe = (letra, alt) =>
    letra + (alt > 0 ? '#'.repeat(alt) : alt < 0 ? 'b'.repeat(-alt) : '');

  /* Acepta "C#", "Bb", "Do#", "Sib", "Lab"... devuelve {letra, alt, len} */
  function leerNota(s) {
    const lat = s.match(/^(Do|Re|Mi|Fa|Sol|La|Si)/i);
    let letra, i;
    if (lat) {
      const nombre = lat[1][0].toUpperCase() + lat[1].slice(1).toLowerCase();
      letra = Object.keys(LATINO).find(k => LATINO[k] === nombre);
      i = lat[1].length;
    } else if (/^[A-G]/i.test(s)) {
      letra = s[0].toUpperCase(); i = 1;
    } else return null;
    let alt = 0;
    while (s[i] === '#' || s[i] === '♯') { alt++; i++; }
    while ((s[i] === 'b' || s[i] === '♭') && !/^b5/.test(s.slice(i, i + 2)) ) { alt--; i++; }
    return { letra, alt, pc: mod(SEMI_LETRA[letra] + alt, 12), len: i };
  }

  /* ---------- acordes ---------- */
  // Calidades reconocidas → intervalos (para validar) y clase
  function leerAcorde(simbolo) {
    const s = simbolo.trim();
    const n = leerNota(s);
    if (!n) return null;
    let resto = s.slice(n.len);
    let bajo = null;
    const sl = resto.lastIndexOf('/');
    if (sl >= 0) {
      const b = leerNota(resto.slice(sl + 1));
      if (b) { bajo = b; resto = resto.slice(0, sl); }
    }
    const r = resto.replace(/\s/g, '');
    let tipo = 'M';       // M, m, dim, aug, sus
    let septima = null;   // '7', 'maj7', 'dim7', 'm7b5', '6'
    let ext = '';
    if (/^(m7b5|ø7?|-7b5)/.test(r)) { tipo = 'dim'; septima = 'm7b5'; }
    else if (/^(dim7|°7|o7)/.test(r)) { tipo = 'dim'; septima = 'dim7'; }
    else if (/^(dim|°|o(?!m))/.test(r)) { tipo = 'dim'; }
    else if (/^(aug|\+)/.test(r)) { tipo = 'aug'; if (/7/.test(r)) septima = '7'; }
    else if (/^(mmaj7|mMaj7|m\(maj7\))/.test(r)) { tipo = 'm'; septima = 'maj7'; }
    else if (/^(maj7|Maj7|M7|Δ7?|7M)/.test(r)) { tipo = 'M'; septima = 'maj7'; }
    else if (/^(m|min|-)(?!aj)/.test(r)) {
      tipo = 'm';
      const q = r.replace(/^(min|m|-)/, '');
      if (/^7/.test(q)) septima = '7';
      else if (/^6/.test(q)) septima = '6';
      else if (/^(9|11)/.test(q)) septima = '7';
      ext = q.replace(/^(7|6)/, '');
    }
    else if (/^sus/.test(r)) { tipo = 'sus'; if (/7/.test(r)) septima = '7'; }
    else if (/^(7|9|11|13)/.test(r)) { septima = '7'; ext = r.replace(/^7/, ''); }
    else if (/^6/.test(r)) { septima = '6'; }
    const sus = (r.match(/sus(2|4)?/) || [])[1] || (tipo === 'sus' ? '4' : null);
    return {
      simbolo: s, raiz: n, bajo, tipo, septima, sus, ext, resto: r,
      // dominante = triada mayor con 7ª menor (o sus con 7)
      esDominante: (tipo === 'M' || tipo === 'sus') && septima === '7',
      esMayor: tipo === 'M' || tipo === 'aug' || tipo === 'sus',
    };
  }

  /* ---------- tonalidad ---------- */
  function leerTonalidad(txt) {
    const t = txt.trim();
    const n = leerNota(t);
    if (!n) return null;
    const resto = t.slice(n.len).trim().toLowerCase();
    const menor = /^(m|min|menor|-)/.test(resto) || /^m$/.test(resto);
    return { ...n, menor };
  }
  function nombreTonalidad(k, cifrado) {
    const nota = cifrado === 'americano' ? americanoDe(k.letra, k.alt) : latinoDe(k.letra, k.alt);
    return nota + (k.menor ? ' menor' : ' mayor');
  }

  /* Acordes diatónicos de la tonalidad (para la barra de grados) */
  function campoArmonico(k) {
    const esc = k.menor ? ESCALA_MENOR : ESCALA_MAYOR;
    const calidades = k.menor
      ? ['m', 'dim', 'M', 'm', 'm', 'M', 'M']
      : ['M', 'm', 'm', 'M', 'M', 'm', 'dim'];
    const li = LETRAS.indexOf(k.letra);
    return esc.map((semi, i) => {
      const letra = LETRAS[(li + i) % 7];
      const pc = mod(k.pc + semi, 12);
      const alt = mod(pc - SEMI_LETRA[letra] + 6, 12) - 6;
      const q = calidades[i];
      let rom = ROMANOS[i];
      if (q !== 'M') rom = rom.toLowerCase();
      if (q === 'dim') rom += '°';
      return {
        grado: i + 1, romano: rom, calidad: q, pc,
        americano: americanoDe(letra, alt) + (q === 'm' ? 'm' : q === 'dim' ? 'dim' : ''),
        latino: latinoDe(letra, alt) + (q === 'm' ? 'm' : q === 'dim' ? 'dim' : ''),
        funcion: funcionDiatonica(i + 1, k.menor),
      };
    });
  }

  function funcionDiatonica(grado, menor) {
    if (!menor) return { 1: 'T', 2: 'SD', 3: 'T', 4: 'SD', 5: 'D', 6: 'T', 7: 'D' }[grado];
    return { 1: 'T', 2: 'SD', 3: 'T', 4: 'SD', 5: 'D', 6: 'SD', 7: 'D' }[grado];
  }

  /* Grado del acorde (con alteración relativa a la escala MAYOR del tónico,
     que es la convención más usada: bIII, bVI, bVII...) */
  function gradoDe(raiz, k) {
    const li = mod(LETRAS.indexOf(raiz.letra) - LETRAS.indexOf(k.letra), 7);
    const semis = mod(raiz.pc - k.pc, 12);
    let alt = mod(semis - ESCALA_MAYOR[li] + 6, 12) - 6;
    return { numero: li + 1, alt, semis };
  }
  function romanoDe(g, ac, menorRef) {
    let r = ROMANOS[g.numero - 1];
    if (ac.tipo === 'm' || ac.tipo === 'dim') r = r.toLowerCase();
    let pre = g.alt > 0 ? '#'.repeat(g.alt) : g.alt < 0 ? 'b'.repeat(-g.alt) : '';
    // En tonalidad menor escribimos III, VI, VII sin "b" (relativos al menor natural)
    if (menorRef && g.alt === -1 && [3, 6, 7].includes(g.numero)) pre = '';
    let suf = '';
    if (ac.tipo === 'aug') suf += '+';
    if (ac.septima === 'm7b5') suf += 'ø7';
    else if (ac.septima === 'dim7') suf += '°7';
    else if (ac.tipo === 'dim') suf += '°';
    if (ac.septima === '7') suf += '7';
    if (ac.septima === 'maj7') suf += 'maj7';
    if (ac.septima === '6') suf += '6';
    if (ac.sus) suf += 'sus' + ac.sus;
    return pre + r + suf;
  }

  /* Calidad diatónica esperada en cada grado (mayor y menor) */
  function esDiatonico(ac, g, k) {
    const semis = g.semis;
    const t = ac.tipo === 'sus' ? 'M' : ac.tipo;
    if (!k.menor) {
      const ok = { 0: 'M', 2: 'm', 4: 'm', 5: 'M', 7: 'M', 9: 'm', 11: 'dim' }[semis];
      if (ok !== t) return false;
      if (ac.septima === '7' && t === 'M' && semis !== 7) return false;   // solo V7 es dominante
      if (ac.septima === 'maj7' && ![0, 5].includes(semis)) return false;
      if (ac.septima === 'dim7') return false;
      return true;
    }
    // menor: natural + armónica (V, V7, vii°)
    const ok = { 0: ['m'], 2: ['dim'], 3: ['M'], 5: ['m'], 7: ['m', 'M'], 8: ['M'], 10: ['M'], 11: ['dim'] }[semis];
    if (!ok || !ok.includes(t)) return false;
    if (ac.septima === '7' && ![7, 10].includes(semis) && t === 'M') return false;
    if (ac.septima === 'maj7' && ![3, 8].includes(semis)) return false;
    return true;
  }

  const NOMBRE_FUNCION = { T: 'Tónica', SD: 'Subdominante', D: 'Dominante' };

  /* ---------- análisis de un acorde en su contexto ---------- */
  function analizarAcorde(ac, k, siguiente, previo, esUltimo) {
    const g = gradoDe(ac.raiz, k);
    const campo = campoArmonico(k);
    const res = {
      romano: romanoDe(g, ac, k.menor), grado: g, funcion: null,
      clase: 'diatonico', etiqueta: '', explicacion: '',
    };
    const nombre = ac.simbolo;
    const sig = siguiente ? siguiente.simbolo : null;

    if (esDiatonico(ac, g, k)) {
      res.funcion = funcionDiatonica(g.numero, k.menor);
      if (k.menor && g.semis === 7 && ac.tipo === 'M') {
        res.clase = 'armonica';
        res.etiqueta = 'V de la menor armónica';
        res.explicacion = `${nombre} es mayor gracias a la sensible: la escala menor armónica sube la 7ª y el V empuja fuerte hacia ${campo[0].americano}.`;
      }
      if (ac.bajo && ac.bajo.pc !== ac.raiz.pc) {
        res.etiqueta = res.etiqueta || 'inversión';
        res.explicacion = res.explicacion || `${nombre}: el bajo en ${americanoDe(ac.bajo.letra, ac.bajo.alt)} hace que la línea del bajo camine suave.`;
      }
      return res;
    }

    // Picardía: I mayor al final en tonalidad menor
    if (k.menor && g.semis === 0 && ac.tipo === 'M' && esUltimo) {
      return { ...res, funcion: 'T', clase: 'prestamo', etiqueta: 'Tercera de picardía',
        explicacion: `Terminar en ${nombre} (mayor) en una canción menor es la "tercera de picardía": un final luminoso.` };
    }

    // Dominante secundaria: acorde mayor/dominante cuya raíz está una 5ª justa sobre un grado diatónico (no el I).
    // Si es una triada mayor que NO resuelve, primero vemos si es un préstamo (ej. IV dórico).
    const dominanteSec = (forzar) => {
      if (!(ac.esMayor && ac.tipo !== 'aug')) return null;
      const destinoPc = mod(ac.raiz.pc - 7, 12);
      const destino = campo.find(c => c.pc === destinoPc);
      if (destino && destino.grado !== 1 && destino.calidad !== 'dim') {
        const resuelve = siguiente && siguiente.raiz.pc === destinoPc;
        if (!forzar && !resuelve && !ac.esDominante) return null;
        const r = ac.septima === '7' ? 'V7' : 'V';
        return { ...res, romano: `${r}/${destino.romano}`, funcion: 'D', clase: 'secundaria',
          etiqueta: 'Dominante secundaria',
          explicacion: resuelve
            ? `${nombre} es la dominante de ${destino.americano}: prepara el ${destino.romano} y lo hace sonar como un "pequeño tónico".`
            : `${nombre} es la dominante de ${destino.americano} (${destino.romano}); crea tensión aunque aquí no resuelve directo.` };
      }
      return null;
    };

    const ds = dominanteSec(false);
    if (ds) return ds;

    // Sustituto tritonal: dominante medio tono arriba del siguiente
    if (ac.esDominante && siguiente && mod(ac.raiz.pc - siguiente.raiz.pc, 12) === 1) {
      return { ...res, funcion: 'D', clase: 'secundaria', etiqueta: 'Sustituto tritonal',
        romano: `subV7`, explicacion: `${nombre} reemplaza a la dominante y baja por semitono a ${sig}: color jazzero.` };
    }

    // Disminuido de paso
    if (ac.tipo === 'dim' && siguiente && mod(siguiente.raiz.pc - ac.raiz.pc, 12) === 1) {
      return { ...res, funcion: 'D', clase: 'cromatico', etiqueta: 'Disminuido de paso',
        explicacion: `${nombre} sube por semitono a ${sig}: funciona como una dominante sin raíz y une los dos acordes.` };
    }

    // Napolitano
    if (g.semis === 1 && ac.tipo === 'M') {
      return { ...res, funcion: 'SD', clase: 'prestamo', etiqueta: 'Acorde napolitano',
        explicacion: `${nombre} es el bII "napolitano": subdominante muy dramática que suele ir al V.` };
    }

    // Préstamo modal
    if (!k.menor) {
      const prestamos = {
        '3M': ['T', 'bIII', 'Da un aire rockero y melancólico.'],
        '5m': ['SD', 'iv', 'La subdominante menor: es el acorde que "pone triste" una canción mayor.'],
        '8M': ['SD', 'bVI', 'Sonido épico, de balada.'],
        '10M': ['SD', 'bVII', 'El bVII da sabor rock/folk y suele volver al I.'],
        '2dim': ['SD', 'ii°', 'Subdominante oscura que prepara el V.'],
        '7m': ['D', 'v', 'Una dominante "suave", sin sensible.'],
        '0m': ['T', 'i', 'Cambio a menor: la misma tónica con otro color.'],
      };
      const p = prestamos[g.semis + (ac.tipo === 'sus' ? 'M' : ac.tipo)];
      if (p) return { ...res, funcion: p[0], clase: 'prestamo', etiqueta: 'Préstamo del modo menor',
        explicacion: `${nombre} viene de ${nombreTonalidad({ ...k, menor: true }, 'americano').replace(' menor', 'm')} (la tonalidad menor paralela). ${p[2]}` };
    } else {
      const prestamos = {
        '5M': ['SD', 'IV', 'IV mayor en tonalidad menor: color dórico, muy usado en música andina y latina.'],
        '2m': ['SD', 'ii', 'ii menor (dórico): suaviza la subdominante.'],
        '9m': ['SD', 'vi', 'Sexto grado natural de la menor melódica/dórica.'],
      };
      const p = prestamos[g.semis + ac.tipo];
      if (p) return { ...res, funcion: p[0], clase: 'prestamo', etiqueta: 'Préstamo (dórico)',
        explicacion: `${nombre}: ${p[2]}` };
    }

    const ds2 = dominanteSec(true);
    if (ds2) return ds2;

    return { ...res, funcion: 'D', clase: 'cromatico', etiqueta: 'Acorde cromático',
      explicacion: `${nombre} está fuera de la tonalidad: es un color de paso.` };
  }

  /* ---------- digitaciones de guitarra ----------
     6 números: cuerda 6 (Mi grave) → cuerda 1 (Mi aguda). -1 = no se toca */
  const X = -1;
  const ABIERTOS = {
    'C': [X, 3, 2, 0, 1, 0], 'A': [X, 0, 2, 2, 2, 0], 'G': [3, 2, 0, 0, 0, 3], 'E': [0, 2, 2, 1, 0, 0],
    'D': [X, X, 0, 2, 3, 2], 'Am': [X, 0, 2, 2, 1, 0], 'Em': [0, 2, 2, 0, 0, 0], 'Dm': [X, X, 0, 2, 3, 1],
    'A7': [X, 0, 2, 0, 2, 0], 'B7': [X, 2, 1, 2, 0, 2], 'C7': [X, 3, 2, 3, 1, 0], 'D7': [X, X, 0, 2, 1, 2],
    'E7': [0, 2, 0, 1, 0, 0], 'G7': [3, 2, 0, 0, 0, 1], 'Am7': [X, 0, 2, 0, 1, 0], 'Em7': [0, 2, 0, 0, 0, 0],
    'Dm7': [X, X, 0, 2, 1, 1], 'Cmaj7': [X, 3, 2, 0, 0, 0], 'Fmaj7': [X, X, 3, 2, 1, 0], 'Gmaj7': [3, 2, 0, 0, 0, 2],
    'Amaj7': [X, 0, 2, 1, 2, 0], 'Dmaj7': [X, X, 0, 2, 2, 2], 'Emaj7': [0, 2, 1, 1, 0, 0],
    'Dsus4': [X, X, 0, 2, 3, 3], 'Asus4': [X, 0, 2, 2, 3, 0], 'Esus4': [0, 2, 2, 2, 0, 0],
    'Dsus2': [X, X, 0, 2, 3, 0], 'Asus2': [X, 0, 2, 2, 0, 0], 'Bdim': [X, 2, 3, 4, 3, X],
  };
  const FORMA_E = { M: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0],
    maj7: [0, X, 1, 1, 0, X], sus4: [0, 2, 2, 2, 0, 0], m7b5: [0, X, 0, 0, X, X], dim7: [0, X, -1, 0, -1, X] };
  const FORMA_A = { M: [X, 0, 2, 2, 2, 0], m: [X, 0, 2, 2, 1, 0], '7': [X, 0, 2, 0, 2, 0], m7: [X, 0, 2, 0, 1, 0],
    maj7: [X, 0, 2, 1, 2, 0], sus4: [X, 0, 2, 2, 3, 0], sus2: [X, 0, 2, 2, 0, 0], dim: [X, 0, 1, 2, 1, X],
    m7b5: [X, 0, 1, 0, 1, X], dim7: [X, 0, 1, 2, 1, 2], '6': [X, 0, 2, 2, 2, 2], m6: [X, 0, 2, 2, 1, 2] };

  function claveForma(ac) {
    if (ac.septima === 'm7b5') return 'm7b5';
    if (ac.septima === 'dim7') return 'dim7';
    if (ac.tipo === 'dim') return 'dim';
    if (ac.tipo === 'sus') return ac.sus === '2' ? 'sus2' : 'sus4';
    if (ac.tipo === 'm') return ac.septima === '7' ? 'm7' : ac.septima === '6' ? 'm6' : 'm';
    if (ac.septima === '7') return '7';
    if (ac.septima === 'maj7') return 'maj7';
    if (ac.septima === '6') return '6';
    return 'M';
  }
  const NOMBRE_PC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  function digitacion(ac) {
    const q = claveForma(ac);
    const sufijo = { M: '', m: 'm', '7': '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', sus2: 'sus2', dim: 'dim' }[q];
    const nombres = [NOMBRE_PC[ac.raiz.pc], americanoDe(ac.raiz.letra, ac.raiz.alt)];
    for (const n of nombres) if (sufijo !== undefined && ABIERTOS[n + sufijo]) return { trastes: ABIERTOS[n + sufijo], cejilla: 0 };
    const opciones = [];
    const fE = mod(ac.raiz.pc - 4, 12) || 12, fA = mod(ac.raiz.pc - 9, 12) || 12;
    if (FORMA_E[q]) opciones.push({ base: FORMA_E[q], f: fE });
    if (FORMA_A[q]) opciones.push({ base: FORMA_A[q], f: fA });
    if (!opciones.length) opciones.push({ base: FORMA_E.M, f: fE });
    opciones.sort((a, b) => a.f - b.f);
    const o = opciones[0];
    return { trastes: o.base.map(v => (v === X ? X : v + o.f)), cejilla: o.f };
  }

  /* ---------- parser del archivo de canción ---------- */
  function tiempoASeg(s) {
    if (!s) return null;
    const p = String(s).trim().split(':').map(Number);
    return p.length === 2 ? p[0] * 60 + p[1] : p[0];
  }

  function parsearCancion(texto) {
    const meta = { titulo: 'Sin título', artista: '', tonalidad: 'C', bpm: 80, compas: 4, inicio: 0,
      cifrado: 'americano', gancho: '', cierre: '', video: '', audio: '', usuario: '@rodrigovelizguitarra' };
    const secciones = [];
    const notas = [];   // subtítulos/narración
    let sec = null, pendienteNota = [];
    let cursor = null;      // tiempo actual en segundos
    const lineas = texto.replace(/\r/g, '').split('\n');
    let enCuerpo = false;
    const asegurarSeccion = () => {
      if (!sec) { sec = { nombre: '', acordes: [], inicio: null }; secciones.push(sec); }
    };
    const k0 = () => leerTonalidad(meta.tonalidad) || leerTonalidad('C');

    for (let raw of lineas) {
      const linea = raw.trim();
      if (!linea || linea.startsWith('#')) continue;
      if (linea === '---') { enCuerpo = true; continue; }
      const m = linea.match(/^([a-záéíóúñ]+)\s*:\s*(.*)$/i);
      if (!enCuerpo && m) {
        const clave = m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const v = m[2].trim();
        if (['bpm', 'compas'].includes(clave)) meta[clave] = parseFloat(v);
        else if (clave === 'inicio') meta.inicio = tiempoASeg(v);
        else meta[clave] = v;
        continue;
      }
      enCuerpo = true;
      if (cursor === null) cursor = meta.inicio;
      const beat = 60 / meta.bpm;

      // [Sección] opcionalmente @0:12.5
      const ms = linea.match(/^\[([^\]]+)\]\s*(?:@\s*([\d:.]+))?/);
      if (ms) {
        if (ms[2]) cursor = tiempoASeg(ms[2]);
        sec = { nombre: ms[1].trim(), acordes: [], inicio: cursor };
        secciones.push(sec);
        continue;
      }
      // > narración (aparece con el siguiente acorde). ">> 0:20 texto" con tiempo fijo
      if (linea.startsWith('>')) {
        const t = linea.replace(/^>\s*/, '');
        const mt = t.match(/^@\s*([\d:.]+)\s+(.*)$/);
        if (mt) notas.push({ t: tiempoASeg(mt[1]), texto: mt[2] });
        else pendienteNota.push(t);
        continue;
      }
      // @0:30 para resincronizar
      const mr = linea.match(/^@\s*([\d:.]+)$/);
      if (mr) { cursor = tiempoASeg(mr[1]); continue; }

      // Línea de compases:  Am | F | C G | E7
      asegurarSeccion();
      if (sec.inicio === null) sec.inicio = cursor;
      const compases = linea.split('|').map(c => c.trim()).filter(c => c.length);
      let ultimoCompas = null;
      for (let c of compases) {
        let fichas;
        if (c === '%') fichas = ultimoCompas ? ultimoCompas.slice() : [];
        else fichas = c.split(/\s+/);
        ultimoCompas = fichas;
        // "-" o "." prolonga el acorde anterior dentro del compás
        const dur = (meta.compas * beat) / fichas.length;
        for (const f of fichas) {
          if (f === '-' || f === '.') {
            const prev = sec.acordes[sec.acordes.length - 1];
            if (prev) prev.dur += dur;
          } else {
            const ac = leerAcorde(f);
            if (ac) {
              const it = { ...ac, t: cursor, dur, seccion: sec.nombre };
              if (pendienteNota.length) {
                pendienteNota.forEach(n => notas.push({ t: cursor, texto: n }));
                pendienteNota = [];
              }
              sec.acordes.push(it);
            }
          }
          cursor += dur;
        }
      }
    }
    const k = k0();
    const todos = secciones.flatMap(s => s.acordes);
    todos.forEach((ac, i) => {
      Object.assign(ac, analizarAcorde(ac, k, todos[i + 1], todos[i - 1], i === todos.length - 1));
      ac.digitacion = digitacion(ac);
      ac.latino = latinoDe(ac.raiz.letra, ac.raiz.alt) + ac.simbolo.slice(ac.raiz.len).replace(/^m(?!aj)/, 'm');
      ac.indice = i;
    });
    // fin de cada nota = siguiente nota o +5 s
    notas.sort((a, b) => a.t - b.t);
    notas.forEach((n, i) => { n.fin = Math.min(notas[i + 1] ? notas[i + 1].t : Infinity, n.t + 6); });
    const finMusica = todos.length ? todos[todos.length - 1].t + todos[todos.length - 1].dur : 0;
    return {
      meta, tonalidad: k, nombreTonalidad: nombreTonalidad(k, 'latino'),
      nombreTonalidadAm: nombreTonalidad(k, 'americano'),
      campo: campoArmonico(k), secciones, acordes: todos, notas, finMusica,
      resumen: resumenProgresion(todos),
    };
  }

  /* Progresión más repetida (en grados) para el cierre */
  function resumenProgresion(acordes) {
    const cuenta = {};
    for (let n = 4; n >= 3; n--) {
      for (let i = 0; i + n <= acordes.length; i++) {
        const k = acordes.slice(i, i + n).map(a => a.romano).join(' – ');
        cuenta[k] = (cuenta[k] || 0) + 1;
      }
    }
    const mejor = Object.entries(cuenta).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0];
    const especiales = [];
    const vistos = new Set();
    for (const a of acordes) if (a.clase !== 'diatonico' && !vistos.has(a.simbolo)) { vistos.add(a.simbolo); especiales.push(a); }
    return { progresion: mejor ? mejor[0] : '', veces: mejor ? mejor[1] : 0, especiales };
  }

  const API = { parsearCancion, leerAcorde, leerTonalidad, campoArmonico, analizarAcorde, digitacion,
    NOMBRE_FUNCION, latinoDe, americanoDe };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Teoria = API;
})(typeof window !== 'undefined' ? window : globalThis);
