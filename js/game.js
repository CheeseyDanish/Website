/**
 * game.js — Brick Breaker, the game on Game.html (unlocked by breaking every skill chip on the front page).
 *
 * Classic breakout on a fixed 800×500 canvas: move the paddle with ←/→ or A/D, or with the mouse/finger;
 * the ball bounces off walls, the paddle and bricks. Clear all 35 bricks to win (and earn the 'bricks'
 * star the first time); lose all 3 lives and it's game over.
 *
 * State machine (see setState):
 *   idle ──Start──▶ running ◀──Pause/Resume──▶ paused
 *                      │
 *                      ├── all bricks gone ──▶ won  ──Play Again──▶ running
 *                      └── lives reach 0   ──▶ lost ──Play Again──▶ running
 *
 * Movement uses pixels per second scaled by the frame time (dt), so speed doesn't depend on the
 * monitor's refresh rate.
 *
 * Load order: after rewards.js on Game.html (Rewards is optional; every use is guarded).
 * Depends on: #gameCanvas, #startGame, #pauseGame, #resetGame, #score and #lives in Game.html;
 *             the --bg/--text theme tokens for the message overlay.
 */

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startGame');
const pauseButton = document.getElementById('pauseGame');
const resetButton = document.getElementById('resetGame');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

// Initialize canvas size
canvas.width = 800;
canvas.height = 500;

// Game state: 'idle' | 'running' | 'paused' | 'won' | 'lost'
let state = 'idle';
let score = 0;
let lives = 3;
let animationFrameId = null;
let lastTime = 0;

// Paddle Properties (speeds are pixels per second, so it plays the same on any monitor)
const paddleWidth = 100;
const paddleHeight = 10;
const paddleSpeed = 480;
let paddleX = (canvas.width - paddleWidth) / 2;

// Ball Properties
const ballRadius = 10;
const ballSpeed = 320;
let ballX = canvas.width / 2;
let ballY = canvas.height - 30;
let ballDX = 0;
let ballDY = 0;

// Brick Properties
const brickRowCount = 5; // set to random number later
const brickColumnCount = 7;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding) - brickPadding)) / 2;

/**
 * Helper function for colourful bricks.
 * @returns {string} a random #RRGGBB colour.
 */
function getRandomBrickColor() {
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    return randomColor;
}

// Create bricks (positions are fixed, so collision never depends on drawing first).
// Indexed bricks[column][row]; status 1 = standing, 0 = broken.
const bricks = Array.from({ length: brickColumnCount }, (_, c) =>
    Array.from({ length: brickRowCount }, (_, r) =>
        ({
            x: c * (brickWidth + brickPadding) + brickOffsetLeft,
            y: r * (brickHeight + brickPadding) + brickOffsetTop,
            status: 1,
            color: getRandomBrickColor()
        }))
);

/**
 * Colours come from the site theme so the board matches light/dark mode.
 * @param {string} name      CSS custom property, e.g. '--bg'.
 * @param {string} fallback  used if the property isn't set.
 * @returns {string}
 */
function themeColor(name, fallback) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
}

//Event Listeners
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
resetButton.addEventListener('click', resetGame);
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
// If the window loses focus mid-press, we never get the keyup: let go of the keys
window.addEventListener('blur', releaseKeys);
// Coming back with the browser's Back/Forward button restores the old page: start fresh
window.addEventListener('pageshow', (e) => { if (e.persisted) toIdle(); });

// Mouse / touch: the paddle follows the pointer over the board
canvas.addEventListener('pointermove', (e) => {
    if (state !== 'running') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    paddleX = Math.min(Math.max(x - paddleWidth / 2, 0), canvas.width - paddleWidth);
});

//keyboard state
let rightPressed = false;
let leftPressed = false;

/** Forget held keys, so the paddle doesn't keep sliding after focus changes or a restart. */
function releaseKeys() {
    rightPressed = false;
    leftPressed = false;
}

/** Stop moving when ←/→ or A/D is released. @param {KeyboardEvent} e */
function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        leftPressed = false;
    }
}

