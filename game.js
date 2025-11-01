// Platanus Hack 25: Two Players - Split Arena

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a0f2e',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let g;
let gPlayers; // graphics for players (rendered above UI)
let p1 = { x: 200, y: 350, size: 24, color: 0x8899ff }; // Initial position in playable area
let p2 = { x: 600, y: 350, size: 24, color: 0xf0f0f0 }; // Initial position in playable area
let cursors;
let wasd;
let speed = 440; // px/s (doubled for faster movement)
const TOP_UI_HEIGHT = 150; // Height of black top section (non-playable area) - "barra datos"
const DIRS = ['U','R','D','L'];
const ARCADE_BUTTONS = ['A', 'B', 'C']; // Top 3 arcade buttons
// Button to direction mapping (for attacks)
// A = Left, B = Up or Down (random), C = Right
const BUTTON_TO_DIR = {
  'A': 'L',  // Left button = Left
  'C': 'R'   // Right button = Right
  // B is handled specially to randomly pick Up or Down
};
let projL = []; // projectiles on left half (targeting P1)
let projR = []; // projectiles on right half (targeting P2)
let shieldP1 = null; // banana for P1
let shieldP2 = null; // banana for P2
let nextShieldP1At = 0; // ms timestamp for P1 banana
let nextShieldP2At = 0; // ms timestamp for P2 banana
let timerGfx; // pixel timer display
let stars = []; // background stars
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let gameOverText = null; // game over message text
let sceneRef = null; // reference to the scene
let menuUI = null; // menu UI elements
let gameStartTime = 0; // timestamp when game started
let currentRound = 1; // current round number
let gameMode = 'twoPlayer'; // 'singlePlayer' or 'twoPlayer'
let menuSelection = 0; // 0 = single player, 1 = two player

// Test mode: set to true to complete patterns with just the first symbol
const testMode = false;

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

// Bone masks (two frames for animation) - P2 normal attack
const BONE_A = [
  [0,1,1,1,0],
  [0,0,1,0,0],
  [0,0,1,0,0],
  [0,0,1,0,0],
  [0,1,1,1,0]
];
const BONE_B = [
  [0,0,0,0,0],
  [1,0,0,0,1],
  [1,1,1,1,1],
  [1,0,0,0,1],
  [0,0,0,0,0]
];

// Stone ball masks (two frames for animation) - P2 double damage
const STONE_A = [
  [0,1,1,1,0],
  [1,1,1,1,1],
  [1,1,1,1,1],
  [1,1,1,1,1],
  [0,1,1,1,0]
];
const STONE_B = [
  [0,1,1,1,0],
  [1,1,0,1,1],
  [1,0,1,1,1],
  [1,1,1,0,1],
  [0,1,1,1,0]
];

// Star masks (two frames for animation) - P1 double damage
const STAR_A = [
  [0,0,1,0,0],
  [0,1,1,1,0],
  [1,1,1,1,1],
  [0,1,1,1,0],
  [0,1,0,1,0]
];
const STAR_B = [
  [0,1,0,1,0],
  [0,0,1,0,0],
  [1,1,1,1,1],
  [0,0,1,0,0],
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
  ],
  'R': [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [1,1,0],
    [1,0,1]
  ]
};

