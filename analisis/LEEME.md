# Videos de análisis armónico

Sistema para hacer videos verticales (1080×1920) de análisis armónico con la menor
edición posible. Tú escribes los acordes en un `.txt`; el sistema calcula grados,
funciones y acordes especiales, y arma el video solo.

## Estructura del video (60–90 s)

| Momento | Qué se ve | De dónde sale |
|---|---|---|
| **Gancho** (0–3 s) | Pregunta grande sobre fondo rojo con la púa | `gancho:` |
| **Contexto** | Título, artista, tonalidad y los 7 acordes de la tonalidad (I ii iii IV V vi vii°) | `titulo:`, `artista:`, `tonalidad:` |
| **Progresión** | Mientras tocas: acorde actual (cifrado americano y latino), grado en romano, función con color, diagrama de guitarra, pulsos del compás y una cinta con los acordes que vienen | los compases |
| **Momento clave** | Tarjeta que explica cada acorde fuera de la tonalidad (préstamo, dominante secundaria, napolitano, etc.) | automático |
| **Narración** | Subtítulos con lo que tú quieras decir | líneas que empiezan con `>` |
| **Cierre** (5 s) | "La fórmula de la canción" (p. ej. I – vi – IV – V), acordes especiales y pregunta final | automático + `cierre:` |

Colores: **azul = tónica**, **verde = subdominante**, **rojo = dominante**.
Borde morado = préstamo modal, naranja = dominante secundaria / sustituto.

## Flujo de trabajo (≈10 minutos por video)

1. **Graba** la canción en vertical con el celular (o usa un audio). Puedes hablar encima o no.
2. **Escribe los acordes**: copia `canciones/ejemplo.txt` y cámbialo. Puedes hacerlo en el editor
   (abre `plantilla.html` en el navegador; en GitHub Pages:
   `https://srdwly.github.io/testoverlay/analisis/plantilla.html`):
   - **Cargar mi video/audio** → ves el video con el análisis encima.
   - **Tap BPM** → aprieta al ritmo 4 veces o más y pone el `bpm:`.
   - **Marcar inicio aquí** → pausa justo en el primer acorde y aprieta; pone el `inicio:`.
   - **Zonas de TikTok** → muestra dónde tapan los botones de la app.
   - **Descargar .txt** → guarda el archivo.
3. **Pásame** el `.txt` y el video (o súbelos a `analisis/canciones/`). Yo renderizo:
   ```
   node render.js canciones/mi-cancion.txt
   ```
4. Sale en `analisis/salida/`: el `.mp4`, los subtítulos `.srt` y `-descripcion.txt` con el texto
   y hashtags para publicar.

## Formato del .txt

```
titulo: Nombre de la canción
artista: Grupo
tonalidad: Am          # C, Am, F#m, Sib, Lam... (americano o latino)
bpm: 92
compas: 4              # 3 para vals/cueca
inicio: 4.2            # segundo del video en que suena el primer acorde
gancho: ¿Por qué esta canción suena tan triste?
cierre: ¿Cuál analizo ahora?
cifrado: americano     # o "latino" para mostrar Lam, Sol, Do... en grande
video: mi-toma.mp4     # opcional (ruta junto al .txt)
---
[Intro]
> Texto que aparece como subtítulo con el siguiente acorde
Am | F | C | G
[Estrofa] @0:18.5      # @tiempo resincroniza si cambias el tempo o haces una pausa
Am | Am | Dm E7 | Am   # dos acordes en un compás = mitad y mitad
C - - G | %            # "-" alarga el acorde anterior, "%" repite el compás
```

## Qué detecta el análisis

- Grados en romano con calidad (I, ii7, V7, viiø7…), en mayor y menor (natural + armónica).
- Función: tónica, subdominante, dominante.
- Dominantes secundarias (V7/vi, V/V…), indicando si resuelven.
- Préstamos del modo menor (iv, bVI, bVII, bIII…), IV dórico en menor, tercera de picardía.
- Napolitano (bII), sustituto tritonal, disminuidos de paso.
- Digitación de guitarra (abierta o con cejilla) para cada acorde.

## Archivos

- `teoria.js` — motor de análisis (sirve en el navegador y en Node).
- `plantilla.html` — plantilla del video + editor de vista previa.
- `render.js` — renderiza a MP4 con Playwright + ffmpeg.
- `canciones/` — un `.txt` por video.
