# FASE — Pressure system

Una fiesta en Emile, Montevideo, el 19 de diciembre de 2026. La web funciona como un cartel: identidad, fecha, lugar y lineup. FASE sigue siendo una propuesta de nombre.

## Color

Valores muestreados de la referencia aportada por el usuario, no inferidos desde el video comprimido.

| Token | Valor | Rol |
| --- | --- | --- |
| Grey | `#99A3AA` | Papel / portada |
| Ink | `#393838` | Letras, cinta y pie |
| Green | `#B8FB7C` | Óvalos, inversión y panel de movimiento |

Sin azul eléctrico, fondos amarillos, gradientes ni decoración líquida dentro de las formas.

## Lettering

**Fase Pressure Black** es una adaptaci?n local y renombrada de Anybody Black, bajo SIL OFL: 785 glifos, espa?ol y 35 comprobaciones t?cnicas aprobadas. Los objetivos de proporci?n son decisiones de dise?o; la referencia deformada no permite una medici?n fiable. Los contornos superpuestos se conservan. No es la fuente de Dekmantel. Ver [fontbook](./font-work/book/fontbook.pdf) y [licencia](./public/fonts/OFL-FasePressure.txt).

- El nombre FASE ocupa una envolvente elíptica: más alto en el centro, menor en los extremos.
- MONTEVIDEO sigue la presión negativa debajo del óvalo: hombros altos, centro hundido.
- La fecha usa el mismo mapa del nombre.
- El texto pequeño aporta datos, no un segundo discurso de marca.

El generador está en [scripts/build-lettering.py](./scripts/build-lettering.py). Genera WOFF2 y TTF junto a los contornos SVG que comparte la portada con el póster.

## Movimiento

1. **Cinta con lente:** una sola textura avanza por impulsos, con 2,55 segundos de pausa y 1,05 segundos de transici?n; cada artista se centra y ajusta al ?valo. Un óvalo fijo invierte el color, comprime las letras horizontalmente y las expande verticalmente. La frase conserva su continuidad a ambos lados de la lente.
2. **Columna de presión:** líneas que ascienden a través de un reloj de arena fijo. El estrechamiento varía por coordenada vertical, no por palabra; las letras se transforman mientras pasan.
3. **Desarme del cartel:** captura del DOM completo. Cuadrados reales del cartel se desprenden, caen y regresan a su posición. Incluye contornos y datos; no se limita al fondo.

4. **Esfera:** letras giran sobre un mapa esf?rico con leve inclinaci?n.
5. **Armado y parpadeo:** el ?valo se abre al cargar y se cierra brevemente como un ojo.

Los tres efectos WebGL se renderizan en WebGL con DPR máximo 1.5. Se detienen fuera de pantalla, con la página oculta, por la preferencia de movimiento reducido y mediante el botón de pausa. El SVG y el contenido HTML siguen disponibles sin WebGL.

## Referencia e interpretación

[Daisy Chain / Dekmantel](https://www.daisychainstudio.net/projects/dekmantel) acredita el motion del décimo aniversario y la identidad a Jonathan Castro. Se estudiaron las secuencias para entender el mapa espacial y el ritmo. El proyecto aplica esas operaciones con otro nombre, contornos propios derivados de una fuente OFL y contenido de esta fiesta. Ningún material de Dekmantel se incluye como asset del sitio.

## Contenido pendiente

Los artistas, la dirección, la hora y el enlace de entradas no se han confirmado. No se muestran artistas ficticios ni enlaces de compra inventados. Los datos se editan en [src/content/artists](./src/content/artists/).
