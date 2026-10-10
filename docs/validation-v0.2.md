# Validación V0.2

Registro histórico de V0.2. Los controles actuales usan RB para saltar y LB para el terremoto; consulta [validación V0.3](validation-v0.3.md).

Validado el 6 de octubre de 2026 en Windows, Chrome, Phaser 3.90.0, Vite 6.4.4 y Node 24.19.0, sobre `codex/v0.2-gamepad-combat` creada desde `origin/main` (`974af36`).

## Resultado

- `npm test`: 15/15 pruebas pasan. Se mantienen intactos los cuatro tests originales de raycast; se añaden deadzone, normalización, última dirección, botones simultáneos/flancos/desconexión, selección acotada del aim assist, cooldown, munición e invulnerabilidad.
- `npm run build`: build de producción correcto.
- `npm run dev`: Vite arranca y sirve el juego en localhost. En esta sesión se usó el puerto 5174 porque 5173 ya estaba ocupado.
- `npm run test:browser`: 38 comprobaciones de integración en Chrome con Phaser/Matter reales y Gamepad API simulada; sin errores de consola.
- Smoke de producción mediante `npm run preview`: carga y render correctos, movimiento con teclado y ausencia de `window.__spiderGame` en el build; consola sin errores.
- Eventos reales de navegador en desarrollo: Space salta y RMB engancha/libera la telaraña. La prueba de integración también pulsa D mediante teclado real.
- Inspección visual: HUD, ambas arañas, colores, armas, flecha de aim y caverna conservan la estética procedural. No se usan assets externos.

El ejecutable npm no estaba en PATH: los comandos npm se ejecutaron a través de `node .playtest/npm-tools/node_modules/npm/bin/npm-cli.js`, con npm instalado sólo en el directorio de herramientas ignorado. Las dependencias del juego siguen siendo Phaser y Vite.

## Ciclo comprobado

1. Mover con LS y recoger una espada al tocarla.
2. Apuntar con RS y centrarlo conservando el último vector normalizado.
3. Saltar con A; mantenerlo no crea más saltos.
4. Enganchar con LT; mantenerlo conserva la misma instancia del constraint.
5. Comprobar que la cuerda floja no empuja y la tensa utiliza la rigidez original.
6. Mantener LT, RS, LS y RT simultáneamente: cuerda estable, movimiento y disparo.
7. Liberar el constraint y comparar exactamente la velocidad Matter antes/después.
8. Soltar LT, volver a enganchar y desconectar el mando simulado sin entradas atascadas.
9. Golpear con espada: un corazón, knockback fuerte y una sola oportunidad de impacto por swing, incluso si se retira artificialmente la invulnerabilidad durante la prueba.
10. Disparar la pistola contra la otra araña y contra una plataforma que bloquea el recorrido.
11. Recibir daño, comprobar protección temporal, perder tres corazones y hacer respawn en ambos bandos.
12. Agotar diez disparos, perder el arma y comprobar cooldown/reaparición de los pickups.
13. Pausar manteniendo Menu: sólo cambia una vez; otra pulsación reanuda.
14. Separar las arañas y comprobar límites de zoom; comprobar río sin daño.
15. Conseguir tres puntos, mostrar CYAN WINS y reiniciar con A.
16. Comprobar coyote time, salto buffered al aterrizar y que el input analógico parcial no recorta velocidad aérea por encima del límite de carrera.
17. Ejecutar hasta un minuto de simulación de IA con semilla fija: desplazamiento entre bordes, telaraña y daño al jugador.

Además se realizó una partida de IA sin intervenir: MAGENTA recogió pistola, disparó, usó telaraña, cambió a espada después de agotar munición y consiguió tres puntos contra el jugador inmóvil. Esta prueba detectó y permitió corregir la tendencia inicial a quedarse debajo de la plataforma de lanzamiento.

## Limitación del mando físico

Chrome no expuso ningún gamepad en este entorno (`navigator.getGamepads()` sin dispositivos). No se ha probado físicamente un mando Xbox, USB/Bluetooth ni la comodidad real del stick en manos de Franquito. Se verificaron los índices estándar A=0, LT=6, RT=7, Menu=9, LS horizontal=0 y RS=2/3, incluyendo conexión, desconexión y uso simultáneo.

Antes de dar por confirmada la experiencia del hardware, conectar el mando en Windows, dar foco al juego y pulsar cualquier botón. Probar la secuencia LS → A → RS → LT → balanceo → soltar LT → recoger arma → RT, y LT + RS + LS + RT juntos. Ajustar sólo `INPUT`, `WEB` e `AI` en `src/config.js` si el playtest físico pide cambios de sensibilidad o dificultad.

## Límites conocidos

- IA sin pathfinding: recuperación local y saltos, con retraso y error al apuntar. Puede tardar en alcanzar zonas alejadas.
- Cámara de zoom acotado: no garantiza ambos extremos de toda la arena visibles en una ventana pequeña.
- Cuerda V0.1 sin wrapping; no incorpora nuevas colisiones de segmentos de cuerda.
- Armas recogidas automáticamente, sin intercambio, inventario ni botón Y.

El PR va hacia `main` y no debe fusionarse automáticamente.
