# Contribuir a Ludok Monster

Gracias por querer echar una mano. Esta guía explica cómo preparar el entorno, cómo está
organizado el código y qué se espera de un pull request.

## Cómo contribuir

- **Cambios de código: directamente con un pull request.** No hace falta abrir un issue antes, ni
  siquiera para cambios grandes. Explica en el PR qué cambia y por qué.
- **Issues públicos: solo para bugs e ideas.** Para un bug, cuenta qué hiciste, qué esperabas y qué
  pasó, con la versión de la app y de Android.
- **Vulnerabilidades: nunca en un issue.** Sigue [SECURITY.md](SECURITY.md) para avisar en privado.

Antes de pegar logs, capturas o una copia JSON, **quita los datos personales**: la dirección y el
usuario de tu Nextcloud, y las ciudades de tus compras si no quieres enseñarlas.

## Entorno

Hace falta Node 22, JDK 17, Android SDK y `adb`.

```bash
git clone https://github.com/iamLudok/Ludok-monster.git
cd Ludok-monster
npm install
npm run android      # instala y abre en un móvil conectado por adb
```

Las texturas de las latas (`public/` y `assets/miniaturas/`) no están en el repositorio porque
llevan la marca de Monster Energy. Sin ellas funcionan `npm run typecheck`, `npm run verify:data`
y `npm run verify:migration`; `verify:library` y la compilación de la app las necesitan (ver
«Los modelos 3D» en el [README](README.md)).

La app usa Expo SDK 57, que cambia bastante entre versiones: consulta la documentación de
[esa versión exacta](https://docs.expo.dev/versions/v57.0.0/), no la última.

## Antes de mandar el PR

```bash
npm run typecheck
npm run verify
```

Los dos tienen que pasar. `verify` ejecuta el mismo código de datos que corre en el móvil contra
un SQLite de escritorio; si tu cambio añade una regla, añade también un caso en el `verify/` que
corresponda.

## Convenciones

- **Todo en castellano**: textos de la interfaz, comentarios y documentación.
- **Los comentarios explican el porqué, no el qué.** Si algo se hace de una forma rara, explica qué
  pasaba al hacerlo de la forma normal.
- TypeScript `strict`, **sin punto y coma** y con comillas simples.
- **Sin rayas largas** (el carácter U+2014, em dash) en textos ni comentarios: usa `: `, paréntesis o dos frases.
- **Sin librería de iconos ni emojis a color** en la interfaz: los iconos son formas hechas con
  `View`.
- Colores, tamaños y espaciados salen de [`src/ui/theme.ts`](src/ui/theme.ts), nunca a ojo en un
  componente.
- **Sin dependencias que no hagan falta** y sin tareas en segundo plano: lo periódico se hace al
  abrir la app o al volver a ella.

## Dónde va cada cosa

- `expo-sqlite` **solo** se importa en [`src/lib/db.ts`](src/lib/db.ts). El resto de la lógica
  pide la base de datos a [`src/lib/dbRef.ts`](src/lib/dbRef.ts); es lo que permite probarla en
  Node.
- Las reglas de negocio van en `src/lib/`, y las pantallas solo las llaman.
- El catálogo de latas es fijo y vive en [`src/lib/catalogo.ts`](src/lib/catalogo.ts), no en la
  base de datos. Una lata nueva necesita su entrada ahí y sus texturas en `public/`.
- Un DOM Component (`Visor3D`, `MapaComprasDom`) solo admite un `export default`: sus tipos van en
  ficheros aparte, como [`src/lib/visor.ts`](src/lib/visor.ts).
- [`src/lib/miniaturas.ts`](src/lib/miniaturas.ts) lo genera `scripts/preparar_etiquetas.py`: no
  se edita a mano.
- La contraseña de Nextcloud vive en la tabla `settings` del móvil. **Nunca** en el código, en
  `app.json` ni en las copias exportadas.

## Añadir un campo a los datos

1. `src/types.ts`: el campo, **opcional** si llega a las copias.
2. `src/lib/schema.ts`: la columna en Drizzle.
3. `src/lib/schemaSql.ts`: la columna en `CREATE_SQL` (que siempre describe el esquema completo,
   para instalaciones nuevas) **y** una entrada nueva al final de `MIGRATIONS` (para las que ya
   existían). Nunca toques `CREATE_SQL` sin añadir el paso, ni edites una migración ya publicada.
4. `src/lib/rows.ts`: el mapeo en los dos sentidos.
5. `src/lib/backupCore.ts`, si hay que exportarlo o restaurarlo.
6. Un caso en `verify/migration.ts` y, si va en las copias, en `verify/data.ts`.

El formato de copia **solo crece**: se pueden añadir campos opcionales, pero no quitar ni cambiar
los que ya hay, porque dejaría fuera copias ya guardadas.

## Checklist del PR

- [ ] `npm run typecheck` y `npm run verify` pasan.
- [ ] Si cambian los datos: migración nueva, copias antiguas siguen entrando y hay un caso en
      `verify/`.
- [ ] Textos y comentarios en castellano, sin rayas largas.
- [ ] Probado en un móvil o emulador real si toca la interfaz.
- [ ] El README sigue diciendo la verdad.

## Licencia

Al contribuir aceptas que tu código se publique bajo la [licencia MIT](LICENSE) del proyecto.
