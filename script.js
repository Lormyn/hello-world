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
const FLAP_VELOCITY = -240;
// Obstacle Constants
const OBSTACLE_WIDTH = 80;
const OBSTACLE_GAP = 120;
const OBSTACLE_COLOR = '#8b4513';
const OBSTACLE_SPEED_PER_SECOND = 300;
const OBSTACLE_SPAWN_INTERVAL_MS = 2000;
// Background Constants
const STAR_COUNT = 100;
const STAR_BASE_SPEED_PER_SECOND = 30;
// Leaderboard Constants
const LEADERBOARD_KEY = 'flappyShipLeaderboard'; // *** Ensure this line exists and is correct ***
const LEADERBOARD_MAX_ENTRIES = 10; // Max scores to keep
// *** Coin Constants ***
const COIN_RADIUS = 15;
const COIN_COLOR = '#ffd700'; // Gold color
const COIN_SCORE = 5;
const COIN_SPAWN_CHANCE = 0.7; // 70% chance to spawn a coin with obstacles

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let shipY;
let shipVelocityY; // Velocity in pixels per second
let obstacles;
let coins; // *** Array for coins ***
let score;
let obstacleSpawnTimer; // Now measures time in ms
let gameRunning;
let gameStarted;
let animationFrameId;
let stars;
let currentHighScore = false;
let lastTime = 0; // *** For deltaTime calculation ***
let audioStarted = false; // Flag to check if audio context is started

// --- Spaceship Object ---
const ship = {
    x: SHIP_START_X,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    bodyColor: '#c0c0c0',
    windowColor: '#00ffff',
    flameColor: '#ff4500'
};

// --- Sound Effects (Tone.js) ---
// Initialize synths - doing this globally
const flapSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 }
}).toDestination();

const coinSynth = new Tone.Synth({
    oscillator: { type: 'sine' }, // Brighter sound
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 }
}).toDestination();


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

