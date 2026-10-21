# Pomodoro Squats · Beta 0.5.0

Bloques de foco y pausas con movimiento: sentadillas, flexiones y estiramientos guiados. Sin cuenta; el historial se guarda en este navegador. El vídeo se procesa en el dispositivo.

Versión pública, también para móvil: https://eduardosalomonm.github.io/pomodoro-squats/

El botón Compartir abre el menú del móvil o copia ese enlace, sin incluir tu tarea ni tu actividad. `localhost` solo abre la app en el dispositivo donde corre el servidor y no sirve para enviarla a amigos. La beta es pública; no requiere cuenta. Los comentarios de prueba se pueden dejar en GitHub desde Ayuda y privacidad. Si ya tenías la app abierta, usa «Guardar y actualizar» cuando aparezca la nueva versión.

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

## Nuevo en la beta 0.5.0

- Calibración guiada desde Sentadillas o Flexiones → «Calibrar y probar». Coloca el iPhone fijo, de lado, y elige cámara frontal o trasera. La guía verifica el encuadre, captura automáticamente una posición extendida y otra flexionada y pide dos repeticiones de prueba antes de guardar.
- Tres perfiles separados: sentadillas, flexiones en suelo y flexiones contra pared. Se distinguen cámara frontal/trasera y proporción del vídeo. Puedes probar un ajuste guardado, repetir la medición o borrarlo. Si mueves el teléfono o cambias tu posición, vuelve a calibrar.
- La pausa se detiene durante la calibración y vuelve a continuar si antes estaba en marcha. Las repeticiones de prueba se mantienen fuera del historial y de las metas; tampoco se permiten incrementos manuales o por teclado mientras dura la prueba.
- Los ciclos se suavizan según el tiempo entre imágenes y requieren posiciones estables. Se rechazan ciclos demasiado cortos y no se unen posiciones separadas por una pérdida de señal. Se mantiene el lado visible para evitar cambios constantes entre piernas o brazos.
- Se verifica visibilidad y presencia, articulaciones dentro del encuadre y tamaño suficiente. Las flexiones incluyen cadera y rodilla para comprobar la posición; la variante de pared comprueba también la posición de las manos. Esto reduce algunos falsos positivos y no constituye una evaluación profesional de la técnica.
- El procesamiento se limita aproximadamente a 15 imágenes por segundo y no se redimensiona el lienzo en cada imagen. La velocidad y precisión reales dependen del dispositivo y de la captura.
- Solo se guardan ángulos de referencia y contexto de cámara en `ps.calibration`; no se guardan vídeo ni puntos del cuerpo. Esos ajustes se quedan en este navegador y no se exportan, para evitar reutilizarlos por accidente en otro dispositivo. El acceso se cancela al ocultar la app, girar el teléfono, cambiar de ejercicio o pulsar cancelar.

### Cómo probar la cámara en un iPhone real

1. Abre la versión pública directamente en Safari y elige Sentadillas o Flexiones (suelo o pared).
2. Apoya el teléfono, selecciona la cámara y pulsa «Calibrar y probar». Da permiso y sigue las indicaciones con voz o en pantalla.
3. Mantén brevemente cada posición, sin forzar un recorrido mayor. Si se pierde el encuadre, la guía espera o reinicia la referencia.
4. Haz dos repeticiones y comprueba que el resultado coincide. Guarda solo si contó bien; de lo contrario repite la prueba o la calibración.
5. Comprueba una serie corta en modo actividad y corrige con +1/−1 si hace falta. Las pruebas previas no deberían aparecer en tus metas.

La batería automática usa poses y vídeo sintéticos con perfiles iPhone/WebKit y Android/Chromium. También se comprueba que el modelo real se descarga y arranca con vídeo vacío. **Estas pruebas no miden la precisión con personas reales**: esa validación sigue pendiente y es el objetivo de la guía.

