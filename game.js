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
let arcadeButtons = {}; // tracks arcade button states (e.g., 'P1U': true/false)
let speed = 440; // px/s (doubled for faster movement)
const TOP_UI_HEIGHT = 150; // Height of black top section (non-playable area) - "barra datos"
const DIRS = ['U','R','D','L'];
// Button to direction mapping for patterns
// Players press arcade buttons that map to directions
const BUTTON_TO_DIR = {
  'B': 'U',  // Button B = Up
  'X': 'L',  // Button X = Left
  'Y': 'D',  // Button Y = Down
  'Z': 'R'   // Button Z = Right
};
let projL = []; // projectiles on left half (targeting P1)
let projR = []; // projectiles on right half (targeting P2)
let shieldP1 = null; // banana for P1
let shieldP2 = null; // banana for P2
let nextShieldP1At = 0; // ms timestamp for P1 banana
let nextShieldP2At = 0; // ms timestamp for P2 banana
let bukP1 = null; // buk shield for P1
let bukP2 = null; // buk shield for P2
let nextBukP1At = 0; // ms timestamp for P1 buk
let nextBukP2At = 0; // ms timestamp for P2 buk
let awsP1 = null; // AWS wall power-up for P1
let awsP2 = null; // AWS wall power-up for P2
let nextAwsP1At = 0; // ms timestamp for P1 AWS
let nextAwsP2At = 0; // ms timestamp for P2 AWS
let walls = []; // active walls (each wall has x, y, width, height, hits)
let timerGfx; // pixel timer display
let stars = []; // background stars
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let activePowerUpType = null; // Current active power-up type: 'shield', 'buk', 'aws', or null
let nextPowerUpSpawnAt = 0; // Global power-up spawn timer
// Independent timers for two player mode
let nextPowerUpP1At = 0; // P1's independent spawn timer
let nextPowerUpP2At = 0; // P2's independent spawn timer
let gameOverText = null; // game over message text
let sceneRef = null; // reference to the scene
let menuUI = null; // menu UI elements
let gameStartTime = 0; // timestamp when game started
let currentRound = 1; // current round number
let gameMode = 'twoPlayer'; // 'singlePlayer' or 'twoPlayer'
let menuSelection = 0; // 0 = single player, 1 = two player

// Test mode: set to true to complete patterns with just the first symbol
const testMode = true;

// Audio variables
let audioContext;
let introMusicLoop = null;
let gameMusicLoop = null;
let currentMusic = null;

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

// Wildcard mask (empty circle) - for pattern UI
const WILDCARD = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0]
];

const BUK_LOGO = [
  [0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0],
  [1,1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,1],
  [1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1],
  [0,0,0,1,1,0,0,1,1,1,0,1,0,1,0,0,0]
];

const AWS_LOGO = [
  [0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,1,1],
  [0,1,1,1,0,1,0,0,1,0,0,1,0,0,1,0,0],
  [0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,1,1],
  [1,1,1,1,1,0,1,0,1,0,1,0,0,0,0,0,1],
  [1,1,0,1,1,0,0,1,0,1,0,0,0,0,1,1,1]
];

// Wall mask (2 columns x 7 rows) - vertical bar with pattern
const WALL_MASK = [
  [1,1],
  [1,1],
  [1,1],
  [1,1],
  [1,1],
  [1,1],
  [1,1]
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

// =============================================================================
// ARCADE BUTTON MAPPING - COMPLETE TEMPLATE
// =============================================================================
// Reference: See button-layout.webp at hack.platan.us/assets/images/arcade/
//
// Maps arcade button codes to keyboard keys for local testing.
// Each arcade code can map to multiple keyboard keys (array values).
// The arcade cabinet sends codes like 'P1U', 'P1A', etc. when buttons are pressed.
//
// To use in your game:
//   if (arcadeButtons['P1U']) { ... }  // Check if button is pressed
//
// CURRENT GAME USAGE (Two Players - Split Arena):
//   - P1U/P1D/P1L/P1R (Joystick) → P1 Movement
//   - P1B/P1X/P1Y/P1Z (Buttons: Up/Left/Down/Right) → P1 Pattern Directions
//   - P2U/P2D/P2L/P2R (Joystick) → P2 Movement
//   - P2B/P2X/P2Y/P2Z (Buttons: Up/Left/Down/Right) → P2 Pattern Directions
//   - START1/START2 → Menu Navigation & Game Start
//   - Note: Buttons A and C are not used
// =============================================================================

const ARCADE_CONTROLS = {
  // ===== PLAYER 1 CONTROLS =====
  // Joystick - Left hand on WASD
  'P1U': ['w'],
  'P1D': ['s'],
  'P1L': ['a'],
  'P1R': ['d'],
  'P1DL': null,  // Diagonal down-left (no keyboard default)
  'P1DR': null,  // Diagonal down-right (no keyboard default)

  // Action Buttons - Right hand on home row area (ergonomic!)
  // Top row (ABC): U, I, O  |  Bottom row (XYZ): J, K, L
  'P1A': ['u'],
  'P1B': ['i'],
  'P1C': ['o'],
  'P1X': ['j'],
  'P1Y': ['k'],
  'P1Z': ['l'],

  // Start Button
  'START1': ['1', 'Enter'],

  // ===== PLAYER 2 CONTROLS =====
  // Joystick - Right hand on Arrow Keys
  'P2U': ['ArrowUp'],
  'P2D': ['ArrowDown'],
  'P2L': ['ArrowLeft'],
  'P2R': ['ArrowRight'],
  'P2DL': null,  // Diagonal down-left (no keyboard default)
  'P2DR': null,  // Diagonal down-right (no keyboard default)

  // Action Buttons - Left hand (avoiding P1's WASD keys)
  // Top row (ABC): R, T, Y  |  Bottom row (XYZ): F, G, H
  'P2A': ['r'],
  'P2B': ['t'],
  'P2C': ['y'],
  'P2X': ['f'],
  'P2Y': ['g'],
  'P2Z': ['h'],

  // Start Button
  'START2': ['2']
};

// Build reverse lookup: keyboard key → arcade button code
const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keyboardKeys] of Object.entries(ARCADE_CONTROLS)) {
  if (keyboardKeys) {
    // Handle both array and single value
    const keys = Array.isArray(keyboardKeys) ? keyboardKeys : [keyboardKeys];
    keys.forEach(key => {
      KEYBOARD_TO_ARCADE[key] = arcadeCode;
    });
  }
}

