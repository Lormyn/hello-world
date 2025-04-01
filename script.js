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
// Ship Constants - Adjusted slightly for new shape
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
const GNOME_WIDTH = 25;
const GNOME_HEIGHT = 40;
const GNOME_COLOR_BODY = '#006400'; // DarkGreen
const GNOME_COLOR_HAT = '#ff0000'; // Red
const GNOME_SPEED_PER_SECOND = 210; // Slightly faster than obstacles
const GNOME_SPAWN_INTERVAL_MIN_MS = 4000; // Min time between gnomes
const GNOME_SPAWN_INTERVAL_RANGE_MS = 5000; // Random additional time

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let shipY;
let shipVelocityY;
let obstacles;
let coins;
let gnomes; // *** Array for gnomes ***
let score;
let obstacleSpawnTimer;
let gnomeSpawnTimer; // *** Timer for gnomes ***
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
    width: SHIP_WIDTH, // Base width
    height: SHIP_HEIGHT, // Base height
    // Colors for spaceship
    bodyColor1: '#e0e0e0', // Lighter grey
    bodyColor2: '#a0a0a0', // Darker grey
    windowColor: '#70d0ff', // Light blue
    flameColor1: '#ffcc00', // Yellow
    flameColor2: '#ff4500'  // OrangeRed
};

