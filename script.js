// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get DOM elements
const scoreDisplay = document.getElementById('score');
const gameOverDisplay = document.getElementById('game-over');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const startMessage = document.getElementById('start-message');
// Leaderboard elements
const leaderboardList = document.getElementById('leaderboard-list');
const nameInputArea = document.getElementById('name-input-area');
const playerNameInput = document.getElementById('player-name');
const submitScoreButton = document.getElementById('submit-score-button');


// --- Game Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
// Ship Constants
const SHIP_WIDTH = 45;
const SHIP_HEIGHT = 25;
const SHIP_START_X = 150;
const SHIP_START_Y = CANVAS_HEIGHT / 2 - SHIP_HEIGHT / 2;
// Physics Constants
const GRAVITY_PER_SECOND = 900;
const FLAP_VELOCITY = -280;
// Obstacle Constants
const OBSTACLE_WIDTH = 80;
const OBSTACLE_GAP = 120;
const OBSTACLE_COLOR = '#8b4513';
const OBSTACLE_SPEED_PER_SECOND = 180;
const OBSTACLE_SPAWN_INTERVAL_MS = 2000;
// Background Constants
const STAR_COUNT = 100;
const STAR_BASE_SPEED_PER_SECOND = 30;
// Leaderboard Constants
const LEADERBOARD_KEY = 'flappyShipLeaderboard';
const LEADERBOARD_MAX_ENTRIES = 10;
// Coin Constants
const COIN_RADIUS = 15;
const COIN_COLOR = '#ffd700';
const COIN_SCORE = 5;
const COIN_SPAWN_CHANCE = 0.7;
// *** Gnome Constants ***
const GNOME_WIDTH = 30; // Slightly wider for rounded look
const GNOME_HEIGHT = 45; // Slightly taller
const GNOME_COLOR_BODY = '#228B22'; // ForestGreen
const GNOME_COLOR_HAT = '#DC143C'; // Crimson Red
const GNOME_COLOR_BEARD = '#FFFFFF'; // White
const GNOME_SPEED_PER_SECOND = 210;
const GNOME_SPAWN_INTERVAL_MIN_MS = 4000;
const GNOME_SPAWN_INTERVAL_RANGE_MS = 5000;
const GNOME_VERTICAL_AMP = 25; // How much gnome moves up/down
const GNOME_VERTICAL_FREQ = 0.01; // How fast gnome moves up/down relative to x pos

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let shipY;
let shipVelocityY;
let obstacles;
let coins;
let gnomes;
let score;
let obstacleSpawnTimer;
let gnomeSpawnTimer;
let gameRunning;
let gameStarted;
let animationFrameId;
let stars;
let currentHighScore = false;
let lastTime = 0;
let audioStarted = false;
let musicLoop;

// --- Spaceship Object ---
const ship = {
    x: SHIP_START_X,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    bodyColor1: '#e0e0e0',
    bodyColor2: '#a0a0a0',
    windowColor: '#70d0ff',
    flameColor1: '#ffcc00',
    flameColor2: '#ff4500'
};

// --- Sound Effects & Music (Tone.js) ---
let flapSynth, coinSynth, musicSynth, reverb, filter;
if (typeof Tone !== 'undefined') {
    // ... (sound setup remains the same) ...
    flapSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } }).toDestination();
    coinSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination();
    reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
    filter = new Tone.Filter({ type: 'lowpass', frequency: 800, Q: 1 });
    musicSynth = new Tone.FMSynth({ harmonicity: 1.5, modulationIndex: 10, envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 1 }, modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.2, release: 0.5 } }).connect(filter).connect(reverb);
    const musicPattern = ["C3", ["Eb3", "G3"], "C3", ["G2", "Eb3"]];
    musicLoop = new Tone.Sequence((time, note) => { musicSynth.triggerAttackRelease(note, "8n", time); }, musicPattern, "4n");
    musicLoop.loop = true;
    Tone.Transport.bpm.value = 90;
} else {
    console.error("Tone.js not loaded! Sound effects and music will not work.");
    flapSynth = coinSynth = musicSynth = { triggerAttackRelease: () => {} };
    musicLoop = { start: () => {}, stop: () => {} };
}


// --- Functions ---

// Function to draw the background stars - No Change
function drawBackground() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Function to update star positions - No Change
function updateBackground(deltaTime) {
    stars.forEach(star => {
        star.x -= star.speed * deltaTime;
        if (star.x < -star.radius) {
            star.x = CANVAS_WIDTH + star.radius;
            star.y = Math.random() * CANVAS_HEIGHT;
        }
    });
}

