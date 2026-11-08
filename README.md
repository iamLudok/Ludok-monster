<div align="center">

# Ludok Monster

**App Android para llevar la cuenta de las latas de Monster Energy que has probado.**

Cuáles, qué nota les pones, dónde las compraste y por cuánto, con cada lata en 3D.<br>
Sin cuentas ni servidores: los datos viven en tu móvil y se copian a tu propio Nextcloud.

[![License: MIT](https://img.shields.io/github/license/iamLudok/Ludok-monster?style=flat-square&color=blue)](LICENSE)
[![Android](https://img.shields.io/badge/Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://www.android.com/)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![three.js](https://img.shields.io/badge/three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Blender](https://img.shields.io/badge/Blender-E87D0D?style=flat-square&logo=blender&logoColor=white)](https://www.blender.org/)

[Funciones](#funciones) · [Instalación](#instalación) · [Copias de seguridad](#copias-de-seguridad) · [Contribuir](#contribuir) · [Licencia](#licencia)

</div>

---

## Índice

- [Funciones](#funciones)
- [Qué sale del móvil](#qué-sale-del-móvil)
- [Instalación](#instalación)
- [Copias de seguridad](#copias-de-seguridad)
- [Desarrollo](#desarrollo)
- [Los modelos 3D](#los-modelos-3d)
- [Estructura](#estructura)
- [Diseño](#diseño)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Funciones

El catálogo trae **45 latas y 2 botellas**, modeladas en Blender a partir de seis fotos reales de
cada una. No son texturas de imprenta: pueden verse reflejos de las fotos, y las medidas son
aproximadas por formato (500, 473, 444 y 355 ml), no medidas de cada lata.

- **Visor 3D**: cada lata se gira y se acerca con los dedos, y funciona sin conexión.
- **Probada**: sí o no, con la fecha. Valorar o comentar una lata la marca sola.
- **Nota** de 1 a 10 y un comentario opcional.
- **Compras**: precio (EUR, USD, GBP, JPY, CHF o MXN), país y ciudad. Varias por lata.
- **Torre**: las latas que has probado forman una pirámide que crece según pruebas más. La vista
  «Colección» enseña la torre completa, con las que faltan apagadas. Las botellas van en el suelo, a
  los lados de la base.
- **Números**: cuántas has probado de cada gama (Ultra, Juiced, Punch…), tu nota media, tus
  favoritas, lo gastado por moneda, la más cara y la más barata, y los países.
- **Mapa** de compras con OpenStreetMap: una chincheta por ciudad.
- En Ajustes, **«Marcar todas como probadas»** para quien ya tiene la colección completa.

## Qué sale del móvil

No hay servidor de Ludok Monster ni ninguna analítica, pero algunas funciones sí hablan con
servicios externos:

> **Lo que sí sale del móvil:**
> - **Nominatim** (`nominatim.openstreetmap.org`): la ciudad y el país de una compra, una sola vez
>   por ciudad, para situarla en el mapa. El resultado se guarda y no se vuelve a pedir.
> - **OpenStreetMap** (`tile.openstreetmap.org`): los trozos de mapa de la zona que estás viendo.
> - **unpkg** (`unpkg.com`): la librería Leaflet del mapa, al abrir el mapa.
> - **Tu Nextcloud**, si activas la copia automática: la copia entera, con tu usuario y tu
>   contraseña de aplicación.

Tus notas, comentarios y precios nunca se envían a Nominatim ni a OpenStreetMap. El visor 3D y
el resto de la app funcionan sin conexión.

## Instalación

Hace falta Node 22, JDK 17, Android SDK y `adb`.

```bash
git clone https://github.com/iamLudok/Ludok-monster.git
cd Ludok-monster
npm install
```

> **Las texturas no están en el repositorio.** `public/` y `assets/miniaturas/` son fotos de las
> latas, con la marca y el diseño de Monster Energy, así que no se publican. Se generan desde el
> proyecto `../Monster` (ver [Los modelos 3D](#los-modelos-3d)); sin ellas la app no compila.

```bash
npm run android        # con el móvil conectado por adb (depuración USB)
```

### Compilar el APK

```bash
npm run build:apk                    # todas las arquitecturas
./scripts/build-apk.sh --compartir   # solo arm64-v8a, para pasar a amigos
# → android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

`release.jks` y `keystore.properties` firman la app y **están fuera del repositorio**. Si se
pierden, la única forma de actualizar la app en un móvil es desinstalarla, y **desinstalar
borra los datos**. Guárdalos junto a tus copias de seguridad.

## Copias de seguridad

La regla es **no perder datos nunca**:

- Todo vive en SQLite, en el almacenamiento privado de la app. Sin servidores ni cuentas.
- **Copia en JSON** desde Ajustes, con el menú de compartir del sistema.
- **Copia automática a tu propio Nextcloud**: al abrir la app, solo por WiFi, como mucho cada
  12 h y un fichero por día (`ludok-monster-AAAA-MM-DD.json`).
- Aviso en la lista de latas si nunca has hecho copia o llevas una semana sin ella.
- La contraseña de Nextcloud **no viaja en las copias** (ver `src/types.ts`).
- El catálogo de latas no está en la base de datos: viene con la app. Lo tuyo se enlaza con
  él por el identificador de cada lata, así que una versión nueva con más latas no obliga a
  migrar nada.

## Desarrollo

```bash
npm run verify     # copia de ida y vuelta, reglas y migraciones, con un SQLite de escritorio
npm run typecheck
```

`verify/` ejecuta el mismo código que corre en el móvil contra `@libsql/client`. También
comprueba que cada lata del catálogo tiene su etiqueta, su versión HD y su modelo en `public/`.

La app usa Expo SDK 57: consulta la documentación de
[esa versión exacta](https://docs.expo.dev/versions/v57.0.0/), no la última.

## Los modelos 3D

Las 45 latas comparten la misma geometría, así que solo hay **cuatro modelos** (uno por tipo
de anilla) en `public/modelos/`, y el visor le pone a cada lata su etiqueta, sus colores de
tapa y anilla y su escala. Las botellas (gama «Botellas») no comparten forma: cada una lleva su
GLB entero.

Todo se genera desde el proyecto Monster, que tiene que estar en `../Monster` (solo se lee, no
se modifica):

```bash
npm run assets:modelos      # Blender: los 4 GLB de las latas
npm run assets:etiquetas    # Pillow: etiquetas, versiones HD, emblemas y miniaturas
npm run assets:botellas     # Blender: las 2 botellas, cada una con su GLB propio
python3 scripts/gen-assets.py   # iconos de la app
```

Los comandos de Blender usan `blender` del `PATH`. Si lo tienes en otro sitio, indícalo con
`BLENDER=/ruta/a/blender npm run assets:modelos`.

El visor (`src/components/Visor3D.tsx`) es un DOM Component de Expo con three.js: corre en un
WebView y lee los ficheros de `public/`, que van dentro del APK.

## Estructura

```
app/(tabs)/        Latas · Torre · Números · Ajustes
app/lata/[slug]    ficha: visor 3D, probada, nota, comentario y compras
app/compra         añadir o editar una compra
app/mapa           mapa de compras
src/lib/           datos y reglas (catalogo, latas, precio, estadisticas, torre, backup…)
src/components/    Visor3D y MapaComprasDom (DOM Components), avisos y Nextcloud
src/ui/            tema y primitivas
public/            modelos GLB y etiquetas para el WebView (generado, fuera del repo)
assets/            iconos, y miniaturas de las listas (generadas, fuera del repo)
verify/            comprobaciones de la capa de datos
scripts/           exportación desde Blender, texturas, iconos y APK
```

## Diseño

«Sala oscura», como las demás apps Ludok: interfaz monocroma, sin color de acento. El color lo
ponen las latas. Las que no has probado se ven apagadas, en la lista y en la torre completa.
El icono es una pirámide de tres latas, sin el logotipo de Monster.

## Contribuir

Los pull requests son bienvenidos. Mira [CONTRIBUTING.md](CONTRIBUTING.md) para preparar el
entorno y ver las convenciones. Para avisar de una vulnerabilidad, sigue
[SECURITY.md](SECURITY.md) en vez de abrir un issue público.

## Licencia

El código se distribuye bajo la **licencia MIT**. Mira [LICENSE](LICENSE) para el texto completo.

Ludok Monster es un proyecto personal sin relación con Monster Energy Company. «Monster
Energy» y los diseños de sus latas son marcas de sus propietarios y no entran en la licencia.

---

<div align="center">

Hecho por [Luken Iriondo](https://github.com/iamLudok) · Si Ludok Monster te resulta útil, dale una ⭐

</div>