/**
 * Start moving on ←/→ or A/D. While a game is running the arrow keys don't scroll the page.
 * @param {KeyboardEvent} e
 */
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rightPressed = true;
        if (state === 'running') e.preventDefault();
    } else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        leftPressed = true;
        if (state === 'running') e.preventDefault();
    }
}

// Start a brand new game (works from any state: idle, won, lost, paused)
function startGame() {
    if (state === 'running') return;
    if (state === 'paused') return pauseGame();
    newGame();
}

/** Reset score, lives, ball, paddle and bricks, then start the loop. */
function newGame() {
    cancelAnimationFrame(animationFrameId);
    score = 0;
    lives = 3;
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    releaseKeys();
    resetBall();
    resetPaddle();
    resetBricks();
    setState('running');
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Pause / resume
function pauseGame() {
    if (state === 'running') {
        setState('paused');
        cancelAnimationFrame(animationFrameId);
        draw();
    } else if (state === 'paused') {
        setState('running');
        releaseKeys();
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

/** "Reset Game" button: restart from scratch, whatever the current state. */
function resetGame() {
    newGame();
}

// Back to the "press Start" screen
function toIdle() {
    cancelAnimationFrame(animationFrameId);
    score = 0;
    lives = 3;
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    releaseKeys();
    resetBall();
    resetPaddle();
    resetBricks();
    setState('idle');
    draw();
}

/**
 * Change state and keep the buttons in sync: Pause only works while playing, and Start reads
 * "Play Again" after a win or loss.
 * @param {'idle'|'running'|'paused'|'won'|'lost'} next
 */
function setState(next) {
    state = next;
    pauseButton.disabled = !(state === 'running' || state === 'paused');
    pauseButton.textContent = state === 'paused' ? 'Resume Game' : 'Pause Game';
    startButton.textContent = (state === 'won' || state === 'lost') ? 'Play Again' : 'Start Game';
}

/** Put the ball just above the paddle, heading up at a slightly random angle (±0.3 rad from vertical). */
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height - 40;
    // launch slightly to one side so every rally isn't identical
    const angle = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3);
    ballDX = Math.cos(angle) * ballSpeed;
    ballDY = Math.sin(angle) * ballSpeed;
}

/** Centre the paddle. */
function resetPaddle() {
    paddleX = (canvas.width - paddleWidth) / 2;
}

/** Stand every brick back up with a fresh random colour. */
function resetBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r].status = 1;
            bricks[c][r].color = getRandomBrickColor(); // Reset color for new game
        }
    }
}

/** @returns {number} how many bricks are still standing. */
function bricksLeft() {
    let count = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            count += bricks[c][r].status;
        }
    }
    return count;
}

// Collision detection: circle vs. rectangle, bouncing off the side it actually hit.
// Finds the point on the brick nearest the ball's centre; if that's within the radius, it's a hit.
// The larger of the two offsets tells us which face was struck: a horizontal offset means a side hit
// (flip DX), a vertical one means a top/bottom hit (flip DY).
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status !== 1) continue;
            const nearestX = Math.max(b.x, Math.min(ballX, b.x + brickWidth));
            const nearestY = Math.max(b.y, Math.min(ballY, b.y + brickHeight));
            const dx = ballX - nearestX;
            const dy = ballY - nearestY;
            if (dx * dx + dy * dy <= ballRadius * ballRadius) {
                b.status = 0;
                score++;
                scoreDisplay.textContent = score;
                if (Math.abs(dx) > Math.abs(dy)) ballDX = -ballDX;
                else ballDY = -ballDY;
                return; // one brick per frame keeps bounces predictable
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
            const b = bricks[c][r];
            if (b.status === 1) {
                ctx.beginPath();
                ctx.rect(b.x, b.y, brickWidth, brickHeight);
                ctx.fillStyle = b.color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

/**
 * Big message in the middle of the board (theme text on theme background, AAA contrast).
 * @param {string} title
 * @param {string} subtitle
 */
function drawMessage(title, subtitle) {
    ctx.fillStyle = themeColor('--bg', '#1D1814');
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
    ctx.globalAlpha = 1;
    ctx.fillStyle = themeColor('--text', '#F6EDE1');
    ctx.textAlign = 'center';
    ctx.font = '700 36px Fraunces, Georgia, serif';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 4);
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 32);
}

