# Hora Studio

App Expo multiplataforma para explorar y personalizar carátulas con vista previa en vivo. Funciona en Android, iOS y navegador; no requiere Apple Watch ni capacidades exclusivas de una plataforma.

## Ejecutar

```sh
npm install
npm run start
```

Pulsa `w` para abrir en navegador, o inicia en móvil con `npm run android` o `npm run ios`.

Elige uno de los tres estilos, cambia el color de acento y guarda tu diseño en el almacenamiento local. Al guardar puedes descargarlo como imagen PNG, imagen SVG vectorial o exportar un JSON con los colores, el estilo y la vista previa. En navegador se descarga directamente; en Android y iOS el menú del sistema permite guardar o compartir el archivo.

El SVG puede abrirse en navegadores y editores de diseño, o insertarse en sitios como una imagen. El JSON permite reutilizar los parámetros desde otros proyectos.

La biblioteca `react-native-watch-face` del enlace solo funciona en iOS y permite instalar carátulas desde archivos existentes. Para mantener una experiencia común en todos los dispositivos, Hora Studio ofrece previsualización y guardado local sin depender de esa integración exclusiva.
