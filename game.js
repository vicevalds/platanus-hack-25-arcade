// Platanus Hack 25: Two Players - Split Arena

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let g;
let p1 = { x: 200, y: 300, size: 24, color: 0x8899ff };
let p2 = { x: 600, y: 300, size: 24, color: 0xf0f0f0 };
let cursors;
let wasd;
let speed = 220; // px/s
const DIRS = ['U','R','D','L'];
const ARCADE_BUTTONS = ['A', 'B', 'C']; // Top 3 arcade buttons
// A = Left, B = Up or Down (random), C = Right
let projL = []; // projectiles on left half (targeting P1)
let projR = []; // projectiles on right half (targeting P2)
let shield = null; // {x,y,ps}
let nextShieldAt = 0; // ms timestamp
let timerGfx; // pixel timer display

// Pixel arrow masks (5x5) - blocky style
const ARROW_U = [
  [0,0,1,0,0],
  [0,1,1,1,0],
  [1,0,1,0,1],
  [0,0,1,0,0],
  [0,0,1,0,0]
];
const ARROW_D = [
  [0,0,1,0,0],
  [0,0,1,0,0],
  [1,0,1,0,1],
  [0,1,1,1,0],
  [0,0,1,0,0]
];
const ARROW_R = [
  [0,0,1,0,0],
  [0,0,0,1,0],
  [1,1,1,1,1],
  [0,0,0,1,0],
  [0,0,1,0,0]
];
const ARROW_L = [
  [0,0,1,0,0],
  [0,1,0,0,0],
  [1,1,1,1,1],
  [0,1,0,0,0],
  [0,0,1,0,0]
];

// Pixel button masks (5x5) for arcade buttons
const BUTTON_A = [
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,1,1,1,1],
  [1,0,0,0,0],
  [1,0,0,0,0]
];
const BUTTON_B = [
  [1,1,1,1,1],
  [0,0,1,0,0],
  [0,0,1,0,0],
  [0,0,1,0,0],
  [0,0,1,0,0]
];
const BUTTON_C = [
  [0,0,0,0,1],
  [0,0,0,0,1],
  [1,1,1,1,1],
  [0,0,0,0,1],
  [0,0,0,0,1]
];

// Fireball masks (two frames for simple animation)
const FIRE_A = [
  [0,0,1,0,0],
  [0,1,1,1,0],
  [1,1,1,1,1],
  [0,1,1,1,0],
  [0,0,1,0,0]
];
const FIRE_B = [
  [0,1,0,1,0],
  [1,1,1,1,1],
  [0,1,1,1,0],
  [1,1,1,1,1],
  [0,1,0,1,0]
];

// Pixel digit masks (3x5)
const DIGITS = {
  '0': [
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1]
  ],
  '1': [
    [0,1,0],
    [1,1,0],
    [0,1,0],
    [0,1,0],
    [1,1,1]
  ],
  '2': [
    [1,1,1],
    [0,0,1],
    [1,1,1],
    [1,0,0],
    [1,1,1]
  ],
  '3': [
    [1,1,1],
    [0,0,1],
    [0,1,1],
    [0,0,1],
    [1,1,1]
  ],
  '4': [
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [0,0,1],
    [0,0,1]
  ],
  '5': [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [0,0,1],
    [1,1,1]
  ],
  '6': [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [1,0,1],
    [1,1,1]
  ],
  '7': [
    [1,1,1],
    [0,0,1],
    [0,1,0],
    [0,1,0],
    [0,1,0]
  ],
  '8': [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,1,1]
  ],
  '9': [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [0,0,1],
    [1,1,1]
  ],
  ':': [
    [0],
    [1],
    [0],
    [1],
    [0]
  ]
};

