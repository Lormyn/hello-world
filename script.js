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
const PLAYER_WIDTH = 40; // Pixel size
const PLAYER_HEIGHT = 40; // Pixel size
const GROUND_Y = CANVAS_HEIGHT - PLAYER_HEIGHT; // Y position of the ground
const GRAVITY = 0.6;
const JUMP_FORCE = -12; // Negative value for upward force
const OBSTACLE_WIDTH = 30; // Pixel size
const OBSTACLE_HEIGHT = 60; // Pixel size
const OBSTACLE_SPEED = 5;
const OBSTACLE_SPAWN_RATE_MIN = 90; // Minimum frames between spawns
const OBSTACLE_SPAWN_RATE_RANGE = 60; // Random additional frames

// Set canvas dimensions
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
let gameRunning; // Is the game loop active?
let gameStarted; // Has the game been started at least once?
let animationFrameId; // To store the ID for requestAnimationFrame

// --- Player Object ---
const player = {
    x: 50,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#00ff00' // Green pixel ship
};

// --- Functions ---

// Function to draw the player (a simple square for pixel effect)
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, playerY, player.width, player.height);
}

// Function to draw an obstacle (a simple square)
function drawObstacle(obstacle) {
    ctx.fillStyle = '#ff0000'; // Red pixel obstacle
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

// Function to update player position (gravity and jump)
function updatePlayer() {
    // Apply gravity only if airborne or jumping
    if (playerY < GROUND_Y || isJumping) {
        playerVelocityY += GRAVITY;
        playerY += playerVelocityY;
    }

    // Prevent falling through the floor
    if (playerY > GROUND_Y) {
        playerY = GROUND_Y;
        playerVelocityY = 0;
        isJumping = false; // Landed
    }
}

// Function to spawn a new obstacle
function spawnObstacle() {
    const height = OBSTACLE_HEIGHT;
    const y = CANVAS_HEIGHT - height; // Obstacle sits on the ground
    obstacles.push({
        x: CANVAS_WIDTH,
        y: y,
        width: OBSTACLE_WIDTH,
        height: height
    });
    // Reset spawn timer with randomness
    obstacleSpawnTimer = Math.floor(Math.random() * OBSTACLE_SPAWN_RATE_RANGE) + OBSTACLE_SPAWN_RATE_MIN;
}

// Function to update obstacle positions and remove off-screen ones
function updateObstacles() {
    let scoredThisFrame = false; // Prevent multiple score increments if obstacles overlap off-screen
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;

        // Remove obstacles that are off-screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            // Increase score when an obstacle is passed (removed)
            // Only score if game is active and haven't scored this frame yet
            if(gameRunning && !scoredThisFrame) {
               score++;
               scoreDisplay.textContent = `Score: ${score}`;
               scoredThisFrame = true; // Ensure score increments only once per frame max
            }
        }
    }
     // Decrease spawn timer and spawn if ready
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
    }
}

// Function to check for collisions between player and obstacles
function checkCollisions() {
    for (const obstacle of obstacles) {
        // Simple AABB (Axis-Aligned Bounding Box) collision detection
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            playerY < obstacle.y + obstacle.height &&
            playerY + player.height > obstacle.y
        ) {
            return true; // Collision detected
        }
    }
    return false; // No collision
}

// Function to handle game over state
function gameOver() {
    gameRunning = false; // Stop the game logic
    cancelAnimationFrame(animationFrameId); // Stop the animation loop
    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    startMessage.classList.add('hidden'); // Ensure start message is hidden
}

// Function to reset the game state for starting or restarting
function resetGame() {
    playerY = GROUND_Y; // Start on the ground
    playerVelocityY = 0;
    isJumping = false;
    obstacles = [];
    score = 0;
    frameCount = 0;
    obstacleSpawnTimer = OBSTACLE_SPAWN_RATE_MIN; // Initial spawn timer
    gameRunning = true; // Set game to running
    gameStarted = true; // Game has now officially started (or restarted)

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverDisplay.classList.add('hidden'); // Hide game over screen
    startMessage.classList.add('hidden'); // Hide start message

    // Clear any previous animation frame request
    cancelAnimationFrame(animationFrameId);

    // Spawn the first obstacle relatively quickly
    spawnObstacle();

    // Start the game loop
    gameLoop();
}

// --- Game Loop ---
function gameLoop() {
    // Stop the loop if game is not running (e.g., after game over)
    if (!gameRunning) return;

    // 1. Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Update game elements
    updatePlayer();
    updateObstacles();

    // 3. Draw game elements
    drawPlayer();
    obstacles.forEach(drawObstacle);

    // 4. Check for collisions
    if (checkCollisions()) {
        gameOver(); // Handle game over state
        return; // Exit loop immediately on game over
    }

    // 5. Increment frame count (can be used for difficulty scaling later)
    frameCount++;

    // 6. Request the next frame and store the ID
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---

// Handle jump input (Spacebar)
function handleInput(e) {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent spacebar from scrolling the page

        if (!gameStarted) {
            // First spacebar press starts the game
            resetGame(); // Initialize and start the game
        } else if (gameRunning && !isJumping && playerY === GROUND_Y) {
             // Subsequent spacebar presses during the game trigger jump
             // Only allow jump if on the ground
            playerVelocityY = JUMP_FORCE;
            isJumping = true;
        }
    }
}

// Handle restart button click
function handleRestart() {
    resetGame(); // Reset game state and start the loop again
}

// --- Initial Setup ---
// Function to draw the initial state (player on ground, start message)
function initializeDisplay() {
    playerY = GROUND_Y; // Place player on ground visually
    playerVelocityY = 0;
    isJumping = false;
    obstacles = []; // Clear any potential leftover obstacles
    score = 0;
    gameRunning = false; // Game is not running initially
    gameStarted = false; // Game hasn't started yet

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas
    drawPlayer(); // Draw the player in starting position

    startMessage.classList.remove('hidden'); // Show start message
    gameOverDisplay.classList.add('hidden'); // Ensure game over is hidden
    scoreDisplay.textContent = `Score: 0`; // Reset score display

    // Add event listeners only once during initialization
    window.removeEventListener('keydown', handleInput); // Remove first to prevent duplicates
    window.addEventListener('keydown', handleInput);

    restartButton.removeEventListener('click', handleRestart); // Remove first
    restartButton.addEventListener('click', handleRestart);
}

// Initialize the display when the script loads
initializeDisplay();
