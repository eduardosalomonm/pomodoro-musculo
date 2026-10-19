# Pomodoro Squats

Pomodoro con breaks activos. En cada break eliges entre sentadillas (la cámara detecta tu cuerpo y cuenta las repeticiones) o una rutina corta de estiramiento con demo, timer y voz. Todo queda en el navegador; no hay cuenta.

Idea de partida: el post de r/SideProject sobre "Pomodoro squats" (https://www.reddit.com/r/SideProject/s/rVoB0JgBo7).

## Cómo abrirla

Versión pública: https://eduardosalomonm.github.io/pomodoro-squats/

En local, desde esta carpeta, en Terminal:

```bash
python3 -m http.server 5180
```

Luego abre http://localhost:5180 en Chrome. Para tenerla como app aparte (ventana propia e icono en el Dock): menú de Chrome → Transmitir, guardar y compartir → Instalar página como app.

Usa siempre la misma dirección (`localhost:5180`): el historial se guarda por dirección y un puerto distinto empieza vacío. Exporta un respaldo de vez en cuando.

## Qué hace hoy

- Pomodoro configurable. Al acabar cada bloque te avisa con sonido, voz y notificación, y vuelve a insistir una vez si en 60 s no has elegido break.
- Puedes posponer el break 5 min o saltarlo. Opcionalmente, el siguiente bloque de foco empieza solo.
- El timer sobrevive a recargas. Si la app estuvo cerrada más de 10 min, no lanza un break viejo.
- Sentadillas: cuenta por el ángulo de la rodilla con MediaPipe Pose. La profundidad es ajustable (suave 120°, media 105°, profunda 90°) y también puedes sumar o restar a mano (+1, −1, +5).
- Estiramiento: 3 rutinas (cuello y hombros, espalda de oficina, pausa de 1 min) con figura animada, cuenta atrás y voz.
- Registro: meta diaria de sentadillas, minutos estirando, racha de días seguidos, gráfica de 7 días y ejercicios anotados a mano. En cada entrada puedes sumar reps o corregir el total.
- Respaldo: exportar e importar en JSON.
- Atajos de teclado: `Espacio` empezar/pausar, `B` break, `+`/`−` reps.
- La pantalla no se apaga mientras usas la cámara o haces una rutina.

## Limitaciones conocidas

- Los avisos solo funcionan si la pestaña o la app están abiertas. Si se cierran, no hay recordatorio.
- El conteo con cámara no se ha probado todavía con una persona real. Hay que calibrar los umbrales con uso.
- El modelo de la cámara se descarga de internet (jsDelivr y Google Storage); sin conexión solo funciona el conteo manual.

## Hoja de ruta

### Fase 1: que me sirva a mí (ahora)
1. Usarla una semana y calibrar el conteo de sentadillas (falsos positivos, ángulo, distancia a la cámara).
2. Más ejercicios con cámara: zancadas, elevaciones de talón y flexiones contra la pared.
3. Rutinas de estiramiento editables (elegir pasos y segundos).
4. Recordatorios con la app cerrada: app de barra de menús en macOS (Tauri o SwiftUI) o notificaciones push.
5. Horario de trabajo: avisar solo, por ejemplo, de 9:00 a 18:00 en días laborables.

### Fase 2: gamificación
- Racha con "comodín" semanal para no perderla por un día malo.
- Niveles por repeticiones acumuladas e insignias por hitos (primeras 100 sentadillas, 7 días seguidos, 10 rutinas de cuello).
- Retos semanales que se ajustan a tu media de la semana anterior.
- Puntuación de forma: profundidad y ritmo medidos por la cámara, no solo el número de reps.
- Mapa de calor anual de actividad, estilo GitHub.

### Fase 3: hacerla pública
- Hosting estático con HTTPS (Cloudflare Pages o Vercel), necesario para la cámara fuera de localhost.
- Seguir sin cuenta por defecto. Sincronización opcional entre dispositivos más adelante.
- Página de privacidad clara: el video nunca sale del dispositivo.
- Inglés y español.
- Retos con amigos o equipos de trabajo ("break de equipo" a la misma hora).
- Revisar antes de lanzar: accesibilidad, avisos de salud ("consulta a un profesional si tienes lesiones") y app nativa si la retención lo justifica.