function create() {
  g = this.add.graphics();
  timerGfx = this.add.graphics();

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });

  // Removed on-screen control instructions for cleaner HUD

  // Pattern & score UI
  initPlayerUI(this, p1, 'L');
  initPlayerUI(this, p2, 'R');

  // Input handling for pattern steps (only arcade buttons, not movement)
  this.input.keyboard.on('keydown', (ev) => {
    switch (ev.code) {
      // P1 Arcade buttons (top 3: Z, X, C)
      case 'KeyZ': tryStep(p1, 'A'); break; // Left button
      case 'KeyX': tryStep(p1, 'B'); break; // Center button
      case 'KeyC': tryStep(p1, 'C'); break; // Right button
      // P2 Arcade buttons (top 3: Numpad 1, 2, 3)
      case 'Numpad1': tryStep(p2, 'A'); break; // Left button
      case 'Numpad2': tryStep(p2, 'B'); break; // Center button
      case 'Numpad3': tryStep(p2, 'C'); break; // Right button
    }
  });
}

function update(_time, delta) {
  const dt = delta / 1000;
  const half = 400;

  // Input P1 (WASD)
  let vx1 = 0, vy1 = 0;
  if (wasd.left.isDown) vx1 -= 1;
  if (wasd.right.isDown) vx1 += 1;
  if (wasd.up.isDown) vy1 -= 1;
  if (wasd.down.isDown) vy1 += 1;
  if (vx1 !== 0 && vy1 !== 0) { const s = Math.SQRT1_2; vx1 *= s; vy1 *= s; }
  p1.x += vx1 * speed * dt;
  p1.y += vy1 * speed * dt;

  // Input P2 (Arrows)
  let vx2 = 0, vy2 = 0;
  if (cursors.left.isDown) vx2 -= 1;
  if (cursors.right.isDown) vx2 += 1;
  if (cursors.up.isDown) vy2 -= 1;
  if (cursors.down.isDown) vy2 += 1;
  if (vx2 !== 0 && vy2 !== 0) { const s = Math.SQRT1_2; vx2 *= s; vy2 *= s; }
  p2.x += vx2 * speed * dt;
  p2.y += vy2 * speed * dt;

  // Constrain to halves and screen
  const m1 = p1.size;
  const m2 = p2.size;
  p1.x = Phaser.Math.Clamp(p1.x, m1, half - m1);
  p2.x = Phaser.Math.Clamp(p2.x, half + m2, 800 - m2);
  p1.y = Phaser.Math.Clamp(p1.y, m1, 600 - m1);
  p2.y = Phaser.Math.Clamp(p2.y, m2, 600 - m2);

  // Draw
  g.clear();
  // middle divider
  g.lineStyle(2, 0x222222, 1);
  g.beginPath();
  g.moveTo(half + 0.5, 0);
  g.lineTo(half + 0.5, 600);
  g.strokePath();

  // move and draw projectiles
  updateProjectiles(dt, _time);

  // shield power-up
  updateShield(_time);

  // timer
  drawTimer(_time);

  // players as pixel people (with immunity blink) - three color boxes like banana
  // P1 (mago): piel, azul, café
  const p1Color = getPlayerColor(p1, _time);
  const p1IsImmune = (p1.immuneUntil && _time < p1.immuneUntil);
  const p1Blinking = p1IsImmune && (Math.floor(_time / 120) % 2 === 1);
  const p1HeadColor = p1Blinking ? 0x666666 : 0xffdbac; // piel, o gris si inmune y parpadeando
  const p1BodyColor = p1Blinking ? 0x666666 : 0x0066ff; // azul, o gris si inmune y parpadeando
  const p1LegsColor = p1Blinking ? 0x666666 : 0x8b5a2b; // café, o gris si inmune y parpadeando
  drawPixelPerson(g, p1.x, p1.y, p1.size, p1Color, PERSON_MASK_P1_HEAD, PERSON_MASK_P1_BODY, PERSON_MASK_P1_LEGS, p1HeadColor, p1BodyColor, p1LegsColor);
  drawPixelPerson(g, p2.x, p2.y, p2.size, getPlayerColor(p2, _time), PERSON_MASK_P2_HEAD, PERSON_MASK_P2_BODY, PERSON_MASK_P2_LEGS);

  // Position pattern UI above players
  positionUI(p1);
  positionUI(p2);
}

