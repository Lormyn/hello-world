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
// Adjust player size slightly for astronaut shape
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const GROUND_Y = CANVAS_HEIGHT - PLAYER_HEIGHT; // Y position of the ground
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
// Obstacle Constants
const OBSTACLE_SPEED = 5;
const OBSTACLE_SPAWN_RATE_MIN = 75; // Spawn a bit faster
const OBSTACLE_SPAWN_RATE_RANGE = 50;
const OBSTACLE_TYPES = [
    { type: 'asteroid_small', width: 30, height: 30, color: '#8b4513' }, // Brown
    { type: 'asteroid_large', width: 50, height: 50, color: '#a0522d' }, // Sienna
    { type: 'asteroid_tall', width: 25, height: 60, color: '#708090' }, // Slate Gray
];
// Background Constants
const STAR_COUNT = 100;
const STAR_BASE_SPEED = 0.5;

// Set canvas logical dimensions
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Game Variables ---
let playerY;
let playerVelocityY;
let isJumping;
let obstacles;
let score;
let frameCount;
let obstacleSpawnTimer;
let gameRunning;
let gameStarted;
let animationFrameId;
let stars; // Array for background stars

// --- Player Object ---
// Player X position remains constant
const player = {
    x: 50,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    // Colors for astronaut
    bodyColor: '#ffffff', // White suit
    visorColor: '#0000ff', // Blue visor
};

// --- Functions ---

// Function to draw the background stars
function drawBackground() {
    // Black space background is set by CSS on canvas
    ctx.fillStyle = '#fff'; // Star color
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Function to update star positions for parallax effect
function updateBackground() {
    stars.forEach(star => {
        star.x -= star.speed;
        // Wrap stars around
        if (star.x < -star.radius) {
            star.x = CANVAS_WIDTH + star.radius;
            star.y = Math.random() * CANVAS_HEIGHT; // Reset Y position too
        }
    });
}

// Function to draw the player as a simple astronaut
function drawPlayer() {
    const bodyX = player.x;
    const bodyY = playerY + PLAYER_HEIGHT * 0.2; // Start body lower
    const bodyW = player.width;
    const bodyH = PLAYER_HEIGHT * 0.8;

    const headRadius = player.width / 2;
    const headX = player.x + player.width / 2;
    const headY = playerY + headRadius;

    // Draw body (rectangle)
    ctx.fillStyle = player.bodyColor;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    // Draw helmet (circle)
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = player.bodyColor; // White helmet
    ctx.fill();

    // Draw visor (smaller rectangle on helmet)
    ctx.fillStyle = player.visorColor;
    ctx.fillRect(headX - headRadius * 0.6, headY - headRadius * 0.4, headRadius * 1.2, headRadius * 0.8);

    // Simple legs (optional)
    // ctx.fillStyle = player.bodyColor;
    // ctx.fillRect(bodyX + bodyW * 0.1, bodyY + bodyH, bodyW * 0.3, PLAYER_HEIGHT * 0.2);
    // ctx.fillRect(bodyX + bodyW * 0.6, bodyY + bodyH, bodyW * 0.3, PLAYER_HEIGHT * 0.2);
}


// Function to draw varied obstacles
function drawObstacle(obstacle) {
    ctx.fillStyle = obstacle.color;
    // Simple rectangle for now, could add more complex shapes
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

// Function to update player position (gravity and jump) - NO CHANGE
function updatePlayer() {
    if (playerY < GROUND_Y || isJumping) {
        playerVelocityY += GRAVITY;
        playerY += playerVelocityY;
    }
    if (playerY > GROUND_Y) {
        playerY = GROUND_Y;
        playerVelocityY = 0;
        isJumping = false;
    }
}

// Function to spawn a new, varied obstacle
function spawnObstacle() {
    // Randomly select an obstacle type
    const typeIndex = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    const obstacleType = OBSTACLE_TYPES[typeIndex];

    const y = CANVAS_HEIGHT - obstacleType.height; // Obstacle sits on the ground

    obstacles.push({
        x: CANVAS_WIDTH,
        y: y,
        width: obstacleType.width,
        height: obstacleType.height,
        color: obstacleType.color,
        type: obstacleType.type // Store type if needed later
    });
    // Reset spawn timer with randomness
    obstacleSpawnTimer = Math.floor(Math.random() * OBSTACLE_SPAWN_RATE_RANGE) + OBSTACLE_SPAWN_RATE_MIN;
}

// Function to update obstacle positions and remove off-screen ones - NO CHANGE
function updateObstacles() {
    let scoredThisFrame = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            if(gameRunning && !scoredThisFrame) {
               score++;
               scoreDisplay.textContent = `Score: ${score}`;
               scoredThisFrame = true;
            }
        }
    }
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
    }
}

// Function to check for collisions between player and obstacles - NO CHANGE
function checkCollisions() {
    for (const obstacle of obstacles) {
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            playerY < obstacle.y + obstacle.height &&
            playerY + player.height > obstacle.y
        ) {
            return true;
        }
    }
    return false;
}

// Function to handle game over state - NO CHANGE
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden');
}

// Function to initialize star positions
function initializeStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 1.5 + 0.5, // Small stars
            // Add slight speed variation for parallax
            speed: STAR_BASE_SPEED + Math.random() * 1.0
        });
    }
}


// Function to reset the game state for starting or restarting
function resetGame() {
    playerY = GROUND_Y;
    playerVelocityY = 0;
    isJumping = false;
    obstacles = [];
    score = 0;
    frameCount = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_RATE_MIN;
    gameRunning = true;
    gameStarted = true;

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverDisplay.classList.add('hidden');
    startMessage.classList.add('hidden');

    initializeStars(); // Initialize stars on reset

    cancelAnimationFrame(animationFrameId);
    spawnObstacle();
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
    drawBackground(); // Draw stars first

    // 4. Update Game Elements
    updatePlayer();
    updateObstacles();

    // 5. Draw Game Elements
    drawPlayer(); // Draw astronaut
    obstacles.forEach(drawObstacle); // Draw varied obstacles

    // 6. Check for collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }

    // 7. Increment frame count
    frameCount++;

    // 8. Request the next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---

// Function to trigger jump action - NO CHANGE
function triggerJump() {
    if (!gameStarted) {
        resetGame();
    } else if (gameRunning && !isJumping && playerY === GROUND_Y) {
        playerVelocityY = JUMP_FORCE;
        isJumping = true;
    }
}

// Handle jump input (Spacebar) - NO CHANGE
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
    }
}

// Handle touch input on the canvas - NO CHANGE
function handleTouchStart(e) {
    e.preventDefault();
    triggerJump();
}

// Handle restart button click - NO CHANGE
function handleRestart() {
    resetGame();
}

// --- Initial Setup ---
// Function to draw the initial state (player on ground, start message)
function initializeDisplay() {
    playerY = GROUND_Y;
    playerVelocityY = 0;
    isJumping = false;
    obstacles = [];
    score = 0;
    gameRunning = false;
    gameStarted = false;

    initializeStars(); // Initialize stars for the initial view

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(); // Draw initial background
    drawPlayer(); // Draw the player in starting position

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
