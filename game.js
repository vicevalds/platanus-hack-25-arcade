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
// Power-ups: [P1, P2] - each element is {shield, buk, aws, nextAt}
let pUps = [{shield:null,buk:null,aws:null,nextAt:0},{shield:null,buk:null,aws:null,nextAt:0}];
let walls = []; // active walls (each wall has x, y, width, height, hits)
let timerGfx; // pixel timer display
let stars = []; // background stars
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let activePowerUpType = null; // Current active power-up type: 'shield', 'buk', 'aws', or null
let nextPowerUpSpawnAt = 0; // Global power-up spawn timer
let gameOverText = null; // game over message text
let sceneRef = null; // reference to the scene
let menuUI = null; // menu UI elements
let gameStartTime = 0; // timestamp when game started
let currentRound = 1; // current round number
let previousRound = 1; // previous round number (to detect changes)
let roundChangeTime = 0; // timestamp when round changed (for animation)
let gameMode = 'twoPlayer'; // 'singlePlayer' or 'twoPlayer'
let menuSelection = 0; // 0 = single player, 1 = two player
let gameOverSelection = 0; // 0 = restart, 1 = back to menu
let lbState = null;
const NAME_CHARS = 'abcdefghijklmnñopqrstuvwxyz';
let nameEntry = null;
let pName = '';
let pScore = 0;

// Test mode: set to true to complete patterns with just the first symbol
const testMode = false;

// Audio variables
let audioContext;
let introMusicLoop = null;
let gameMusicLoop = null;
let currentMusic = null;
let musicTimeouts = []; // Array to store all music timeouts (intro, battle, victory)

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
  [0,0,1,0,1,1,0,0,0,0,0,1,1,0,1,1,1],
  [0,1,1,1,0,1,1,0,1,0,1,1,0,1,1,0,0],
  [0,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,0],
  [1,1,1,1,1,0,1,1,1,1,1,0,0,0,0,1,1],
  [1,1,0,1,1,0,0,1,0,1,0,0,0,1,1,1,0]
];
// Unified banana pixel art (single version)
const BANANA_Y = [
  [0,0,0,0,1,1,1],
  [0,0,0,1,1,1,1],
  [0,0,1,0,1,0,1],
  [0,1,0,0,1,0,1],
  [1,0,0,1,0,0,1],
  [0,0,1,0,0,1,0]
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
  ],
  'X': [
    [1,0,1],
    [0,1,0],
    [0,1,0],
    [0,1,0],
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
  // Resume audio context if suspended (required by browsers after user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playTone(freq, duration, type = 'square', volume = 0.15) {
  if (!audioContext) initAudio();
  
  // Don't play if audio context is suspended (will cause accumulation of notes)
  if (audioContext.state === 'suspended') {
    return;
  }
  
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

function playSuccessSound(combo = 0) {
  if (!audioContext) initAudio();
  
  // Special glorious sound for combo x8
  if (combo >= 8) {
    // Glorious fanfare: 5 notes for maximum epicness
    // C5, E5, G5, C6, E6 (extended arpeggio)
    const gloriousFreqs = [523, 659, 784, 1047, 1568]; // C5, E5, G5, C6, E6
    const volume = 0.15 * 1.3; // High volume for combo x8
    
    // Play extended arpeggio with slightly longer durations for grandeur
    playTone(gloriousFreqs[0], 0.1, 'square', volume); // C5
    setTimeout(() => playTone(gloriousFreqs[1], 0.1, 'square', volume), 60); // E5
    setTimeout(() => playTone(gloriousFreqs[2], 0.12, 'square', volume), 120); // G5
    setTimeout(() => playTone(gloriousFreqs[3], 0.14, 'square', volume), 180); // C6 (high note for glory)
    setTimeout(() => playTone(gloriousFreqs[4], 0.16, 'square', volume), 250); // E6 (highest note for maximum epicness)
    return;
  }
  
  // Normal success sound for combos < 8
  // Base frequencies: C5, E5, G5
  const baseFreqs = [523, 659, 784]; // C5, E5, G5
  
  // Calculate pitch shift: each combo increases by a whole tone (2 semitones, up to one octave = 6 whole tones)
  const wholeTones = Math.min(combo - 1, 6); // Cap at one octave (combo 1 = base, combo 2 = +1 tone, etc.)
  const semitones = wholeTones * 2; // Convert whole tones to semitones
  const multiplier = Math.pow(2, semitones / 12); // Exponential frequency multiplier
  
  // Calculate volume based on combo
  let volume;
  if (combo <= 2) {
    volume = 0.8;
  } else if (combo <= 5) {
    volume = 1.0;
  } else {
    volume = 1.3;
  }
  
  // Apply volume multiplier to base volume (0.15)
  const finalVolume = 0.15 * volume;
  
  // Ascending arpeggio with pitch shift
  playTone(baseFreqs[0] * multiplier, 0.08, 'square', finalVolume); // C5 + shift
  setTimeout(() => playTone(baseFreqs[1] * multiplier, 0.08, 'square', finalVolume), 80); // E5 + shift
  setTimeout(() => playTone(baseFreqs[2] * multiplier, 0.15, 'square', finalVolume), 160); // G5 + shift
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

function playButtonPressSound() {
  if (!audioContext) initAudio();
  
  // Short, satisfying beep for button press (higher pitched, quick)
  playTone(880, 0.05, 'square', 0.12);
}

function playIntroMusic() {
  if (!audioContext) initAudio();
  stopMusic();
  
  // Ensure audio context is running before playing music
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      // Start music after context is resumed
      startIntroMusicLoop();
    });
  } else {
    startIntroMusicLoop();
  }
}

function startIntroMusicLoop() {
  // Don't start if audio context is suspended
  if (!audioContext || audioContext.state === 'suspended') {
    return;
  }
  
  // Battle atmosphere music - intense and dark
  // Bass rhythm (war drums)
  const bassPattern = [
    { freq: 80, dur: 0.1, vol: 0.12 }, // Deep bass
    { freq: 0, dur: 0.15 }, // Rest
    { freq: 80, dur: 0.1, vol: 0.12 },
    { freq: 0, dur: 0.15 },
    { freq: 100, dur: 0.1, vol: 0.15 }, // Slightly higher
    { freq: 0, dur: 0.15 },
    { freq: 80, dur: 0.1, vol: 0.12 },
    { freq: 0, dur: 0.2 }
  ];
  
  // Dark melody (minor scale, tense)
  const melody = [
    { freq: 220, dur: 0.2, vol: 0.06 }, // A3
    { freq: 247, dur: 0.2, vol: 0.06 }, // B3
    { freq: 262, dur: 0.3, vol: 0.07 }, // C4
    { freq: 294, dur: 0.2, vol: 0.06 }, // D4
    { freq: 262, dur: 0.2, vol: 0.06 }, // C4
    { freq: 220, dur: 0.3, vol: 0.07 }, // A3
    { freq: 196, dur: 0.2, vol: 0.06 }, // G3
    { freq: 220, dur: 0.4, vol: 0.08 }  // A3 (longer)
  ];
  
  // High tension layer (sparse, dramatic)
  const tensionLayer = [
    { freq: 0, dur: 0.4 },
    { freq: 330, dur: 0.15, vol: 0.05 }, // E4
    { freq: 0, dur: 0.3 },
    { freq: 392, dur: 0.2, vol: 0.06 }, // G4
    { freq: 0, dur: 0.5 },
    { freq: 330, dur: 0.15, vol: 0.05 },
    { freq: 0, dur: 0.3 },
    { freq: 294, dur: 0.25, vol: 0.06 } // D4
  ];
  
  let time = 0;
  const loopDuration = 2.4 * 1000; // 2.4 seconds loop
  
  const playBattleMusic = () => {
    // Only play if context is running
    if (!audioContext || audioContext.state !== 'running') {
      return;
    }
    time = 0;
    
    // Play bass rhythm
    bassPattern.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === introMusicLoop && audioContext && audioContext.state === 'running') {
          if (note.freq > 0) {
            playTone(note.freq, note.dur, 'sawtooth', note.vol || 0.12);
          }
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
    
    // Play melody (offset slightly)
    time = 0.1;
    melody.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === introMusicLoop && audioContext && audioContext.state === 'running') {
          playTone(note.freq, note.dur, 'square', note.vol || 0.06);
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
    
    // Play tension layer
    time = 0;
    tensionLayer.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === introMusicLoop && audioContext && audioContext.state === 'running') {
          if (note.freq > 0) {
            playTone(note.freq, note.dur, 'triangle', note.vol || 0.05);
          }
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
  };
  
  playBattleMusic();
  introMusicLoop = setInterval(playBattleMusic, loopDuration + 100);
  currentMusic = introMusicLoop;
}