function drawStick(gr, x, y, s, color) {
  // s acts as overall scale. Head radius ~ s*0.4, body length ~ s*1.2
  const r = Math.max(6, Math.floor(s * 0.4));
  const body = Math.floor(s * 1.2);
  const arm = Math.floor(s * 0.9);
  const leg = Math.floor(s * 1.0);

  gr.lineStyle(3, color, 1);

  // Head
  gr.strokeCircle(x, y - body - r, r);

  // Body
  gr.beginPath();
  gr.moveTo(x, y - body);
  gr.lineTo(x, y);
  gr.strokePath();

  // Arms
  gr.beginPath();
  gr.moveTo(x - arm * 0.6, y - body + body * 0.3);
  gr.lineTo(x + arm * 0.6, y - body + body * 0.3);
  gr.strokePath();

  // Legs
  gr.beginPath();
  gr.moveTo(x, y);
  gr.lineTo(x - leg * 0.5, y + leg * 0.9);
  gr.moveTo(x, y);
  gr.lineTo(x + leg * 0.5, y + leg * 0.9);
  gr.strokePath();
}

// Pixel person masks (8 x 13) - Player 1 (three separate color boxes)
const PERSON_MASK_P1_HEAD = [
  [0,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0]
];
const PERSON_MASK_P1_BODY = [
  [0,0,0,0,0,0,0,0],
  [0,0,1,0,0,1,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,1,1,1,0,0,0],
  [0,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,0,0],
  [0,1,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,0]
];
const PERSON_MASK_P1_LEGS = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,0,1],
  [0,0,1,0,1,0,0,1],
  [0,0,1,0,1,0,0,1]
];

// Pixel person masks - Player 2 (three separate color boxes)
const PERSON_MASK_P2_HEAD = [
  [0,1,1,1,1,1,0,0],
  [1,0,1,1,0,1,1,0],
  [0,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0]
];
const PERSON_MASK_P2_BODY = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [1,1,1,1,1,1,1,0],
  [1,0,0,1,0,0,1,0],
  [0,0,1,1,1,0,0,0],
  [0,1,0,1,0,1,0,0],
  [1,0,1,1,1,0,1,0],
  [1,0,0,1,0,0,1,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0]
];
const PERSON_MASK_P2_LEGS = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,1,0,0,0,1,1,0],
  [0,1,0,0,0,1,0,0],
  [1,1,0,0,0,1,1,0]
];

function drawPixelPerson(gr, x, y, s, baseColor, maskHead, maskBody, maskLegs, colorHead, colorBody, colorLegs) {
  const cols = maskHead[0].length;
  const rows = maskHead.length;
  // Fit into approx 2*s box
  const ps = Math.max(2, Math.floor((s * 2) / cols));
  const w = cols * ps;
  const h = rows * ps;
  const sx = Math.floor(x - w / 2);
  const sy = Math.floor(y - h / 2);
  
  // Three separate color boxes (like banana)
  // Use specific colors if provided, otherwise derive from baseColor
  let color1, color2, color3;
  if (colorHead !== undefined && colorBody !== undefined && colorLegs !== undefined) {
    color1 = colorHead;
    color2 = colorBody;
    color3 = colorLegs;
  } else {
    const r = (baseColor >> 16) & 0xff;
    const g = (baseColor >> 8) & 0xff;
    const b = baseColor & 0xff;
    color1 = ((Math.min(255, r + 40) << 16) | (Math.min(255, g + 40) << 8) | Math.min(255, b + 40));
    color2 = baseColor;
    color3 = ((Math.max(0, r - 40) << 16) | (Math.max(0, g - 40) << 8) | Math.max(0, b - 40));
  }
  
  // Color 1: Head
  gr.fillStyle(color1, 1);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (maskHead[row][col]) gr.fillRect(sx + col * ps, sy + row * ps, ps, ps);
    }
  }
  
  // Color 2: Body
  gr.fillStyle(color2, 1);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (maskBody[row][col]) gr.fillRect(sx + col * ps, sy + row * ps, ps, ps);
    }
  }
  
  // Color 3: Legs
  gr.fillStyle(color3, 1);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (maskLegs[row][col]) gr.fillRect(sx + col * ps, sy + row * ps, ps, ps);
    }
  }
}