// Function to draw the spaceship - No Change
function drawShip() {
    const x = ship.x; const y = shipY; const w = ship.width; const h = ship.height;
    const gradient = ctx.createLinearGradient(x - w/2, y - h/2, x - w/2, y + h/2);
    gradient.addColorStop(0, ship.bodyColor1); gradient.addColorStop(1, ship.bodyColor2);
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y);
    ctx.quadraticCurveTo(x + w / 4, y - h / 2, x - w / 4, y - h / 2);
    ctx.lineTo(x - w / 2, y - h * 0.8); ctx.lineTo(x - w * 0.6, y); ctx.lineTo(x - w / 2, y + h * 0.8);
    ctx.lineTo(x - w / 4, y + h / 2); ctx.quadraticCurveTo(x + w / 4, y + h / 2, x + w / 2, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ship.windowColor; ctx.beginPath();
    ctx.ellipse(x + w * 0.1, y, w * 0.2, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.beginPath();
    ctx.arc(x + w * 0.15, y - h * 0.05, w * 0.05, 0, Math.PI * 2); ctx.fill();
    if (shipVelocityY < -50) {
        ctx.fillStyle = ship.flameColor1; ctx.beginPath();
        ctx.moveTo(x - w * 0.55, y - h * 0.3); ctx.lineTo(x - w, y); ctx.lineTo(x - w * 0.55, y + h * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = ship.flameColor2; ctx.beginPath();
        ctx.moveTo(x - w * 0.6, y - h * 0.4); ctx.lineTo(x - w * 0.8, y); ctx.lineTo(x - w * 0.6, y + h * 0.4);
        ctx.closePath(); ctx.fill();
    }
}

// Function to draw obstacle pairs - No Change
function drawObstacles() {
    ctx.fillStyle = OBSTACLE_COLOR;
    obstacles.forEach(pair => {
        ctx.fillRect(pair.x, 0, OBSTACLE_WIDTH, pair.topHeight);
        ctx.fillRect(pair.x, pair.bottomY, OBSTACLE_WIDTH, CANVAS_HEIGHT - pair.bottomY);
    });
}

// Function to draw coins - No Change
function drawCoins() {
    ctx.fillStyle = COIN_COLOR;
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });
}

// *** Function to draw gnomes - UPDATED Appearance ***
function drawGnomes() {
    gnomes.forEach(gnome => {
        const bodyHeight = GNOME_HEIGHT * 0.6;
        const bodyY = gnome.y + GNOME_HEIGHT * 0.4;
        const headRadius = GNOME_WIDTH * 0.3;
        const hatHeight = GNOME_HEIGHT * 0.4;
        const hatPointY = gnome.y;
        const hatBaseY = gnome.y + hatHeight;

        // Beard (draw first, behind body/hat)
        ctx.fillStyle = GNOME_COLOR_BEARD;
        ctx.beginPath();
        ctx.moveTo(gnome.x + GNOME_WIDTH * 0.1, hatBaseY);
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, bodyY + bodyHeight * 0.5, gnome.x + GNOME_WIDTH * 0.9, hatBaseY);
        ctx.closePath();
        ctx.fill();

        // Body (rounded rectangle/capsule)
        ctx.fillStyle = GNOME_COLOR_BODY;
        ctx.beginPath();
        ctx.moveTo(gnome.x, bodyY);
        ctx.lineTo(gnome.x, bodyY + bodyHeight - GNOME_WIDTH / 2); // Left side
        ctx.arcTo(gnome.x, bodyY + bodyHeight, gnome.x + GNOME_WIDTH / 2, bodyY + bodyHeight, GNOME_WIDTH / 2); // Bottom curve
        ctx.arcTo(gnome.x + GNOME_WIDTH, bodyY + bodyHeight, gnome.x + GNOME_WIDTH, bodyY, GNOME_WIDTH / 2); // Right curve
        ctx.lineTo(gnome.x + GNOME_WIDTH, bodyY); // Right side
        ctx.closePath(); // Close top (will be covered by hat/beard)
        ctx.fill();

        // Hat (smoother triangle)
        ctx.fillStyle = GNOME_COLOR_HAT;
        ctx.beginPath();
        ctx.moveTo(gnome.x, hatBaseY); // Left base
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, hatPointY - hatHeight * 0.2, gnome.x + GNOME_WIDTH, hatBaseY); // Curved top to right base
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, hatBaseY + hatHeight * 0.1, gnome.x, hatBaseY); // Curved bottom back to left base
        ctx.closePath();
        ctx.fill();
    });
}


