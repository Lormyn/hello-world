// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get DOM elements
const scoreDisplay = document.getElementById('score');
const gameOverDisplay = document.getElementById('game-over');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const startMessage = document.getElementById('start-message');

// --- Game Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
// Spaceship Constants
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 30;
const SHIP_START_X = 150;
const SHIP_START_Y = CANVAS_HEIGHT / 2 - SHIP_HEIGHT / 2;
// Physics Constants
const GRAVITY = 0.3; // Adjusted gravity
const FLAP_FORCE = -6; // Upward force on flap
const MAX_VELOCITY = 8; // Optional: Limit fall speed
// Obstacle Constants
const OBSTACLE_WIDTH = 80; // Width of the vertical obstacles
const OBSTACLE_GAP = 120; // Vertical gap between obstacle pairs
const OBSTACLE_COLOR = '#8b4513'; // Asteroid brown
const OBSTACLE_SPEED = 3; // Speed obstacles move left
const OBSTACLE_SPAWN_RATE = 120; // Frames between new obstacle pairs
// Background Constants
const STAR_COUNT = 100;
const STAR_BASE_SPEED = 0.5;

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let shipY;
let shipVelocityY;
let obstacles; // Array for obstacle pairs { x, topHeight, bottomY, passed }
let score;
let frameCount;
let obstacleSpawnTimer;
let gameRunning;
let gameStarted;
let animationFrameId;
let stars; // Array for background stars

// --- Spaceship Object ---
const ship = {
    x: SHIP_START_X,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    // Colors for spaceship
    bodyColor: '#c0c0c0', // Silver
    windowColor: '#00ffff', // Cyan
    flameColor: '#ff4500' // OrangeRed
};

// --- Functions ---

// Function to draw the background stars - Reuse from previous
function drawBackground() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Function to update star positions - Reuse from previous
function updateBackground() {
    stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < -star.radius) {
            star.x = CANVAS_WIDTH + star.radius;
            star.y = Math.random() * CANVAS_HEIGHT;
        }
    });
}

// Function to draw the spaceship (simple rocket shape)
function drawShip() {
    // Main body (triangle)
    ctx.fillStyle = ship.bodyColor;
    ctx.beginPath();
    ctx.moveTo(ship.x, shipY + ship.height / 2); // Nose cone
    ctx.lineTo(ship.x - ship.width / 2, shipY - ship.height / 2); // Top back wing
    ctx.lineTo(ship.x - ship.width / 2, shipY + ship.height / 2); // Bottom back wing
    ctx.closePath();
    ctx.fill();

    // Window (small circle)
    ctx.fillStyle = ship.windowColor;
    ctx.beginPath();
    ctx.arc(ship.x - ship.width * 0.1, shipY, ship.height / 5, 0, Math.PI * 2);
    ctx.fill();

    // Flame when flapping/moving up (optional visual feedback)
    if (shipVelocityY < -1) { // Show flame if moving up significantly
        ctx.fillStyle = ship.flameColor;
        ctx.beginPath();
        ctx.moveTo(ship.x - ship.width / 2, shipY - ship.height * 0.3);
        ctx.lineTo(ship.x - ship.width * 0.8, shipY); // Flame point 1
        ctx.lineTo(ship.x - ship.width / 2, shipY + ship.height * 0.3);
        ctx.closePath();
        ctx.fill();
    }
}


// Function to draw obstacle pairs
function drawObstacles() {
    ctx.fillStyle = OBSTACLE_COLOR;
    obstacles.forEach(pair => {
        // Draw top obstacle
        ctx.fillRect(pair.x, 0, OBSTACLE_WIDTH, pair.topHeight);
        // Draw bottom obstacle
        ctx.fillRect(pair.x, pair.bottomY, OBSTACLE_WIDTH, CANVAS_HEIGHT - pair.bottomY);
    });
}

// Function to update ship position (gravity and flap)
function updateShip() {
    shipVelocityY += GRAVITY;
    // Optional: Limit fall speed
    // if (shipVelocityY > MAX_VELOCITY) {
    //     shipVelocityY = MAX_VELOCITY;
    // }
    shipY += shipVelocityY;

    // Check for collision with top/bottom boundaries
    if (shipY < 0 || shipY + ship.height > CANVAS_HEIGHT) {
        gameOver();
    }
}