function playGameMusic() {
  if (!audioContext) initAudio();
  stopMusic();
  
  // Epic battle music - cleaner, more space, balanced volume
  // Spaced bass rhythm (war drums)
  const bassDrum = [
    { freq: 90, dur: 0.12, vol: 0.08 },
    { freq: 0, dur: 0.2 },
    { freq: 90, dur: 0.12, vol: 0.08 },
    { freq: 0, dur: 0.15 },
    { freq: 110, dur: 0.12, vol: 0.09 },
    { freq: 0, dur: 0.2 },
    { freq: 90, dur: 0.12, vol: 0.08 },
    { freq: 0, dur: 0.25 }
  ];
  
  // Continuous flowing melody (epic combat theme)
  const mainMelody = [
    { freq: 440, dur: 0.15, vol: 0.07 }, // A4
    { freq: 494, dur: 0.15, vol: 0.07 }, // B4
    { freq: 523, dur: 0.18, vol: 0.075 },  // C5
    { freq: 587, dur: 0.15, vol: 0.07 }, // D5
    { freq: 659, dur: 0.18, vol: 0.075 },  // E5
    { freq: 587, dur: 0.15, vol: 0.07 }, // D5
    { freq: 523, dur: 0.15, vol: 0.07 }, // C5
    { freq: 494, dur: 0.15, vol: 0.07 }, // B4
    { freq: 440, dur: 0.18, vol: 0.075 },  // A4
    { freq: 392, dur: 0.15, vol: 0.07 }, // G4
    { freq: 440, dur: 0.18, vol: 0.075 },  // A4
    { freq: 494, dur: 0.15, vol: 0.07 }, // B4
    { freq: 523, dur: 0.2, vol: 0.08 }   // C5 (longer)
  ];
  
  // Subtle rhythm layer (sparse, supportive)
  const rhythmLayer = [
    { freq: 220, dur: 0.2, vol: 0.06 }, // A3
    { freq: 0, dur: 0.3 },
    { freq: 262, dur: 0.2, vol: 0.06 }, // C4
    { freq: 0, dur: 0.3 },
    { freq: 294, dur: 0.2, vol: 0.06 }, // D4
    { freq: 0, dur: 0.3 },
    { freq: 262, dur: 0.2, vol: 0.06 }, // C4
    { freq: 0, dur: 0.2 }
  ];
  
  let time = 0;
  const loopDuration = 2.4 * 1000; // Slower 2.4 second loop for more space
  
  const playEpicBattle = () => {
    if (!audioContext || audioContext.state !== 'running') {
      return;
    }
    time = 0;
    
    // Play bass drum (foundation - spaced out)
    bassDrum.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === gameMusicLoop && audioContext && audioContext.state === 'running') {
          if (note.freq > 0) {
            playTone(note.freq, note.dur, 'sine', note.vol || 0.08);
          }
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
    
    // Play main melody (continuous, flowing)
    time = 0.1;
    mainMelody.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === gameMusicLoop && audioContext && audioContext.state === 'running') {
          playTone(note.freq, note.dur, 'triangle', note.vol || 0.06);
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
    
    // Play rhythm layer (sparse, supportive)
    time = 0.15;
    rhythmLayer.forEach(note => {
      const timeoutId = setTimeout(() => {
        if (currentMusic === gameMusicLoop && audioContext && audioContext.state === 'running') {
          if (note.freq > 0) {
            playTone(note.freq, note.dur, 'sine', note.vol || 0.05);
          }
        }
      }, time * 1000);
      musicTimeouts.push(timeoutId);
      time += note.dur;
    });
  };
  
  playEpicBattle();
  gameMusicLoop = setInterval(playEpicBattle, loopDuration + 100);
  currentMusic = gameMusicLoop;
}

function playVictoryMusic() {
  if (!audioContext) initAudio();
  stopMusic();
  
  // Tragic catastrophic game over theme (sad, descending minor scale)
  // Deep bass foundation (catastrophic)
  const bassLayer = [
    { freq: 65, dur: 0.4, vol: 0.12 }, // C2 (very low)
    { freq: 0, dur: 0.1 },
    { freq: 65, dur: 0.4, vol: 0.12 },
    { freq: 0, dur: 0.1 },
    { freq: 58, dur: 0.5, vol: 0.14 }, // A#1 (even lower)
    { freq: 0, dur: 0.2 },
    { freq: 55, dur: 0.6, vol: 0.15 }  // G#1 (lowest, sustained)
  ];
  
  // Main tragic melody (descending minor scale)
  const melody = [
    { freq: 330, dur: 0.3, vol: 0.08 }, // E4
    { freq: 294, dur: 0.3, vol: 0.08 }, // D4
    { freq: 262, dur: 0.4, vol: 0.09 }, // C4
    { freq: 233, dur: 0.3, vol: 0.08 }, // A#3
    { freq: 220, dur: 0.4, vol: 0.09 }, // A3
    { freq: 196, dur: 0.3, vol: 0.08 }, // G3
    { freq: 175, dur: 0.5, vol: 0.1 },  // F3 (longer, more tragic)
    { freq: 165, dur: 0.6, vol: 0.11 }  // E3 (final, sustained, very sad)
  ];
  
  // High tension layer (sparse, dramatic)
  const tensionLayer = [
    { freq: 0, dur: 0.5 },
    { freq: 392, dur: 0.25, vol: 0.06 }, // G4
    { freq: 0, dur: 0.3 },
    { freq: 330, dur: 0.3, vol: 0.07 }, // E4
    { freq: 0, dur: 0.4 },
    { freq: 294, dur: 0.4, vol: 0.08 }, // D4
    { freq: 0, dur: 0.3 },
    { freq: 262, dur: 0.5, vol: 0.09 }  // C4 (final, sustained)
  ];
  
  let time = 0;
  
  // Play bass layer (foundation)
  bassLayer.forEach(note => {
    const timeoutId = setTimeout(() => {
      if (currentMusic === 'victory' && audioContext && audioContext.state === 'running') {
        if (note.freq > 0) {
          playTone(note.freq, note.dur, 'sawtooth', note.vol || 0.12);
        }
      }
    }, time * 1000);
    musicTimeouts.push(timeoutId);
    time += note.dur;
  });
  
  // Play main melody (tragic descent)
  time = 0.2;
  melody.forEach(note => {
    const timeoutId = setTimeout(() => {
      if (currentMusic === 'victory' && audioContext && audioContext.state === 'running') {
        playTone(note.freq, note.dur, 'triangle', note.vol || 0.08);
      }
    }, time * 1000);
    musicTimeouts.push(timeoutId);
    time += note.dur;
  });
  
  // Play tension layer (dramatic accents)
  time = 0.1;
  tensionLayer.forEach(note => {
    const timeoutId = setTimeout(() => {
      if (currentMusic === 'victory' && audioContext && audioContext.state === 'running') {
        if (note.freq > 0) {
          playTone(note.freq, note.dur, 'sine', note.vol || 0.06);
        }
      }
    }, time * 1000);
    musicTimeouts.push(timeoutId);
    time += note.dur;
  });
  
  // Game over music doesn't loop, it's a one-time tragic theme
  currentMusic = 'victory';
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
  // Clear all music timeouts (intro, battle, victory)
  musicTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  musicTimeouts = [];
  
  currentMusic = null;
}