/** Draw one frame: bricks, ball, paddle, then the overlay message for the current state (if any). */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    if (state === 'idle') drawMessage('Brick Breaker', 'Press Start Game to play');
    else if (state === 'paused') drawMessage('Paused', 'Press Resume Game to keep going');
    else if (state === 'won') drawMessage('You win!', `Final score: ${score}`);
    else if (state === 'lost') drawMessage('Game over', `Score: ${score}`);
}

/** All bricks cleared: stop, award the 'bricks' star the first time, and show a toast linking home. */
function winGame() {
    setState('won');
    releaseKeys();
    draw(); // the last brick is already gone, so the final frame shows an empty board
    const firstStar = typeof Rewards !== 'undefined' && Rewards.earn('bricks');
    if (typeof Rewards !== 'undefined') {
        Rewards.toast(
            firstStar
                ? `You cleared every brick! You earned a star. It's on the front page.`
                : `You cleared every brick! Final score: ${score}.`,
            { icon: 'fa-star', link: { href: 'index.html', text: 'Back to the site' } }
        );
    }
}

/** Out of lives: stop and tell the player their score. */
function loseGame() {
    setState('lost');
    releaseKeys();
    draw();
    if (typeof Rewards !== 'undefined') {
        Rewards.toast(`Out of lives. You scored ${score}. Press Play Again to retry.`, { icon: 'fa-heart-crack' });
    }
}

/**
 * Main game loop, one call per animation frame while running.
 * Order: paddle → ball → walls → paddle bounce / lost life → bricks → win check → draw.
 * dt is capped at 33 ms so a hitch (or a backgrounded tab) can't tunnel the ball through a brick.
 * @param {number} now  requestAnimationFrame timestamp in ms.
 */
function gameLoop(now) {
    if (state !== 'running') return;
    const dt = Math.min(0.033, (now - lastTime) / 1000); // seconds since last frame, capped
    lastTime = now;

    //Paddle movement
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX = Math.min(paddleX + paddleSpeed * dt, canvas.width - paddleWidth);
    } else if (leftPressed && paddleX > 0) {
        paddleX = Math.max(paddleX - paddleSpeed * dt, 0);
    }

    // Ball movement
    ballX += ballDX * dt;
    ballY += ballDY * dt;

    // Wall collision (Left/Right)
    if (ballX > canvas.width - ballRadius) { ballX = canvas.width - ballRadius; ballDX = -Math.abs(ballDX); }
    if (ballX < ballRadius) { ballX = ballRadius; ballDX = Math.abs(ballDX); }
    // Wall collision (Top)
    if (ballY < ballRadius) { ballY = ballRadius; ballDY = Math.abs(ballDY); }

    // Paddle collision
    const paddleTop = canvas.height - paddleHeight;
    if (ballDY > 0 && ballY + ballRadius >= paddleTop && ballY < paddleTop + paddleHeight &&
        ballX > paddleX - ballRadius && ballX < paddleX + paddleWidth + ballRadius) {
        // Adjust ball direction based on where it hits the paddle (-1 left edge .. 1 right edge).
        // That maps to up to 60° either side of straight up, so players can aim; speed stays constant.
        const hitPosition = ((ballX - paddleX) / paddleWidth) * 2 - 1;
        const angle = Math.max(-1, Math.min(1, hitPosition)) * (Math.PI / 3);
        ballDX = Math.sin(angle) * ballSpeed;
        ballDY = -Math.cos(angle) * ballSpeed;
        ballY = paddleTop - ballRadius;
    } else if (ballY - ballRadius > canvas.height) {
        // Ball falls below paddle
        lives--;
        livesDisplay.textContent = lives;
        if (lives <= 0) {
            return loseGame();
        }
        resetBall();
        resetPaddle();
    }

    // Collision
    collisionDetection();

    // Check win condition before drawing, so the last brick disappears
    if (bricksLeft() === 0) {
        return winGame();
    }

    draw();

    // Continue game loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

toIdle();
// Redraw once the web fonts arrive so the start message uses them
if (document.fonts) document.fonts.ready.then(() => { if (state === 'idle') draw(); });