function drawScore(player) {
  const gfx = player.scoreGfx;
  gfx.clear();
  const text = String(player.score || 0);
  const ps = 5;
  const gap = 2;
  const digitW = 3 * ps;
  const totalW = text.length * digitW + (text.length - 1) * gap;
  let x = player.scoreAlignRight ? (player.scoreAnchor.x - totalW) : player.scoreAnchor.x;
  const y = player.scoreAnchor.y;
  gfx.fillStyle(0xffff66, 1);
  for (let i = 0; i < text.length; i++) {
    const d = DIGITS[text[i]];
    for (let r = 0; r < d.length; r++) {
      for (let c = 0; c < d[r].length; c++) {
        if (d[r][c]) gfx.fillRect(x + c * ps, y + r * ps, ps, ps);
      }
    }
    x += digitW + gap;
  }
}

function drawDigitsCentered(gfx, cx, y, text, color, ps, gap) {
  gfx.fillStyle(color, 1);
  // compute total width
  let totalW = 0;
  for (let i = 0; i < text.length; i++) {
    const d = DIGITS[text[i]];
    const w = d[0].length * ps;
    totalW += w;
    if (i < text.length - 1) totalW += gap;
  }
  let x = Math.floor(cx - totalW / 2);
  for (let i = 0; i < text.length; i++) {
    const d = DIGITS[text[i]];
    for (let r = 0; r < d.length; r++) {
      for (let c = 0; c < d[r].length; c++) {
        if (d[r][c]) gfx.fillRect(x + c * ps, y + r * ps, ps, ps);
      }
    }
    x += d[0].length * ps + gap;
  }
}

function drawTimer(now) {
  if (!timerGfx) return;
  timerGfx.clear();
  const elapsed = Math.floor(now / 1000);
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const text = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  drawDigitsCentered(timerGfx, 400, 10, text, 0xffffff, 5, 2);
}

function initPlayerUI(scene, player, side) {
  player.score = 0;
  player.progress = 0;
  player.pattern = makePattern();
  player.side = side;
  player.patternGfx = scene.add.graphics();
  player.scoreGfx = scene.add.graphics();
  player.scoreAnchor = { x: side === 'L' ? 20 : 780, y: 20 };
  player.scoreAlignRight = side === 'R';
  // fixed positions at the top of each half
  positionUI(player);
  refreshPatternTexts(player);
}

function makePattern() {
  const len = 3 + Math.floor(Math.random() * 5); // 3..7
  const arr = [];
  for (let i = 0; i < len; i++) {
    // Only use top 3 arcade buttons (A, B, C)
    arr.push(ARCADE_BUTTONS[(Math.random() * 3) | 0]);
  }
  return arr;
}

function refreshPatternTexts(player) {
  const pat = player.pattern;
  const idx = player.progress;
  // Redraw pixel arrows
  drawPatternUI(player);
  drawScore(player);
}

function tryStep(player, input) {
  if (!player.pattern) return;
  const want = player.pattern[player.progress];
  
  // Patterns only contain arcade buttons A, B, C
  // Check if input matches the expected button
  const matches = (input === want);
  
  if (matches) {
    player.progress++;
    if (player.progress >= player.pattern.length) {
      player.score++;
      const completed = player.pattern.slice();
      // spawn attacks on opponent half
      spawnAttackPattern(player === p1 ? 'R' : 'L', completed);
      player.pattern = makePattern();
      player.progress = 0;
    }
  } else {
    player.progress = 0;
  }
  refreshPatternTexts(player);
  drawScore(player);
}

function positionUI(player) {
  const centerX = player.side === 'L' ? 200 : 600;
  const patY = 50;
  player.patternAnchor = { x: centerX, y: patY };
  drawPatternUI(player);
  drawScore(player);
}