// --- Sound Effects & Music (Tone.js) ---
let flapSynth, coinSynth, musicSynth, reverb, filter;
// ... (sound setup remains the same as previous version) ...
if (typeof Tone !== 'undefined') {
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

// *** Function to draw the spaceship - UPDATED Appearance ***
function drawShip() {
    const x = ship.x; // Center X reference
    const y = shipY; // Center Y reference (vertical center of the drawn shape)
    const w = ship.width;
    const h = ship.height;

    // Main Body - create a gradient
    const gradient = ctx.createLinearGradient(x - w/2, y - h/2, x - w/2, y + h/2);
    gradient.addColorStop(0, ship.bodyColor1); // Lighter top
    gradient.addColorStop(1, ship.bodyColor2); // Darker bottom
    ctx.fillStyle = gradient;

    ctx.beginPath();
    // Nose cone (quadratic curve for smoother point)
    ctx.moveTo(x + w / 2, y); // Tip of the nose
    ctx.quadraticCurveTo(x + w / 4, y - h / 2, x - w / 4, y - h / 2); // Top curve to back
    // Tail fins (example)
    ctx.lineTo(x - w / 2, y - h * 0.8); // Upper tail fin point
    ctx.lineTo(x - w * 0.6, y);      // Back center indent
    ctx.lineTo(x - w / 2, y + h * 0.8); // Lower tail fin point
    // Bottom curve back to nose
    ctx.lineTo(x - w / 4, y + h / 2); // Bottom back
    ctx.quadraticCurveTo(x + w / 4, y + h / 2, x + w / 2, y); // Bottom curve to nose
    ctx.closePath();
    ctx.fill();
    // Optional: Add a border
    // ctx.strokeStyle = '#333';
    // ctx.lineWidth = 1;
    // ctx.stroke();

    // Cockpit Window
    ctx.fillStyle = ship.windowColor;
    ctx.beginPath();
    // Slightly elongated oval shape
    ctx.ellipse(x + w * 0.1, y, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Simple shine on window
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x + w * 0.15, y - h * 0.05, w * 0.05, 0, Math.PI * 2);
    ctx.fill();


    // Flame when flapping/moving up
    if (shipVelocityY < -50) {
        // Inner flame (yellow)
        ctx.fillStyle = ship.flameColor1;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.55, y - h * 0.3); // Start slightly behind body edge
        ctx.lineTo(x - w, y); // Longer point
        ctx.lineTo(x - w * 0.55, y + h * 0.3);
        ctx.closePath();
        ctx.fill();
        // Outer flame (orange)
        ctx.fillStyle = ship.flameColor2;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.6, y - h * 0.4);
        ctx.lineTo(x - w * 0.8, y); // Shorter point
        ctx.lineTo(x - w * 0.6, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
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

// *** Function to draw gnomes ***
function drawGnomes() {
    gnomes.forEach(gnome => {
        // Body
        ctx.fillStyle = GNOME_COLOR_BODY;
        ctx.fillRect(gnome.x, gnome.y + GNOME_HEIGHT * 0.3, GNOME_WIDTH, GNOME_HEIGHT * 0.7);
        // Hat
        ctx.fillStyle = GNOME_COLOR_HAT;
        ctx.beginPath();
        ctx.moveTo(gnome.x, gnome.y + GNOME_HEIGHT * 0.3); // Left base of hat
        ctx.lineTo(gnome.x + GNOME_WIDTH / 2, gnome.y); // Point of hat
        ctx.lineTo(gnome.x + GNOME_WIDTH, gnome.y + GNOME_HEIGHT * 0.3); // Right base of hat
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

        const shipLeft = ship.x - ship.width / 2;
        const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2;
        const shipBottom = shipY + ship.height / 2;
        const coin = coins[i];
        const closestX = Math.max(shipLeft, Math.min(coin.x, shipRight));
        const closestY = Math.max(shipTop, Math.min(coin.y, shipBottom));
        const distX = coin.x - closestX;
        const distY = coin.y - closestY;
        const distanceSquared = (distX * distX) + (distY * distY);

        if (distanceSquared < (COIN_RADIUS * COIN_RADIUS)) {
            score += COIN_SCORE;
            scoreDisplay.textContent = `Score: ${score}`;
            if (audioStarted) coinSynth.triggerAttackRelease("A5", "0.1");
            coins.splice(i, 1);
            continue;
        }

        if (coin.x + COIN_RADIUS < 0) {
            coins.splice(i, 1);
        }
    }
}

// *** Function to spawn a gnome ***
function spawnGnome() {
    const gnomeX = CANVAS_WIDTH;
    const gnomeY = CANVAS_HEIGHT - GNOME_HEIGHT; // Gnome sits on the ground
    gnomes.push({ x: gnomeX, y: gnomeY, width: GNOME_WIDTH, height: GNOME_HEIGHT });
    console.log("Gnome spawned!");
    // Reset gnome spawn timer
    gnomeSpawnTimer = GNOME_SPAWN_INTERVAL_MIN_MS + Math.random() * GNOME_SPAWN_INTERVAL_RANGE_MS;
}

// *** Function to update gnome positions ***
function updateGnomes(deltaTime) {
    for (let i = gnomes.length - 1; i >= 0; i--) {
        gnomes[i].x -= GNOME_SPEED_PER_SECOND * deltaTime; // Move gnome left

        // Remove gnomes that are off-screen
        if (gnomes[i].x + GNOME_WIDTH < 0) {
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


// Function to check for collisions between ship and obstacles/gnomes - MODIFIED
function checkCollisions() {
    // Check Obstacle Collisions
    for (const pair of obstacles) {
        // Simple AABB check (using ship center and dimensions for approximation)
        const shipLeft = ship.x - ship.width / 2;
        const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2;
        const shipBottom = shipY + ship.height / 2;

        // Check collision with top obstacle
        if (shipRight > pair.x && shipLeft < pair.x + OBSTACLE_WIDTH && shipTop < pair.topHeight) {
            return true; // Collision with top part
        }
        // Check collision with bottom obstacle
        if (shipRight > pair.x && shipLeft < pair.x + OBSTACLE_WIDTH && shipBottom > pair.bottomY) {
            return true; // Collision with bottom part
        }
    }

    // *** Check Gnome Collisions ***
    for (const gnome of gnomes) {
        const shipLeft = ship.x - ship.width / 2;
        const shipRight = ship.x + ship.width / 2;
        const shipTop = shipY - ship.height / 2;
        const shipBottom = shipY + ship.height / 2;

        if (shipRight > gnome.x &&
            shipLeft < gnome.x + gnome.width &&
            shipBottom > gnome.y &&
            shipTop < gnome.y + gnome.height) {
            console.log("Gnome collision!");
            return true; // Collision with gnome
        }
    }

    return false; // No collision
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

// MODIFIED resetGame to initialize gnomes and gnome timer
function resetGame() {
    console.log("Executing resetGame function");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    gnomes = []; // *** Initialize gnomes array ***
    score = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS / 2;
    // *** Initialize gnome timer ***
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

    if (typeof Tone !== 'undefined' && Tone.Transport.state !== "started") {
         Tone.Transport.start();
         musicLoop.start(0);
         console.log("Music started.");
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
