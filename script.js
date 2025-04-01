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
const FLAP_VELOCITY = -250; // *** UPDATED: Was -280 *** (Weaker flap)
// Obstacle Constants
const OBSTACLE_WIDTH = 80;
const OBSTACLE_GAP = 120;
const OBSTACLE_COLOR = '#8b4513';
const OBSTACLE_SPEED_PER_SECOND = 330; // *** UPDATED: Was 180 *** (Faster obstacles)
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
const GNOME_WIDTH = 30;
const GNOME_HEIGHT = 45;
const GNOME_COLOR_BODY = '#228B22'; // ForestGreen
const GNOME_COLOR_HAT = '#DC143C'; // Crimson Red
const GNOME_COLOR_BEARD = '#FFFFFF'; // White
const GNOME_COLOR_FACE = '#FFDAB9'; // PeachPuff (skin tone)
const GNOME_COLOR_EYES = '#000000'; // Black
const GNOME_SPEED_PER_SECOND = 210;
const GNOME_SPAWN_INTERVAL_MIN_MS = 4000;
const GNOME_SPAWN_INTERVAL_RANGE_MS = 5000;
const GNOME_VERTICAL_AMP = 25;
const GNOME_VERTICAL_FREQ = 0.01;

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
        const bodyW = GNOME_WIDTH * 0.8; // Body slightly narrower than total width
        const bodyX = gnome.x + (GNOME_WIDTH - bodyW) / 2;
        const bodyHeight = GNOME_HEIGHT * 0.55;
        const bodyY = gnome.y + GNOME_HEIGHT * 0.45;
        const hatHeight = GNOME_HEIGHT * 0.4;
        const hatPointY = gnome.y;
        const hatBaseY = gnome.y + hatHeight;
        const faceY = hatBaseY - GNOME_HEIGHT * 0.1; // Top of face area
        const eyeY = faceY + GNOME_HEIGHT * 0.08;
        const eyeSpacing = GNOME_WIDTH * 0.2;
        const eyeSize = GNOME_WIDTH * 0.08;
        const eyebrowY = eyeY - GNOME_HEIGHT * 0.05;

        // Body (rounded rectangle/capsule)
        ctx.fillStyle = GNOME_COLOR_BODY;
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY + bodyW/2); // Start top left rounded corner
        ctx.arcTo(bodyX, bodyY, bodyX + bodyW/2, bodyY, bodyW/2); // Top left curve
        ctx.arcTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + bodyW/2, bodyW/2); // Top right curve
        ctx.lineTo(bodyX + bodyW, bodyY + bodyHeight - bodyW/2); // Right side
        ctx.arcTo(bodyX + bodyW, bodyY + bodyHeight, bodyX + bodyW/2, bodyY + bodyHeight, bodyW/2); // Bottom right curve
        ctx.arcTo(bodyX, bodyY + bodyHeight, bodyX, bodyY + bodyHeight - bodyW/2, bodyW/2); // Bottom left curve
        ctx.closePath();
        ctx.fill();

        // Face Area (under hat, above beard)
        ctx.fillStyle = GNOME_COLOR_FACE;
        ctx.beginPath();
        ctx.rect(gnome.x + GNOME_WIDTH * 0.15, faceY, GNOME_WIDTH * 0.7, GNOME_HEIGHT * 0.2);
        ctx.fill();

        // Beard (draw over body, under face)
        ctx.fillStyle = GNOME_COLOR_BEARD;
        ctx.beginPath();
        ctx.moveTo(gnome.x + GNOME_WIDTH * 0.15, faceY); // Start at face bottom-left
        ctx.lineTo(gnome.x, bodyY + bodyHeight * 0.3); // Point down-left
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, bodyY + bodyHeight * 0.8, gnome.x + GNOME_WIDTH, bodyY + bodyHeight * 0.3); // Bottom curve
        ctx.lineTo(gnome.x + GNOME_WIDTH * 0.85, faceY); // Point up-right to face bottom-right
        ctx.closePath();
        ctx.fill();

        // Hat (smoother triangle)
        ctx.fillStyle = GNOME_COLOR_HAT;
        ctx.beginPath();
        ctx.moveTo(gnome.x, hatBaseY); // Left base
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, hatPointY - hatHeight * 0.2, gnome.x + GNOME_WIDTH, hatBaseY); // Curved top to right base
        ctx.quadraticCurveTo(gnome.x + GNOME_WIDTH / 2, hatBaseY + hatHeight * 0.1, gnome.x, hatBaseY); // Curved bottom back to left base
        ctx.closePath();
        ctx.fill();

        // Eyes (simple dots)
        ctx.fillStyle = GNOME_COLOR_EYES;
        ctx.beginPath();
        ctx.arc(gnome.x + GNOME_WIDTH / 2 - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); // Left eye
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gnome.x + GNOME_WIDTH / 2 + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2); // Right eye
        ctx.fill();

        // Angry Eyebrows (slanted lines)
        ctx.strokeStyle = GNOME_COLOR_EYES;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gnome.x + GNOME_WIDTH / 2 - eyeSpacing * 1.8, eyebrowY + 2); // Left eyebrow outer
        ctx.lineTo(gnome.x + GNOME_WIDTH / 2 - eyeSpacing * 0.8, eyebrowY);     // Left eyebrow inner
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gnome.x + GNOME_WIDTH / 2 + eyeSpacing * 0.8, eyebrowY);     // Right eyebrow inner
        ctx.lineTo(gnome.x + GNOME_WIDTH / 2 + eyeSpacing * 1.8, eyebrowY + 2); // Right eyebrow outer
        ctx.stroke();
        ctx.lineWidth = 1; // Reset line width
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
        obstacles[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime; // Uses updated constant
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
        coins[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime; // Uses updated constant
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

// Function to spawn a gnome - No Change
function spawnGnome() {
    const gnomeX = CANVAS_WIDTH;
    const spawnPadding = GNOME_HEIGHT * 1.5;
    const gnomeY = Math.random() * (CANVAS_HEIGHT - spawnPadding * 2) + spawnPadding;
    gnomes.push({ x: gnomeX, y: gnomeY, initialY: gnomeY, width: GNOME_WIDTH, height: GNOME_HEIGHT });
    console.log("Gnome spawned at y:", gnomeY);
    gnomeSpawnTimer = GNOME_SPAWN_INTERVAL_MIN_MS + Math.random() * GNOME_SPAWN_INTERVAL_RANGE_MS;
}

// Function to update gnome positions - No Change
function updateGnomes(deltaTime) {
    for (let i = gnomes.length - 1; i >= 0; i--) {
        const gnome = gnomes[i];
        gnome.x -= GNOME_SPEED_PER_SECOND * deltaTime;
        gnome.y = gnome.initialY + Math.sin(gnome.x * GNOME_VERTICAL_FREQ) * GNOME_VERTICAL_AMP;
        if (gnome.y < 0) gnome.y = 0;
        if (gnome.y + GNOME_HEIGHT > CANVAS_HEIGHT) gnome.y = CANVAS_HEIGHT - GNOME_HEIGHT;
        if (gnome.x + GNOME_WIDTH < 0) { gnomes.splice(i, 1); }
    }
    if (typeof gnomeSpawnTimer === 'number') {
        gnomeSpawnTimer -= deltaTime * 1000;
        if (gnomeSpawnTimer <= 0) { spawnGnome(); }
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

// MODIFIED resetGame to ensure music restarts correctly
function resetGame() {
    console.log("Executing resetGame function");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    gnomes = [];
    score = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS / 2;
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

    // *** Start/Restart music - UPDATED Logic ***
    if (typeof Tone !== 'undefined') {
        console.log("Transport state before reset:", Tone.Transport.state);
        // Stop and cancel any previous events, set position to 0
        Tone.Transport.stop();
        Tone.Transport.cancel(0); // Cancel events scheduled after time 0
        Tone.Transport.position = 0; // Reset transport time to 0
        musicLoop.stop(0); // Ensure sequence is stopped before restarting

        // Start transport and loop
        Tone.Transport.start("+0.1"); // Start transport slightly ahead
        musicLoop.start(0); // Schedule sequence to start at time 0
        console.log("Music (re)started.");
    }

    cancelAnimationFrame(animationFrameId);
    console.log("Requesting first animation frame for gameLoop");
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game Loop --- No Change
function gameLoop(currentTime) {
    if (!gameRunning) { return; }
    if (lastTime === 0) { lastTime = currentTime; animationFrameId = requestAnimationFrame(gameLoop); return; }
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    if (deltaTime > 0.1) { animationFrameId = requestAnimationFrame(gameLoop); return; }

    updateBackground(deltaTime); updateShip(deltaTime); updateObstacles(deltaTime);
    updateCoins(deltaTime); updateGnomes(deltaTime);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(); drawObstacles(); drawCoins(); drawGnomes(); drawShip();

    if (checkCollisions()) { gameOver(); }

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling --- No Change from previous
// ... (triggerFlap, handleFlapAction, handleKeyDown, handleTouchStart, handleClick, handleRestart, handleSubmitScore, handleNameSubmitKey remain the same) ...
function triggerFlap() { if (typeof Tone !== 'undefined' && !audioStarted) { Tone.start().then(() => { audioStarted = true; console.log("Audio Context Started"); handleFlapAction(); }).catch(e => { console.error("Error starting Audio Context:", e); handleFlapAction(); }); } else { handleFlapAction(); } }
function handleFlapAction() { if (!gameStarted) { resetGame(); if (audioStarted) flapSynth.triggerAttackRelease("C4", "0.05"); } else if (gameRunning) { shipVelocityY = FLAP_VELOCITY; if (audioStarted) flapSynth.triggerAttackRelease("C5", "0.05"); } } // Uses updated constant
function handleKeyDown(e) { if (e.code === 'Space') { e.preventDefault(); triggerFlap(); } }
function handleTouchStart(e) { e.preventDefault(); triggerFlap(); }
function handleClick(e) { e.preventDefault(); triggerFlap(); }
function handleRestart() { resetGame(); }
function handleSubmitScore() { const playerName = playerNameInput.value; if (playerName.trim().length > 0 && currentHighScore) { addScoreToLeaderboard(playerName, score); nameInputArea.classList.add('hidden'); restartButton.classList.remove('hidden'); currentHighScore = false; } else if (playerName.trim().length === 0) { console.log("Player name cannot be empty"); playerNameInput.focus(); } }
function handleNameSubmitKey(e) { if (e.code === 'Enter') { e.preventDefault(); handleSubmitScore(); } }


// --- Initial Setup --- No Change
function initializeDisplay() {
    console.log("Initializing display...");
    shipY = SHIP_START_Y; shipVelocityY = 0; obstacles = []; coins = []; gnomes = []; score = 0;
    gameRunning = false; gameStarted = false; currentHighScore = false; lastTime = 0; audioStarted = false;
    initializeStars();
    if (!ctx) { console.error("Canvas context (ctx) is not available!"); return; }
    if (!canvas) { console.error("Canvas element not found!"); return; }
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); drawBackground(); drawShip();
    startMessage.classList.remove('hidden'); gameOverDisplay.classList.add('hidden'); nameInputArea.classList.add('hidden');
    scoreDisplay.textContent = `Score: 0`; displayLeaderboard();
    window.removeEventListener('keydown', handleKeyDown); window.addEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart); canvas.addEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('click', handleClick); canvas.addEventListener('click', handleClick);
    if (restartButton) { restartButton.removeEventListener('click', handleRestart); restartButton.addEventListener('click', handleRestart); } else { console.error("Restart button not found!"); }
    if (submitScoreButton) { submitScoreButton.removeEventListener('click', handleSubmitScore); submitScoreButton.addEventListener('click', handleSubmitScore); } else { console.error("Submit score button not found!"); }
    if (playerNameInput) { playerNameInput.removeEventListener('keydown', handleNameSubmitKey); playerNameInput.addEventListener('keydown', handleNameSubmitKey); } else { console.error("Player name input not found!"); }
    console.log("Initialization complete. Waiting for first input.");
}

// Initialize the display when the script loads
initializeDisplay();
