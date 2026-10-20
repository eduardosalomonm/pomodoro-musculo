# Pomodoro Squats · Beta 0.3.0

Bloques de foco y pausas con movimiento: sentadillas, flexiones y estiramientos guiados. Sin cuenta; el historial se guarda en este navegador. El vídeo se procesa en el dispositivo.

Versión pública, también para móvil: https://eduardosalomonm.github.io/pomodoro-squats/

El botón Compartir abre el menú del móvil o copia ese enlace, sin incluir tu tarea ni tu actividad. `localhost` solo abre la app en el dispositivo donde corre el servidor y no sirve para enviarla a amigos. La beta es pública; no requiere cuenta. Los comentarios de prueba se pueden dejar en GitHub desde Ayuda y privacidad.

## Abrir en local

Desde esta carpeta:

```sh
python3 -m http.server 5180
```

Abre http://localhost:5180. Usa siempre la misma dirección y puerto: cada dirección tiene su propio historial. Para usarla en una ventana independiente, instálala desde el menú de tu navegador.

## Probarla con amigos

1. Abrir el enlace público directamente en Safari o Chrome. Para problemas de cámara en el navegador integrado de WhatsApp/Instagram, abrirlo en el navegador del teléfono.
2. Pulsar «Probar pausa · 1 min» en la bienvenida; no modifica los ajustes de duración ni inventa bloques de foco.
3. Elegir una actividad, probar el conteo manual y guardar. La cámara es opcional.
4. En Ayuda y privacidad están las instrucciones de instalación y el enlace para reportar problemas. Los comentarios de GitHub son públicos y requieren cuenta; no adjuntar respaldos personales.

Esta beta incluye iconos PNG para Android y un icono específico para la pantalla de inicio de iPhone. La vista de ejercicio compacta el temporizador en móvil. Incluye una imagen de presentación al compartir el enlace y evita indexación en buscadores mientras siga en beta.

## Qué incluye

- Foco y pausa configurables, tarea de foco opcional y resumen de bloques y minutos completados hoy. Los minutos se empiezan a registrar con esta versión; no se estiman los bloques antiguos.
- Temporizador persistente, posponer cinco minutos y comienzo automático del siguiente bloque opcional. Una pausa manual no cuenta como bloque de foco completado. Posponer tampoco añade bloques ficticios.
- Tres opciones de pausa y recuerdo de tu última elección. Elegir una actividad inicia la pausa si todavía estabas en foco.
- Sentadillas y flexiones con objetivos separados, demostración, botones −1 / +1 / +5 y cámara opcional. Las flexiones admiten suelo y pared; cada variante se guarda por separado al cambiar.
- Detección por ángulo de rodilla o codo, compensando la proporción del vídeo. Requiere extensión inicial y un ciclo estable de bajada y subida. Si pierde visibilidad, reinicia el ciclo para reducir falsos positivos.
- Tres rutinas de estiramiento con demostración, voz, pasos y control de pausa. Se registra solo el tiempo activo; saltar pasos no acredita su duración completa. Al salir de la pestaña la rutina se pausa y la cámara se apaga.
- Guardado del ejercicio al cambiar de actividad, terminar o reiniciar el descanso. Los borradores se recuperan tras recargar sin duplicar entradas. Las rutinas interrumpidas se guardan como parciales.
- Estadísticas por día local: sentadillas, flexiones, minutos estirando, racha y gráfica de siete días. Los ejemplos antiguos no contribuyen al progreso. La plancha se registra en segundos y no se mezcla con las repeticiones.
- Historial editable, borrado con opción de deshacer, anotación manual y respaldo JSON. La importación valida todo el archivo antes de combinarlo; conserva los ajustes actuales y admite respaldos originales de versión 1.
- Interfaz adaptable, temas claro / oscuro / sistema, navegación por teclado, etiquetas accesibles y preferencia de movimiento reducido.
- Sonido y voz independientes; notificaciones con permiso explícito. `Espacio` inicia o pausa el temporizador, `B` abre una pausa y `+` / `−` ajustan repeticiones. Los atajos globales no interfieren al escribir o usar botones.
- Apertura sin conexión tras la primera carga; los ejercicios y el conteo manual funcionan sin descargar el modelo de cámara.

## Límites actuales