function create() {
  sceneRef = this; // store scene reference
  g = this.add.graphics();
  g.setDepth(10); // Arena and background at lowest level
  gPlayers = this.add.graphics();
  gPlayers.setDepth(100); // Players above UI
  timerGfx = this.add.graphics();
  timerGfx.setDepth(1000); // Timer above everything
  
  // Create background stars (only in playable area)
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * 800,
      y: TOP_UI_HEIGHT + Math.random() * (600 - TOP_UI_HEIGHT), // Only in playable area
      size: Math.random() < 0.7 ? 1 : 2, // most stars are small
      brightness: 0.3 + Math.random() * 0.7
    });
  }

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });

  // Control instructions (hidden until game starts)
  const p1Controls = this.add.text(100, 580, 'P1: WASD + ZXC', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#8899ff'
  }).setOrigin(0.5).setVisible(false).setName('controls');
  
  const p2Controls = this.add.text(700, 580, 'P2: Arrows + 123', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#ffdd00'
  }).setOrigin(0.5).setVisible(false).setName('controls');

  // Pattern & score UI
  initPlayerUI(this, p1, 'L');
  initPlayerUI(this, p2, 'R');

  // Show menu
  showMenu();

  // Input handling for pattern steps (only arcade buttons, not movement)
  this.input.keyboard.on('keydown', (ev) => {
    if (gameState === 'menu') {
      // Navigate menu with Up/Down or W/S
      if (ev.code === 'ArrowUp' || ev.code === 'KeyW') {
        menuSelection = (menuSelection - 1 + 2) % 2;
        updateMenuSelection();
        return;
      }
      if (ev.code === 'ArrowDown' || ev.code === 'KeyS') {
        menuSelection = (menuSelection + 1) % 2;
        updateMenuSelection();
        return;
      }
      // Start game with Space or Enter
      if (ev.code === 'Space' || ev.code === 'Enter') {
        gameMode = menuSelection === 0 ? 'singlePlayer' : 'twoPlayer';
        startGame();
        return;
      }
    } else if (gameState === 'gameOver') {
      // Restart with Space or Enter
      if (ev.code === 'Space' || ev.code === 'Enter') {
        restartGame();
        return;
      }
      // Return to menu with ESC or M
      if (ev.code === 'Escape' || ev.code === 'KeyM') {
        returnToMenu();
        return;
      }
    }
    
    if (gameState !== 'playing') return;
    
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

function drawShadow(gr, x, y, size) {
  // Shadow offset (sun is top-left, so shadow goes bottom-right)
  const offsetX = 8;
  const offsetY = 8;
  const shadowWidth = size * 1.5;
  const shadowHeight = size * 0.4;
  
  gr.fillStyle(0x000000, 0.3); // semi-transparent black
  // Ellipse-like shadow using overlapping rectangles
  const cx = x + offsetX;
  const cy = y + offsetY + size;
  gr.fillRect(cx - shadowWidth / 2, cy - shadowHeight / 2, shadowWidth, shadowHeight);
}

function drawArenaFloor(gr, halfX) {
  // Top black section (non-playable area) - full width
  gr.fillStyle(0x000000, 1);
  gr.fillRect(0, 0, 800, TOP_UI_HEIGHT);
  
  // Horizontal divider line between top section and playable area
  gr.fillStyle(0x66ccff, 1); // light cyan/blue
  gr.fillRect(0, TOP_UI_HEIGHT - 2, 800, 4);
  
  if (gameMode === 'singlePlayer') {
    // Single player: full space arena (mago theme)
    gr.fillStyle(0x1a0f2e, 1);
    gr.fillRect(0, TOP_UI_HEIGHT, 800, 600 - TOP_UI_HEIGHT);
    
    // Space-themed details across full screen
    gr.fillStyle(0xffee88, 0.5); // light yellow stars
    const magoStars = [
      [40, 120 + TOP_UI_HEIGHT], [120, 80 + TOP_UI_HEIGHT], [200, 180 + TOP_UI_HEIGHT], [280, 250 + TOP_UI_HEIGHT], [350, 150 + TOP_UI_HEIGHT],
      [80, 320 + TOP_UI_HEIGHT], [180, 420 + TOP_UI_HEIGHT], [300, 500 + TOP_UI_HEIGHT], [250, 380 + TOP_UI_HEIGHT], [150, 280 + TOP_UI_HEIGHT],
      [60, 480 + TOP_UI_HEIGHT], [320, 90 + TOP_UI_HEIGHT], [230, 540 + TOP_UI_HEIGHT],
      // Add more stars for right side
      [440, 120 + TOP_UI_HEIGHT], [520, 80 + TOP_UI_HEIGHT], [600, 180 + TOP_UI_HEIGHT], [680, 250 + TOP_UI_HEIGHT], [750, 150 + TOP_UI_HEIGHT],
      [480, 320 + TOP_UI_HEIGHT], [580, 420 + TOP_UI_HEIGHT], [700, 500 + TOP_UI_HEIGHT], [650, 380 + TOP_UI_HEIGHT], [550, 280 + TOP_UI_HEIGHT],
      [460, 480 + TOP_UI_HEIGHT], [720, 90 + TOP_UI_HEIGHT], [630, 540 + TOP_UI_HEIGHT]
    ];
    for (const [x, y] of magoStars) {
      // Draw cross shape (5 pixels)
      const ps = 2;
      gr.fillRect(x, y - ps, ps, ps); // top
      gr.fillRect(x - ps, y, ps, ps); // left
      gr.fillRect(x, y, ps, ps); // center
      gr.fillRect(x + ps, y, ps, ps); // right
      gr.fillRect(x, y + ps, ps, ps); // bottom
    }
    
    // Asteroids across full screen
    gr.fillStyle(0x8b7355, 0.4); // light brown
    const asteroids = [
      [100, 200 + TOP_UI_HEIGHT], [240, 350 + TOP_UI_HEIGHT], [340, 480 + TOP_UI_HEIGHT], [70, 440 + TOP_UI_HEIGHT], [300, 140 + TOP_UI_HEIGHT],
      [500, 200 + TOP_UI_HEIGHT], [640, 350 + TOP_UI_HEIGHT], [740, 480 + TOP_UI_HEIGHT], [470, 440 + TOP_UI_HEIGHT], [700, 140 + TOP_UI_HEIGHT]
    ];
    for (const [ax, ay] of asteroids) {
      // Draw small pixelated asteroid
      gr.fillRect(ax, ay, 8, 8);
      gr.fillRect(ax + 8, ay + 4, 4, 4);
      gr.fillRect(ax - 4, ay + 4, 4, 4);
    }
  } else {
    // Two player mode: split arena
    // Left side - Mago's arena (solid dark purple)
    gr.fillStyle(0x1a0f2e, 1);
    gr.fillRect(0, TOP_UI_HEIGHT, halfX, 600 - TOP_UI_HEIGHT);
    
    // Space-themed details for mago side (subtle)
    // Small cross-shaped stars (yellow)
    gr.fillStyle(0xffee88, 0.5); // light yellow
    const magoStars = [
      [40, 120 + TOP_UI_HEIGHT], [120, 80 + TOP_UI_HEIGHT], [200, 180 + TOP_UI_HEIGHT], [280, 250 + TOP_UI_HEIGHT], [350, 150 + TOP_UI_HEIGHT],
      [80, 320 + TOP_UI_HEIGHT], [180, 420 + TOP_UI_HEIGHT], [300, 500 + TOP_UI_HEIGHT], [250, 380 + TOP_UI_HEIGHT], [150, 280 + TOP_UI_HEIGHT],
      [60, 480 + TOP_UI_HEIGHT], [320, 90 + TOP_UI_HEIGHT], [230, 540 + TOP_UI_HEIGHT]
    ];
    for (const [x, y] of magoStars) {
      // Draw cross shape (5 pixels)
      const ps = 2;
      gr.fillRect(x, y - ps, ps, ps); // top
      gr.fillRect(x - ps, y, ps, ps); // left
      gr.fillRect(x, y, ps, ps); // center
      gr.fillRect(x + ps, y, ps, ps); // right
      gr.fillRect(x, y + ps, ps, ps); // bottom
    }
    
    // Asteroids (small pixel rocks) - light brown
    gr.fillStyle(0x8b7355, 0.4); // light brown
    const asteroids = [
      [100, 200 + TOP_UI_HEIGHT], [240, 350 + TOP_UI_HEIGHT], [340, 480 + TOP_UI_HEIGHT], [70, 440 + TOP_UI_HEIGHT], [300, 140 + TOP_UI_HEIGHT]
    ];
    for (const [ax, ay] of asteroids) {
      // Draw small pixelated asteroid
      gr.fillRect(ax, ay, 8, 8);
      gr.fillRect(ax + 8, ay + 4, 4, 4);
      gr.fillRect(ax - 4, ay + 4, 4, 4);
    }
    
    // Right side - Skeleton's arena (solid brown earth color)
    gr.fillStyle(0x3d2817, 1); // darker earth brown
    gr.fillRect(halfX, TOP_UI_HEIGHT, halfX, 600 - TOP_UI_HEIGHT);
    
    // Earth-themed details for skeleton side (subtle)
    // Small grass patches
    gr.fillStyle(0x2d5016, 0.6); // dark green
    const grassPatches = [
      [450, 140 + TOP_UI_HEIGHT], [550, 240 + TOP_UI_HEIGHT], [650, 180 + TOP_UI_HEIGHT], [720, 320 + TOP_UI_HEIGHT], [480, 380 + TOP_UI_HEIGHT],
      [620, 450 + TOP_UI_HEIGHT], [740, 520 + TOP_UI_HEIGHT], [520, 520 + TOP_UI_HEIGHT], [680, 100 + TOP_UI_HEIGHT], [580, 340 + TOP_UI_HEIGHT]
    ];
    for (const [gx, gy] of grassPatches) {
      // Small grass patch (pixelated)
      gr.fillRect(gx, gy + 8, 12, 3);
      gr.fillRect(gx + 2, gy + 5, 8, 3);
      gr.fillRect(gx + 4, gy + 2, 4, 3);
    }
    
    // Small bones scattered
    gr.fillStyle(0x8a7a6a, 0.5); // bone color
    const bonePositions = [
      [470, 200 + TOP_UI_HEIGHT], [590, 300 + TOP_UI_HEIGHT], [710, 420 + TOP_UI_HEIGHT], [530, 480 + TOP_UI_HEIGHT], [660, 260 + TOP_UI_HEIGHT],
      [750, 150 + TOP_UI_HEIGHT], [440, 540 + TOP_UI_HEIGHT], [610, 90 + TOP_UI_HEIGHT]
    ];
    for (const [bx, by] of bonePositions) {
      // Tiny bone shape (horizontal)
      gr.fillRect(bx, by + 2, 10, 2);
      gr.fillRect(bx - 1, by, 3, 6);
      gr.fillRect(bx + 8, by, 3, 6);
    }
    
    // Middle divider - solid cyan/light blue (only in playable area)
    gr.fillStyle(0x66ccff, 1); // light cyan/blue
    gr.fillRect(halfX - 2, TOP_UI_HEIGHT, 4, 600 - TOP_UI_HEIGHT);
  }
}

function update(_time, delta) {
  const dt = delta / 1000;
  const half = 400;

  // Animate game over texts (pulsate)
  if (gameState === 'gameOver' && gameOverText) {
    const scale = 1 + Math.sin(_time / 200) * 0.1; // pulsate between 0.9 and 1.1
    if (gameOverText.winnerText) gameOverText.winnerText.setScale(scale);
    if (gameOverText.loserText) gameOverText.loserText.setScale(scale);
    if (gameOverText.gameOverTitle) gameOverText.gameOverTitle.setScale(scale);
  }

  // Don't update game if in menu
  if (gameState === 'menu') return;

  // Input P1 (WASD)
  let vx1 = 0, vy1 = 0;
  if (gameState === 'playing' && wasd.left.isDown) vx1 -= 1;
  if (gameState === 'playing' && wasd.right.isDown) vx1 += 1;
  if (gameState === 'playing' && wasd.up.isDown) vy1 -= 1;
  if (gameState === 'playing' && wasd.down.isDown) vy1 += 1;
  if (vx1 !== 0 && vy1 !== 0) { const s = Math.SQRT1_2; vx1 *= s; vy1 *= s; }
  const p1IsMoving = vx1 !== 0 || vy1 !== 0;
  p1.x += vx1 * speed * dt;
  p1.y += vy1 * speed * dt;

  // Input P2 (Arrows)
  let vx2 = 0, vy2 = 0;
  if (gameState === 'playing' && cursors.left.isDown) vx2 -= 1;
  if (gameState === 'playing' && cursors.right.isDown) vx2 += 1;
  if (gameState === 'playing' && cursors.up.isDown) vy2 -= 1;
  if (gameState === 'playing' && cursors.down.isDown) vy2 += 1;
  if (vx2 !== 0 && vy2 !== 0) { const s = Math.SQRT1_2; vx2 *= s; vy2 *= s; }
  const p2IsMoving = vx2 !== 0 || vy2 !== 0;
  p2.x += vx2 * speed * dt;
  p2.y += vy2 * speed * dt;

  // Health drain over time (if playing)
  if (gameState === 'playing') {
    // Calculate current round based on elapsed time (10 seconds per round)
    const elapsedSeconds = (_time - gameStartTime) / 1000;
    currentRound = Math.floor(elapsedSeconds / 10) + 1;
    
    // Base health drain rate increases with each round
    const baseHealthDrainRate = 20; // health per second
    const roundMultiplier = 1 + (currentRound - 1) * 0.05; // +5% per round
    const healthDrainRate = baseHealthDrainRate * roundMultiplier;
    
    // Players lose health 20% faster when standing still
    const p1DrainMultiplier = p1IsMoving ? 1.0 : 1.2;
    const p2DrainMultiplier = p2IsMoving ? 1.0 : 1.2;
    
    p1.health = Math.max(0, (p1.health || 0) - healthDrainRate * p1DrainMultiplier * dt);
    if (gameMode === 'twoPlayer') {
      p2.health = Math.max(0, (p2.health || 0) - healthDrainRate * p2DrainMultiplier * dt);
    }
    
    // Check for game over from health drain
    if (gameMode === 'singlePlayer') {
      if (p1.health <= 0) {
        endGame(p1, p1); // In single player, just pass p1 for both
      }
    } else {
      if (p1.health <= 0) {
        endGame(p2, p1);
      } else if (p2.health <= 0) {
        endGame(p1, p2);
      }
    }
  }

  // Constrain to halves and screen (with top UI section limit)
  const m1 = p1.size;
  const m2 = p2.size;
  const topLimit = TOP_UI_HEIGHT + m1; // Top limit: UI height + player size
  
  if (gameMode === 'singlePlayer') {
    // Single player: mage can move across full screen
    p1.x = Phaser.Math.Clamp(p1.x, m1, 800 - m1);
    p1.y = Phaser.Math.Clamp(p1.y, topLimit, 600 - m1);
  } else {
    // Two player: constrain to halves
    p1.x = Phaser.Math.Clamp(p1.x, m1, half - m1);
    p2.x = Phaser.Math.Clamp(p2.x, half + m2, 800 - m2);
    p1.y = Phaser.Math.Clamp(p1.y, topLimit, 600 - m1);
    p2.y = Phaser.Math.Clamp(p2.y, TOP_UI_HEIGHT + m2, 600 - m2);
  }

  // Draw
  g.clear();
  gPlayers.clear();
  
  // Draw background stars
  for (const star of stars) {
    g.fillStyle(0xffffff, star.brightness);
    g.fillRect(star.x, star.y, star.size, star.size);
  }
  
  // Arena floor design
  drawArenaFloor(g, half);
  
  // Draw shadow only for player 2 (skeleton) in two player mode - on arena layer
  if (gameMode === 'twoPlayer') {
    drawShadow(g, p2.x, p2.y, p2.size);
  }

  // move and draw projectiles (on arena layer)
  updateProjectiles(dt, _time);

  // shield power-ups (on arena layer) - one per player
  updateShieldP1(_time);
  if (gameMode === 'twoPlayer') {
    updateShieldP2(_time);
  }

  // timer
  drawTimer(_time);

  // players as pixel people (with immunity blink) - drawn on player layer (above UI)
  // P1 (mago): piel, azul, café
  const p1Color = getPlayerColor(p1, _time);
  const p1IsImmune = (p1.immuneUntil && _time < p1.immuneUntil);
  const p1Blinking = p1IsImmune && (Math.floor(_time / 120) % 2 === 1);
  const p1HeadColor = p1Blinking ? 0x666666 : 0xffdbac; // piel, o gris si inmune y parpadeando
  const p1BodyColor = p1Blinking ? 0x666666 : 0x0066ff; // azul, o gris si inmune y parpadeando
  const p1LegsColor = p1Blinking ? 0x666666 : 0x8b5a2b; // café, o gris si inmune y parpadeando
  drawPixelPerson(gPlayers, p1.x, p1.y, p1.size, p1Color, PERSON_MASK_P1_HEAD, PERSON_MASK_P1_BODY, PERSON_MASK_P1_LEGS, p1HeadColor, p1BodyColor, p1LegsColor);
  
  // P2: colores personalizados con cuerpo amarillo (only in two player mode)
  if (gameMode === 'twoPlayer') {
    const p2Color = getPlayerColor(p2, _time);
    const p2IsImmune = (p2.immuneUntil && _time < p2.immuneUntil);
    const p2Blinking = p2IsImmune && (Math.floor(_time / 120) % 2 === 1);
    const p2HeadColor = p2Blinking ? 0x666666 : 0xf0f0f0; // blanco/gris claro
    const p2BodyColor = p2Blinking ? 0x666666 : 0x8b5a2b; // amarillo
    const p2LegsColor = p2Blinking ? 0x666666 : 0x888888; // gris oscuro
    drawPixelPerson(gPlayers, p2.x, p2.y, p2.size, p2Color, PERSON_MASK_P2_HEAD, PERSON_MASK_P2_BODY, PERSON_MASK_P2_LEGS, p2HeadColor, p2BodyColor, p2LegsColor);
  }

  // Position UI (always, so health bars are always visible when playing)
  if (gameState === 'playing') {
    positionUI(p1);
    if (gameMode === 'twoPlayer') {
      positionUI(p2);
    }
    
    // Update health bars and pattern UI (only show when playing)
    drawHealthBar(p1);
    if (gameMode === 'twoPlayer') {
      drawHealthBar(p2);
    }
    drawPatternUI(p1);
    if (gameMode === 'twoPlayer') {
      drawPatternUI(p2);
    }
  } else {
    // Hide health bars, patterns, and scores when game is not playing
    p1.healthGfx.clear();
    p2.healthGfx.clear();
    p1.patternGfx.clear();
    p2.patternGfx.clear();
    p1.scoreGfx.clear();
    p2.scoreGfx.clear();
  }
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
const PERSON_MASK_P2_BODY = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0]
];
const PERSON_MASK_P2_LEGS = [
  [0,1,1,1,1,1,0,0],
  [1,0,1,1,0,1,1,0],
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
  
  // Only show timer when playing
  if (gameState !== 'playing') return;
  
  // Draw round number above timer
  const roundText = 'R' + String(currentRound);
  drawDigitsCentered(timerGfx, 400, 10, roundText, 0xffaa00, 4, 2);
  
  // Draw countdown timer (10 to 0) below round
  const elapsed = (now - gameStartTime) / 1000;
  const timeInRound = elapsed % 10; // time within current round
  const countdown = Math.max(0, Math.floor(10 - timeInRound)); // countdown from 10 to 0
  const text = String(countdown).padStart(2, '0');
  drawDigitsCentered(timerGfx, 400, 35, text, 0xffffff, 5, 2);
}

function initPlayerUI(scene, player, side) {
  player.score = 0;
  player.progress = 0;
  player.pattern = makePattern();
  player.side = side;
  player.maxHealth = 100;
  player.health = player.maxHealth;
  player.healthGfx = scene.add.graphics();
  player.healthGfx.setDepth(50); // Above arena (10) but below players (100)
  player.patternText = scene.add.text(0, 0, '', {
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff'
  }).setOrigin(0.5, 1);
  player.patternGfx = scene.add.graphics();
  player.patternGfx.setDepth(50); // Above arena (10) but below players (100)
  player.scoreGfx = scene.add.graphics();
  player.scoreGfx.setDepth(50); // Above arena (10) but below players (100)
  
  // Set score position (will be updated in positionUI for single player)
  player.scoreAnchor = { x: side === 'L' ? 20 : 780, y: 20 };
  player.scoreAlignRight = side === 'R';
  
  // fixed positions at the top of each half
  positionUI(player);
  refreshPatternTexts(player);
}

function makePattern() {
  let len;
  const round = currentRound;
  const rand = Math.random();
  
  if (round <= 6) {
    // Rondas 1-6: 80% de 3 símbolos, 20% de 4 símbolos
    if (rand < 0.80) {
      len = 3;
    } else {
      len = 4;
    }
  } else if (round <= 12) {
    // Rondas 7-12: 0% de 3, 30% de 4, 40% de 5, 30% de 6
    if (rand < 0.30) {
      len = 4;
    } else if (rand < 0.70) {
      len = 5;
    } else {
      len = 6;
    }
  } else {
    // Rondas 13+: 0% de 3, 0% de 4, 30% de 5, 30% de 6, 40% de 7
    if (rand < 0.30) {
      len = 5;
    } else if (rand < 0.60) {
      len = 6;
    } else {
      len = 7;
    }
  }
  
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
  // Redraw pixel arrows (only when playing)
  if (gameState === 'playing') {
    drawHealthBar(player);
    drawPatternUI(player);
    drawScore(player);
  }
}

function tryStep(player, input) {
  if (!player.pattern || gameState !== 'playing') return;
  
  // In single player mode, only P1 can play
  if (gameMode === 'singlePlayer' && player !== p1) return;
  
  const want = player.pattern[player.progress];
  
  // Patterns only contain arcade buttons A, B, C
  // Check if input matches the expected button
  const matches = (input === want);
  
  if (matches) {
    player.progress++;
    
    // Test mode: complete pattern immediately on first correct input
    if (testMode && player.progress === 1) {
      player.progress = player.pattern.length;
    }
    
    if (player.progress >= player.pattern.length) {
      player.score++;
      // Recover health to 100% when completing pattern
      player.health = player.maxHealth;
      const completed = player.pattern.slice();
      // spawn attacks on opponent half
      // In single player mode, spawn projectiles targeting the same player
      const targetSide = (gameMode === 'singlePlayer') ? 'L' : (player === p1 ? 'R' : 'L');
      spawnAttackPattern(targetSide, completed, player);
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
  // Position at top of player's box (aesthetic, outside playable zone)
  // Health bar at top, pattern below it (closer spacing)
  const healthY = 35; // health bar position (top of screen)
  const patY = 90; // pattern below health bar
  
  // In single player mode, center P1's UI
  let centerX;
  if (gameMode === 'singlePlayer' && player === p1) {
    centerX = 400; // center of screen
    // Also center the score
    player.scoreAnchor = { x: 20, y: 20 };
    player.scoreAlignRight = false;
  } else {
    centerX = player.side === 'L' ? 200 : 600;
    // Reset score position for two player mode
    player.scoreAnchor = { x: player.side === 'L' ? 20 : 780, y: 20 };
    player.scoreAlignRight = player.side === 'R';
  }
  
  player.patternText.setPosition(centerX, patY); // no visible content, kept for anchor
  player.patternAnchor = { x: centerX, y: patY };
  player.healthAnchor = { x: centerX, y: healthY };
  // Only draw score and health when playing
  if (gameState === 'playing') {
    drawScore(player);
    drawHealthBar(player);
    drawPatternUI(player);
  }
}

function drawHealthBar(player) {
  const gfx = player.healthGfx;
  gfx.clear();
  if (!player.healthAnchor) return;
  
  const x = player.healthAnchor.x;
  const y = player.healthAnchor.y;
  const barWidth = 250; // increased from 150
  const barHeight = 22; // increased for better visibility (more thickness)
  const healthPercent = Math.max(0, Math.min(1, player.health / player.maxHealth));
  
  // Black background (extended for visibility)
  const bgPadding = 4;
  gfx.fillStyle(0x000000, 1);
  gfx.fillRect(x - barWidth / 2 - bgPadding, y - barHeight / 2 - bgPadding, barWidth + bgPadding * 2, barHeight + bgPadding * 2);
  
  // Background (dark red)
  gfx.fillStyle(0x330000, 1);
  gfx.fillRect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight);
  
  // Health fill (green to red gradient based on health)
  let healthColor;
  if (healthPercent > 0.6) {
    healthColor = 0x00ff00; // green
  } else if (healthPercent > 0.3) {
    healthColor = 0xffff00; // yellow
  } else {
    healthColor = 0xff0000; // red
  }
  gfx.fillStyle(healthColor, 1);
  gfx.fillRect(x - barWidth / 2, y - barHeight / 2, barWidth * healthPercent, barHeight);
  
  // Border (white pixelated)
  gfx.lineStyle(2, 0xffffff, 1);
  gfx.strokeRect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight);
}

function drawPatternUI(player) {
  const gfx = player.patternGfx;
  gfx.clear();
  // Only show pattern when playing or when anchors are set
  if (gameState !== 'playing' || !player.patternAnchor) return;
  
  const basePs = 6; // pixel size for UI buttons/arrows (normal)
  const gap = 8; // spacing between buttons
  const buttons = player.pattern;
  const idx = player.progress;
  const masks = {
    U: ARROW_U, D: ARROW_D, L: ARROW_L, R: ARROW_R,
    A: BUTTON_A, B: BUTTON_B, C: BUTTON_C
  };
  const iconW = ARROW_U[0].length; // all icons are 5x5
  const iconH = ARROW_U.length;
  const aw = iconW * basePs;
  const aw2 = iconW * basePs * 2; // current button width when scaled 2x
  // compute total width with one button possibly 2x
  let totalW = 0;
  for (let i = 0; i < buttons.length; i++) totalW += (i === idx ? aw2 : aw);
  totalW += (buttons.length - 1) * gap;
  
  // Draw black background for pattern
  const bgPadding = 6;
  const bgHeight = iconH * basePs * 2 + bgPadding * 2; // accommodate 2x size
  const bgY = player.patternAnchor.y - bgHeight / 2;
  gfx.fillStyle(0x000000, 1);
  gfx.fillRect(
    player.patternAnchor.x - totalW / 2 - bgPadding,
    bgY,
    totalW + bgPadding * 2,
    bgHeight
  );
  
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

function spawnAttackPattern(targetSide, pattern, attacker) {
  const arr = targetSide === 'L' ? projL : projR;
  const isP1 = (attacker === p1);
  
  // In single player mode, double the number of projectiles
  const repetitions = (gameMode === 'singlePlayer' && isP1) ? 2 : 1;
  
  for (let rep = 0; rep < repetitions; rep++) {
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
        
        // In single player mode, always use skeleton design (bones)
        if (gameMode === 'singlePlayer' && isP1) {
          // 15% probability for double damage attack (stone ball)
          if (Math.random() < 0.15) {
            p.dmg = 2;
            p.ps = 10;
            p.type = 'stone';
            p.color = 0x666666; // gray stone
          } else {
            // Normal attack (bone)
            p.ps = 8;
            p.type = 'bone';
            p.color = 0xeeeeee; // white bone
          }
        } else {
          // Two player mode: use normal projectile designs
          // 15% probability for double damage attack
          if (Math.random() < 0.15) {
            p.dmg = 2;
            p.ps = 10;
            if (isP1) {
              // P1 (mago): star
              p.type = 'star';
              p.color = 0xffff00; // yellow star
            } else {
              // P2 (skeleton): stone ball
              p.type = 'stone';
              p.color = 0x666666; // gray stone
            }
          } else {
            // Normal attacks
            p.ps = 8;
            if (isP1) {
              // P1 (mago): fireball
              p.type = 'fire';
              p.color = 0xff6a00; // fiery orange
            } else {
              // P2 (skeleton): bone
              p.type = 'bone';
              p.color = 0xeeeeee; // white bone
            }
          }
        }
        arr.push(p);
      }
    }
  }
}