// ============================================================================
// AUDIO FUNCTIONS - Web Audio API for procedural sounds
// ============================================================================

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration, type = 'square', volume = 0.15) {
  if (!audioContext) initAudio();
  
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioContext.currentTime);
  
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playErrorSound() {
  if (!audioContext) initAudio();
  
  // Descending "buzz" sound
  playTone(400, 0.1, 'sawtooth', 0.2);
  setTimeout(() => playTone(200, 0.15, 'sawtooth', 0.2), 100);
}

function playSuccessSound() {
  if (!audioContext) initAudio();
  
  // Ascending arpeggio
  playTone(523, 0.08, 'square', 0.15); // C5
  setTimeout(() => playTone(659, 0.08, 'square', 0.15), 80); // E5
  setTimeout(() => playTone(784, 0.15, 'square', 0.15), 160); // G5
}

function playPowerUpSound() {
  if (!audioContext) initAudio();
  
  // Quick ascending scale
  playTone(523, 0.06, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.06, 'sine', 0.12), 60);
  setTimeout(() => playTone(784, 0.06, 'sine', 0.12), 120);
  setTimeout(() => playTone(1047, 0.12, 'sine', 0.12), 180);
}

function playHitSound() {
  if (!audioContext) initAudio();
  
  // Impact sound with noise-like effect
  playTone(150, 0.08, 'sawtooth', 0.25);
  setTimeout(() => playTone(100, 0.12, 'sawtooth', 0.2), 50);
}

function playIntroMusic() {
  if (!audioContext) initAudio();
  stopMusic();
  
  // Simple intro melody loop (heroic arcade theme)
  const melody = [
    { freq: 523, dur: 0.15 }, // C5
    { freq: 659, dur: 0.15 }, // E5
    { freq: 784, dur: 0.15 }, // G5
    { freq: 1047, dur: 0.3 }, // C6
    { freq: 784, dur: 0.15 }, // G5
    { freq: 659, dur: 0.15 }, // E5
    { freq: 523, dur: 0.3 }  // C5
  ];
  
  let time = 0;
  const loopDuration = melody.reduce((sum, note) => sum + note.dur, 0) * 1000;
  
  const playMelody = () => {
    time = 0;
    melody.forEach(note => {
      setTimeout(() => {
        if (currentMusic === introMusicLoop) {
          playTone(note.freq, note.dur, 'square', 0.08);
        }
      }, time * 1000);
      time += note.dur;
    });
  };
  
  playMelody();
  introMusicLoop = setInterval(playMelody, loopDuration + 200);
  currentMusic = introMusicLoop;
}

function playGameMusic() {
  if (!audioContext) initAudio();
  stopMusic();
  
  // Battle music loop (intense arcade theme)
  const melody = [
    { freq: 392, dur: 0.12 }, // G4
    { freq: 392, dur: 0.12 }, // G4
    { freq: 440, dur: 0.12 }, // A4
    { freq: 523, dur: 0.24 }, // C5
    { freq: 494, dur: 0.12 }, // B4
    { freq: 440, dur: 0.12 }, // A4
    { freq: 392, dur: 0.24 }, // G4
    { freq: 349, dur: 0.12 }, // F4
    { freq: 392, dur: 0.12 }, // G4
    { freq: 440, dur: 0.24 }  // A4
  ];
  
  let time = 0;
  const loopDuration = melody.reduce((sum, note) => sum + note.dur, 0) * 1000;
  
  const playMelody = () => {
    time = 0;
    melody.forEach(note => {
      setTimeout(() => {
        if (currentMusic === gameMusicLoop) {
          playTone(note.freq, note.dur, 'square', 0.06);
        }
      }, time * 1000);
      time += note.dur;
    });
  };
  
  playMelody();
  gameMusicLoop = setInterval(playMelody, loopDuration + 100);
  currentMusic = gameMusicLoop;
}