Referencias técnicas: [Pose Landmarker de Google](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) y [permisos de cámara en el navegador](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Nuevo en la beta 0.4.0

- Meta diaria de flexiones independiente de la meta de sentadillas y de las repeticiones por pausa. Se ajusta en Ajustes o desde «Editar metas diarias». El valor inicial es 30; los ajustes y el historial anteriores se conservan.
- Rutinas personalizadas desde Estiramientos: crear, copiar una propuesta, editar, ordenar con botones, eliminar y deshacer. Catálogo de los movimientos guiados existentes; cada paso dura entre 5 y 300 segundos, con hasta 12 pasos, 30 minutos y 50 rutinas guardadas.
- Borrador local automático mientras editas. Cerrar el editor conserva el borrador y «Continuar borrador» lo recupera incluso tras recargar. «Guardar rutina» actualiza la rutina disponible; «Descartar borrador» elimina solo los cambios pendientes. Los borradores sin guardar no se exportan.
- Si una rutina dura más que la pausa restante, puedes ampliar la pausa o usar solo el tiempo restante. La segunda opción guarda una entrada parcial y acredita solo los segundos activos.
- Respaldos de versión 3 con rutinas guardadas. Se siguen aceptando las versiones 1 y 2. Al importar se combinan identificadores nuevos sin duplicados; las rutinas con un ID existente, los ajustes y las metas actuales se conservan. Las entradas inválidas se rechazan antes de combinar los datos.

## Qué incluye

- Foco y pausa configurables, tarea de foco opcional y resumen de bloques y minutos completados hoy. Los minutos se empiezan a registrar con esta versión; no se estiman los bloques antiguos.
- Temporizador persistente, posponer cinco minutos y comienzo automático del siguiente bloque opcional. Una pausa manual no cuenta como bloque de foco completado. Posponer tampoco añade bloques ficticios.
- Tres opciones de pausa y recuerdo de tu última elección. Elegir una actividad inicia la pausa si todavía estabas en foco.
- Sentadillas y flexiones con objetivos separados, demostración, botones −1 / +1 / +5 y cámara opcional. Las flexiones admiten suelo y pared; cada variante se guarda por separado al cambiar.
- Detección por ángulo de rodilla o codo, compensando la proporción del vídeo. Requiere extensión inicial y un ciclo estable de bajada y subida. Si pierde visibilidad, reinicia el ciclo para reducir falsos positivos.
- Tres rutinas de estiramiento con demostración, voz, pasos y control de pausa. Se registra solo el tiempo activo; saltar pasos no acredita su duración completa. Al salir de la pestaña la rutina se pausa y la cámara se apaga.
- Guardado del ejercicio al cambiar de actividad, terminar o reiniciar el descanso. Los borradores se recuperan tras recargar sin duplicar entradas. Las rutinas interrumpidas se guardan como parciales.
- Estadísticas por día local: sentadillas y flexiones con sus metas y barras independientes, minutos estirando, racha y gráfica de siete días. Los ejemplos antiguos no contribuyen al progreso. La plancha se registra en segundos y no se mezcla con las repeticiones.
- Historial editable, borrado con opción de deshacer, anotación manual y respaldo JSON. La importación valida todo el archivo antes de combinarlo; conserva los ajustes actuales y admite respaldos originales de versión 1.
- Interfaz adaptable, temas claro / oscuro / sistema, navegación por teclado, etiquetas accesibles y preferencia de movimiento reducido.
- Sonido y voz independientes; notificaciones con permiso explícito. `Espacio` inicia o pausa el temporizador, `B` abre una pausa y `+` / `−` ajustan repeticiones. Los atajos globales no interfieren al escribir o usar botones.
- Apertura sin conexión tras la primera carga; los ejercicios y el conteo manual funcionan sin descargar el modelo de cámara.

## Límites actuales

Los recordatorios requieren que la app esté abierta. El sistema operativo puede suspenderla cuando bloqueas el teléfono; no se prometen alarmas en ese estado. La cámara necesita HTTPS o localhost; el modelo se descarga desde jsDelivr y Google Storage. Las fuentes externas tienen alternativas locales.

La descarga e inicialización del modelo real se comprueban aparte cuando hay acceso a sus proveedores. El conteo y la calibración se han verificado con poses sintéticas, tanto en rodilla como en codo, y con cancelación durante permisos y carga. **Falta calibrarlo con personas reales**, diferentes encuadres y variantes. El conteo manual está siempre disponible. La variante contra la pared no identifica la pared físicamente: se basa en el ciclo del codo y la visibilidad del cuerpo.

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

Las pruebas de cámara cubren ciclos cortos, discontinuidades, diferentes frecuencias de vídeo, visibilidad, perfiles, calibración completa y pruebas aisladas de la actividad, selección de lente, cancelación con permisos pendientes y orientación. Las pruebas de rutinas cubren orden, reproducción, borradores tras recarga, eliminación con deshacer, duración mayor que la pausa, respaldo y restauración sin duplicados, campos inválidos y metas de flexiones al cambiar de día. Las pruebas móviles usan Chromium con perfil Android y WebKit con perfil iPhone; no sustituyen pruebas en teléfonos físicos. Las pruebas cubren bienvenida, pausa de un minuto, compartir nativo y copia alternativa sin datos personales, arranque fallido, actualización con progreso pendiente, instalación y rutas bajo `/pomodoro-squats/`, además de fechas locales y cambio de hora, exclusión de ejemplos, importación, ciclos de detección, recuperación de borradores, pausas, fin de bloques, importación sin HTML ejecutable, atajos, tamaños de 320 a 1440 px, modo oscuro, uso sin conexión y cámara con poses sintéticas. Las capturas se guardan en la carpeta temporal del sistema (`OUTPUT_DIR` permite elegir otra).

## Archivos

`index.html` y `styles.css` definen la interfaz; `app.js`, los flujos y dispositivos; `core.js`, validación y fechas; `pose-counter.js`, medición y ciclos; `calibration-model.js` y `camera-guide.js`, calibración y guía; `routine-model.js` y `routine-editor.js`, validación y edición de rutinas; `figure.js` y `routines.js`, demostraciones y rutinas. `boot.js` protege el arranque; `companion.js` contiene bienvenida, compartir, instalación, ayuda y actualización; `release.js` identifica la versión. `sw.js` conserva un paquete completo por versión para abrir sin conexión.

## Dirección visual

Se conserva la identidad original de terracota y verde salvia, con el temporizador como acción principal y ayuda progresiva para ajustes y respaldos. Referencias de interacción: [progreso con etiqueta y valor](https://ui.shadcn.com/docs/components/base/progress) y [estados vacíos](https://ui.shadcn.com/docs/components/base/empty) de shadcn/ui. Se adaptan los patrones al HTML existente sin incorporar su biblioteca ni copiar su código.

## Publicación y actualizaciones

GitHub Pages publica `main` desde la raíz, con HTTPS. `.nojekyll` permite servir los módulos estáticos sin transformación. Antes de subir, ejecutar las pruebas y comprobar que no se están incluyendo datos personales.

Para cada versión nueva, cambiar `VERSION` en `release.js`, `CACHE` en `sw.js` y la versión de `package.json`. El worker descarga el paquete entero antes de activarse; una actualización espera hasta que el usuario pulsa «Guardar y actualizar». Se guarda la actividad pendiente y se recarga, sin borrar el historial. Los archivos de una versión se sirven desde el mismo paquete para evitar mezclar módulos antiguos y nuevos. Probar esta transición con `tests/update.mjs`.

## Próximos pasos

1. Calibrar la detección con uso real y distintos encuadres.
2. Calibrar la experiencia del editor con pruebas en teléfonos físicos.
3. Horario de trabajo y recordatorios con la app cerrada.
4. Otros movimientos con cámara, a partir de lo aprendido con sentadillas y flexiones.

Idea de partida: https://www.reddit.com/r/SideProject/s/rVoB0JgBo7
