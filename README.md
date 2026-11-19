# FASE — Emile, Montevideo

Web/cartel para el 19 de diciembre de 2026. Identidad gris, carbón y verde; lettering de presión, cinta con lente ovalada y carrusel vertical de reloj de arena.

## Ejecutar

```sh
npm install
npm run dev
npm run build
```

Vista local: http://127.0.0.1:4321/

## Sistema gráfico

[DESIGN.md](./DESIGN.md) documenta color, lettering, motion y contenido. La portada y el póster comparten [FestivalPoster.astro](./src/components/FestivalPoster.astro).

- [warp-canvas.ts](./src/lib/warp-canvas.ts): una textura de texto y tres mapas inversos WebGL (lente, reloj de arena y esfera).
- [festival.ts](./src/lib/festival.ts): visibilidad, pausa, movimiento reducido y fragmentación del DOM completo.
- [build-lettering.py](./scripts/build-lettering.py): genera la adaptación Fase Pressure y sus contornos. Requiere Python, fontTools y Brotli. La fuente conserva SIL OFL; ver [licencia](./public/fonts/OFL-TitanOne.txt).

## Contenido

FASE es el nombre propuesto. Confirmar el nombre final, los artistas, la dirección, el horario y el enlace de entradas antes de publicar. La colección [artists](./src/content/artists/) conserva los datos editables; los nombres de muestra no se muestran en la web.

## Póster

`/poster?f=post`, `/poster?f=story`, `/poster?f=a2`. Con el servidor en marcha:

```sh
npx tsx scripts/export-poster.ts post
npx tsx scripts/export-poster.ts story
npx tsx scripts/export-poster.ts a2
```

Se guardan PNG en [exports](./exports/). Usa Chrome instalado; `PLAYWRIGHT_CHANNEL` permite seleccionar otro canal disponible. Son composiciones estáticas deterministas del mismo lettering, no capturas del carrusel animado.

## Verificación

```sh
node scripts/verify-preview.mjs
```

Comprueba desborde en 360, 390, 768, 1440 y 1920 px; movimiento de la cinta, pausa, fragmentación y rearme, preferencia de movimiento reducido y errores de ejecución. Guarda capturas en `.qa/` (ignoradas). La emulación no sustituye una prueba de interacción en un teléfono físico.

El proyecto permanece local y no se ha desplegado. El diagnóstico de npm del entorno actual sigue señalando advisories en la rama Astro 5; actualizar el framework antes de una publicación de producción.