// Function to spawn a new obstacle pair
function spawnObstaclePair() {
    // Calculate maximum possible height for the top obstacle
    // ensuring the gap and minimum bottom obstacle height
    const maxTopHeight = CANVAS_HEIGHT - OBSTACLE_GAP - 20; // Min 20px for bottom obstacle
    const minTopHeight = 20; // Min 20px for top obstacle

    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
    const bottomY = topHeight + OBSTACLE_GAP;

    obstacles.push({
        x: CANVAS_WIDTH,
        topHeight: topHeight,
        bottomY: bottomY,
        passed: false // Flag to track scoring
    });

    obstacleSpawnTimer = OBSTACLE_SPAWN_RATE;
}

// Function to update obstacle positions and handle scoring
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;

        // Scoring: Check if the obstacle pair has passed the ship's position
        if (!obstacles[i].passed && obstacles[i].x + OBSTACLE_WIDTH < ship.x) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            obstacles[i].passed = true;
        }

        // Remove obstacles that are off-screen
        if (obstacles[i].x + OBSTACLE_WIDTH < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Decrease spawn timer and spawn if ready
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstaclePair();
    }
}

// Function to check for collisions between ship and obstacles
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

// Function to handle game over state - NO CHANGE needed
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden');
}

// Function to initialize star positions - Reuse from previous
function initializeStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 1.5 + 0.5,
            speed: STAR_BASE_SPEED + Math.random() * 1.0
        });
    }
}

// Function to reset the game state for starting or restarting
function resetGame() {
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    score = 0;
    frameCount = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_RATE / 2; // Spawn first obstacle faster
    gameRunning = true;
    gameStarted = true;

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverDisplay.classList.add('hidden');
    startMessage.classList.add('hidden');

    initializeStars(); // Initialize stars on reset

    cancelAnimationFrame(animationFrameId);
    // Don't spawn obstacle immediately, wait for timer
    gameLoop();
}

// --- Game Loop ---
function gameLoop() {
    if (!gameRunning) return;

    // 1. Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Update Background
    updateBackground();

    // 3. Draw Background
    drawBackground();

    // 4. Update Game Elements
    updateShip(); // Update ship physics
    updateObstacles(); // Update obstacles & scoring

    // 5. Draw Game Elements
    drawShip(); // Draw spaceship
    drawObstacles(); // Draw vertical obstacles

    // 6. Check for collisions (obstacles)
    if (checkCollisions()) {
        gameOver();
        return;
    }
    // Note: Boundary collision is checked within updateShip()

    // 7. Increment frame count
    frameCount++;

    // 8. Request the next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---

// Function to trigger flap action
function triggerFlap() {
    if (!gameStarted) {
        // First input starts the game
        resetGame();
    } else if (gameRunning) {
        // Flap only if game is running
        shipVelocityY = FLAP_FORCE; // Apply upward thrust
    }
}

// Handle jump input (Spacebar)
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        triggerFlap(); // Call the flap function
    }
}

// Handle touch input on the canvas
function handleTouchStart(e) {
    e.preventDefault();
    triggerFlap(); // Call the flap function
}

// Handle restart button click - NO CHANGE
function handleRestart() {
    resetGame();
}

// --- Initial Setup ---
// Function to draw the initial state
function initializeDisplay() {
    shipY = SHIP_START_Y;
    shipVelocityY = 0;
    obstacles = [];
    score = 0;
    gameRunning = false;
    gameStarted = false;

    initializeStars();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawShip(); // Draw the ship in starting position

    startMessage.classList.remove('hidden');
    gameOverDisplay.classList.add('hidden');
    scoreDisplay.textContent = `Score: 0`;

    // Add event listeners only once during initialization
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchstart', handleTouchStart);

    restartButton.removeEventListener('click', handleRestart);
    restartButton.addEventListener('click', handleRestart);
}

// Initialize the display when the script loads
initializeDisplay();
