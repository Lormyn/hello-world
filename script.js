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
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 30;
const SHIP_START_X = 150;
const SHIP_START_Y = CANVAS_HEIGHT / 2 - SHIP_HEIGHT / 2;
// Physics Constants
const GRAVITY_PER_SECOND = 900;
const FLAP_VELOCITY = -250;
// Obstacle Constants
const OBSTACLE_WIDTH = 80;
const OBSTACLE_GAP = 120;
const OBSTACLE_COLOR = '#8b4513';
const OBSTACLE_SPEED_PER_SECOND = 360;
const OBSTACLE_SPAWN_INTERVAL_MS = 1800;
// Background Constants
const STAR_COUNT = 100;
const STAR_BASE_SPEED_PER_SECOND = 30;
// Leaderboard Constants
const LEADERBOARD_KEY = 'flappyShipLeaderboard';
const LEADERBOARD_MAX_ENTRIES = 10;
// Coin Constants
const COIN_RADIUS = 10;
const COIN_COLOR = '#ffd700';
const COIN_SCORE = 5;
const COIN_SPAWN_CHANCE = 0.7;

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let shipY;
let shipVelocityY;
let obstacles;
let coins;
let score;
let obstacleSpawnTimer;
let gameRunning;
let gameStarted;
let animationFrameId;
let stars;
let currentHighScore = false;
let lastTime = 0;
let audioStarted = false;
let musicLoop; // *** Variable to hold the music sequence ***

// --- Spaceship Object ---
const ship = {
    x: SHIP_START_X,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    bodyColor: '#c0c0c0',
    windowColor: '#00ffff',
    flameColor: '#ff4500'
};

// --- Sound Effects & Music (Tone.js) ---
// Ensure Tone is loaded before creating instances
let flapSynth, coinSynth, musicSynth, reverb, filter;
if (typeof Tone !== 'undefined') {
    flapSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 }
    }).toDestination();

    coinSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 }
    }).toDestination();

    // *** Setup for spacey music ***
    reverb = new Tone.Reverb({
        decay: 4, // Longer decay for spacey feel
        wet: 0.4  // Mix of dry/wet signal
    }).toDestination();

    filter = new Tone.Filter({
        type: 'lowpass',
        frequency: 800, // Cut off high frequencies for softer sound
        Q: 1
    }); //.connect(reverb); // Chain filter to reverb

    // Use FMSynth for potentially richer/spacey tones
    musicSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 1 },
        modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.2, release: 0.5 }
    }).connect(filter).connect(reverb); // Connect synth through filter and reverb

    // Define the musical sequence (simple C minor arpeggio)
    const musicPattern = ["C3", ["Eb3", "G3"], "C3", ["G2", "Eb3"]];
    musicLoop = new Tone.Sequence((time, note) => {
        musicSynth.triggerAttackRelease(note, "8n", time); // Play note for an 8th note duration
    }, musicPattern, "4n"); // Play pattern notes every quarter note

    musicLoop.loop = true; // Ensure the sequence loops
    Tone.Transport.bpm.value = 90; // Set tempo

} else {
    console.error("Tone.js not loaded! Sound effects and music will not work.");
    // Provide dummy objects/functions if needed to prevent errors later
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
    ctx.fillStyle = ship.bodyColor;
    ctx.beginPath();
    ctx.moveTo(ship.x, shipY + ship.height / 2);
    ctx.lineTo(ship.x - ship.width / 2, shipY - ship.height / 2);
    ctx.lineTo(ship.x - ship.width / 2, shipY + ship.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ship.windowColor;
    ctx.beginPath();
    ctx.arc(ship.x - ship.width * 0.1, shipY, ship.height / 5, 0, Math.PI * 2);
    ctx.fill();
    if (shipVelocityY < -50) {
        ctx.fillStyle = ship.flameColor;
        ctx.beginPath();
        ctx.moveTo(ship.x - ship.width / 2, shipY - ship.height * 0.3);
        ctx.lineTo(ship.x - ship.width * 0.8, shipY);
        ctx.lineTo(ship.x - ship.width / 2, shipY + ship.height * 0.3);
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

// Function to update coin positions and check collection - MODIFIED to use safe sound trigger
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
            if (audioStarted) coinSynth.triggerAttackRelease("A5", "0.1"); // Play coin sound safely
            coins.splice(i, 1);
            continue;
        }

        if (coin.x + COIN_RADIUS < 0) {
            coins.splice(i, 1);
        }
    }
}