function createProjectile(side, dir) {
  const halfX = 400;
  const margin = 12;
  const baseSpeed = 260;
  const color = 0xff2020; // intense red
  // Playable area boundaries
  const topBound = TOP_UI_HEIGHT;
  const bottomBound = 600;
  const playableHeight = bottomBound - topBound;
  let x = 0, y = 0, vx = 0, vy = 0;
  
  // In single player mode, spawn projectiles across the full screen
  if (gameMode === 'singlePlayer') {
    // Full screen spawning
    switch (dir) {
      case 'U': x = margin + Math.random() * (800 - margin * 2); y = bottomBound + 16; vx = 0; vy = -baseSpeed; break;
      case 'D': x = margin + Math.random() * (800 - margin * 2); y = topBound - 16; vx = 0; vy = baseSpeed; break;
      case 'R': x = -16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = baseSpeed; vy = 0; break;
      case 'L': x = 800 + 16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = -baseSpeed; vy = 0; break;
    }
  } else if (side === 'R') {
    // right half: x in [halfX, 800]
    switch (dir) {
      case 'U': x = halfX + margin + Math.random() * (800 - halfX - margin * 2); y = bottomBound + 16; vx = 0; vy = -baseSpeed; break;
      case 'D': x = halfX + margin + Math.random() * (800 - halfX - margin * 2); y = topBound - 16; vx = 0; vy = baseSpeed; break;
      case 'R': x = halfX - 16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = baseSpeed; vy = 0; break;
      case 'L': x = 800 + 16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = -baseSpeed; vy = 0; break;
    }
  } else {
    // left half: x in [0, halfX]
    switch (dir) {
      case 'U': x = margin + Math.random() * (halfX - margin * 2); y = bottomBound + 16; vx = 0; vy = -baseSpeed; break;
      case 'D': x = margin + Math.random() * (halfX - margin * 2); y = topBound - 16; vx = 0; vy = baseSpeed; break;
      case 'R': x = -16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = baseSpeed; vy = 0; break;
      case 'L': x = halfX + 16; y = topBound + margin + Math.random() * (playableHeight - margin * 2); vx = -baseSpeed; vy = 0; break;
    }
  }
  return { x, y, vx, vy, dir, side, color, ps: 8, type: 'arrow', dmg: 1 };
}