function drawPatternUI(player) {
  const basePs = 6; // pixel size for UI buttons/arrows (normal)
  const gap = 8; // spacing between buttons
  const buttons = player.pattern;
  const idx = player.progress;
  const gfx = player.patternGfx;
  gfx.clear();
  const masks = {
    A: BUTTON_A, B: BUTTON_B, C: BUTTON_C
  };
  const iconW = BUTTON_A[0].length; // all icons are 5x5
  const iconH = BUTTON_A.length;
  const aw = iconW * basePs;
  const aw2 = iconW * basePs * 2; // current button width when scaled 2x
  // compute total width with one button possibly 2x
  let totalW = 0;
  for (let i = 0; i < buttons.length; i++) totalW += (i === idx ? aw2 : aw);
  totalW += (buttons.length - 1) * gap;
  let x0 = Math.floor(player.patternAnchor.x - totalW / 2);
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const mask = masks[btn];
    if (!mask) continue;
    const isCurrent = i === idx;
    const ps = isCurrent ? basePs * 2 : basePs;
    const y0 = Math.floor(player.patternAnchor.y - (iconH * ps) / 2);
    let color;
    if (i < idx) color = 0x777777; // passed -> gray
    else if (isCurrent) color = 0x00ff66; // current -> green, larger
    else color = 0xffffff; // upcoming -> white
    gfx.fillStyle(color, 1);
    for (let r = 0; r < mask.length; r++) {
      for (let c = 0; c < mask[r].length; c++) {
        if (mask[r][c]) gfx.fillRect(x0 + c * ps, y0 + r * ps, ps, ps);
      }
    }
    x0 += (isCurrent ? aw2 : aw) + gap;
  }
}

function spawnAttackPattern(targetSide, pattern) {
  const arr = targetSide === 'L' ? projL : projR;
  for (let i = 0; i < pattern.length; i++) {
    let d = pattern[i];
    // Convert buttons to their mapped directions
    // A = Left, B = Up or Down (random), C = Right
    if (d === 'A') {
      d = 'L';
    } else if (d === 'B') {
      d = Math.random() < 0.5 ? 'U' : 'D'; // Random up or down
    } else if (d === 'C') {
      d = 'R';
    }
    // Only spawn projectiles for movement directions
    if (DIRS.includes(d)) {
      const p = createProjectile(targetSide, d);
      // low probability fireball that deals 2 points and animates
      if (Math.random() < 0.15) {
        p.type = 'fire';
        p.dmg = 2;
        p.color = 0xff6a00; // fiery orange
        p.ps = 10;
      }
      arr.push(p);
    }
  }
}

function createProjectile(side, dir) {
  const halfX = 400;
  const margin = 12;
  const baseSpeed = 260;
  const color = 0xff2020; // intense red
  let x = 0, y = 0, vx = 0, vy = 0;
  if (side === 'R') {
    // right half: x in [halfX, 800]
    switch (dir) {
      case 'U': x = halfX + margin + Math.random() * (800 - halfX - margin * 2); y = 600 + 16; vx = 0; vy = -baseSpeed; break;
      case 'D': x = halfX + margin + Math.random() * (800 - halfX - margin * 2); y = -16; vx = 0; vy = baseSpeed; break;
      case 'R': x = halfX - 16; y = margin + Math.random() * (600 - margin * 2); vx = baseSpeed; vy = 0; break;
      case 'L': x = 800 + 16; y = margin + Math.random() * (600 - margin * 2); vx = -baseSpeed; vy = 0; break;
    }
  } else {
    // left half: x in [0, halfX]
    switch (dir) {
      case 'U': x = margin + Math.random() * (halfX - margin * 2); y = 600 + 16; vx = 0; vy = -baseSpeed; break;
      case 'D': x = margin + Math.random() * (halfX - margin * 2); y = -16; vx = 0; vy = baseSpeed; break;
      case 'R': x = -16; y = margin + Math.random() * (600 - margin * 2); vx = baseSpeed; vy = 0; break;
      case 'L': x = halfX + 16; y = margin + Math.random() * (600 - margin * 2); vx = -baseSpeed; vy = 0; break;
    }
  }
  return { x, y, vx, vy, dir, side, color, ps: 8, type: 'arrow', dmg: 1 };
}