// Function to update ship position - No Change
function updateShip(deltaTime) {
    shipVelocityY += GRAVITY_PER_SECOND * deltaTime;
    shipY += shipVelocityY * deltaTime;
    if (shipY < 0) {
        shipY = 0;
        shipVelocityY = 0;
    } else if (shipY + ship.height > CANVAS_HEIGHT) {
         shipY = CANVAS_HEIGHT - ship.height;
         shipVelocityY = 0;
         gameOver();
    }
}

// Function to spawn a new obstacle pair - No Change
function spawnObstaclePair() {
    const maxTopHeight = CANVAS_HEIGHT - OBSTACLE_GAP - 20;
    const minTopHeight = 20;
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
    const bottomY = topHeight + OBSTACLE_GAP;
    const obstacleX = CANVAS_WIDTH;
    obstacles.push({ x: obstacleX, topHeight: topHeight, bottomY: bottomY, passed: false });
    if (Math.random() < COIN_SPAWN_CHANCE) {
        const coinX = obstacleX + OBSTACLE_WIDTH / 2;
        const coinY = topHeight + OBSTACLE_GAP / 2;
        coins.push({ x: coinX, y: coinY });
    }
}

// Function to update obstacle positions and handle scoring - No Change
function updateObstacles(deltaTime) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime;
        if (!obstacles[i].passed && obstacles[i].x + OBSTACLE_WIDTH < ship.x) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            obstacles[i].passed = true;
        }
        if (obstacles[i].x + OBSTACLE_WIDTH < 0) {
            obstacles.splice(i, 1);
        }
    }
    if (typeof obstacleSpawnTimer === 'number') {
         obstacleSpawnTimer -= deltaTime * 1000;
         if (obstacleSpawnTimer <= 0) {
             spawnObstaclePair();
             obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS;
         }
    }
}

// Function to update coin positions and check collection - No Change
function updateCoins(deltaTime) {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime;
        const shipLeft = ship.x - ship.width / 2; const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2; const shipBottom = shipY + ship.height / 2;
        const coin = coins[i];
        const closestX = Math.max(shipLeft, Math.min(coin.x, shipRight));
        const closestY = Math.max(shipTop, Math.min(coin.y, shipBottom));
        const distX = coin.x - closestX; const distY = coin.y - closestY;
        const distanceSquared = (distX * distX) + (distY * distY);
        if (distanceSquared < (COIN_RADIUS * COIN_RADIUS)) {
            score += COIN_SCORE; scoreDisplay.textContent = `Score: ${score}`;
            if (audioStarted) coinSynth.triggerAttackRelease("A5", "0.1");
            coins.splice(i, 1); continue;
        }
        if (coin.x + COIN_RADIUS < 0) { coins.splice(i, 1); }
    }
}

// *** Function to spawn a gnome - UPDATED Y Position ***
function spawnGnome() {
    const gnomeX = CANVAS_WIDTH;
    // Spawn at a random height, ensuring space from top/bottom edges
    const spawnPadding = GNOME_HEIGHT * 1.5; // Ensure gnome fully visible
    const gnomeY = Math.random() * (CANVAS_HEIGHT - spawnPadding * 2) + spawnPadding;

    gnomes.push({
        x: gnomeX,
        y: gnomeY, // Current y
        initialY: gnomeY, // Store initial y for sine wave
        width: GNOME_WIDTH,
        height: GNOME_HEIGHT
    });
    console.log("Gnome spawned at y:", gnomeY);
    // Reset gnome spawn timer
    gnomeSpawnTimer = GNOME_SPAWN_INTERVAL_MIN_MS + Math.random() * GNOME_SPAWN_INTERVAL_RANGE_MS;
}

// *** Function to update gnome positions - UPDATED with Vertical Movement ***
function updateGnomes(deltaTime) {
    for (let i = gnomes.length - 1; i >= 0; i--) {
        const gnome = gnomes[i];
        // Horizontal movement
        gnome.x -= GNOME_SPEED_PER_SECOND * deltaTime;

        // Vertical movement (sine wave based on horizontal position)
        gnome.y = gnome.initialY + Math.sin(gnome.x * GNOME_VERTICAL_FREQ) * GNOME_VERTICAL_AMP;

        // Keep gnome within vertical bounds (optional, prevents extreme waves)
        if (gnome.y < 0) gnome.y = 0;
        if (gnome.y + GNOME_HEIGHT > CANVAS_HEIGHT) gnome.y = CANVAS_HEIGHT - GNOME_HEIGHT;


        // Remove gnomes that are off-screen
        if (gnome.x + GNOME_WIDTH < 0) {
            gnomes.splice(i, 1);
        }
    }

     // Update and check spawn timer
    if (typeof gnomeSpawnTimer === 'number') {
        gnomeSpawnTimer -= deltaTime * 1000;
        if (gnomeSpawnTimer <= 0) {
            spawnGnome();
        }
    }
}