function stopMusic() {
  if (introMusicLoop) {
    clearInterval(introMusicLoop);
    introMusicLoop = null;
  }
  if (gameMusicLoop) {
    clearInterval(gameMusicLoop);
    gameMusicLoop = null;
  }
  currentMusic = null;
}

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

  // Initialize arcade button states
  Object.keys(ARCADE_CONTROLS).forEach(code => {
    arcadeButtons[code] = false;
  });

  // Control instructions (hidden until game starts)
  const p1Controls = this.add.text(100, 580, 'P1: WASD + IJKL', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#8899ff'
  }).setOrigin(0.5).setVisible(false).setName('controls');
  
  const p2Controls = this.add.text(700, 580, 'P2: Arrows + TFGH', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#ffdd00'
  }).setOrigin(0.5).setVisible(false).setName('controls');

  // Pattern & score UI
  initPlayerUI(this, p1, 'L');
  initPlayerUI(this, p2, 'R');

  // Initialize audio context
  initAudio();

  // Show menu
  showMenu();

  // Input handling - keyboard events mapped to arcade buttons
  this.input.keyboard.on('keydown', (ev) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[ev.key];
    
    // Set arcade button state
    if (arcadeCode) {
      arcadeButtons[arcadeCode] = true;
    }
    
    if (gameState === 'menu') {
      // Navigate menu with Up/Down
      if (arcadeCode === 'P1U' || arcadeCode === 'P2U') {
        menuSelection = (menuSelection - 1 + 2) % 2;
        updateMenuSelection();
        return;
      }
      if (arcadeCode === 'P1D' || arcadeCode === 'P2D') {
        menuSelection = (menuSelection + 1) % 2;
        updateMenuSelection();
        return;
      }
      // Start game with START buttons or Enter
      if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
        gameMode = menuSelection === 0 ? 'singlePlayer' : 'twoPlayer';
        startGame();
        return;
      }
    } else if (gameState === 'gameOver') {
      // Restart with START buttons or Enter
      if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
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
    
    // Pattern step handling with arcade buttons (B=Up, X=Left, Y=Down, Z=Right)
    if (arcadeCode === 'P1B') tryStep(p1, 'B');  // Up
    else if (arcadeCode === 'P1X') tryStep(p1, 'X');  // Left
    else if (arcadeCode === 'P1Y') tryStep(p1, 'Y');  // Down
    else if (arcadeCode === 'P1Z') tryStep(p1, 'Z');  // Right
    else if (arcadeCode === 'P2B') tryStep(p2, 'B');  // Up
    else if (arcadeCode === 'P2X') tryStep(p2, 'X');  // Left
    else if (arcadeCode === 'P2Y') tryStep(p2, 'Y');  // Down
    else if (arcadeCode === 'P2Z') tryStep(p2, 'Z');  // Right
  });
  
  this.input.keyboard.on('keyup', (ev) => {
    const arcadeCode = KEYBOARD_TO_ARCADE[ev.key];
    
    // Clear arcade button state
    if (arcadeCode) {
      arcadeButtons[arcadeCode] = false;
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

  // Input P1 (Arcade controls)
  let vx1 = 0, vy1 = 0;
  if (gameState === 'playing' && arcadeButtons['P1L']) vx1 -= 1;
  if (gameState === 'playing' && arcadeButtons['P1R']) vx1 += 1;
  if (gameState === 'playing' && arcadeButtons['P1U']) vy1 -= 1;
  if (gameState === 'playing' && arcadeButtons['P1D']) vy1 += 1;
  if (vx1 !== 0 && vy1 !== 0) { const s = Math.SQRT1_2; vx1 *= s; vy1 *= s; }
  const p1IsMoving = vx1 !== 0 || vy1 !== 0;
  const prevP1X = p1.x;
  const prevP1Y = p1.y;
  p1.x += vx1 * speed * dt;
  p1.y += vy1 * speed * dt;

  // Input P2 (Arcade controls)
  let vx2 = 0, vy2 = 0;
  if (gameState === 'playing' && arcadeButtons['P2L']) vx2 -= 1;
  if (gameState === 'playing' && arcadeButtons['P2R']) vx2 += 1;
  if (gameState === 'playing' && arcadeButtons['P2U']) vy2 -= 1;
  if (gameState === 'playing' && arcadeButtons['P2D']) vy2 += 1;
  if (vx2 !== 0 && vy2 !== 0) { const s = Math.SQRT1_2; vx2 *= s; vy2 *= s; }
  const p2IsMoving = vx2 !== 0 || vy2 !== 0;
  const prevP2X = p2.x;
  const prevP2Y = p2.y;
  p2.x += vx2 * speed * dt;
  p2.y += vy2 * speed * dt;

  // Health drain over time (if playing)
  if (gameState === 'playing') {
    // Calculate current round based on elapsed time (10 seconds per round)
    const elapsedSeconds = (_time - gameStartTime) / 1000;
    currentRound = Math.floor(elapsedSeconds / 10) + 1;
    
    // Base health drain rate increases with each round
    const baseHealthDrainRate = 0; // health per second
    const roundMultiplier = 1 + (currentRound - 1) * 0.05; // +5% per round
    const healthDrainRate = baseHealthDrainRate * roundMultiplier;
    
    // Players lose health 20% faster when standing still
    const p1DrainMultiplier = p1IsMoving ? 1.0 : 1.6;
    const p2DrainMultiplier = p2IsMoving ? 1.0 : 1.6;
    
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

  // Players can now pass through walls (no collision check)

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

  // buk power-ups (on arena layer) - one per player
  updateBukP1(_time);
  if (gameMode === 'twoPlayer') {
    updateBukP2(_time);
  }

  // AWS power-ups (on arena layer) - one per player
  updateAwsP1(_time);
  if (gameMode === 'twoPlayer') {
    updateAwsP2(_time);
  }

  // Draw walls
  drawWalls();

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
  
  // Draw shield around P1 if active
  if (p1.hasShield) {
    drawShield(gPlayers, p1.x, p1.y, p1.size);
  }
  
  // P2: colores personalizados con cuerpo amarillo (only in two player mode)
  if (gameMode === 'twoPlayer') {
    const p2Color = getPlayerColor(p2, _time);
    const p2IsImmune = (p2.immuneUntil && _time < p2.immuneUntil);
    const p2Blinking = p2IsImmune && (Math.floor(_time / 120) % 2 === 1);
    const p2HeadColor = p2Blinking ? 0x666666 : 0xf0f0f0; // blanco/gris claro
    const p2BodyColor = p2Blinking ? 0x666666 : 0x8b5a2b; // amarillo
    const p2LegsColor = p2Blinking ? 0x666666 : 0x888888; // gris oscuro
    drawPixelPerson(gPlayers, p2.x, p2.y, p2.size, p2Color, PERSON_MASK_P2_HEAD, PERSON_MASK_P2_BODY, PERSON_MASK_P2_LEGS, p2HeadColor, p2BodyColor, p2LegsColor);
    
    // Draw shield around P2 if active
    if (p2.hasShield) {
      drawShield(gPlayers, p2.x, p2.y, p2.size);
    }
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

function drawShield(gr, x, y, playerSize) {
  // Draw a rectangular shield around the player
  const shieldWidth = playerSize * 3.5;
  const shieldHeight = playerSize * 3.5;
  const shieldThickness = 3;
  
  // Cyan/blue shield with slight transparency
  gr.lineStyle(shieldThickness, 0x00ffff, 0.8);
  gr.strokeRect(x - shieldWidth / 2, y - shieldHeight / 2, shieldWidth, shieldHeight);
  
  // Add a subtle fill
  gr.fillStyle(0x00ffff, 0.1);
  gr.fillRect(x - shieldWidth / 2, y - shieldHeight / 2, shieldWidth, shieldHeight);
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
  
  // In single player mode, draw in top right corner
  if (gameMode === 'singlePlayer') {
    // Draw round number
    const roundText = 'R' + String(currentRound);
    const roundX = 720; // Right aligned position
    const roundY = 15;
    
    // Calculate width to align right
    let totalW = 0;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      totalW += d[0].length * 4 + 2; // ps=4, gap=2
    }
    
    timerGfx.fillStyle(0xffaa00, 1);
    let x = roundX - totalW;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) timerGfx.fillRect(x + c * 4, roundY + r * 4, 4, 4);
        }
      }
      x += d[0].length * 4 + 2;
    }
    
    // Draw countdown timer below round
    const elapsed = (now - gameStartTime) / 1000;
    const timeInRound = elapsed % 10;
    const countdown = Math.max(0, Math.floor(10 - timeInRound));
    const timeText = String(countdown).padStart(2, '0');
    
    // Calculate width for time
    totalW = 0;
    for (let i = 0; i < timeText.length; i++) {
      const d = DIGITS[timeText[i]];
      totalW += d[0].length * 5 + 2; // ps=5, gap=2
    }
    
    timerGfx.fillStyle(0xffffff, 1);
    x = roundX - totalW;
    const timeY = 45;
    for (let i = 0; i < timeText.length; i++) {
      const d = DIGITS[timeText[i]];
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) timerGfx.fillRect(x + c * 5, timeY + r * 5, 5, 5);
        }
      }
      x += d[0].length * 5 + 2;
    }
  } else {
    // Two player mode: draw centered
    const roundText = 'R' + String(currentRound);
    drawDigitsCentered(timerGfx, 400, 10, roundText, 0xffaa00, 4, 2);
    
    const elapsed = (now - gameStartTime) / 1000;
    const timeInRound = elapsed % 10;
    const countdown = Math.max(0, Math.floor(10 - timeInRound));
    const text = String(countdown).padStart(2, '0');
    drawDigitsCentered(timerGfx, 400, 35, text, 0xffffff, 5, 2);
  }
}