function getLB() {
  try {
    const s = localStorage.getItem('ebLB');
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}

function saveLB(s) {
  try { localStorage.setItem('ebLB', JSON.stringify(s)); } catch (e) {}
}

function addLB(n, sc) {
  let s = getLB();
  s.push({ name: n.substring(0, 4).toUpperCase(), score: sc });
  s.sort((a, b) => b.score - a.score);
  saveLB(s.slice(0, 10));
}

function isTop10(sc) {
  const s = getLB();
  return s.length < 10 || sc > s[9].score;
}

function showName(sc) {
  if (!sceneRef) return;
  lbState = 'enteringName';
  nameEntry = {
    letters: ['a', 'a', 'a', 'a'],
    index: 0
  };
  pName = nameEntry.letters.join('');
  pScore = sc;
  const g = gameOverText;
  if (g) Object.values(g).forEach(v => v?.setVisible?.(false));
  const t = (x, y, txt, sz, cl) => sceneRef.add.text(x, y, txt, { fontSize: sz, fontFamily: 'Arial', color: cl, fontWeight: 'bold' }).setOrigin(0.5).setDepth(2101);
  const letterTexts = [];
  const startX = 400 - 120;
  for (let i = 0; i < 4; i++) {
    letterTexts.push(sceneRef.add.text(startX + i * 80, 360, 'A', {
      fontSize: '64px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2101));
  }
  const selectionRect = sceneRef.add.rectangle(letterTexts[0].x, letterTexts[0].y, 72, 86, 0x00ff00, 0.15)
    .setStrokeStyle(2, 0x00ff00)
    .setOrigin(0.5)
    .setDepth(2100);
  gameOverText.nameInputUI = {
    inputOverlay: sceneRef.add.rectangle(400, 300, 800, 600, 0x000000, 0.9).setDepth(2100),
    inputTitle: t(400, 200, 'NEW HIGH SCORE!', '48px', '#00ff00'),
    inputScore: t(400, 260, 'Score: ' + sc, '32px', '#ffffff'),
    inputLabel: t(400, 320, 'Set Name (4 chars):', '24px', '#aaaaaa'),
    letters: letterTexts,
    selectionRect,
    inputHint: t(400, 480, 'Stick Up/Down: change letter, Stick left/right: move to letter, Start: save & exit', '20px', '#888888')
  };
  updName();
}

function updName() {
  if (!nameEntry) return;
  const ui = gameOverText?.nameInputUI;
  if (!ui) return;
  const letters = ui.letters || [];
  nameEntry.letters.forEach((ch, idx) => {
    const target = letters[idx];
    if (target) {
      target.setText(ch);
      target.setStyle({ color: idx === nameEntry.index ? '#00ff00' : '#ffffff' });
    }
  });
  if (ui.selectionRect && letters[nameEntry.index]) {
    ui.selectionRect.setPosition(letters[nameEntry.index].x, letters[nameEntry.index].y);
  }
  pName = nameEntry.letters.join('');
}

function changeNameLetter(delta) {
  if (!nameEntry) return false;
  const chars = NAME_CHARS;
  const idx = nameEntry.index;
  const current = nameEntry.letters[idx] || chars[0];
  let pos = chars.indexOf(current);
  if (pos === -1) pos = 0;
  pos = ((pos + delta) % chars.length + chars.length) % chars.length;
  const nextChar = chars.charAt(pos);
  if (nextChar !== current) {
    nameEntry.letters[idx] = nextChar;
    return true;
  }
  return false;
}

function moveNameCursor(delta) {
  if (!nameEntry) return false;
  const len = nameEntry.letters.length;
  if (len === 0) return false;
  nameEntry.index = ((nameEntry.index + delta) % len + len) % len;
  return true;
}

function confirmNameLetter() {
  if (!nameEntry) return false;
  const len = nameEntry.letters.length;
  if (len === 0) return false;
  nameEntry.index = nameEntry.index === len - 1 ? 0 : nameEntry.index + 1;
  return true;
}

function finalizeNameEntry() {
  if (!nameEntry) return;
  const finalName = (nameEntry.letters.join('').trim() || 'ANON').substring(0, 4).toUpperCase();
  addLB(finalName, pScore);
  hideName();
  returnToMenu();
}

function hName(arcadeCode, rawKey) {
  if (lbState !== 'enteringName' || !nameEntry) return false;

  let handled = false;

  const handleArcade = (code) => {
    switch (code) {
      case 'P1U':
      case 'P2U':
        handled = changeNameLetter(1) || handled;
        break;
      case 'P1D':
      case 'P2D':
        handled = changeNameLetter(-1) || handled;
        break;
      case 'P1L':
      case 'P2L':
        handled = moveNameCursor(-1) || handled;
        break;
      case 'P1R':
      case 'P2R':
        handled = moveNameCursor(1) || handled;
        break;
      case 'P1A':
      case 'P2A':
        handled = confirmNameLetter() || handled;
        break;
      case 'START1':
      case 'START2':
        finalizeNameEntry();
        handled = true;
        break;
      default:
        break;
    }
  };

  if (arcadeCode) {
    handleArcade(arcadeCode);
  } else if (rawKey) {
    switch (rawKey) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        handled = changeNameLetter(1) || handled;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handled = changeNameLetter(-1) || handled;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        handled = moveNameCursor(-1) || handled;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        handled = moveNameCursor(1) || handled;
        break;
      case ' ':
      case 'Space':
        handled = confirmNameLetter() || handled;
        break;
      case 'Enter':
        finalizeNameEntry();
        handled = true;
        break;
      default:
        break;
    }
  }

  if (handled && nameEntry) {
    updName();
  }

  return handled;
}

function hideName() {
  const ui = gameOverText?.nameInputUI;
  if (!ui) return;
  if (ui.letters) {
    ui.letters.forEach(l => l?.destroy?.());
  }
  if (ui.selectionRect) ui.selectionRect.destroy();
  if (ui.inputOverlay) ui.inputOverlay.destroy();
  if (ui.inputTitle) ui.inputTitle.destroy();
  if (ui.inputScore) ui.inputScore.destroy();
  if (ui.inputLabel) ui.inputLabel.destroy();
  if (ui.inputHint) ui.inputHint.destroy();
  gameOverText.nameInputUI = null;
  lbState = null;
  nameEntry = null;
  const g = gameOverText;
  if (g) Object.values(g).forEach(v => v?.setVisible?.(true));
}

function setMenuVis(v) {
  if (!menuUI) return;
  Object.values(menuUI).forEach(u => u?.setVisible?.(v));
}

function showLB() {
  if (!sceneRef) return;
  lbState = 'showing';
  const s = getLB();
  if (gameState === 'menu') setMenuVis(false);
  const t = (x, y, txt, sz, cl) => sceneRef.add.text(x, y, txt, { fontSize: sz, fontFamily: 'Arial', color: cl, fontWeight: 'bold' }).setOrigin(0.5).setDepth(2101);
  const items = [];
  for (let i = 0; i < 10; i++) {
    const txt = i < s.length ? `${(i+1).toString().padStart(2,'0')}. ${s[i].name.padEnd(4,' ')}  ${s[i].score.toString().padStart(6,'0')}` : `${(i+1).toString().padStart(2,'0')}. ---- 0000`;
    items.push(t(400, 200 + i * 35, txt, '24px', i < s.length ? '#ffffff' : '#666666'));
  }
  if (!gameOverText) gameOverText = {};
  gameOverText.leaderboardUI = {
    lbOverlay: sceneRef.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(2100),
    lbTitle: t(400, 120, 'LEADERBOARD', '48px', '#E8AE32'),
    lbItems: items,
    lbHint: t(400, 560, 'Press ENTER to continue', '20px', '#888888')
  };
}

function hideLB() {
  const ui = gameOverText?.leaderboardUI;
  if (!ui) return;
  if (ui.lbItems) ui.lbItems.forEach(i => i.destroy());
  [ui.lbOverlay, ui.lbTitle, ui.lbHint].forEach(v => v?.destroy());
  gameOverText.leaderboardUI = null;
  lbState = null;
  if (gameState === 'menu') {
    setMenuVis(true);
    if (gameOverText && !gameOverText.overlay && !gameOverText.gameOverTitle) gameOverText = null;
  }
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
    // Resume audio context on first user interaction (required by browsers)
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        // If we're in menu and music hasn't started, start it now
        if (gameState === 'menu' && !introMusicLoop) {
          playIntroMusic();
        }
      });
    }
    
    const arcadeCode = KEYBOARD_TO_ARCADE[ev.key];
    
    // Set arcade button state
    if (arcadeCode) {
      arcadeButtons[arcadeCode] = true;
    }
    
    if (gameState === 'menu') {
      if (lbState === 'showing') {
        if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
          hideLB();
          return;
        }
      } else {
        if (arcadeCode === 'P1U' || arcadeCode === 'P2U') {
          menuSelection = (menuSelection - 1 + 3) % 3;
          updateMenuSelection();
          return;
        }
        if (arcadeCode === 'P1D' || arcadeCode === 'P2D') {
          menuSelection = (menuSelection + 1) % 3;
          updateMenuSelection();
          return;
        }
        if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
          if (menuSelection === 0) {
            gameMode = 'singlePlayer';
            startGame();
          } else if (menuSelection === 1) {
            gameMode = 'twoPlayer';
            startGame();
          } else {
            showLB();
          }
          return;
        }
      }
    } else if (gameState === 'gameOver') {
      if (lbState === 'enteringName') {
        if (hName(arcadeCode, ev.key)) return;
      } else if (lbState === 'showing') {
        if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
          hideLB();
          return;
        }
      }
      // Normal game over menu
      else {
        // Navigate menu with Up/Down
        if (arcadeCode === 'P1U' || arcadeCode === 'P2U') {
          gameOverSelection = (gameOverSelection - 1 + 2) % 2;
          updateGameOverSelection();
          return;
        }
        if (arcadeCode === 'P1D' || arcadeCode === 'P2D') {
          gameOverSelection = (gameOverSelection + 1) % 2;
          updateGameOverSelection();
          return;
        }
        // Select option with START buttons or Enter
        if (arcadeCode === 'START1' || arcadeCode === 'START2' || ev.key === 'Enter') {
          if (gameOverSelection === 0) {
            restartGame();
          } else {
            returnToMenu();
          }
          return;
        }
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
    // Also animate score texts (slightly less pulsation)
    const scoreScale = 1 + Math.sin(_time / 200) * 0.05;
    if (gameOverText.winnerScoreText) gameOverText.winnerScoreText.setScale(scoreScale);
    if (gameOverText.loserScoreText) gameOverText.loserScoreText.setScale(scoreScale);
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
    // Calculate current round based on elapsed time (6 seconds per round)
    const elapsedSeconds = (_time - gameStartTime) / 1000;
    currentRound = Math.floor(elapsedSeconds / 6) + 1;
    
    // Detect round change for animation
    if (currentRound !== previousRound) {
      previousRound = currentRound;
      roundChangeTime = _time;
      // Play a special sound for round change
      playTone(1047, 0.1, 'square', 0.15); // High C
      setTimeout(() => playTone(1047, 0.1, 'square', 0.15), 100);
    }
    
    // Base health drain rate increases by 0.4 per round (faster progression)
    const baseHealthDrainRate = 20; // health per second (starting rate)
    const healthDrainRate = baseHealthDrainRate + (currentRound - 1) * 1.3; // +0.4 per round
    
    // Base multiplier is 1.0, when moving reduce by 0.2 (0.8 total)
    // When idle, multiplier is 1.8x base speed
    const baseMultiplier = 1.0;
    const p1DrainMultiplier = p1IsMoving ? baseMultiplier - 0.1 : baseMultiplier * 1.8;
    const p2DrainMultiplier = p2IsMoving ? baseMultiplier - 0.1 : baseMultiplier * 1.8;
    
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

  // Power-ups (on arena layer) - one per player (only when playing)
  if (gameState === 'playing') {
    updatePowerUps(0, _time);
    if (gameMode === 'twoPlayer') {
      updatePowerUps(1, _time);
    }
  }

  // timer
  drawTimer(_time);

  // Draw walls on player layer (above map, but players drawn after so they appear in front)
  drawWalls();

  // players as pixel people (with immunity blink) - drawn on player layer (above UI)
  // P1 (mago): piel, azul, café
  const p1Color = getPlayerColor(p1, _time);
  const p1IsImmune = (p1.immuneUntil && _time < p1.immuneUntil);
  const whitePhase = Math.floor(_time / 120) % 2 === 0;
  const p1UseWhite = p1IsImmune && whitePhase;
  const p1HeadColor = p1UseWhite ? 0xffffff : 0xffdbac; // piel u original
  const p1BodyColor = p1UseWhite ? 0xffffff : 0x0066ff; // azul u original
  const p1LegsColor = p1UseWhite ? 0xffffff : 0x8b5a2b; // café u original
  drawPixelPerson(gPlayers, p1.x, p1.y, p1.size, p1Color, PERSON_MASK_P1_HEAD, PERSON_MASK_P1_BODY, PERSON_MASK_P1_LEGS, p1HeadColor, p1BodyColor, p1LegsColor);
  
  // Draw shield around P1 if active
  if (p1.hasShield) {
    drawShield(gPlayers, p1.x, p1.y, p1.size);
  }
  
  // P2: colores personalizados con cuerpo amarillo (only in two player mode)
  if (gameMode === 'twoPlayer') {
    const p2Color = getPlayerColor(p2, _time);
    const p2IsImmune = (p2.immuneUntil && _time < p2.immuneUntil);
    const p2UseWhite = p2IsImmune && whitePhase;
    const p2HeadColor = p2UseWhite ? 0xffffff : 0xf0f0f0; // blanco original
    const p2BodyColor = p2UseWhite ? 0xffffff : 0x8b5a2b; // cuerpo original
    const p2LegsColor = p2UseWhite ? 0xffffff : 0x888888; // piernas originales
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
    
    // Update and draw score popups
    updateScorePopups(p1, dt, _time);
    drawScorePopups(p1);
    updateHealthPopups(p1, dt, _time);
    drawHealthPopups(p1);
    drawCombo(p1);
    if (gameMode === 'twoPlayer') {
      updateScorePopups(p2, dt, _time);
      drawScorePopups(p2);
      updateHealthPopups(p2, dt, _time);
      drawHealthPopups(p2);
      drawCombo(p2);
    }
  } else {
    // Hide health bars, patterns, and scores when game is not playing
    p1.healthGfx.clear();
    p2.healthGfx.clear();
    p1.patternGfx.clear();
    p2.patternGfx.clear();
    p1.scoreGfx.clear();
    p2.scoreGfx.clear();
    if (p1.scorePopupGfx) p1.scorePopupGfx.clear();
    if (p2.scorePopupGfx) p2.scorePopupGfx.clear();
    if (p1.healthPopupGfx) p1.healthPopupGfx.clear();
    if (p2.healthPopupGfx) p2.healthPopupGfx.clear();
    if (p1.comboGfx) p1.comboGfx.clear();
    if (p2.comboGfx) p2.comboGfx.clear();
  }
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
  
  // Base size: 5 pixels (single player increased by 0.5 from 4 to 5)
  let basePs = 5; // Base size for both modes
  let color = 0xffff66; // Default yellow
  
  // In two player mode only, check if this player is winning
  if (gameMode === 'twoPlayer' && gameState === 'playing') {
    const p1Score = p1.score || 0;
    const p2Score = p2.score || 0;
    
    // Check if this player is winning (has more points)
    if (player === p1 && p1Score > p2Score) {
      basePs = Math.floor(5 * 1.3); // 1.3x larger (6.5 -> 6 pixels)
      color = 0xffff00; // Bright yellow
    } else if (player === p2 && p2Score > p1Score) {
      basePs = Math.floor(5 * 1.3); // 1.3x larger (6.5 -> 6 pixels)
      color = 0xffff00; // Bright yellow
    } else {
      // Not winning: normal size and white color
      basePs = 5; // Normal size (larger in two player mode)
      color = 0xffffff; // White
    }
  }
  
  const ps = basePs;
  const gap = 2;
  const digitW = 3 * ps;
  const totalW = text.length * digitW + (text.length - 1) * gap;
  let x = player.scoreAlignRight ? (player.scoreAnchor.x - totalW) : player.scoreAnchor.x;
  const y = player.scoreAnchor.y;
  gfx.fillStyle(color, 1);
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

function drawCombo(player) {
  const gfx = player.comboGfx;
  gfx.clear();
  
  // Only show combo if > 0
  if (!player.combo || player.combo === 0 || gameState !== 'playing') return;
  
  const comboText = 'X' + String(player.combo);
  
  // Dynamic size based on combo level
  // In single player mode: sizes are 0.5 larger (1 pixel more)
  // In two player mode: make combo indicator larger (1 pixel more than single player)
  // Combos x1-x2: 3px (single) / 4px (two), x3-x4: 4px/5px, x5-x6: 5px/6px, x7-x8: 6px/7px
  let ps;
  if (player.combo <= 2) {
    ps = (gameMode === 'singlePlayer') ? 3 : 4; // Combos x1-x2: 3 píxeles (single) / 4 píxeles (two, larger)
  } else if (player.combo <= 4) {
    ps = (gameMode === 'singlePlayer') ? 4 : 5; // Combos x3-x4: 4 píxeles (single) / 5 píxeles (two, larger)
  } else if (player.combo <= 6) {
    ps = (gameMode === 'singlePlayer') ? 5 : 6; // Combos x5-x6: 5 píxeles (single) / 6 píxeles (two, larger)
  } else {
    ps = (gameMode === 'singlePlayer') ? 6 : 7; // Combo x7-x8: 6 píxeles (single) / 7 píxeles (two, larger)
  }
  
  const gap = 1;
  const digitW = 3 * ps;
  const totalW = comboText.length * digitW + (comboText.length - 1) * gap;
  let x = player.scoreAlignRight ? (player.comboAnchor.x - totalW) : player.comboAnchor.x;
  const y = player.comboAnchor.y;
  
  // Color based on combo level
  let color = 0x00ff00; // Green for low combos
  if (player.combo >= 6) {
    color = 0xff00ff; // Magenta for high combos
  } else if (player.combo >= 3) {
    color = 0x00ffff; // Cyan for medium combos
  }
  
  gfx.fillStyle(color, 1);
  for (let i = 0; i < comboText.length; i++) {
    const char = comboText[i];
    const d = DIGITS[char];
    if (!d) continue;
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
  
  // Check if round just changed (animate for 1 second)
  const timeSinceRoundChange = now - roundChangeTime;
  const isRoundChanging = timeSinceRoundChange < 1000;
  
  // Animation effects
  let roundScale = 1;
  let roundColor = 0xffaa00;
  let roundAlpha = 1;
  
  if (isRoundChanging) {
    // Pulse effect: scale up then down
    const progress = timeSinceRoundChange / 1000;
    if (progress < 0.3) {
      // Scale up quickly
      roundScale = 1 + (progress / 0.3) * 0.8; // 1.0 -> 1.8
    } else if (progress < 0.6) {
      // Scale down
      roundScale = 1.8 - ((progress - 0.3) / 0.3) * 0.5; // 1.8 -> 1.3
    } else {
      // Final scale down to normal
      roundScale = 1.3 - ((progress - 0.6) / 0.4) * 0.3; // 1.3 -> 1.0
    }
    // Flash effect: alternate between orange and yellow
    roundColor = (Math.floor(now / 100) % 2 === 0) ? 0xffaa00 : 0xffff00;
  }
  
  // In single player mode, draw in top right corner
  if (gameMode === 'singlePlayer') {
    // Draw round number
    const roundText = 'R' + String(currentRound);
    const roundX = 720; // Right aligned position
    const roundY = 15;
    
    // Calculate width to align right
    const basePs = 4;
    const ps = Math.floor(basePs * roundScale);
    let totalW = 0;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      totalW += d[0].length * ps + 2; // ps scaled, gap=2
    }
    
    timerGfx.fillStyle(roundColor, roundAlpha);
    let x = roundX - totalW;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) timerGfx.fillRect(x + c * ps, roundY + r * ps, ps, ps);
        }
      }
      x += d[0].length * ps + 2;
    }
    
    // Draw countdown timer below round
    const elapsed = (now - gameStartTime) / 1000;
    const timeInRound = elapsed % 6;
    const countdown = Math.max(0, Math.floor(6 - timeInRound));
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
    // Two player mode: draw centered with animation
    const roundText = 'R' + String(currentRound);
    const basePs = 4;
    const ps = Math.floor(basePs * roundScale);
    
    // Draw round number with animation
    timerGfx.fillStyle(roundColor, roundAlpha);
    
    // Calculate total width
    let totalW = 0;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      totalW += d[0].length * ps;
      if (i < roundText.length - 1) totalW += 2;
    }
    
    let x = Math.floor(400 - totalW / 2);
    const y = 10;
    for (let i = 0; i < roundText.length; i++) {
      const d = DIGITS[roundText[i]];
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) timerGfx.fillRect(x + c * ps, y + r * ps, ps, ps);
        }
      }
      x += d[0].length * ps + 2;
    }
    
    // Draw countdown timer
    const elapsed = (now - gameStartTime) / 1000;
    const timeInRound = elapsed % 6;
    const countdown = Math.max(0, Math.floor(6 - timeInRound));
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
  player.patternErrors = 0; // Track errors in current pattern
  player.scorePopups = []; // Array of active score popups {amount, x, y, life, maxLife}
  player.healthPopups = []; // Array of active health popups {percent, x, y, life, maxLife}
  player.pendingScore = 0; // Points accumulated during current pattern (not yet added to total)
  player.combo = 0; // Combo counter
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
  player.scorePopupGfx = scene.add.graphics();
  player.scorePopupGfx.setDepth(60); // Above score
  player.healthPopupGfx = scene.add.graphics();
  player.healthPopupGfx.setDepth(60); // Above health bar
  player.comboGfx = scene.add.graphics();
  player.comboGfx.setDepth(50); // Same depth as score
  
  // Set score position (will be updated in positionUI for single player)
  player.scoreAnchor = { x: side === 'L' ? 20 : 780, y: 65 }; // Moved down to y: 65 to avoid health bar
  player.scoreAlignRight = side === 'R';
  player.comboAnchor = { x: side === 'L' ? 20 : 780, y: 105 }; // Below score (more spacing)
  
  // fixed positions at the top of each half
  positionUI(player);
  refreshPatternTexts(player);
}