// Function to check for collisions between ship and obstacles/gnomes - No Change
function checkCollisions() {
    // Check Obstacle Collisions
    for (const pair of obstacles) {
        const shipLeft = ship.x - ship.width / 2; const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2; const shipBottom = shipY + ship.height / 2;
        if (shipRight > pair.x && shipLeft < pair.x + OBSTACLE_WIDTH && shipTop < pair.topHeight) return true;
        if (shipRight > pair.x && shipLeft < pair.x + OBSTACLE_WIDTH && shipBottom > pair.bottomY) return true;
    }
    // Check Gnome Collisions
    for (const gnome of gnomes) {
        const shipLeft = ship.x - ship.width / 2; const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2; const shipBottom = shipY + ship.height / 2;
        if (shipRight > gnome.x && shipLeft < gnome.x + gnome.width && shipBottom > gnome.y && shipTop < gnome.y + gnome.height) {
            console.log("Gnome collision!"); return true;
        }
    }
    return false;
}

// --- Leaderboard Functions --- No Change
// ... (getLeaderboard, saveLeaderboard, checkHighScore, addScoreToLeaderboard, displayLeaderboard remain the same) ...
function getLeaderboard() { const board = localStorage.getItem(LEADERBOARD_KEY); try { const parsedBoard = board ? JSON.parse(board) : []; return Array.isArray(parsedBoard) ? parsedBoard : []; } catch (e) { console.error("Error parsing leaderboard from localStorage:", e); return []; } }
function saveLeaderboard(board) { try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board)); } catch (e) { console.error("Error saving leaderboard to localStorage:", e); } }
function checkHighScore(currentScore) { const board = getLeaderboard(); const lowestScore = board.length < LEADERBOARD_MAX_ENTRIES ? 0 : board[board.length - 1].score; return currentScore > lowestScore; }
function addScoreToLeaderboard(name, score) { const board = getLeaderboard(); const formattedName = name.trim().substring(0, 3).toUpperCase() || "???"; board.push({ name: formattedName, score: score }); board.sort((a, b) => b.score - a.score); const updatedBoard = board.slice(0, LEADERBOARD_MAX_ENTRIES); saveLeaderboard(updatedBoard); displayLeaderboard(); }
function displayLeaderboard() { const board = getLeaderboard(); if (!leaderboardList) { console.error("Leaderboard list element not found!"); return; } leaderboardList.innerHTML = ''; if (board.length === 0) { leaderboardList.innerHTML = '<li>No scores yet!</li>'; return; } board.forEach((entry) => { const li = document.createElement('li'); const nameSpan = document.createElement('span'); nameSpan.className = 'name'; nameSpan.textContent = entry.name; const scoreSpan = document.createElement('span'); scoreSpan.className = 'score'; scoreSpan.textContent = entry.score; li.appendChild(nameSpan); li.appendChild(scoreSpan); leaderboardList.appendChild(li); }); }


// --- Game State Functions ---

// MODIFIED gameOver to stop music - No Change from previous
function gameOver() {
    console.log("Executing gameOver function");
    gameRunning = false;
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden');
    if (typeof Tone !== 'undefined' && Tone.Transport.state === "started") {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        console.log("Music stopped.");
    }
    currentHighScore = checkHighScore(score);
    if (currentHighScore) {
        nameInputArea.classList.remove('hidden');
        restartButton.classList.add('hidden');
        playerNameInput.value = '';
        playerNameInput.focus();
    } else {
        nameInputArea.classList.add('hidden');
        restartButton.classList.remove('hidden');
    }
}

function initializeStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 1.5 + 0.5,
            speed: STAR_BASE_SPEED_PER_SECOND + Math.random() * 50
        });
    }
}