function initPlayerUI(scene, player, side) {
  player.score = 0;
  player.progress = 0;
  player.pattern = makePattern();
  player.side = side;
  player.maxHealth = 100;
  player.health = player.maxHealth;
  player.hasShield = false; // Shield from buk pickup
  player.wildcardDirections = []; // Directions pressed for wildcard patterns
  player.errorFlashUntil = 0; // Error flash timestamp
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
  const directions = ['U', 'D', 'L', 'R'];
  
  // Generate pattern with only directions first
  for (let i = 0; i < len; i++) {
    arr.push(directions[(Math.random() * 4) | 0]);
  }
  
  // 25% chance to replace ONE random symbol with a wildcard
  if (Math.random() < 0.25) {
    const wildcardPos = (Math.random() * len) | 0;
    arr[wildcardPos] = 'W';
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
  
  // Convert button to direction (B=U, X=L, Y=D, Z=R)
  const direction = BUTTON_TO_DIR[input];
  
  // Check if the direction matches the expected pattern direction
  // If pattern expects wildcard ('W'), accept any direction
  const matches = (want === 'W') || (direction === want);
  
  if (matches) {
    // If this was a wildcard, save the direction pressed for projectile spawning
    if (want === 'W') {
      if (!player.wildcardDirections) player.wildcardDirections = [];
      player.wildcardDirections.push(direction);
    }
    
    player.progress++;
    
    // Test mode: complete pattern immediately on first correct input
    if (testMode && player.progress === 1) {
      player.progress = player.pattern.length;
    }
    
    if (player.progress >= player.pattern.length) {
      player.score++;
      // Play success sound
      playSuccessSound();
      // Recover 50% of max health when completing pattern (capped at max health)
      player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.5);
      const completed = player.pattern.slice();
      // spawn attacks on opponent half
      // In single player mode, spawn projectiles targeting the same player
      const targetSide = (gameMode === 'singlePlayer') ? 'L' : (player === p1 ? 'R' : 'L');
      spawnAttackPattern(targetSide, completed, player);
      player.pattern = makePattern();
      player.progress = 0;
      player.wildcardDirections = []; // Reset wildcard directions
    }
  } else {
    // Play error sound on mistake
    playErrorSound();
    // Set error flash timestamp (flash for 400ms)
    player.errorFlashUntil = sceneRef.time.now + 400;
    player.progress = 0;
    player.wildcardDirections = []; // Reset on mistake
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
  
  const basePs = 6; // pixel size for UI arrows (normal)
  const gap = 8; // spacing between arrows
  const buttons = player.pattern;
  const idx = player.progress;
  const masks = {
    U: ARROW_U, D: ARROW_D, L: ARROW_L, R: ARROW_R,
    W: WILDCARD // Wildcard: empty circle
  };
  const iconW = ARROW_U[0].length; // all icons are 5x5
  const iconH = ARROW_U.length;
  const aw = iconW * basePs;
  const aw2 = iconW * basePs * 2; // current button width when scaled 2x
  // compute total width with one button possibly 2x
  let totalW = 0;
  for (let i = 0; i < buttons.length; i++) totalW += (i === idx ? aw2 : aw);
  totalW += (buttons.length - 1) * gap;
  
  // Check if there's an active error flash
  const now = sceneRef ? sceneRef.time.now : 0;
  const isErrorFlashing = player.errorFlashUntil && now < player.errorFlashUntil;
  const flashOn = isErrorFlashing && (Math.floor(now / 50) % 2 === 0); // Flash every 50ms
  
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
    else if (isCurrent) {
      // Current symbol: check for error flash
      if (isErrorFlashing) {
        // Flash between red and dark red
        color = flashOn ? 0xff0000 : 0x880000; // Bright red / Dark red
      } else {
        // Normal: green for current symbol
        color = 0x00ff66;
      }
    } else {
      // Upcoming: white for all symbols
      color = 0xffffff; // White for all upcoming symbols
    }
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
  
  // Track wildcard index for multiple wildcards
  let wildcardIdx = 0;
  
  for (let rep = 0; rep < repetitions; rep++) {
    wildcardIdx = 0; // Reset for each repetition
    for (let i = 0; i < pattern.length; i++) {
      const d = pattern[i];
      
      // Check if this is a wildcard ('W')
      if (d === 'W') {
        // Use the saved wildcard direction for this wildcard
        const wildcardDirs = attacker.wildcardDirections || [];
        const wildcardDir = wildcardDirs[wildcardIdx];
        wildcardIdx++;
        
        if (wildcardDir && DIRS.includes(wildcardDir)) {
          const p = createProjectile(targetSide, wildcardDir);
          
          // Wildcard always spawns special projectile (double damage)
          p.dmg = 2; // Double damage for wildcard
          p.ps = 10;
          
          // In single player mode, always use skeleton design (stone)
          if (gameMode === 'singlePlayer' && isP1) {
            p.type = 'stone';
            p.color = 0x666666; // gray stone
          } else {
            // Two player mode: use player-specific special projectile
            if (isP1) {
              // P1 (mago): star
              p.type = 'star';
              p.color = 0xffff00; // yellow star
            } else {
              // P2 (skeleton): stone ball
              p.type = 'stone';
              p.color = 0x666666; // gray stone
            }
          }
          arr.push(p);
        }
      } else if (DIRS.includes(d)) {
        // Normal direction (not wildcard)
        const p = createProjectile(targetSide, d);
        
        // In single player mode, always use skeleton design (bones)
        if (gameMode === 'singlePlayer' && isP1) {
          // Normal attack (bone)
          p.ps = 8;
          p.type = 'bone';
          p.color = 0xeeeeee; // white bone
        } else {
          // Two player mode: use normal projectile designs
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
      
      // Check collision with walls
      let hitWall = false;
      for (let w = 0; w < walls.length; w++) {
        const wall = walls[w];
        // Calculate wall dimensions from mask
        const cols = WALL_MASK[0].length; // 2
        const rows = WALL_MASK.length; // 7
        const ps = Math.max(2, Math.floor(wall.size / cols));
        const wallWidth = cols * ps;
        const wallHeight = rows * ps;
        const hw = wallWidth / 2;
        const hh = wallHeight / 2;
        
        // Check if projectile is inside wall boundaries
        if (p.x >= wall.x - hw && p.x <= wall.x + hw && 
            p.y >= wall.y - hh && p.y <= wall.y + hh) {
          wall.hits++;
          if (wall.hits >= 2) {
            // Remove wall after 2 hits
            walls.splice(w, 1);
          }
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        arr.splice(i, 1);
        continue;
      }
      
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
  
  // Check if player has shield - if so, remove shield and absorb the hit
  if (player.hasShield) {
    player.hasShield = false;
    return; // Shield absorbed the hit
  }
  
  // Play hit sound
  playHitSound();
  
  // Progressive damage multiplier: increases by 0.1x per round
  // Round 1: 1.0x, Round 2: 1.1x, Round 3: 1.2x, etc.
  const roundMultiplier = 1.0 + (currentRound - 1) * 0.1;
  const baseDamage = 22.5; // base damage per hit (reduced to half)
  const finalDamage = dmg * baseDamage * roundMultiplier;
  
  // Reduce both score and health
  // Round dmg to nearest integer for score to avoid decimal scores
  player.score = Math.max(0, (player.score || 0) - Math.round(dmg));
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
  
  // Stop music when game ends
  stopMusic();
  
  // Semi-transparent overlay
  const overlay = sceneRef.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
  overlay.setDepth(2000);
  
  let winnerText = null;
  let loserText = null;
  let gameOverTitle = null;
  
  if (gameMode === 'singlePlayer') {
    // Single player: Game Over message
    gameOverTitle = sceneRef.add.text(400, 180, 'GAME OVER', {
      fontSize: '72px',
      fontFamily: 'Arial',
      color: '#ff4444',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    // Show score
    const finalScore = sceneRef.add.text(400, 260, 'Final Score: ' + (p1.score || 0), {
      fontSize: '40px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    gameOverText = { overlay, gameOverTitle, finalScore };
  } else {
    // Two player mode: Winner/Loser messages
    winnerText = sceneRef.add.text(winner.side === 'L' ? 200 : 600, 220, 'WINNER', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#00ff00',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    loserText = sceneRef.add.text(loser.side === 'L' ? 200 : 600, 220, 'LOSER', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#ff4444',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    gameOverText = { overlay, winnerText, loserText };
  }
  
  // Restart button (default option)
  const restartText = sceneRef.add.text(400, 360, 'Press SPACE or ENTER to restart', {
    fontSize: '28px',
    fontFamily: 'Arial',
    color: '#00ff00',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(2001);
  
  // Menu button
  const menuText = sceneRef.add.text(400, 420, 'Back to Menu (ESC or M)', {
    fontSize: '22px',
    fontFamily: 'Arial',
    color: '#aaaaaa'
  }).setOrigin(0.5).setDepth(2001);
  
  gameOverText.restartText = restartText;
  gameOverText.menuText = menuText;
}

function showMenu() {
  if (!sceneRef) return;
  
  // Create menu background graphics with mage arena theme
  const menuBg = sceneRef.add.graphics();
  menuBg.setDepth(1500);
  
  // Dark purple background (mago theme)
  menuBg.fillStyle(0x1a0f2e, 1);
  menuBg.fillRect(0, 0, 800, 600);
  
  // Add space-themed stars
  menuBg.fillStyle(0xffee88, 0.5);
  const menuStars = [
    [40, 120], [120, 80], [200, 180], [280, 250], [350, 150],
    [80, 320], [180, 420], [300, 500], [250, 380], [150, 280],
    [60, 480], [320, 90], [230, 540],
    [440, 120], [520, 80], [600, 180], [680, 250], [750, 150],
    [480, 320], [580, 420], [700, 500], [650, 380], [550, 280],
    [460, 480], [720, 90], [630, 540]
  ];
  for (const [x, y] of menuStars) {
    const ps = 2;
    menuBg.fillRect(x, y - ps, ps, ps);
    menuBg.fillRect(x - ps, y, ps, ps);
    menuBg.fillRect(x, y, ps, ps);
    menuBg.fillRect(x + ps, y, ps, ps);
    menuBg.fillRect(x, y + ps, ps, ps);
  }
  
  // Add asteroids
  menuBg.fillStyle(0x8b7355, 0.4);
  const menuAsteroids = [
    [100, 200], [240, 350], [340, 480], [70, 440], [300, 140],
    [500, 200], [640, 350], [740, 480], [470, 440], [700, 140]
  ];
  for (const [ax, ay] of menuAsteroids) {
    menuBg.fillRect(ax, ay, 8, 8);
    menuBg.fillRect(ax + 8, ay + 4, 4, 4);
    menuBg.fillRect(ax - 4, ay + 4, 4, 4);
  }
  
  // Title
  const title = sceneRef.add.text(400, 140, 'Epic Battle', {
    fontSize: '72px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(1501);
  
  // Description
  const description = sceneRef.add.text(400, 200, 'Help the wizard defeat the skeletons in an epic battle', {
    fontSize: '18px',
    fontFamily: 'Arial',
    color: '#aaaaaa'
  }).setOrigin(0.5).setDepth(1501);
  
  // Single player option
  const singlePlayerText = sceneRef.add.text(400, 310, 'One Player', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(1501);
  
  // Two player option
  const twoPlayerText = sceneRef.add.text(400, 370, 'Two Players', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(1501);
  
  // Controls info - In PC
  const controlsTitle = sceneRef.add.text(400, 500, 'In PC:', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#888888'
  }).setOrigin(0.5).setDepth(1501);

  const controls2 = sceneRef.add.text(400, 545, 'P1: WASD + IJKL | P2: Arrows + TFGH', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#666666'
  }).setOrigin(0.5).setDepth(1501);
  
  menuUI = { menuBg, title, description, singlePlayerText, twoPlayerText, controlsTitle, controls2 };
  updateMenuSelection();
  
  // Start intro music
  playIntroMusic();
}

function updateMenuSelection() {
  if (!menuUI) return;
  
  // Update colors and scale based on selection
  if (menuSelection === 0) {
    menuUI.singlePlayerText.setColor('#00ff00');
    menuUI.singlePlayerText.setFontSize('40px');
    menuUI.twoPlayerText.setColor('#ffffff');
    menuUI.twoPlayerText.setFontSize('36px');
  } else {
    menuUI.singlePlayerText.setColor('#ffffff');
    menuUI.singlePlayerText.setFontSize('36px');
    menuUI.twoPlayerText.setColor('#00ff00');
    menuUI.twoPlayerText.setFontSize('40px');
  }
}

function startGame() {
  if (!sceneRef || gameState !== 'menu') return;
  
  // Start game music
  playGameMusic();
  
  // Hide menu
  if (menuUI) {
    if (menuUI.menuBg) menuUI.menuBg.destroy();
    if (menuUI.title) menuUI.title.destroy();
    if (menuUI.description) menuUI.description.destroy();
    if (menuUI.singlePlayerText) menuUI.singlePlayerText.destroy();
    if (menuUI.twoPlayerText) menuUI.twoPlayerText.destroy();
    if (menuUI.controlsTitle) menuUI.controlsTitle.destroy();
    if (menuUI.controls2) menuUI.controls2.destroy();
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
  p1.wildcardDirections = [];
  p2.wildcardDirections = [];
  p1.errorFlashUntil = 0;
  p2.errorFlashUntil = 0;
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = sceneRef.time.now + (5000 + Math.random() * 3000); // First spawn in 5-8s for single player
  // Initialize independent timers for two player mode
  nextPowerUpP1At = sceneRef.time.now + (5000 + Math.random() * 3000);
  nextPowerUpP2At = sceneRef.time.now + (5000 + Math.random() * 3000);
  
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
  bukP1 = null;
  bukP2 = null;
  nextBukP1At = 0;
  nextBukP2At = 0;
  awsP1 = null;
  awsP2 = null;
  nextAwsP1At = 0;
  nextAwsP2At = 0;
  walls = [];
  p1.hasShield = false;
  p2.hasShield = false;
  
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
  p1.wildcardDirections = [];
  p2.wildcardDirections = [];
  p1.errorFlashUntil = 0;
  p2.errorFlashUntil = 0;
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = sceneRef.time.now + (5000 + Math.random() * 3000); // First spawn in 5-8s for single player
  // Initialize independent timers for two player mode
  nextPowerUpP1At = sceneRef.time.now + (5000 + Math.random() * 3000);
  nextPowerUpP2At = sceneRef.time.now + (5000 + Math.random() * 3000);
  projL = [];
  projR = [];
  shieldP1 = null;
  shieldP2 = null;
  nextShieldP1At = 0;
  nextShieldP2At = 0;
  bukP1 = null;
  bukP2 = null;
  nextBukP1At = 0;
  nextBukP2At = 0;
  awsP1 = null;
  awsP2 = null;
  nextAwsP1At = 0;
  nextAwsP2At = 0;
  walls = [];
  p1.hasShield = false;
  p2.hasShield = false;
  
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
  bukP1 = null;
  bukP2 = null;
  nextBukP1At = 0;
  nextBukP2At = 0;
  awsP1 = null;
  awsP2 = null;
  nextAwsP1At = 0;
  nextAwsP2At = 0;
  walls = [];
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = 0;
  nextPowerUpP1At = 0;
  nextPowerUpP2At = 0;
  
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
  p1.hasShield = false;
  p2.hasShield = false;
  p1.wildcardDirections = [];
  p2.wildcardDirections = [];
  p1.errorFlashUntil = 0;
  p2.errorFlashUntil = 0;
  
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
  
  // Show menu (will start intro music)
  showMenu();
}

function getPlayerColor(player, now) {
  if (player.immuneUntil && now < player.immuneUntil) {
    return (Math.floor(now / 120) % 2 === 0) ? player.color : 0x666666;
  }
  return player.color;
}

function updateShieldP1(now) {
  // Count active power-ups for P1 only in two player mode
  const activePowerUpsP1 = (gameMode === 'twoPlayer') ? 
    [shieldP1, bukP1, awsP1].filter(p => p !== null).length :
    [shieldP1, shieldP2, bukP1, bukP2, awsP1, awsP2].filter(p => p !== null).length;
  
  // Use independent timer for two player mode, global for single player
  const spawnTimer = (gameMode === 'twoPlayer') ? nextPowerUpP1At : nextPowerUpSpawnAt;
  
  // schedule spawn if none
  if (!shieldP1 && !bukP1 && !awsP1) {
    // In two player mode, choose random power-up independently for P1
    if (gameMode === 'twoPlayer' && now >= spawnTimer) {
      const randomType = ['shield', 'buk', 'aws'][Math.floor(Math.random() * 3)];
      if (randomType === 'shield') {
        spawnShieldP1(now);
        nextPowerUpP1At = now + (5000 + Math.random() * 3000); // respawn in 5-8s
      } else if (randomType === 'buk') {
        spawnBukP1(now);
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else if (randomType === 'aws') {
        spawnAwsP1(now);
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      }
    } else if (gameMode === 'singlePlayer' && activePowerUpsP1 < 2 && now >= spawnTimer) {
      // Single player mode: use global system
      const randomType = ['shield', 'buk', 'aws'][Math.floor(Math.random() * 3)];
      if (randomType === 'shield') {
        spawnShieldP1(now);
        activePowerUpType = 'shield';
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
    }
  }
  // draw and check pickup
  if (shieldP1) {
    const timeAlive = now - shieldP1.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      shieldP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else if (activePowerUpsP1 <= 1) {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
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
    }

    // pickup check for P1 only
    if (distSq(p1.x, p1.y, shieldP1.x, shieldP1.y) <= (p1.size + 10) * (p1.size + 10)) {
      playPowerUpSound();
      p1.health = p1.maxHealth; // Fill health to 100%
      drawHealthBar(p1);
      shieldP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else if (activePowerUpsP1 <= 1) {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
    }
  }
}

function updateShieldP2(now) {
  // Count active power-ups for P2 only
  const activePowerUpsP2 = [shieldP2, bukP2, awsP2].filter(p => p !== null).length;
  
  // schedule spawn if none - only in two player mode
  if (!shieldP2 && !bukP2 && !awsP2 && gameMode === 'twoPlayer') {
    // Choose random power-up independently for P2
    if (now >= nextPowerUpP2At) {
      const randomType = ['shield', 'buk', 'aws'][Math.floor(Math.random() * 3)];
      if (randomType === 'shield') {
        spawnShieldP2(now);
        nextPowerUpP2At = now + (5000 + Math.random() * 3000); // respawn in 5-8s
      } else if (randomType === 'buk') {
        spawnBukP2(now);
        nextPowerUpP2At = now + (5000 + Math.random() * 3000);
      } else if (randomType === 'aws') {
        spawnAwsP2(now);
        nextPowerUpP2At = now + (5000 + Math.random() * 3000);
      }
    }
  }
  // draw and check pickup
  if (shieldP2) {
    const timeAlive = now - shieldP2.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      shieldP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
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
    }

    // pickup check for P2 only
    if (distSq(p2.x, p2.y, shieldP2.x, shieldP2.y) <= (p2.size + 10) * (p2.size + 10)) {
      playPowerUpSound();
      p2.health = p2.maxHealth; // Fill health to 100%
      drawHealthBar(p2);
      shieldP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
    }
  }
}

function updateBukP1(now) {
  // Draw and check pickup (spawn is handled in updateShieldP1)
  if (bukP1) {
    const timeAlive = now - bukP1.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      bukP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
      // Draw shadow for buk first
      drawShadow(g, bukP1.x, bukP1.y, 15);
      
      const ps = bukP1.ps;
      const w = BUK_LOGO[0].length * ps;
      const h = BUK_LOGO.length * ps;
      const sx = Math.floor(bukP1.x - w / 2);
      const sy = Math.floor(bukP1.y - h / 2);
      
      // Draw cyan ".buk" text
      g.fillStyle(0x2f4daa, 1);
      for (let r = 0; r < BUK_LOGO.length; r++) {
        for (let c = 0; c < BUK_LOGO[r].length; c++) {
          if (BUK_LOGO[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }

    // pickup check for P1 only
    if (distSq(p1.x, p1.y, bukP1.x, bukP1.y) <= (p1.size + 10) * (p1.size + 10)) {
      playPowerUpSound();
      p1.hasShield = true;
      bukP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
    }
  }
}

function updateBukP2(now) {
  // Draw and check pickup (spawn is handled in updateShieldP2)
  if (bukP2) {
    const timeAlive = now - bukP2.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      bukP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
      // Draw shadow for buk first
      drawShadow(g, bukP2.x, bukP2.y, 15);
      
      const ps = bukP2.ps;
      const w = BUK_LOGO[0].length * ps;
      const h = BUK_LOGO.length * ps;
      const sx = Math.floor(bukP2.x - w / 2);
      const sy = Math.floor(bukP2.y - h / 2);
      
      // Draw cyan ".buk" text
      g.fillStyle(0x2f4daa, 1);
      for (let r = 0; r < BUK_LOGO.length; r++) {
        for (let c = 0; c < BUK_LOGO[r].length; c++) {
          if (BUK_LOGO[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }

    // pickup check for P2 only
    if (distSq(p2.x, p2.y, bukP2.x, bukP2.y) <= (p2.size + 10) * (p2.size + 10)) {
      playPowerUpSound();
      p2.hasShield = true;
      bukP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
    }
  }
}

function spawnShieldP1(now) {
  const margin = 20;
  const halfX = 400;
  // Spawn in P1's half (left side)
  const x = margin + Math.random() * (halfX - margin * 2);
  // Spawn shield only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  shieldP1 = { x, y, ps: 5, spawnTime: now };
}

function spawnShieldP2(now) {
  const margin = 20;
  const halfX = 400;
  // Spawn in P2's half (right side)
  const x = halfX + margin + Math.random() * (halfX - margin * 2);
  // Spawn shield only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  shieldP2 = { x, y, ps: 5, spawnTime: now };
}

function spawnBukP1(now) {
  const margin = 20;
  const halfX = 400;
  // In single player mode, spawn across full screen; otherwise in P1's half
  let x, y;
  if (gameMode === 'singlePlayer') {
    x = margin + Math.random() * (800 - margin * 2);
  } else {
    x = margin + Math.random() * (halfX - margin * 2);
  }
  // Spawn buk only in playable area (below top UI section)
  y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  bukP1 = { x, y, ps: 4, spawnTime: now }; // ps: 4 for double size
}

function spawnBukP2(now) {
  const margin = 20;
  const halfX = 400;
  // Spawn in P2's half (right side)
  const x = halfX + margin + Math.random() * (halfX - margin * 2);
  // Spawn buk only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  bukP2 = { x, y, ps: 4, spawnTime: now }; // ps: 4 for double size
}

function updateAwsP1(now) {
  // Draw and check pickup (spawn is handled in updateShieldP1)
  if (awsP1) {
    const timeAlive = now - awsP1.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      awsP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
      // Draw shadow for AWS first
      drawShadow(g, awsP1.x, awsP1.y, 15);
      
      const ps = awsP1.ps;
      const w = AWS_LOGO[0].length * ps;
      const h = AWS_LOGO.length * ps;
      const sx = Math.floor(awsP1.x - w / 2);
      const sy = Math.floor(awsP1.y - h / 2);
      
      // Draw AWS logo in orange
      g.fillStyle(0xFF9900, 1);
      for (let r = 0; r < AWS_LOGO.length; r++) {
        for (let c = 0; c < AWS_LOGO[r].length; c++) {
          if (AWS_LOGO[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }

    // pickup check for P1 only
    if (distSq(p1.x, p1.y, awsP1.x, awsP1.y) <= (p1.size + 10) * (p1.size + 10)) {
      playPowerUpSound();
      // Create wall at AWS position (same size as player for visual consistency)
      const wallX = awsP1.x;
      const wallY = awsP1.y;
      
      walls.push({ 
        x: wallX, 
        y: wallY, 
        size: p1.size, // Use player size for scaling
        hits: 0 
      });
      
      awsP1 = null;
      // Reset timer based on game mode
      if (gameMode === 'twoPlayer') {
        nextPowerUpP1At = now + (5000 + Math.random() * 3000);
      } else {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + (5000 + Math.random() * 3000);
      }
    }
  }
}

function updateAwsP2(now) {
  // Draw and check pickup (spawn is handled in updateShieldP2)
  if (awsP2) {
    const timeAlive = now - awsP2.spawnTime;
    
    // Check if power-up has expired (5 seconds)
    if (timeAlive > 5000) {
      awsP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
      return;
    }

    // Blink effect in the last second (4000-5000ms)
    const shouldBlink = timeAlive > 4000 && Math.floor(now / 150) % 2 === 0;
    
    if (!shouldBlink) {
      // Draw shadow for AWS first
      drawShadow(g, awsP2.x, awsP2.y, 15);
      
      const ps = awsP2.ps;
      const w = AWS_LOGO[0].length * ps;
      const h = AWS_LOGO.length * ps;
      const sx = Math.floor(awsP2.x - w / 2);
      const sy = Math.floor(awsP2.y - h / 2);
      
      // Draw AWS logo in orange
      g.fillStyle(0xFF9900, 1);
      for (let r = 0; r < AWS_LOGO.length; r++) {
        for (let c = 0; c < AWS_LOGO[r].length; c++) {
          if (AWS_LOGO[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }

    // pickup check for P2 only
    if (distSq(p2.x, p2.y, awsP2.x, awsP2.y) <= (p2.size + 10) * (p2.size + 10)) {
      playPowerUpSound();
      // Create wall at AWS position (same size as player for visual consistency)
      const wallX = awsP2.x;
      const wallY = awsP2.y;
      
      walls.push({ 
        x: wallX, 
        y: wallY, 
        size: p2.size, // Use player size for scaling
        hits: 0 
      });
      
      awsP2 = null;
      nextPowerUpP2At = now + (5000 + Math.random() * 3000);
    }
  }
}

function spawnAwsP1(now) {
  const margin = 20;
  const halfX = 400;
  // In single player mode, spawn across full screen; otherwise in P1's half
  let x, y;
  if (gameMode === 'singlePlayer') {
    x = margin + Math.random() * (800 - margin * 2);
  } else {
    x = margin + Math.random() * (halfX - margin * 2);
  }
  // Spawn AWS only in playable area (below top UI section)
  y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  awsP1 = { x, y, ps: 3, spawnTime: now }; // ps: 3 for smaller size
}

function spawnAwsP2(now) {
  const margin = 20;
  const halfX = 400;
  // Spawn in P2's half (right side)
  const x = halfX + margin + Math.random() * (halfX - margin * 2);
  // Spawn AWS only in playable area (below top UI section)
  const y = TOP_UI_HEIGHT + margin + Math.random() * (600 - TOP_UI_HEIGHT - margin * 2);
  awsP2 = { x, y, ps: 3, spawnTime: now }; // ps: 3 for smaller size
}

function drawWalls() {
  // Draw all active walls using pixel mask (2x7 pixels, smaller size)
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const cols = WALL_MASK[0].length; // 2
    const rows = WALL_MASK.length; // 7
    
    // Smaller wall size (reduced from wall.size * 2 to wall.size * 1)
    const ps = Math.max(2, Math.floor(wall.size / cols));
    const w = cols * ps;
    const h = rows * ps;
    const sx = Math.floor(wall.x - w / 2);
    const sy = Math.floor(wall.y - h / 2);
    
    // Draw wall using mask with AWS orange color
    g.fillStyle(0xFF9900, 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (WALL_MASK[r][c]) {
          g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }
  }
}

function grantImmunity(player, ms, now) {
  if (player.immuneUntil && now < player.immuneUntil) player.immuneUntil += ms;
  else player.immuneUntil = now + ms;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