// Function to check for collisions between ship and obstacles - No Change
function checkCollisions() {
    for (const pair of obstacles) {
        if (ship.x + ship.width / 2 > pair.x && ship.x - ship.width / 2 < pair.x + OBSTACLE_WIDTH) {
            if (shipY - ship.height / 2 < pair.topHeight || shipY + ship.height / 2 > pair.bottomY) {
                return true;
            }
        }
    }
    return false;
}

// --- Leaderboard Functions --- No Change

function getLeaderboard() {
    const board = localStorage.getItem(LEADERBOARD_KEY);
    try {
        const parsedBoard = board ? JSON.parse(board) : [];
        return Array.isArray(parsedBoard) ? parsedBoard : [];
    } catch (e) {
        console.error("Error parsing leaderboard from localStorage:", e);
        return [];
    }
}

function saveLeaderboard(board) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    } catch (e) {
        console.error("Error saving leaderboard to localStorage:", e);
    }
}

function checkHighScore(currentScore) {
    const board = getLeaderboard();
    const lowestScore = board.length < LEADERBOARD_MAX_ENTRIES ? 0 : board[board.length - 1].score;
    return currentScore > lowestScore;
}

function addScoreToLeaderboard(name, score) {
    const board = getLeaderboard();
    const formattedName = name.trim().substring(0, 3).toUpperCase() || "???";
    board.push({ name: formattedName, score: score });
    board.sort((a, b) => b.score - a.score);
    const updatedBoard = board.slice(0, LEADERBOARD_MAX_ENTRIES);
    saveLeaderboard(updatedBoard);
    displayLeaderboard();
}

function displayLeaderboard() {
    const board = getLeaderboard();
    if (!leaderboardList) {
        console.error("Leaderboard list element not found!");
        return;
    }
    leaderboardList.innerHTML = '';
    if (board.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet!</li>';
        return;
    }
    board.forEach((entry) => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = entry.name;
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score';
        scoreSpan.textContent = entry.score;
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        leaderboardList.appendChild(li);
    });
}

// --- Game State Functions ---