function makePattern() {
  let len;
  const round = currentRound;
  const rand = Math.random();
  
  if (round <= 2) {
    // Rondas 1-10: 80% de 3 símbolos, 20% de 4 símbolos
    if (rand < 0.50) {
      len = 2;// ACA
    } else {
      len = 3;
    }
  } else if (round <= 8) {
    // Rondas 1-10: 80% de 3 símbolos, 20% de 4 símbolos
    if (rand < 0.80) {
      len = 3;// ACA
    } else {
      len = 4;
    }
  } else if (round <= 18) {
    // Rondas 11-20: 70% de 4, 30% de 5
    if (rand < 0.70) {
      len = 4;
    } else {
      len = 5;
    }
  } else if (round <= 27) {
    // Rondas 21-27: 40% de 4, 40% de 5, 20% de 6
    if (rand < 0.40) {
      len = 4;
    } else if (rand < 0.80) {
      len = 5;
    } else {
      len = 6;
    }
  } else if (round <= 35) {
    // Rondas 28-35: 40% de 5, 50% de 6, 10% de 7 (ajustado para sumar 100%)
    if (rand < 0.40) {
      len = 5;
    } else if (rand < 0.90) {
      len = 6;
    } else {
      len = 7;
    }
  } else {
    // Rondas 36+: 70% de 6, 30% de 7
    if (rand < 0.70) {
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
    
    // Play button press sound for correct input
    playButtonPressSound();
    
    // Accumulate 10 points for each correct symbol (not added to total yet)
    player.pendingScore += 10;
    // NO mostrar popup aquí - solo al completar el patrón
    player.progress++;
    
    // Test mode: complete pattern immediately on first correct input
    if (testMode && player.progress === 1) {
      player.progress = player.pattern.length;
    }
    
    if (player.progress >= player.pattern.length) {
      // Pattern completed! Add all pending points to total score
      let totalEarned = player.pendingScore;
      
      // Check if pattern was completed without errors
      if (player.patternErrors === 0) {
        totalEarned += 10; // Bonus for perfect completion
      }
      
      // Calculate combo multiplier based on current combo
      // Only apply multiplier if pattern completed without errors
      let comboMultiplier = 1.0;
      if (player.patternErrors === 0 && player.combo > 0) {
        const combo = player.combo;
        if (combo >= 8) {
          comboMultiplier = 2.0; // x8+: 2.0x
        } else if (combo === 7) {
          comboMultiplier = 1.7; // x7: 1.7x
        } else if (combo === 6) {
          comboMultiplier = 1.6; // x6: 1.6x
        } else if (combo === 5) {
          comboMultiplier = 1.5; // x5: 1.5x
        } else if (combo === 4) {
          comboMultiplier = 1.4; // x4: 1.4x
        } else if (combo === 3) {
          comboMultiplier = 1.2; // x3: 1.2x
        } else if (combo === 2) {
          comboMultiplier = 1.1; // x2: 1.1x
        } else {
          comboMultiplier = 1.0; // x1: 1.0x
        }
      }
      
      // Apply multiplier to points earned
      totalEarned = Math.round(totalEarned * comboMultiplier);
      
      // Add all earned points to total score
      player.score += totalEarned;
      
      // Show popup with total earned points (after multiplier)
      showScorePopup(player, totalEarned, sceneRef.time.now);
      
      // Increment combo if pattern completed without errors
      if (player.patternErrors === 0) {
        player.combo++;
      } else {
        player.combo = 0; // Reset combo if there were errors
      }
      
      // Play success sound with combo
      playSuccessSound(player.combo);
      
      // Recover health when completing pattern (capped at max health)
      // Health recovery percentage based on combo level
      let healthRecoveryPercent = 0.4; // Default: 40% for combo x1
      if (player.combo >= 8) {
        healthRecoveryPercent = 0.70; // x8+: 70%
      } else if (player.combo === 7) {
        healthRecoveryPercent = 0.65; // x7: 65%
      } else if (player.combo === 6) {
        healthRecoveryPercent = 0.60; // x6: 60%
      } else if (player.combo === 5) {
        healthRecoveryPercent = 0.55; // x5: 55%
      } else if (player.combo === 4) {
        healthRecoveryPercent = 0.50; // x4: 50%
      } else if (player.combo === 3) {
        healthRecoveryPercent = 0.45; // x3: 45%
      } else if (player.combo === 2) {
        healthRecoveryPercent = 0.40; // x2: 40%
      } else {
        healthRecoveryPercent = 0.40; // x1: 40%
      }
      
      const healthRecovery = player.maxHealth * healthRecoveryPercent;
      player.health = Math.min(player.maxHealth, player.health + healthRecovery);
      
      // Show health recovery popup
      showHealthPopup(player, Math.round(healthRecoveryPercent * 100), sceneRef.time.now);
      const completed = player.pattern.slice();
      // spawn attacks on opponent half
      // In single player mode, spawn projectiles targeting the same player
      const targetSide = (gameMode === 'singlePlayer') ? 'L' : (player === p1 ? 'R' : 'L');
      spawnAttackPattern(targetSide, completed, player);
      player.pattern = makePattern();
      player.progress = 0;
      player.wildcardDirections = []; // Reset wildcard directions
      player.patternErrors = 0; // Reset error count for new pattern
      player.pendingScore = 0; // Reset pending score for new pattern
    }
  } else {
    // Play error sound on mistake
    playErrorSound();
    // Set error flash timestamp (flash for 400ms)
    player.errorFlashUntil = sceneRef.time.now + 400;
    // Subtract 10 points for mistake (from total score)
    player.score = Math.max(0, player.score - 10);
    showScorePopup(player, -10, sceneRef.time.now);
    player.patternErrors++; // Track error
    player.combo = 0; // Reset combo on mistake
    player.progress = 0;
    player.wildcardDirections = []; // Reset on mistake
    player.pendingScore = 0; // Lose all pending points on mistake
  }
  refreshPatternTexts(player);
  drawScore(player);
  drawCombo(player);
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
    // Also adjust the score position for single player
    player.scoreAnchor = { x: 20, y: 65 }; // Moved down to avoid health bar
    player.comboAnchor = { x: 20, y: 105 }; // Below score (more spacing)
    player.scoreAlignRight = false;
  } else {
    // Move health bar and pattern more toward center to avoid overlap with high scores and long patterns
    centerX = player.side === 'L' ? 240 : 560; // Moved toward center (was 200/600)
    // In two player mode: score at same height as health bar (healthY), combo below score
    player.scoreAnchor = { x: player.side === 'L' ? 20 : 780, y: healthY }; // Same height as health bar
    player.comboAnchor = { x: player.side === 'L' ? 20 : 780, y: 95 }; // Below score counter (moved down from 65)
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
    drawCombo(player);
  }
}