function updateProjectiles(dt, now) {
  const halfX = 400;
  const drawArrow = (proj) => {
    const ps = proj.ps; // pixel size
    let mask;
    if (proj.type === 'fire') {
      const frame = (Math.floor(now / 120) % 2) === 0 ? FIRE_A : FIRE_B;
      mask = frame;
    } else {
      mask = proj.dir === 'U' ? ARROW_U : proj.dir === 'D' ? ARROW_D : proj.dir === 'R' ? ARROW_R : ARROW_L;
    }
    const w = mask[0].length * ps;
    const h = mask.length * ps;
    const sx = Math.floor(proj.x - w / 2);
    const sy = Math.floor(proj.y - h / 2);
    g.fillStyle(proj.color, 1);
    for (let r = 0; r < mask.length; r++) {
      for (let c = 0; c < mask[r].length; c++) {
        if (mask[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
      }
    }
  };

  const step = (arr, side) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      drawArrow(p);
      // collision with target player
      const target = side === 'L' ? p1 : p2;
      if (isHit(p, target)) {
        onPlayerHit(target, now, p.dmg || 1);
        arr.splice(i, 1);
        continue;
      }
      // cull when out of bounds
      if (p.y < -24 || p.y > 624 || (side === 'L' && (p.x < -24 || p.x > halfX + 24)) || (side === 'R' && (p.x < halfX - 24 || p.x > 824))) {
        arr.splice(i, 1);
      }
    }
  };

  step(projL, 'L');
  step(projR, 'R');
}

function isHit(proj, player) {
  const dx = Math.abs(proj.x - player.x);
  const dy = Math.abs(proj.y - player.y);
  const r = player.size; // aproximación: caja alrededor del torso
  return dx <= r && dy <= r;
}

function onPlayerHit(player) {
  // placeholder to keep signature (overloaded below)
}

function onPlayerHit(player, now, dmg = 1) {
  if (player.immuneUntil && now < player.immuneUntil) return;
  player.score = Math.max(0, (player.score || 0) - dmg);
  drawScore(player);
  player.immuneUntil = now + 1000; // 1s immunity
}

function getPlayerColor(player, now) {
  if (player.immuneUntil && now < player.immuneUntil) {
    return (Math.floor(now / 120) % 2 === 0) ? player.color : 0x666666;
  }
  return player.color;
}

function updateShield(now) {
  // schedule spawn if none
  if (!shield) {
    if (nextShieldAt === 0) {
      // set an initial delay so it doesn't appear immediately
      nextShieldAt = now + (10000 + Math.random() * 10000); // 10..20s
    } else if (now >= nextShieldAt) {
      spawnShield();
    }
  }
  // draw and check pickup
  if (shield) {
    const ps = shield.ps;
    // Banana pixel art (two colors: peel yellow and stem brown)
    const bananaY = [
      [0,0,0,0,1,0,0],
      [0,0,0,0,1,1,0],
      [0,0,0,0,1,1,0],
      [0,0,0,1,1,1,0],
      [1,1,1,1,1,1,0],
      [0,1,1,1,1,0,0]
    ];
    const bananaB = [
      [0,0,0,0,1,0,0],
      [0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0]
    ];0, w = bananaY[0].length * ps;
    const h = bananaY.length * ps;
    const sx = Math.floor(shield.x - w / 2);
    const sy = Math.floor(shield.y - h / 2);
    // draw yellow peel
    g.fillStyle(0xffe066, 1);
    for (let r = 0; r < bananaY.length; r++) {
      for (let c = 0; c < bananaY[r].length; c++) {
        if (bananaY[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
      }
    }
    // draw brown stem
    g.fillStyle(0x8b5a2b, 1);
    for (let r = 0; r < bananaB.length; r++) {
      for (let c = 0; c < bananaB[r].length; c++) {
        if (bananaB[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
      }
    }

    // pickup check
    if (distSq(p1.x, p1.y, shield.x, shield.y) <= (p1.size + 10) * (p1.size + 10)) {
      grantImmunity(p1, 3000, now);
      shield = null; scheduleNextShield(now);
    } else if (distSq(p2.x, p2.y, shield.x, shield.y) <= (p2.size + 10) * (p2.size + 10)) {
      grantImmunity(p2, 3000, now);
      shield = null; scheduleNextShield(now);
    }
  }
}

function spawnShield() {
  const margin = 20;
  const x = margin + Math.random() * (800 - margin * 2);
  const y = margin + Math.random() * (600 - margin * 2);
  shield = { x, y, ps: 5 };
}

function scheduleNextShield(now) {
  // respawn in 10..20 seconds aleatorio (raro)
  nextShieldAt = now + (10000 + Math.random() * 10000);
}

function grantImmunity(player, ms, now) {
  if (player.immuneUntil && now < player.immuneUntil) player.immuneUntil += ms;
  else player.immuneUntil = now + ms;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