// MODIFIED gameOver to stop music
function gameOver() {
    console.log("Executing gameOver function");
    gameRunning = false;
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden');

    // *** Stop the music ***
    if (typeof Tone !== 'undefined' && Tone.Transport.state === "started") {
        Tone.Transport.stop();
        Tone.Transport.cancel(); // Remove scheduled events
        console.log("Music stopped.");
    }

    currentHighScore = checkHighScore(score);
    if (currentHighScore) {
        console.log("High score detected, showing name input.");
        nameInputArea.classList.remove('hidden');
        restartButton.classList.add('hidden');
        playerNameInput.value = '';
        playerNameInput.focus();
    } else {
        console.log("Not a high score, showing restart button.");
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

// MODIFIED resetGame to potentially start music
function resetGame() {
    console.log("Executing resetGame function");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    score = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS / 2;
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

    // *** Start music if Tone available and transport not already started ***
    if (typeof Tone !== 'undefined' && Tone.Transport.state !== "started") {
        // Ensure Transport is ready before starting loop
         Tone.Transport.start();
         musicLoop.start(0); // Start the sequence immediately
         console.log("Music started.");
    }


    cancelAnimationFrame(animationFrameId);
    console.log("Requesting first animation frame for gameLoop");
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game Loop --- No Change
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

    updateBackground(deltaTime);
    updateShip(deltaTime);
    updateObstacles(deltaTime);
    updateCoins(deltaTime);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawObstacles();
    drawCoins();
    drawShip();

    if (checkCollisions()) {
        gameOver();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---

// MODIFIED triggerFlap to handle audio context start and play sound
function triggerFlap() {
    // Start Tone.js audio context on first interaction
    // Check if Tone is loaded and context hasn't started
    if (typeof Tone !== 'undefined' && !audioStarted) {
        Tone.start().then(() => {
             audioStarted = true;
             console.log("Audio Context Started");
             // Now that context is started, proceed with flap/game start
             handleFlapAction();
        }).catch(e => {
            console.error("Error starting Audio Context:", e);
            // Proceed without audio if context fails
             handleFlapAction();
        });
    } else {
        // Audio context already started or Tone not loaded, proceed directly
        handleFlapAction();
    }
}

// Helper function to separate flap logic after audio context check
function handleFlapAction() {
     if (!gameStarted) {
        console.log("First flap, calling resetGame()");
        resetGame(); // This now starts the gameLoop and music
        // Play flap sound on first flap too
        if (audioStarted) flapSynth.triggerAttackRelease("C4", "0.05");
    } else if (gameRunning) {
         console.log("Flapping!");
         shipVelocityY = FLAP_VELOCITY;
         if (audioStarted) flapSynth.triggerAttackRelease("C5", "0.05"); // Play flap sound
    } else {
         console.log("Flap ignored because game is not running");
    }
}


// Handle jump input (Spacebar) - No Change
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        triggerFlap();
    }
}

// Handle touch input on the canvas - No Change
function handleTouchStart(e) {
    e.preventDefault();
    triggerFlap();
}

// Handle click input on the canvas - No Change
function handleClick(e) {
    e.preventDefault();
    triggerFlap();
}


// Handle restart button click - No Change
function handleRestart() {
    resetGame();
}

// Handle score submission - No Change
function handleSubmitScore() {
    const playerName = playerNameInput.value;
    if (playerName.trim().length > 0 && currentHighScore) {
        addScoreToLeaderboard(playerName, score);
        nameInputArea.classList.add('hidden');
        restartButton.classList.remove('hidden');
        currentHighScore = false;
    } else if (playerName.trim().length === 0) {
        console.log("Player name cannot be empty");
        playerNameInput.focus();
    }
}

// Handle submitting name with Enter key - No Change
function handleNameSubmitKey(e) {
    if (e.code === 'Enter') {
        e.preventDefault();
        handleSubmitScore();
    }
}


// --- Initial Setup --- MODIFIED to initialize coins array
function initializeDisplay() {
    console.log("Initializing display...");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = [];
    score = 0;
    gameRunning = false;
    gameStarted = false;
    currentHighScore = false;
    lastTime = 0;
    audioStarted = false; // Reset audio flag

    initializeStars();

    if (!ctx) {
        console.error("Canvas context (ctx) is not available!");
        return;
    }
    if (!canvas) {
         console.error("Canvas element not found!");
         return;
    }

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

    if (restartButton) {
        restartButton.removeEventListener('click', handleRestart);
        restartButton.addEventListener('click', handleRestart);
    } else { console.error("Restart button not found!"); }

    if (submitScoreButton) {
         submitScoreButton.removeEventListener('click', handleSubmitScore);
         submitScoreButton.addEventListener('click', handleSubmitScore);
    } else { console.error("Submit score button not found!"); }

    if (playerNameInput) {
        playerNameInput.removeEventListener('keydown', handleNameSubmitKey);
        playerNameInput.addEventListener('keydown', handleNameSubmitKey);
    } else { console.error("Player name input not found!"); }

    console.log("Initialization complete. Waiting for first input.");
}

// Initialize the display when the script loads
initializeDisplay();
