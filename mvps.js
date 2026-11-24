/* ══════════════════════════════════════════════════════════════════
   LISTA DE MVPs  (la usa mvp-fx.html; la pista de baile podrá usarla igual)

   usuario    → el @ de TikTok SIN la @, en minúsculas (es lo que manda TikFinity
                como uniqueId; la pista de baile guarda a cada bailarín con este mismo dato)
   nombre     → cómo se muestra en grande (si lo dejas vacío usa el apodo de TikTok)
   animacion  → 'corona' (entrada real dorada) o 'pua' (púa de fuego)
   frase      → texto chico debajo del nombre (opcional)
   color      → color principal (opcional; si no, el de la animación)
   foto       → enlace de una foto (opcional; si no, usa la foto de perfil que manda TikFinity)
   tecla      → número del 1 al 9 para dispararlo a mano (opcional; si no, el orden de la lista)
   video      → animación propia hecha con IA (sobre FONDO VERDE: el overlay quita el verde).
                Guárdala en la carpeta mvp/ del repo. El nombre lo escribe el overlay encima.
   nombreY    → altura del nombre en el video (0 arriba, 1920 abajo; por defecto 330)

   Los de abajo (menos Clarita) son EJEMPLOS: cámbialos por tus MVPs reales.
   ══════════════════════════════════════════════════════════════════ */
window.MVPS = [
  { usuario: 'clarivonn', nombre: 'CLARITA', video: 'mvp/clarita.webm', frase: '🎸 ¡Llegó la rockera! 🫰' },
  { usuario: 'ejemplo_reina',  nombre: 'Doña Carmen', animacion: 'corona', frase: '¡Llegó la reina del live!' },
  { usuario: 'ejemplo_rockero', nombre: 'El Rockero',  animacion: 'pua',    frase: '¡Que suenen las cuerdas!' },
];