// Function to update star positions - MODIFIED for deltaTime
function updateBackground(deltaTime) {
    stars.forEach(star => {
        star.x -= star.speed * deltaTime; // Use deltaTime
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
    // Adjusted flame condition based on velocity in pixels/sec
    if (shipVelocityY < -50) { // Show flame if moving up significantly
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

// *** Function to draw coins ***
function drawCoins() {
    ctx.fillStyle = COIN_COLOR;
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });
}


// Function to update ship position - MODIFIED for deltaTime
function updateShip(deltaTime) {
    // Apply gravity (acceleration in pixels/sec^2)
    shipVelocityY += GRAVITY_PER_SECOND * deltaTime;
    // Update position based on velocity (pixels/sec * sec)
    shipY += shipVelocityY * deltaTime;

    // Check for collision with top/bottom boundaries
    if (shipY < 0) {
        shipY = 0; // Stop at top boundary
        shipVelocityY = 0; // Reset velocity to prevent sticking (optional)
        // gameOver(); // Optionally end game on hitting top
    } else if (shipY + ship.height > CANVAS_HEIGHT) {
         shipY = CANVAS_HEIGHT - ship.height; // Stop at bottom boundary
         shipVelocityY = 0; // Reset velocity
         gameOver(); // End game on hitting bottom
    }
}

// Function to spawn a new obstacle pair - MODIFIED to potentially spawn coin
function spawnObstaclePair() {
    const maxTopHeight = CANVAS_HEIGHT - OBSTACLE_GAP - 20;
    const minTopHeight = 20;
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
    const bottomY = topHeight + OBSTACLE_GAP;

    const obstacleX = CANVAS_WIDTH; // Start obstacles off-screen right

    obstacles.push({ x: obstacleX, topHeight: topHeight, bottomY: bottomY, passed: false });

    // *** Spawn a coin within the gap based on chance ***
    if (Math.random() < COIN_SPAWN_CHANCE) {
        const coinX = obstacleX + OBSTACLE_WIDTH / 2; // Center coin horizontally with obstacle
        const coinY = topHeight + OBSTACLE_GAP / 2; // Center coin vertically in the gap
        coins.push({ x: coinX, y: coinY });
        // console.log("Coin spawned at:", coinX, coinY); // Log coin spawn
    }

    // Timer reset is handled in updateObstacles
}

// Function to update obstacle positions and handle scoring - MODIFIED for deltaTime
function updateObstacles(deltaTime) {
    // Update obstacle positions
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime; // Use deltaTime

        // Scoring: Check if the obstacle pair has passed the ship's position
        if (!obstacles[i].passed && obstacles[i].x + OBSTACLE_WIDTH < ship.x) {
            score++; // Score for passing obstacle gap
            scoreDisplay.textContent = `Score: ${score}`;
            obstacles[i].passed = true;
        }

        // Remove obstacles that are off-screen
        if (obstacles[i].x + OBSTACLE_WIDTH < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Update and check spawn timer (using deltaTime converted to ms)
    // Ensure timer exists before decrementing
    if (typeof obstacleSpawnTimer === 'number') {
         obstacleSpawnTimer -= deltaTime * 1000; // Decrease timer by elapsed ms
         if (obstacleSpawnTimer <= 0) {
             spawnObstaclePair();
             obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL_MS; // Reset timer
         }
    }
}

// *** Function to update coin positions and check collection ***
function updateCoins(deltaTime) {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= OBSTACLE_SPEED_PER_SECOND * deltaTime; // Coins move with obstacles

        // Check for collision with ship (simple rectangle-circle collision)
        const shipLeft = ship.x - ship.width / 2;
        const shipRight = ship.x + ship.width / 2; // Use nose cone as right edge approx
        const shipTop = shipY - ship.height / 2;
        const shipBottom = shipY + ship.height / 2;

        const coin = coins[i];

        // Find closest point on ship rectangle to coin center
        const closestX = Math.max(shipLeft, Math.min(coin.x, shipRight));
        const closestY = Math.max(shipTop, Math.min(coin.y, shipBottom));

        // Calculate distance between coin center and closest point
        const distX = coin.x - closestX;
        const distY = coin.y - closestY;
        const distanceSquared = (distX * distX) + (distY * distY);

        // If distance is less than coin radius squared, collision!
        if (distanceSquared < (COIN_RADIUS * COIN_RADIUS)) {
            score += COIN_SCORE; // Add coin score
            scoreDisplay.textContent = `Score: ${score}`;
            coinSynth.triggerAttackRelease("A5", "0.1"); // Play coin sound
            coins.splice(i, 1); // Remove collected coin
            // console.log("Coin collected!"); // Log collection
            continue; // Skip to next coin as this one is gone
        }

        // Remove coins that are off-screen
        if (coin.x + COIN_RADIUS < 0) {
            coins.splice(i, 1);
        }
    }
}


// Function to check for collisions between ship and obstacles - No Change
function checkCollisions() {
    for (const pair of obstacles) {
        // Check collision with top obstacle
        if (
            ship.x + ship.width / 2 > pair.x && // Ship right edge past obstacle left edge
            ship.x - ship.width / 2 < pair.x + OBSTACLE_WIDTH && // Ship left edge before obstacle right edge
            shipY - ship.height / 2 < pair.topHeight // Ship top edge above obstacle bottom edge
        ) {
            return true; // Collision with top
        }
        // Check collision with bottom obstacle
        if (
            ship.x + ship.width / 2 > pair.x &&
            ship.x - ship.width / 2 < pair.x + OBSTACLE_WIDTH &&
            shipY + ship.height / 2 > pair.bottomY // Ship bottom edge below obstacle top edge
        ) {
            return true; // Collision with bottom
        }
    }
    return false; // No collision
}

// --- Leaderboard Functions --- No Change

function getLeaderboard() {
    const board = localStorage.getItem(LEADERBOARD_KEY); // Use the constant here
    // console.log("Raw data from localStorage:", board);
    try {
        const parsedBoard = board ? JSON.parse(board) : [];
        // console.log("Parsed leaderboard:", parsedBoard);
        return Array.isArray(parsedBoard) ? parsedBoard : [];
    } catch (e) {
        console.error("Error parsing leaderboard from localStorage:", e);
        return [];
    }
}

function saveLeaderboard(board) {
    try {
        // console.log("Saving leaderboard:", board);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board)); // Use the constant here
    } catch (e) {
        console.error("Error saving leaderboard to localStorage:", e);
    }
}

function checkHighScore(currentScore) {
    const board = getLeaderboard();
    const lowestScore = board.length < LEADERBOARD_MAX_ENTRIES ? 0 : board[board.length - 1].score;
    // console.log(`Checking high score: Current=${currentScore}, Lowest on board (or 0)=${lowestScore}`);
    const isHighScore = currentScore > lowestScore;
    // console.log("Is high score?", isHighScore);
    return isHighScore;
}

function addScoreToLeaderboard(name, score) {
    const board = getLeaderboard();
    const formattedName = name.trim().substring(0, 3).toUpperCase() || "???";
    // console.log(`Adding score: Name=${formattedName}, Score=${score}`);
    board.push({ name: formattedName, score: score });
    board.sort((a, b) => b.score - a.score);
    const updatedBoard = board.slice(0, LEADERBOARD_MAX_ENTRIES);
    saveLeaderboard(updatedBoard);
    displayLeaderboard();
}

function displayLeaderboard() {
    // console.log("Attempting to display leaderboard...");
    const board = getLeaderboard();
    if (!leaderboardList) {
        console.error("Leaderboard list element not found!");
        return;
    }
    leaderboardList.innerHTML = '';
    if (board.length === 0) {
        // console.log("Leaderboard is empty, displaying 'No scores yet!'");
        leaderboardList.innerHTML = '<li>No scores yet!</li>';
        return;
    }
    // console.log(`Populating leaderboard display with ${board.length} entries.`);
    board.forEach((entry, index) => {
        // console.log(`Adding entry ${index}:`, entry);
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

function gameOver() {
    // console.log("Executing gameOver function");
    gameRunning = false; // Stop the game logic execution in the loop
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden');

    currentHighScore = checkHighScore(score);
    if (currentHighScore) {
        // console.log("High score detected, showing name input.");
        nameInputArea.classList.remove('hidden');
        restartButton.classList.add('hidden');
        playerNameInput.value = '';
        playerNameInput.focus();
    } else {
        // console.log("Not a high score, showing restart button.");
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

// MODIFIED resetGame to initialize coins array
function resetGame() {
    // console.log("Executing resetGame function");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = []; // *** Initialize coins array ***
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

    cancelAnimationFrame(animationFrameId);
    // console.log("Requesting first animation frame for gameLoop");
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game Loop --- MODIFIED to update/draw coins
function gameLoop(currentTime) {
    // console.log(`Game Loop - gameRunning: ${gameRunning}, gameStarted: ${gameStarted}`);

    if (!gameRunning) {
        //  console.log("Game loop stopping because gameRunning is false.");
         return;
    }

    if (lastTime === 0) {
        // console.log("Game loop first frame, setting lastTime:", currentTime);
        lastTime = currentTime;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (deltaTime > 0.1) {
        //  console.log("Large deltaTime detected, skipping frame:", deltaTime);
         animationFrameId = requestAnimationFrame(gameLoop);
         return;
    }

    // --- Updates based on deltaTime ---
    updateBackground(deltaTime);
    updateShip(deltaTime);
    updateObstacles(deltaTime);
    updateCoins(deltaTime); // *** Update coins ***

    // --- Drawing ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawObstacles(); // Draw obstacles behind ship/coins
    drawCoins(); // *** Draw coins ***
    drawShip(); // Draw ship on top

    // --- Collision Check ---
    if (checkCollisions()) { // Checks obstacle collision
        gameOver();
    }
    // Coin collision is handled within updateCoins

    // --- Request Next Frame ---
    animationFrameId = requestAnimationFrame(gameLoop);

}

// --- Input Handling ---

// MODIFIED triggerFlap to handle audio context start and play sound
function triggerFlap() {
    // console.log("Executing triggerFlap function");

    // Start Tone.js audio context on first interaction
    if (!audioStarted && typeof Tone !== 'undefined') { // Check if Tone is loaded
        Tone.start();
        audioStarted = true;
        console.log("Audio Context Started");
    }

    if (!gameStarted) {
        // console.log("First flap, calling resetGame()");
        resetGame(); // This now starts the gameLoop
        // Play flap sound on first flap too
        if (audioStarted) flapSynth.triggerAttackRelease("C4", "0.05");
    } else if (gameRunning) {
        //  console.log("Flapping!");
         shipVelocityY = FLAP_VELOCITY;
         if (audioStarted) flapSynth.triggerAttackRelease("C5", "0.05"); // Play flap sound
    } else {
        //  console.log("Flap ignored because game is not running");
    }
}

// Handle jump input (Spacebar) - No Change
function handleKeyDown(e) {
    if (e.code === 'Space') {
        // console.log("Spacebar pressed");
        e.preventDefault();
        triggerFlap();
    }
}

// Handle touch input on the canvas - No Change
function handleTouchStart(e) {
    // console.log("Touch detected on canvas");
    e.preventDefault();
    triggerFlap();
}

// Handle click input on the canvas - NEW
function handleClick(e) {
    // console.log("Click detected on canvas");
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
    // console.log("Initializing display...");
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    coins = []; // *** Initialize coins array ***
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
    } else {
        console.error("Restart button not found!");
    }

    if (submitScoreButton) {
         submitScoreButton.removeEventListener('click', handleSubmitScore);
         submitScoreButton.addEventListener('click', handleSubmitScore);
    } else {
        console.error("Submit score button not found!");
    }

    if (playerNameInput) {
        playerNameInput.removeEventListener('keydown', handleNameSubmitKey);
        playerNameInput.addEventListener('keydown', handleNameSubmitKey);
    } else {
         console.error("Player name input not found!");
    }

    // console.log("Initialization complete. Waiting for first input.");
}

// Initialize the display when the script loads
initializeDisplay();