function showScorePopup(player, amount, now) {
  if (!player.scorePopups) player.scorePopups = [];
  
  // Create popup at score position
  // In two player mode: position below score counter to avoid overlap
  let x = player.scoreAnchor.x + (player.scoreAlignRight ? -40 : 80);
  let y = player.scoreAnchor.y;
  
  if (gameMode === 'twoPlayer') {
    // Position below score counter (score is at y: 35, place popup at y: 70)
    y = player.scoreAnchor.y + 35; // Below score counter
  }
  
  player.scorePopups.push({
    amount: amount,
    x: x,
    y: y,
    startY: y,
    life: 0,
    maxLife: 1000 // 1 second
  });
}

function updateScorePopups(player, dt, now) {
  if (!player.scorePopups) return;
  
  // Update and remove expired popups
  for (let i = player.scorePopups.length - 1; i >= 0; i--) {
    const popup = player.scorePopups[i];
    popup.life += dt * 1000; // Convert to ms
    
    // Remove if expired
    if (popup.life >= popup.maxLife) {
      player.scorePopups.splice(i, 1);
    }
  }
}

function drawScorePopups(player) {
  if (!player.scorePopups || !player.scorePopupGfx) return;
  
  const gfx = player.scorePopupGfx;
  gfx.clear();
  
  for (const popup of player.scorePopups) {
    // Calculate alpha based on life (fade out)
    const progress = popup.life / popup.maxLife;
    const alpha = 1 - progress;
    
    // Move popup upward
    const offsetY = -progress * 30; // Move up 30 pixels
    const currentY = popup.startY + offsetY;
    
    // Color: green for positive, red for negative
    const color = popup.amount >= 0 ? 0x00ff00 : 0xff0000;
    
    // Format text (with + or -)
    const text = (popup.amount >= 0 ? '+' : '') + String(popup.amount);
    
    // Draw using pixel digits (smaller size)
    const ps = 3; // pixel size (smaller than score)
    const gap = 1;
    
    gfx.fillStyle(color, alpha);
    
    let x = popup.x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let d;
      
      // Handle special characters
      if (char === '+') {
        // Simple plus: 3x3
        d = [
          [0,1,0],
          [1,1,1],
          [0,1,0]
        ];
      } else if (char === '-') {
        // Simple minus: 3x1
        d = [
          [0,0,0],
          [1,1,1],
          [0,0,0]
        ];
      } else {
        d = DIGITS[char];
      }
      
      if (!d) continue;
      
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) gfx.fillRect(x + c * ps, currentY + r * ps, ps, ps);
        }
      }
      x += d[0].length * ps + gap;
    }
  }
}