function updateProjectiles(dt, now) {
  const halfX = 400;
  const drawProjectile = (proj) => {
    const ps = proj.ps; // pixel size
    let mask;
    const frame = (Math.floor(now / 120) % 2) === 0;
    
    // Select mask based on projectile type (all animated)
    switch (proj.type) {
      case 'fire':
        mask = frame ? FIRE_A : FIRE_B;
        break;
      case 'bone':
        mask = frame ? BONE_A : BONE_B;
        break;
      case 'stone':
        mask = frame ? STONE_A : STONE_B;
        break;
      case 'star':
        mask = frame ? STAR_A : STAR_B;
        break;
      default:
        // Fallback to arrows (shouldn't happen)
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
      drawProjectile(p);
      // collision with target player
      const target = side === 'L' ? p1 : p2;
      if (isHit(p, target)) {
        onPlayerHit(target, now, p.dmg || 1);
        arr.splice(i, 1);
        continue;
      }
      // cull when out of bounds (respect top UI section)
      // In single player mode, projectiles can travel across the entire screen
      if (gameMode === 'singlePlayer') {
        // Full screen bounds for single player
        if (p.y < TOP_UI_HEIGHT - 24 || p.y > 624 || p.x < -24 || p.x > 824) {
          arr.splice(i, 1);
        }
      } else {
        // Two player mode: restrict to halves
        if (p.y < TOP_UI_HEIGHT - 24 || p.y > 624 || (side === 'L' && (p.x < -24 || p.x > halfX + 24)) || (side === 'R' && (p.x < halfX - 24 || p.x > 824))) {
          arr.splice(i, 1);
        }
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
  if (gameState !== 'playing') return;
  
  // In single player mode, only P1 can be hit
  if (gameMode === 'singlePlayer' && player !== p1) return;
  
  // Progressive damage multiplier: increases by 0.1x per round
  // Round 1: 1.0x, Round 2: 1.1x, Round 3: 1.2x, etc.
  const roundMultiplier = 1.0 + (currentRound - 1) * 0.1;
  const baseDamage = 22.5; // base damage per hit (reduced to half)
  const finalDamage = dmg * baseDamage * roundMultiplier;
  
  // Reduce both score and health
  player.score = Math.max(0, (player.score || 0) - dmg);
  player.health = Math.max(0, (player.health || 0) - finalDamage);
  
  drawScore(player);
  drawHealthBar(player);
  player.immuneUntil = now + 1000; // 1s immunity
  
  // Check for game over
  if (player.health <= 0) {
    if (gameMode === 'singlePlayer') {
      endGame(p1, p1); // In single player, just pass p1 for both
    } else {
      endGame(player === p1 ? p2 : p1, player);
    }
  }
}

function endGame(winner, loser) {
  if (gameState === 'gameOver' || !sceneRef) return; // already ended or no scene
  gameState = 'gameOver';
  
  // Semi-transparent overlay
  const overlay = sceneRef.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
  overlay.setDepth(2000);
  
  let winnerText = null;
  let loserText = null;
  let gameOverTitle = null;
  
  if (gameMode === 'singlePlayer') {
    // Single player: Game Over message
    gameOverTitle = sceneRef.add.text(400, 200, 'Game Over', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ff0000',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    // Show score
    const finalScore = sceneRef.add.text(400, 280, 'Puntaje Final: ' + (p1.score || 0), {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    gameOverText = { overlay, gameOverTitle, finalScore };
  } else {
    // Two player mode: Winner/Loser messages
    winnerText = sceneRef.add.text(winner.side === 'L' ? 200 : 600, 250, 'Winner', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#00ff00',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    loserText = sceneRef.add.text(loser.side === 'L' ? 200 : 600, 250, 'Loser', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ff0000',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    gameOverText = { overlay, winnerText, loserText };
  }
  
  // Restart button (default option)
  const restartText = sceneRef.add.text(400, 380, 'Presiona ESPACIO o ENTER para Reiniciar', {
    fontSize: '24px',
    fontFamily: 'Arial',
    color: '#00ff00',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(2001);
  
  // Menu button
  const menuText = sceneRef.add.text(400, 430, 'Presiona ESC o M para volver al Menú', {
    fontSize: '24px',
    fontFamily: 'Arial',
    color: '#aaaaaa',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(2001);
  
  gameOverText.restartText = restartText;
  gameOverText.menuText = menuText;
}

function showMenu() {
  if (!sceneRef) return;
  
  // Background overlay
  const overlay = sceneRef.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
  
  // Title
  const title = sceneRef.add.text(400, 120, 'SPLIT ARENA DUO', {
    fontSize: '64px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Mode selection title
  const modeTitle = sceneRef.add.text(400, 220, 'Selecciona Modo de Juego:', {
    fontSize: '32px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Single player option
  const singlePlayerText = sceneRef.add.text(400, 290, 'Un Jugador (Mago)', {
    fontSize: '28px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Two player option
  const twoPlayerText = sceneRef.add.text(400, 340, 'Dos Jugadores', {
    fontSize: '28px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Navigation instructions
  const navInstr = sceneRef.add.text(400, 410, 'Usa W/S o Flechas para navegar', {
    fontSize: '20px',
    fontFamily: 'Arial',
    color: '#aaaaaa'
  }).setOrigin(0.5);
  
  // Start button
  const startText = sceneRef.add.text(400, 460, 'Presiona ESPACIO o ENTER para Empezar', {
    fontSize: '24px',
    fontFamily: 'Arial',
    color: '#00ff00',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Instructions
  const instr1 = sceneRef.add.text(400, 520, 'P1: WASD (movimiento) + ZXC (botones)', {
    fontSize: '18px',
    fontFamily: 'Arial',
    color: '#8899ff'
  }).setOrigin(0.5);
  
  const instr2 = sceneRef.add.text(400, 550, 'P2: FLECHAS (movimiento) + 123 (botones)', {
    fontSize: '18px',
    fontFamily: 'Arial',
    color: '#ffdd00'
  }).setOrigin(0.5);
  
  menuUI = { overlay, title, modeTitle, singlePlayerText, twoPlayerText, navInstr, startText, instr1, instr2 };
  updateMenuSelection();
}

function updateMenuSelection() {
  if (!menuUI) return;
  
  // Update colors based on selection
  if (menuSelection === 0) {
    menuUI.singlePlayerText.setColor('#00ff00');
    menuUI.twoPlayerText.setColor('#ffffff');
  } else {
    menuUI.singlePlayerText.setColor('#ffffff');
    menuUI.twoPlayerText.setColor('#00ff00');
  }
}

function startGame() {
  if (!sceneRef || gameState !== 'menu') return;
  
  // Hide menu
  if (menuUI) {
    menuUI.overlay.destroy();
    menuUI.title.destroy();
    if (menuUI.modeTitle) menuUI.modeTitle.destroy();
    if (menuUI.singlePlayerText) menuUI.singlePlayerText.destroy();
    if (menuUI.twoPlayerText) menuUI.twoPlayerText.destroy();
    if (menuUI.navInstr) menuUI.navInstr.destroy();
    menuUI.startText.destroy();
    menuUI.instr1.destroy();
    menuUI.instr2.destroy();
    menuUI = null;
  }
  
  // Show controls based on mode
  sceneRef.children.list.forEach(child => {
    if (child.name === 'controls') {
      // Only show P2 controls in two player mode
      if (child.text && child.text.includes('P2')) {
        child.setVisible(gameMode === 'twoPlayer');
      } else {
        child.setVisible(true);
      }
    }
  });
  
  // Reset game state
  gameState = 'playing';
  gameStartTime = sceneRef.time.now; // Reset timer
  currentRound = 1; // Reset round
  p1.health = p1.maxHealth;
  p2.health = p2.maxHealth;
  p1.score = 0;
  p2.score = 0;
  p1.progress = 0;
  p2.progress = 0;
  p1.pattern = makePattern();
  p2.pattern = makePattern();
  p1.immuneUntil = 0;
  p2.immuneUntil = 0;
  
  // Position players based on mode
  if (gameMode === 'singlePlayer') {
    // Single player: mage in center of full screen
    p1.x = 400;
    p1.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
    // P2 is not visible/active in single player
    p2.x = 2000; // move off screen
    p2.y = 2000;
  } else {
    // Two player: position in their respective halves
    p1.x = 200;
    p1.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
    p2.x = 600;
    p2.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
  }
  
  projL = [];
  projR = [];
  shieldP1 = null;
  shieldP2 = null;
  nextShieldP1At = 0;
  nextShieldP2At = 0;
  
  // Position UI and refresh - ensure anchors are set first, then draw everything
  // positionUI sets anchors, then we explicitly draw since gameState is now 'playing'
  positionUI(p1);
  if (gameMode === 'twoPlayer') {
    positionUI(p2);
  }
  // Now explicitly draw everything
  drawHealthBar(p1);
  if (gameMode === 'twoPlayer') {
    drawHealthBar(p2);
  }
  drawPatternUI(p1);
  if (gameMode === 'twoPlayer') {
    drawPatternUI(p2);
  }
  refreshPatternTexts(p1);
  if (gameMode === 'twoPlayer') {
    refreshPatternTexts(p2);
  }
  drawScore(p1);
  if (gameMode === 'twoPlayer') {
    drawScore(p2);
  }
}

function restartGame() {
  if (!sceneRef || gameState !== 'gameOver') return;
  
  // Clean up game over UI
  if (gameOverText) {
    if (gameOverText.overlay) gameOverText.overlay.destroy();
    if (gameOverText.winnerText) gameOverText.winnerText.destroy();
    if (gameOverText.loserText) gameOverText.loserText.destroy();
    if (gameOverText.gameOverTitle) gameOverText.gameOverTitle.destroy();
    if (gameOverText.finalScore) gameOverText.finalScore.destroy();
    if (gameOverText.restartText) gameOverText.restartText.destroy();
    if (gameOverText.menuText) gameOverText.menuText.destroy();
    gameOverText = null;
  }
  
  // Change state to 'playing' to start the game immediately
  gameState = 'playing';
  gameStartTime = sceneRef.time.now; // Reset timer
  currentRound = 1; // Reset round
  
  // Reset all game state for a fresh start
  p1.health = p1.maxHealth;
  p2.health = p2.maxHealth;
  p1.score = 0;
  p2.score = 0;
  p1.progress = 0;
  p2.progress = 0;
  p1.pattern = makePattern();
  p2.pattern = makePattern();
  p1.immuneUntil = 0;
  p2.immuneUntil = 0;
  projL = [];
  projR = [];
  shieldP1 = null;
  shieldP2 = null;
  nextShieldP1At = 0;
  nextShieldP2At = 0;
  
  // Position players based on game mode
  if (gameMode === 'singlePlayer') {
    p1.x = 400;
    p1.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
    p2.x = 2000;
    p2.y = 2000;
  } else {
    p1.x = 200;
    p1.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
    p2.x = 600;
    p2.y = TOP_UI_HEIGHT + (600 - TOP_UI_HEIGHT) / 2;
  }
  
  // Position UI and refresh - ensure anchors are set first, then draw everything
  positionUI(p1);
  if (gameMode === 'twoPlayer') {
    positionUI(p2);
  }
  // Now explicitly draw everything since gameState is 'playing'
  drawHealthBar(p1);
  if (gameMode === 'twoPlayer') {
    drawHealthBar(p2);
  }
  drawPatternUI(p1);
  if (gameMode === 'twoPlayer') {
    drawPatternUI(p2);
  }
  refreshPatternTexts(p1);
  if (gameMode === 'twoPlayer') {
    refreshPatternTexts(p2);
  }
  drawScore(p1);
  if (gameMode === 'twoPlayer') {
    drawScore(p2);
  }
}

function returnToMenu() {
  if (!sceneRef || gameState !== 'gameOver') return;
  
  // Clean up game over UI
  if (gameOverText) {
    if (gameOverText.overlay) gameOverText.overlay.destroy();
    if (gameOverText.winnerText) gameOverText.winnerText.destroy();
    if (gameOverText.loserText) gameOverText.loserText.destroy();
    if (gameOverText.gameOverTitle) gameOverText.gameOverTitle.destroy();
    if (gameOverText.finalScore) gameOverText.finalScore.destroy();
    if (gameOverText.restartText) gameOverText.restartText.destroy();
    if (gameOverText.menuText) gameOverText.menuText.destroy();
    gameOverText = null;
  }
  
  // Reset game state FIRST before showing menu
  gameState = 'menu';
  menuSelection = 0; // Reset to single player
  
  // Clear all projectiles
  projL = [];
  projR = [];
  shieldP1 = null;
  shieldP2 = null;
  nextShieldP1At = 0;
  nextShieldP2At = 0;
  
  // Reset player positions off screen
  p1.x = 200;
  p1.y = 350;
  p2.x = 600;
  p2.y = 350;
  
  // Reset player state
  p1.score = 0;
  p2.score = 0;
  p1.health = p1.maxHealth;
  p2.health = p2.maxHealth;
  p1.progress = 0;
  p2.progress = 0;
  p1.immuneUntil = 0;
  p2.immuneUntil = 0;
  
  // Clear all UI graphics
  if (p1.healthGfx) p1.healthGfx.clear();
  if (p2.healthGfx) p2.healthGfx.clear();
  if (p1.patternGfx) p1.patternGfx.clear();
  if (p2.patternGfx) p2.patternGfx.clear();
  if (p1.scoreGfx) p1.scoreGfx.clear();
  if (p2.scoreGfx) p2.scoreGfx.clear();
  if (timerGfx) timerGfx.clear();
  if (g) g.clear();
  if (gPlayers) gPlayers.clear();
  
  // Hide control instructions
  sceneRef.children.list.forEach(child => {
    if (child.name === 'controls') {
      child.setVisible(false);
    }
  });
  
  // Show menu
  showMenu();
}

function getPlayerColor(player, now) {
  if (player.immuneUntil && now < player.immuneUntil) {
    return (Math.floor(now / 120) % 2 === 0) ? player.color : 0x666666;
  }
  return player.color;
}

function updateShieldP1(now) {
  // schedule spawn if none
  if (!shieldP1) {
    if (nextShieldP1At === 0) {
      // set an initial delay so it doesn't appear immediately
      nextShieldP1At = now + (5000 + Math.random() * 3000); // 5-8s initial spawn
    } else if (now >= nextShieldP1At) {
      spawnShieldP1();
    }
  }
  // draw and check pickup
  if (shieldP1) {
    // Draw shadow for banana first
    drawShadow(g, shieldP1.x, shieldP1.y, 15);
    
    const ps = shieldP1.ps;
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
    ];
    const w = bananaY[0].length * ps;
    const h = bananaY.length * ps;
    const sx = Math.floor(shieldP1.x - w / 2);
    const sy = Math.floor(shieldP1.y - h / 2);
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

    // pickup check for P1 only
    if (distSq(p1.x, p1.y, shieldP1.x, shieldP1.y) <= (p1.size + 10) * (p1.size + 10)) {
      grantImmunity(p1, 3000, now); // 3 seconds immunity
      shieldP1 = null; 
      nextShieldP1At = now + (5000 + Math.random() * 3000); // respawn in 5-8s
    }
  }
}

function updateShieldP2(now) {
  // schedule spawn if none
  if (!shieldP2) {
    if (nextShieldP2At === 0) {
      // set an initial delay so it doesn't appear immediately
      nextShieldP2At = now + (5000 + Math.random() * 3000); // 5-8s initial spawn
    } else if (now >= nextShieldP2At) {
      spawnShieldP2();
    }
  }
  // draw and check pickup
  if (shieldP2) {
    // Draw shadow for banana first
    drawShadow(g, shieldP2.x, shieldP2.y, 15);
    
    const ps = shieldP2.ps;
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
    ];
    const w = bananaY[0].length * ps;
    const h = bananaY.length * ps;
    const sx = Math.floor(shieldP2.x - w / 2);
    const sy = Math.floor(shieldP2.y - h / 2);
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

    // pickup check for P2 only
    if (distSq(p2.x, p2.y, shieldP2.x, shieldP2.y) <= (p2.size + 10) * (p2.size + 10)) {
      grantImmunity(p2, 3000, now); // 3 seconds immunity
      shieldP2 = null;
      nextShieldP2At = now + (5000 + Math.random() * 3000); // respawn in 5-8s
    }
  }
}

function spawnShieldP1() {
  const margin = 20;
  const halfX = 400;
  // Spawn in P1's half (left side)
  const x = margin + Math.random() * (halfX - margin * 2);
  // Spawn shield only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  shieldP1 = { x, y, ps: 5 };
}

function spawnShieldP2() {
  const margin = 20;
  const halfX = 400;
  // Spawn in P2's half (right side)
  const x = halfX + margin + Math.random() * (halfX - margin * 2);
  // Spawn shield only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  shieldP2 = { x, y, ps: 5 };
}

function grantImmunity(player, ms, now) {
  if (player.immuneUntil && now < player.immuneUntil) player.immuneUntil += ms;
  else player.immuneUntil = now + ms;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
