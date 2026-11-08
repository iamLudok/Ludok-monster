# Política de seguridad

## Versiones con soporte

Solo se mantiene la rama `main` y el APK de la última release. Los arreglos de seguridad salen
en una release nueva; no se parchean versiones anteriores.

## Avisar de una vulnerabilidad

**No abras un issue público.** Los issues los ve cualquiera, y describir el fallo ahí daría la
receta para aprovecharlo antes de que haya un arreglo publicado y la gente haya actualizado.

En su lugar, avisa en privado:

1. Ve a la pestaña **Security** del repositorio.
2. Pulsa **Report a vulnerability**.
3. Explica qué has encontrado, cómo reproducirlo y qué consecuencias tiene.

Recibirás respuesta en el plazo de una semana. Si el fallo se confirma, se arregla, se publica una
release y se te da el crédito en sus notas (salvo que prefieras no salir).

## Qué entra

- Que la contraseña de Nextcloud salga de donde debe: en las copias exportadas, en logs, o
  enviada a un servicio que no es el suyo.
- Que una copia JSON manipulada pueda corromper o borrar datos al importarla, o ejecutar algo.
- Que el visor 3D o el mapa (los dos corren en un WebView) carguen o ejecuten contenido que no
  deben.
- Fallos en cómo se habla con Nextcloud (credenciales, rutas, certificados).
- Problemas en `scripts/build-apk.sh` o en la configuración de la firma.

## Qué no entra

- Fallos de servicios de terceros: Nominatim, OpenStreetMap, unpkg, Nextcloud, Android o Expo.
  Avisa a sus responsables.
- Ataques que requieren acceso previo al móvil desbloqueado, root o una copia del keystore.
- Usar `http://` para Nextcloud: está permitido a propósito para servidores caseros y la app ya
  avisa de que la contraseña viaja sin cifrar.

## Protege tu instalación

- **Usa una contraseña de aplicación de Nextcloud**, no la de tu cuenta (Ajustes personales →
  Seguridad). Si pierdes el móvil, revócala desde ahí y nada más se ve afectado.
- **Usa `https://`** para cualquier Nextcloud accesible desde fuera de tu red.
- **Trata las copias JSON como datos personales**: llevan tus compras, con ciudades y fechas.
- **Instala solo APKs de la release oficial** o compilados por ti. Un APK firmado con otra clave no
  se instala encima, y desinstalar para ponerlo borra los datos.
- **Si compilas tú**, guarda `release.jks` y `keystore.properties` fuera del repo (ya están en
  `.gitignore`) y con permisos restringidos (`chmod 600 keystore.properties`).
- Mantén Android actualizado.
