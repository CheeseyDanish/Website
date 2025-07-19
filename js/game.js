// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startGame');
const pauseButton = document.getElementById('pauseGame');
const resetButton = document.getElementById('resetGame');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

// Game state variables
let score = 0;
let lives = 3;
let gameRunning = false;
let gamePaused = false;
let animationFrameId = null;

// Initialize canvas size
canvas.width = 800;
canvas.height = 500;

// Paddle Properties
const paddleWidth = 100;
const paddleHeight = 10;
const paddleSpeed = 5;
let paddleX = (canvas.width - paddleWidth) / 2;

// Ball Properties
const ballRadius = 10;
let ballX = canvas.width / 2;
let ballY = canvas.height - 30;
let ballDX = 2;
let ballDY = -2;

// Brick Properties
const brickRowCount = 5; // set to random number later
const brickColumnCount = 7;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;

// helper function for colorful bricks
function getRandomBrickColor() {
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    return randomColor;
}

// Create bricks
const bricks = Array.from({ length: brickColumnCount }, () => 
    Array.from({ length: brickRowCount }, () => 
        ({
            x: 0,
            y: 0,
            status: 1,
            color: getRandomBrickColor()
        }))
);

//Event Listeners
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
resetButton.addEventListener('click', resetGame);
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

//keyboard state
let rightPressed = false;
let leftPressed = false;

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
}
// Start the game function
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        score = 0;
        lives = 3;
        scoreDisplay.textContent = score;
        livesDisplay.textContent = lives;
        resetBall();
        resetPaddle();
        resetBricks();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Pause the game function
function pauseGame() {
    gamePaused = !gamePaused;
    if (!gamePaused) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId); // Stop the game loop
    startGame();
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    ballDX = 2;
    ballDY = -2;
}

function resetPaddle() {
    paddleX = (canvas.width - paddleWidth) / 2; 
}

function resetBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r].status = 1;
            bricks[c][r].color = getRandomBrickColor(); // Reset color for new game
        }
    }
}

// Collision detection
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ballX > b.x && ballX < b.x + brickWidth && ballY > b.y && ballY < b.y + brickHeight) {
                    ballDY = -ballDY;
                    b.status = 0;
                    score++;
                    scoreDisplay.textContent = score;
                }
            }
        }
    }
}

//Draw functions
function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0095DD';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = '#0095DD';
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// Main game loop
function gameLoop() {
    if (!gameRunning || gamePaused) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    drawBricks();
    drawBall();
    drawPaddle();

    // Collision
    collisionDetection();

    // Ball movement
    ballX += ballDX;
    ballY += ballDY;

    // Wall collision (Left/Right)
    if (ballX + ballDX > canvas.width - ballRadius || ballX + ballDX < ballRadius) {
        ballDX = -ballDX;
    }
    // Wall collision (Top)
    if (ballY + ballDY < ballRadius) {
        ballDY = -ballDY;
    } else if (ballY + ballDY > canvas.height - ballRadius) {
        // Paddle collision
        if (ballX > paddleX && ballX < paddleX + paddleWidth) {
            ballDY = -ballDY;

            // Adjust ball direction based on where it hits the paddle
            const hitPosition = (ballX - paddleX) / paddleWidth;
            ballDX = 2 * hitPosition - 1;// Adjust multiplier for different angles
        } else {
            // Ball falls below paddle
            lives--;
            livesDisplay.textContent = lives;
            if (lives <= 0) {
                alert('Game Over! Your score was: ' + score);
                resetGame();
                gameRunning = false;
                cancelAnimationFrame(animationFrameId); // Stop the game loop
            } else {
                resetBall();
            }
        }
    }

//Paddle movement
if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += paddleSpeed;
} else if (leftPressed && paddleX > 0) {
    paddleX -= paddleSpeed;
}

// Check win condition
if (score === brickRowCount * brickColumnCount) {
    alert('You win! Final Score: ' + score);
    gameRunning = false;
    gamePaused = false;
}

// Continue game loop
animationFrameId = requestAnimationFrame(gameLoop);

}