function showHealthPopup(player, percent, now) {
  if (!player.healthPopups) player.healthPopups = [];
  
  // Create popup position
  const barWidth = 250; // Same as in drawHealthBar
  let x, y;
  
  if (gameMode === 'twoPlayer') {
    // In two player mode: position below health bar and to the left of patterns
    // Health bar is at y: 35, place popup below it (y: 60)
    // Pattern anchor is at centerX (240 or 560), place popup to the left
    const healthY = player.healthAnchor ? player.healthAnchor.y : 35;
    const patternX = player.patternAnchor ? player.patternAnchor.x : (player.side === 'L' ? 240 : 560);
    y = healthY + 25; // Below health bar (health bar height ~22, add some spacing)
    x = patternX - 80; // To the left of patterns
  } else {
    // Single player mode: to the right of health bar (original behavior)
    const offsetX = 10; // Space between bar and popup
    x = player.healthAnchor ? (player.healthAnchor.x + barWidth / 2 + offsetX) : (player.side === 'L' ? 200 + barWidth / 2 + offsetX : 600 + barWidth / 2 + offsetX);
    y = player.healthAnchor ? player.healthAnchor.y : 35;
  }
  
  player.healthPopups.push({
    percent: percent,
    x: x,
    y: y,
    startY: y,
    life: 0,
    maxLife: 1000 // 1 second
  });
}

function updateHealthPopups(player, dt, now) {
  if (!player.healthPopups) return;
  
  // Update and remove expired popups
  for (let i = player.healthPopups.length - 1; i >= 0; i--) {
    const popup = player.healthPopups[i];
    popup.life += dt * 1000; // Convert to ms
    
    // Remove if expired
    if (popup.life >= popup.maxLife) {
      player.healthPopups.splice(i, 1);
    }
  }
}