// MODIFIED resetGame to initialize gnomes and gnome timer, ensure music restarts
function resetGame() {
    console.log("Executing resetGame function");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    gnomes = []; // Initialize gnomes array
    score = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS / 2;
    // Initialize gnome timer
    gnomeSpawnTimer = GNOME_SPAWN_INTERVAL_MIN_MS + Math.random() * GNOME_SPAWN_INTERVAL_RANGE_MS;
    gameRunning = true;
    gameStarted = true;
    currentHighScore = false;
    lastTime = 0;

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverDisplay.classList.add('hidden');
    nameInputArea.classList.add('hidden');
    restartButton.classList.remove('hidden');
    startMessage.classList.add('hidden');

    initializeStars();

    // *** Start/Restart music ***
    if (typeof Tone !== 'undefined') {
        console.log("Transport state before reset:", Tone.Transport.state); // Log state
        // Always ensure transport is started and loop begins from time 0
        Tone.Transport.start();
        musicLoop.start(0); // Restart sequence from beginning
        console.log("Music (re)started.");
    }

    cancelAnimationFrame(animationFrameId);
    console.log("Requesting first animation frame for gameLoop");
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game Loop --- MODIFIED to update/draw gnomes
function gameLoop(currentTime) {
    if (!gameRunning) {
         return;
    }

    if (lastTime === 0) {
        lastTime = currentTime;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (deltaTime > 0.1) {
         animationFrameId = requestAnimationFrame(gameLoop);
         return;
    }

    // --- Updates based on deltaTime ---
    updateBackground(deltaTime);
    updateShip(deltaTime);
    updateObstacles(deltaTime);
    updateCoins(deltaTime);
    updateGnomes(deltaTime); // *** Update gnomes ***

    // --- Drawing ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawObstacles();
    drawCoins();
    drawGnomes(); // *** Draw gnomes ***
    drawShip(); // Draw ship last (on top)

    // --- Collision Check ---
    if (checkCollisions()) { // Now checks obstacles AND gnomes
        gameOver();
    }

    // --- Request Next Frame ---
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling --- No Change from previous
// ... (triggerFlap, handleFlapAction, handleKeyDown, handleTouchStart, handleClick, handleRestart, handleSubmitScore, handleNameSubmitKey remain the same) ...
function triggerFlap() { if (typeof Tone !== 'undefined' && !audioStarted) { Tone.start().then(() => { audioStarted = true; console.log("Audio Context Started"); handleFlapAction(); }).catch(e => { console.error("Error starting Audio Context:", e); handleFlapAction(); }); } else { handleFlapAction(); } }
function handleFlapAction() { if (!gameStarted) { resetGame(); if (audioStarted) flapSynth.triggerAttackRelease("C4", "0.05"); } else if (gameRunning) { shipVelocityY = FLAP_VELOCITY; if (audioStarted) flapSynth.triggerAttackRelease("C5", "0.05"); } }
function handleKeyDown(e) { if (e.code === 'Space') { e.preventDefault(); triggerFlap(); } }
function handleTouchStart(e) { e.preventDefault(); triggerFlap(); }
function handleClick(e) { e.preventDefault(); triggerFlap(); }
function handleRestart() { resetGame(); }
function handleSubmitScore() { const playerName = playerNameInput.value; if (playerName.trim().length > 0 && currentHighScore) { addScoreToLeaderboard(playerName, score); nameInputArea.classList.add('hidden'); restartButton.classList.remove('hidden'); currentHighScore = false; } else if (playerName.trim().length === 0) { console.log("Player name cannot be empty"); playerNameInput.focus(); } }
function handleNameSubmitKey(e) { if (e.code === 'Enter') { e.preventDefault(); handleSubmitScore(); } }


// --- Initial Setup --- MODIFIED to initialize gnomes array
function initializeDisplay() {
    console.log("Initializing display...");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    gnomes = []; // *** Initialize gnomes array ***
    score = 0;
    gameRunning = false;
    gameStarted = false;
    currentHighScore = false;
    lastTime = 0;
    audioStarted = false;

    initializeStars();

    if (!ctx) { console.error("Canvas context (ctx) is not available!"); return; }
    if (!canvas) { console.error("Canvas element not found!"); return; }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawShip();

    startMessage.classList.remove('hidden');
    gameOverDisplay.classList.add('hidden');
    nameInputArea.classList.add('hidden');
    scoreDisplay.textContent = `Score: 0`;

    displayLeaderboard();

    // Add event listeners only once during initialization
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('click', handleClick);
    canvas.addEventListener('click', handleClick);
    if (restartButton) { restartButton.removeEventListener('click', handleRestart); restartButton.addEventListener('click', handleRestart); } else { console.error("Restart button not found!"); }
    if (submitScoreButton) { submitScoreButton.removeEventListener('click', handleSubmitScore); submitScoreButton.addEventListener('click', handleSubmitScore); } else { console.error("Submit score button not found!"); }
    if (playerNameInput) { playerNameInput.removeEventListener('keydown', handleNameSubmitKey); playerNameInput.addEventListener('keydown', handleNameSubmitKey); } else { console.error("Player name input not found!"); }

    console.log("Initialization complete. Waiting for first input.");
}

// Initialize the display when the script loads
initializeDisplay();