Los recordatorios requieren que la app esté abierta. El sistema operativo puede suspenderla cuando bloqueas el teléfono; no se prometen alarmas en ese estado. La cámara necesita HTTPS o localhost; el modelo se descarga desde jsDelivr y Google Storage. Las fuentes externas tienen alternativas locales.

La descarga e inicialización del modelo real se comprueban aparte cuando hay acceso a sus proveedores. El conteo con cámara se ha verificado con poses sintéticas, tanto en rodilla como en codo, y con cancelación durante permisos y carga. **Falta calibrarlo con personas reales**, diferentes encuadres y variantes. El conteo manual está siempre disponible. La variante contra la pared no identifica la pared físicamente: se basa en el ciclo del codo y la visibilidad del cuerpo.

Los navegadores pueden retrasar procesos en segundo plano. El Pomodoro usa una hora de finalización absoluta y se actualiza al volver. Las rutinas se pausan al ocultar la app para no sumar tiempo desatendido. Si un temporizador terminó hace más de diez minutos con la app cerrada, se descarta el aviso antiguo.

Exporta un respaldo periódicamente. Si el navegador impide guardar, la app muestra un aviso para que exportes antes de cerrar. No hay sincronización entre dispositivos ni coordinación de sesiones simultáneas en varias pestañas.

## Comprobaciones

No necesita instalación ni compilación para funcionar. Para las pruebas de desarrollo, usa Node y, para los recorridos de navegador, Playwright:

```sh
npm install
npm test
npx playwright install chromium webkit
```

Con el servidor local abierto en otro terminal:

```sh
APP_URL=http://localhost:5180 npm run test:browser
```

Las pruebas móviles usan Chromium con perfil Android y WebKit con perfil iPhone; no sustituyen pruebas en teléfonos físicos. Las pruebas cubren bienvenida, pausa de un minuto, compartir nativo y copia alternativa sin datos personales, arranque fallido, actualización con progreso pendiente, instalación y rutas bajo `/pomodoro-squats/`, además de fechas locales y cambio de hora, exclusión de ejemplos, importación, ciclos de detección, recuperación de borradores, pausas, fin de bloques, importación sin HTML ejecutable, atajos, tamaños de 320 a 1440 px, modo oscuro, uso sin conexión y cámara con poses sintéticas. Las capturas se guardan en la carpeta temporal del sistema (`OUTPUT_DIR` permite elegir otra).

## Archivos

`index.html` y `styles.css` definen la interfaz; `app.js`, los flujos y dispositivos; `core.js`, validación, fechas y detección; `figure.js` y `routines.js`, demostraciones y rutinas. `boot.js` protege el arranque; `companion.js` contiene bienvenida, compartir, instalación, ayuda y actualización; `release.js` identifica la versión. `sw.js` conserva un paquete completo por versión para abrir sin conexión.

## Dirección visual

Se conserva la identidad original de terracota y verde salvia, con el temporizador como acción principal y ayuda progresiva para ajustes y respaldos. Referencias de interacción: [progreso con etiqueta y valor](https://ui.shadcn.com/docs/components/base/progress) y [estados vacíos](https://ui.shadcn.com/docs/components/base/empty) de shadcn/ui. Se adaptan los patrones al HTML existente sin incorporar su biblioteca ni copiar su código.

## Publicación y actualizaciones

GitHub Pages publica `main` desde la raíz, con HTTPS. `.nojekyll` permite servir los módulos estáticos sin transformación. Antes de subir, ejecutar las pruebas y comprobar que no se están incluyendo datos personales.

Para cada versión nueva, cambiar `VERSION` en `release.js`, `CACHE` en `sw.js` y la versión de `package.json`. El worker descarga el paquete entero antes de activarse; una actualización espera hasta que el usuario pulsa «Guardar y actualizar». Se guarda la actividad pendiente y se recarga, sin borrar el historial. Los archivos de una versión se sirven desde el mismo paquete para evitar mezclar módulos antiguos y nuevos. Probar esta transición con `tests/update.mjs`.

## Próximos pasos

1. Calibrar la detección con uso real y distintos encuadres.
2. Rutinas de estiramiento editables.
3. Horario de trabajo y recordatorios con la app cerrada.
4. Otros movimientos con cámara, a partir de lo aprendido con sentadillas y flexiones.

Idea de partida: https://www.reddit.com/r/SideProject/s/rVoB0JgBo7