function drawHealthPopups(player) {
  if (!player.healthPopups || !player.healthPopupGfx) return;
  
  const gfx = player.healthPopupGfx;
  gfx.clear();
  
  for (const popup of player.healthPopups) {
    // Calculate alpha based on life (fade out)
    const progress = popup.life / popup.maxLife;
    const alpha = 1 - progress;
    
    // Move popup upward
    const offsetY = -progress * 30; // Move up 30 pixels
    const currentY = popup.startY + offsetY;
    
    // Color: green for health recovery
    const color = 0x00ff00;
    
    // Format text (with + and %)
    const text = '+' + String(popup.percent) + '%';
    
    // Draw using pixel digits (smaller size)
    const ps = 3; // pixel size (smaller than score)
    const gap = 1;
    
    gfx.fillStyle(color, alpha);
    
    let x = popup.x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let d;
      
      // Handle special characters
      if (char === '+') {
        // Simple plus: 3x3
        d = [
          [0,1,0],
          [1,1,1],
          [0,1,0]
        ];
      } else if (char === '%') {
        // Percent symbol: 3x5
        d = [
          [1,0,1],
          [0,0,1],
          [0,1,0],
          [1,0,0],
          [1,0,1]
        ];
      } else {
        d = DIGITS[char];
      }
      
      if (!d) continue;
      
      for (let r = 0; r < d.length; r++) {
        for (let c = 0; c < d[r].length; c++) {
          if (d[r][c]) gfx.fillRect(x + c * ps, currentY + r * ps, ps, ps);
        }
      }
      x += d[0].length * ps + gap;
    }
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
  
  // Progressive damage multiplier: increases every 5 rounds
  // Rounds 1-4: 1.0x, Rounds 5-9: 1.1x, Rounds 10-14: 1.2x, etc.
  const difficultyTier = Math.floor((currentRound - 1) / 5); // 0, 1, 2, 3... every 5 rounds
  const roundMultiplier = 1.0 + difficultyTier * 0.1; // +10% every 5 rounds
  const baseDamage = 22.5; // base damage per hit
  const finalDamage = dmg * baseDamage * roundMultiplier;
  
  // Subtract 5 points for taking damage
  player.score = Math.max(0, player.score - 5);
  showScorePopup(player, -5, now);
  
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
  
  // Clear all power-ups when game ends
  pUps[0].shield = pUps[0].buk = pUps[0].aws = null;
  pUps[1].shield = pUps[1].buk = pUps[1].aws = null;
  
  // Play victory music
  playVictoryMusic();
  
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
    
    if (isTop10(p1.score || 0)) {
      showName(p1.score || 0);
    }
  } else {
    // Two player mode: Winner/Loser messages
    const winnerX = winner.side === 'L' ? 200 : 600;
    const loserX = loser.side === 'L' ? 200 : 600;
    
    winnerText = sceneRef.add.text(winnerX, 200, 'WINNER', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#00ff00',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    // Winner score below WINNER text
    const winnerScoreText = sceneRef.add.text(winnerX, 260, 'Score: ' + (winner.score || 0), {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#88ff88',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    loserText = sceneRef.add.text(loserX, 200, 'LOSER', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#ff4444',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    // Loser score below LOSER text
    const loserScoreText = sceneRef.add.text(loserX, 260, 'Score: ' + (loser.score || 0), {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ff8888',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(2001);
    
    gameOverText = { overlay, winnerText, loserText, winnerScoreText, loserScoreText };
  }
  
  // Restart option (default)
  const restartText = sceneRef.add.text(400, 360, 'Restart', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(2001);
  
  // Back to menu option
  const menuText = sceneRef.add.text(400, 420, 'Back to Menu', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(2001);
  
  gameOverText.restartText = restartText;
  gameOverText.menuText = menuText;
  
  // Initialize selection to restart (default)
  gameOverSelection = 0;
  updateGameOverSelection();
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
    color: '#E8AE32',
    fontWeight: 'bold'
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
  
  const lbText = sceneRef.add.text(400, 430, 'Leaderboard', {
    fontSize: '36px',
    fontFamily: 'Arial',
    color: '#ffffff',
    fontWeight: 'bold'
  }).setOrigin(0.5).setDepth(1501);
  
  menuUI = { menuBg, title, singlePlayerText, twoPlayerText, leaderboardText: lbText };
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
    if (menuUI.leaderboardText) {
      menuUI.leaderboardText.setColor('#ffffff');
      menuUI.leaderboardText.setFontSize('36px');
    }
  } else if (menuSelection === 1) {
    menuUI.singlePlayerText.setColor('#ffffff');
    menuUI.singlePlayerText.setFontSize('36px');
    menuUI.twoPlayerText.setColor('#00ff00');
    menuUI.twoPlayerText.setFontSize('40px');
    if (menuUI.leaderboardText) {
      menuUI.leaderboardText.setColor('#ffffff');
      menuUI.leaderboardText.setFontSize('36px');
    }
  } else {
    menuUI.singlePlayerText.setColor('#ffffff');
    menuUI.singlePlayerText.setFontSize('36px');
    menuUI.twoPlayerText.setColor('#ffffff');
    menuUI.twoPlayerText.setFontSize('36px');
    if (menuUI.leaderboardText) {
      menuUI.leaderboardText.setColor('#00ff00');
      menuUI.leaderboardText.setFontSize('40px');
    }
  }
}

function updateGameOverSelection() {
  if (!gameOverText || !gameOverText.restartText || !gameOverText.menuText) return;
  
  // Update colors and scale based on selection
  if (gameOverSelection === 0) {
    gameOverText.restartText.setColor('#00ff00');
    gameOverText.restartText.setFontSize('40px');
    gameOverText.menuText.setColor('#ffffff');
    gameOverText.menuText.setFontSize('36px');
  } else {
    gameOverText.restartText.setColor('#ffffff');
    gameOverText.restartText.setFontSize('36px');
    gameOverText.menuText.setColor('#00ff00');
    gameOverText.menuText.setFontSize('40px');
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
    if (menuUI.singlePlayerText) menuUI.singlePlayerText.destroy();
    if (menuUI.twoPlayerText) menuUI.twoPlayerText.destroy();
    if (menuUI.leaderboardText) menuUI.leaderboardText.destroy();
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
  previousRound = 1; // Reset previous round
  roundChangeTime = 0; // Reset round change time
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
  p1.patternErrors = 0;
  p2.patternErrors = 0;
  p1.scorePopups = [];
  p2.scorePopups = [];
  p1.healthPopups = [];
  p2.healthPopups = [];
  p1.pendingScore = 0;
  p2.pendingScore = 0;
  p1.combo = 0;
  p2.combo = 0;
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = sceneRef.time.now + getPowerUpSpawnTime(); // First spawn time based on current round
  // Initialize independent timers for two player mode
  pUps[0].nextAt = sceneRef.time.now + getPowerUpSpawnTime();
  pUps[1].nextAt = sceneRef.time.now + getPowerUpSpawnTime();
  
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
  pUps[0] = {shield:null,buk:null,aws:null,nextAt:sceneRef.time.now + getPowerUpSpawnTime()};
  pUps[1] = {shield:null,buk:null,aws:null,nextAt:sceneRef.time.now + getPowerUpSpawnTime()};
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
    if (gameOverText.winnerScoreText) gameOverText.winnerScoreText.destroy();
    if (gameOverText.loserScoreText) gameOverText.loserScoreText.destroy();
    if (gameOverText.restartText) gameOverText.restartText.destroy();
    if (gameOverText.menuText) gameOverText.menuText.destroy();
    if (gameOverText.nameInputUI) hideName();
    if (gameOverText.leaderboardUI) hideLB();
    gameOverText = null;
  }
  lbState = null;
  
  // Start game music
  playGameMusic();
  
  // Change state to 'playing' to start the game immediately
  gameState = 'playing';
  gameStartTime = sceneRef.time.now; // Reset timer
  currentRound = 1; // Reset round
  previousRound = 1; // Reset previous round
  roundChangeTime = 0; // Reset round change time
  
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
  p1.patternErrors = 0;
  p2.patternErrors = 0;
  p1.scorePopups = [];
  p2.scorePopups = [];
  p1.healthPopups = [];
  p2.healthPopups = [];
  p1.pendingScore = 0;
  p2.pendingScore = 0;
  p1.combo = 0;
  p2.combo = 0;
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = sceneRef.time.now + getPowerUpSpawnTime(); // First spawn time based on current round
  // Initialize independent timers for two player mode
  pUps[0].nextAt = sceneRef.time.now + getPowerUpSpawnTime();
  pUps[1].nextAt = sceneRef.time.now + getPowerUpSpawnTime();
  projL = [];
  projR = [];
  pUps[0] = {shield:null,buk:null,aws:null,nextAt:sceneRef.time.now + getPowerUpSpawnTime()};
  pUps[1] = {shield:null,buk:null,aws:null,nextAt:sceneRef.time.now + getPowerUpSpawnTime()};
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
    if (gameOverText.winnerScoreText) gameOverText.winnerScoreText.destroy();
    if (gameOverText.loserScoreText) gameOverText.loserScoreText.destroy();
    if (gameOverText.restartText) gameOverText.restartText.destroy();
    if (gameOverText.menuText) gameOverText.menuText.destroy();
    if (gameOverText.nameInputUI) hideName();
    if (gameOverText.leaderboardUI) hideLB();
    gameOverText = null;
  }
  lbState = null;
  
  // Reset game state FIRST before showing menu
  gameState = 'menu';
  menuSelection = 0; // Reset to single player
  
  // Clear all projectiles
  projL = [];
  projR = [];
  pUps[0] = {shield:null,buk:null,aws:null,nextAt:0};
  pUps[1] = {shield:null,buk:null,aws:null,nextAt:0};
  walls = [];
  
  // Reset power-up system
  activePowerUpType = null;
  nextPowerUpSpawnAt = 0;
  
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
  p1.patternErrors = 0;
  p2.patternErrors = 0;
  p1.scorePopups = [];
  p2.scorePopups = [];
  p1.healthPopups = [];
  p2.healthPopups = [];
  p1.pendingScore = 0;
  p2.pendingScore = 0;
  
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
    return (Math.floor(now / 120) % 2 === 0) ? 0xffffff : player.color;
  }
  return player.color;
}

function getPowerUpSpawnTime() {
  // Base spawn time: 5-8 seconds
  // Decrease spawn time as rounds increase (more frequent power-ups)
  const baseMin = 5000; // 5 seconds
  const baseMax = 8000; // 8 seconds
  const baseRange = baseMax - baseMin; // 3000ms
  
  // Reduce spawn time by 5% per round (minimum 50% of original time)
  const reductionFactor = Math.max(0.5, 1 - (currentRound - 1) * 0.05);
  
  const minTime = baseMin * reductionFactor;
  const maxTime = baseMax * reductionFactor;
  const range = maxTime - minTime;
  
  return minTime + Math.random() * range;
}

// Unified power-up functions (playerIdx: 0=P1, 1=P2)
function spawnPowerUp(playerIdx, type, now) {
  const m = 20, hX = 400, ps = type === 'shield' ? 5 : type === 'buk' ? 4 : 3;
  const p = playerIdx === 0 ? p1 : p2;
  let x;
  if (gameMode === 'singlePlayer' && playerIdx === 0 && type !== 'shield') {
    x = m + Math.random() * (800 - m * 2);
  } else {
    const left = playerIdx === 0 ? m : hX + m;
    const right = playerIdx === 0 ? hX - m : 800 - m;
    x = left + Math.random() * (right - left);
  }
  const y = TOP_UI_HEIGHT + m + Math.random() * (600 - TOP_UI_HEIGHT - m * 2);
  pUps[playerIdx][type] = { x, y, ps, spawnTime: now };
}

function updatePowerUp(playerIdx, type, now) {
  const pu = pUps[playerIdx][type];
  if (!pu) return;
  const p = playerIdx === 0 ? p1 : p2;
  const t = now - pu.spawnTime;
  if (t > 5000) {
    pUps[playerIdx][type] = null;
    if (gameMode === 'twoPlayer') {
      pUps[playerIdx].nextAt = now + getPowerUpSpawnTime();
    } else if (playerIdx === 0) {
      let a = 0;
      for (let i = 0; i < 2; i++) {
        if (pUps[i].shield) a++;
        if (pUps[i].buk) a++;
        if (pUps[i].aws) a++;
      }
      if (a <= 1) {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + getPowerUpSpawnTime();
      }
    }
    return;
  }
  const blink = t > 4000 && Math.floor(now / 150) % 2 === 0;
  if (!blink) {
    drawShadow(g, pu.x, pu.y, 15);
    const ps = pu.ps;
    let mask, color;
    if (type === 'shield') {
      mask = BANANA_Y;
      color = 0xffe066;
    } else if (type === 'buk') {
      mask = BUK_LOGO;
      color = 0x2f4daa;
    } else if (type === 'aws') {
      mask = AWS_LOGO;
      color = 0xFF9900;
    }
    if (mask) {
      const w = mask[0].length * ps, h = mask.length * ps;
      const sx = Math.floor(pu.x - w / 2), sy = Math.floor(pu.y - h / 2);
      g.fillStyle(color, 1);
      for (let r = 0; r < mask.length; r++) {
        for (let c = 0; c < mask[r].length; c++) {
          if (mask[r][c]) g.fillRect(sx + c * ps, sy + r * ps, ps, ps);
        }
      }
    }
  }
  if (distSq(p.x, p.y, pu.x, pu.y) <= (p.size + 10) * (p.size + 10)) {
    playPowerUpSound();
    if (type === 'shield') {
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.8);
    } else if (type === 'buk') {
      p.hasShield = true;
    } else if (type === 'aws') {
      walls.push({ x: pu.x, y: pu.y, size: p.size, hits: 0 });
    }
    p.score += 20;
    showScorePopup(p, 20, now);
    drawHealthBar(p);
    drawScore(p);
    pUps[playerIdx][type] = null;
    if (gameMode === 'twoPlayer') {
      pUps[playerIdx].nextAt = now + getPowerUpSpawnTime();
    } else if (playerIdx === 0) {
      let a = 0;
      for (let i = 0; i < 2; i++) {
        if (pUps[i].shield) a++;
        if (pUps[i].buk) a++;
        if (pUps[i].aws) a++;
      }
      if (a <= 1) {
        activePowerUpType = null;
        nextPowerUpSpawnAt = now + getPowerUpSpawnTime();
      }
    }
  }
}

function updatePowerUps(playerIdx, now) {
  const pu = pUps[playerIdx];
  const active = [pu.shield, pu.buk, pu.aws].filter(x => x !== null).length;
  const timer = gameMode === 'twoPlayer' ? pu.nextAt : nextPowerUpSpawnAt;
  if (active === 0) {
    if ((gameMode === 'twoPlayer' && now >= timer) || 
        (gameMode === 'singlePlayer' && playerIdx === 0 && active < 2 && now >= timer)) {
      const types = ['shield', 'buk', 'aws'];
      const t = types[Math.floor(Math.random() * 3)];
      spawnPowerUp(playerIdx, t, now);
      if (gameMode === 'twoPlayer') {
        pu.nextAt = now + getPowerUpSpawnTime();
      } else {
        activePowerUpType = t;
        nextPowerUpSpawnAt = now + getPowerUpSpawnTime();
      }
    }
  }
  updatePowerUp(playerIdx, 'shield', now);
  updatePowerUp(playerIdx, 'buk', now);
  updatePowerUp(playerIdx, 'aws', now);
}

function drawWalls() {
  // Draw all active walls with brick pattern (2x7 pixels, maintaining exact size)
  // Draw on player layer so walls appear above map but players can pass behind
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const cols = WALL_MASK[0].length; // 2
    const rows = WALL_MASK.length; // 7
    
    // Calculate pixel size maintaining exact wall dimensions
    const ps = Math.max(2, Math.floor(wall.size / cols));
    const w = cols * ps;
    const h = rows * ps;
    const sx = Math.floor(wall.x - w / 2);
    const sy = Math.floor(wall.y - h / 2);
    
    // Draw brick pattern: orange bricks with black mortar lines
    // All lines are drawn within the exact wall dimensions
    const brickOrange = 0xFF9900;
    const mortarBlack = 0x000000;
    
    // First, fill entire wall with orange bricks
    gPlayers.fillStyle(brickOrange, 1);
    gPlayers.fillRect(sx, sy, w, h);
    
    // Then draw black mortar lines within the wall area
    gPlayers.fillStyle(mortarBlack, 1);
    
    // Horizontal mortar lines between brick rows (thin lines)
    const mortarThickness = Math.max(1, Math.floor(ps * 0.15)); // 15% of pixel size, min 1px
    for (let r = 1; r < rows; r++) {
      const mortarY = sy + r * ps - Math.floor(mortarThickness / 2);
      gPlayers.fillRect(sx, mortarY, w, mortarThickness);
    }
    
    // Vertical mortar line in the middle (separating left and right bricks)
    const midX = sx + Math.floor(w / 2);
    gPlayers.fillRect(midX - Math.floor(mortarThickness / 2), sy, mortarThickness, h);
    
    // Vertical edges (thin black outline)
    gPlayers.fillRect(sx, sy, mortarThickness, h); // Left edge
    gPlayers.fillRect(sx + w - mortarThickness, sy, mortarThickness, h); // Right edge
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
