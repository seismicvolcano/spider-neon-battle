# Spider Neon Battle — V0.2

Combate arcade de dos arañas en la caverna procedural de V0.1. CYAN es el jugador; MAGENTA es una IA fácil/media. Cada araña tiene tres corazones. La primera en conseguir tres puntos gana; A / Space inicia otra partida.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+ y npm.

```bash
npm install
npm run dev
npm test
npm run build
```

Abre la URL que imprime Vite (normalmente http://127.0.0.1:5173). `npm run preview` sirve el build de `dist/`. No se necesitan assets externos.

## Xbox en Windows

Usa un navegador con Gamepad API y mapeo `standard`, como Chrome o Edge. Conecta el mando, da foco al juego y pulsa un botón para que el navegador lo exponga. El HUD muestra `PRESS ANY BUTTON` mientras espera, confirma la conexión y avisa al desconectarse. Un mando estándar conectado tiene prioridad sobre teclado/mouse.

| Entrada | Acción |
| --- | --- |
| LS horizontal | Mover, controlar en el aire e impulsar el balanceo; deadzone 0.20 |
| RS | Dirección normalizada de apuntado; deadzone radial 0.23 |
| A | Saltar en el flanco de pulsación, con coyote time y buffer |
| Mantener LT (> 0.4) | Lanzar una vez y mantener la telaraña |
| Soltar LT | Liberar la telaraña conservando la velocidad |
| RT (> 0.4) | Atacar; mantener repite a la frecuencia del arma |
| Menu | Pausa / reanudar |

RS no mueve un cursor. Al centrar el stick se conserva la última dirección válida. Una flecha cyan de 92 px muestra esa dirección; se ilumina si hay superficie alcanzable. Si falla el gancho, suelta LT y vuelve a pulsarlo. LT + RS + LS + RT pueden usarse simultáneamente.

X, B, Y, LB, RB y los clicks de sticks quedan sin acciones en esta versión. Las armas se recogen automáticamente al tocarlas si la araña no lleva una.

## Teclado/mouse de desarrollo

| Entrada | Acción |
| --- | --- |
| A / D | Movimiento y balanceo |
| W / Space | Salto |
| Mouse | Apuntado en coordenadas del mundo |
| Mantener RMB | Telaraña; soltar conserva momentum |
| Mantener LMB | Ataque con el arma actual |
| Esc | Pausa / reanudar |
| R | Reiniciar toda la partida |
| F1 | Debug: cuerpos, raycast, anchor, velocidades y dirección de aim |

Perder foco pausa la simulación, libera la cuerda del jugador y limpia entradas. Menu / Esc reanuda. La desconexión del mando libera LT y devuelve el control al teclado sin dejar movimiento o ataque atascados.

## Combate

- **Espada láser:** swing de 180 ms, cooldown de 520 ms, alcance de 91 px, una oportunidad de impacto por objetivo y swing. Knockback fuerte, con un pequeño aporte de la velocidad relativa.
- **Pistola láser:** diez disparos, cooldown de 340 ms, proyectiles a 1150 px/s. Su recorrido completo se cruza con geometría y cuerpos para evitar atravesar paredes entre ticks. El primer impacto consume el proyectil, incluso si el objetivo está invulnerable. Al agotarse la munición, desaparece el arma.
- **Armas:** seis puntos sobre plataformas existentes, alternando espada y pistola. Cada punto repone su arma 6.5 s después de recogerla y anuncia el regreso con un brillo. Una araña lleva como máximo un arma; no hay intercambio ni inventario.
- **Daño:** cada impacto válido quita un corazón, añade knockback a la velocidad, produce chispas y concede 900 ms de invulnerabilidad con parpadeo. Un golpe conserva la telaraña mientras la araña siga viva.
- **Muerte:** explosión neón, punto para el atacante, eliminación de cuerda y arma, respawn después de 1.1 s con tres corazones y 1.2 s de protección. El río sigue rebotando sin daño.
- **IA:** reacciona cada 280 ms, apunta a la posición observada con error angular, busca armas, salta ante obstáculos/bordes, rodea localmente una plataforma que la bloquee desde arriba y usa telaraña ocasionalmente. Su pistola dispara más despacio que la del jugador. Usa las mismas reglas físicas y de combate.
- **Cámara:** sigue el punto medio de ambas arañas, suaviza el zoom entre 0.48 y 1.15 y respeta los límites del mundo.

## Arquitectura y física preservada

```text
Gamepad / KeyboardMouse / EnemyAI
              ↓
         ActionState
              ↓
    Spider + WebSystem + CombatSystem
```

- `src/actions.js`: deadzones, normalización y flancos de botones estándar, sin Phaser.
- `src/InputSystem.js`: prioridad del mando, fallback, foco, desconexión y conservación de eventos entre frames y ticks.
- `src/Spider.js`: parámetros `{ id, spawn, color, accentColor }`; cuerpo Matter, grounded, buffer, daño, arma, spawn y dibujo propios para cada instancia.
- `src/WebSystem.js`: recibe dirección, mantiene un único constraint por pulsación y lo libera sin alterar velocidad. La cuerda sólo tira cuando está tensa.
- `src/aimAssist.js`: primero intenta el rayo exacto; si falla prueba ±2.5°, ±5°, ±7.5° y ±10°. Prefiere menor desviación y después distancia. Cada candidato usa la primera intersección sólida; una pared demasiado cercana tampoco puede saltarse.
- `src/CombatSystem.js` / `src/weaponState.js`: recogida, cooldowns, swings, proyectiles, daño, puntuación y efectos.
- `src/EnemyAI.js`: genera el mismo estado de acción que el jugador, sin pathfinding.
- `src/GameScene.js`: misma arena, paso fijo Matter a 60 Hz, dos arañas, cámara, partida y HUD.
- `src/raycast.js`: sin cambios; conserva las intersecciones exactas con pendientes y cuerpos compuestos.

Se mantienen aceleración terrestre, control aéreo, salto, coyote time, buffer, impulso tangencial, límite de seguridad y rebote de V0.1. La comparación de velocidad usa el signo del input, para que un stick parcialmente inclinado tampoco recorte el momentum que ya supera la velocidad de carrera.

Todos los parámetros de entrada, ayuda de aim, armas, daño, respawn, victoria, cámara e IA están en `src/config.js`. Las velocidades de locomoción siguen expresadas en unidades Matter (px por tick de 1/60 s); la velocidad de proyectiles usa px/s.

## Validación y simulación

`npm test` ejecuta 15 pruebas de lógica pura, incluyendo los cuatro tests originales de raycast. Para la integración opcional con Chrome y Playwright:

```bash
npm install --no-save --package-lock=false playwright
npm run dev
# En otra terminal:
npm run test:browser
```

`GAME_URL` permite usar otro puerto. `PLAYWRIGHT_MODULE` permite indicar una URL de archivo al módulo Playwright si está instalado en otro lugar. `scripts/playtest.mjs` simula un mando estándar en Gamepad API y comprueba 38 comportamientos sobre Phaser/Matter reales, incluidos muerte/respawn de ambos bandos, victoria, desconexión, controles simultáneos y una simulación prolongada de IA. Guarda una captura en `.playtest/v02-validated.png` y exige consola sin errores.

En desarrollo también puedes inspeccionar o simular entradas desde la consola:

```js
const scene = window.__spiderGame.scene.getScene('cavern');
const pad = {
  connected: true,
  axes: [0.7, 0, 0.6, -0.8], // LS x/y, RS x/y
  buttons: Array.from({ length: 17 }, () => ({ value: 0 })),
};
scene.controls.override = pad;
pad.buttons[6].value = 1; // LT
pad.buttons[7].value = 1; // RT: puede usarse junto con LT y ambos sticks
pad.buttons[0].value = 1; // A; volver a cero antes de otra pulsación
pad.buttons[6].value = 0; // soltar LT
scene.controls.override = null; // volver al mando real / teclado
```

Inspecciona `scene.controls.pending`, `scene.spider.aim`, `scene.spider.body.velocity`, `scene.web.constraint`, `scene.enemy` y `scene.combat` para ajustar el prototipo. `window.__spiderGame` sólo existe en desarrollo.

Los resultados y la limitación de acceso al mando físico se documentan en [docs/validation-v0.2.md](docs/validation-v0.2.md). El soporte Xbox está implementado y verificado mediante estados estándar simulados; la comodidad y compatibilidad con el mando físico de Franquito requieren probarlo en su equipo.

## Límites de esta versión

La IA tiene navegación local sencilla y puede tardar en alcanzar plataformas muy separadas. La cámara limita el alejamiento: en extremos opuestos del mundo puede no encuadrar perfectamente ambas arañas en ventanas pequeñas. La cuerda conserva el modelo V0.1 sin wrapping; el aim assist evita enganchar detrás de una primera superficie, pero la cuerda no se enrolla después alrededor de obstáculos. No se añaden bombas, multiplayer, otros niveles, progresión ni menús extensos.
