/**
 * 吃糖豆游戏 - 主游戏文件
 * 模块化设计，包含迷宫生成、角色控制、敌人AI、碰撞检测等功能
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    CELL_SIZE: 40,
    PLAYER_RADIUS: 15,
    ENEMY_RADIUS: 14,
    CANDY_RADIUS: 8,
    PLAYER_SPEED: 4,
    ENEMY_SPEED: 2.5,
    WALL_COLOR: '#4a5568',
    PATH_COLOR: '#1a1a2e',
    PLAYER_COLOR: '#ffd700',
    ENEMY_COLOR: '#ef4444',
    CANDY_COLOR: '#10b981'
};

// ==================== 游戏状态 ====================
const GameState = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    WIN: 'win'
};

// ==================== 全局变量 ====================
let canvas, ctx;
let gameState = GameState.WAITING;
let score = 0;
let maze = [];
let player = null;
let enemy = null;
let candies = [];
let animationId = null;

// ==================== 迷宫生成模块 ====================
class MazeGenerator {
    constructor(width, height) {
        this.cols = Math.floor(width / CONFIG.CELL_SIZE);
        this.rows = Math.floor(height / CONFIG.CELL_SIZE);
        this.maze = [];
    }

    generate() {
        for (let y = 0; y < this.rows; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.maze[y][x] = 1;
            }
        }

        this._carve(1, 1);

        for (let y = 0; y < this.rows; y++) {
            this.maze[y][0] = 1;
            this.maze[y][this.cols - 1] = 1;
        }
        for (let x = 0; x < this.cols; x++) {
            this.maze[0][x] = 1;
            this.maze[this.rows - 1][x] = 1;
        }

        return this.maze;
    }

    _carve(x, y) {
        this.maze[y][x] = 0;

        const directions = [
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ].sort(() => Math.random() - 0.5);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1 && this.maze[ny][nx] === 1) {
                this.maze[y + dy / 2][x + dx / 2] = 0;
                this._carve(nx, ny);
            }
        }
    }

    getEmptyPositions() {
        const positions = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 0) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }
}

// ==================== 玩家类 ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.speed = CONFIG.PLAYER_SPEED;
        this.color = CONFIG.PLAYER_COLOR;
        this.dx = 0;
        this.dy = 0;
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
    }

    update() {
        this.dx = 0;
        this.dy = 0;

        if (this.keys.ArrowUp) this.dy = -this.speed;
        if (this.keys.ArrowDown) this.dy = this.speed;
        if (this.keys.ArrowLeft) this.dx = -this.speed;
        if (this.keys.ArrowRight) this.dx = this.speed;

        const nextX = this.x + this.dx;
        const nextY = this.y + this.dy;

        if (!CollisionDetector.checkWallCollision(nextX, this.y, this.radius)) {
            this.x = nextX;
        }
        if (!CollisionDetector.checkWallCollision(this.x, nextY, this.radius)) {
            this.y = nextY;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
    }

    setKeyState(key, state) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = state;
        }
    }
}

// ==================== 敌人类 ====================
class Enemy {
    constructor(x, y, patrolPath) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.ENEMY_RADIUS;
        this.speed = CONFIG.ENEMY_SPEED;
        this.color = CONFIG.ENEMY_COLOR;
        this.patrolPath = patrolPath;
        this.currentPathIndex = 0;
        this.pathProgress = 0;
    }

    update() {
        if (this.patrolPath.length < 2) return;

        const currentTarget = this.patrolPath[this.currentPathIndex];
        const nextIndex = (this.currentPathIndex + 1) % this.patrolPath.length;
        const nextTarget = this.patrolPath[nextIndex];

        const targetX = nextTarget.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        const targetY = nextTarget.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.x = targetX;
            this.y = targetY;
            this.currentPathIndex = nextIndex;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
    }

    static generatePatrolPath(maze, startX, startY) {
        const path = [{ x: startX, y: startY }];
        const cols = maze[0].length;
        const rows = maze.length;

        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];

        let currentX = startX;
        let currentY = startY;
        const visited = new Set();
        visited.add(`${currentX},${currentY}`);

        for (let i = 0; i < 8; i++) {
            const validMoves = [];

            for (const dir of directions) {
                const newX = currentX + dir.dx;
                const newY = currentY + dir.dy;
                const key = `${newX},${newY}`;

                if (newX > 0 && newX < cols - 1 &&
                    newY > 0 && newY < rows - 1 &&
                    maze[newY][newX] === 0 &&
                    !visited.has(key)) {
                    validMoves.push({ x: newX, y: newY });
                }
            }

            if (validMoves.length > 0) {
                const nextMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                path.push(nextMove);
                visited.add(`${nextMove.x},${nextMove.y}`);
                currentX = nextMove.x;
                currentY = nextMove.y;
            } else {
                break;
            }
        }

        return path;
    }
}

// ==================== 糖豆类 ====================
class Candy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.CANDY_RADIUS;
        this.color = CONFIG.CANDY_COLOR;
        this.collected = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    draw(ctx) {
        if (this.collected) return;

        this.pulsePhase += 0.1;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
        const currentRadius = this.radius * pulse;

        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, currentRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
    }
}

// ==================== 碰撞检测模块 ====================
class CollisionDetector {
    static checkWallCollision(x, y, radius) {
        const cols = maze[0].length;
        const rows = maze.length;

        const left = Math.floor((x - radius) / CONFIG.CELL_SIZE);
        const right = Math.floor((x + radius) / CONFIG.CELL_SIZE);
        const top = Math.floor((y - radius) / CONFIG.CELL_SIZE);
        const bottom = Math.floor((y + radius) / CONFIG.CELL_SIZE);

        for (let row = top; row <= bottom; row++) {
            for (let col = left; col <= right; col++) {
                if (row >= 0 && row < rows && col >= 0 && col < cols) {
                    if (maze[row][col] === 1) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    static checkCircleCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }

    static checkCandyCollection(player, candy) {
        if (candy.collected) return false;
        const dx = player.x - candy.x;
        const dy = player.y - candy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < player.radius + candy.radius + 5;
    }
}

// ==================== 游戏渲染模块 ====================
class Renderer {
    static drawMaze(ctx) {
        const cols = maze[0].length;
        const rows = maze.length;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cellX = x * CONFIG.CELL_SIZE;
                const cellY = y * CONFIG.CELL_SIZE;

                if (maze[y][x] === 1) {
                    ctx.fillStyle = CONFIG.WALL_COLOR;
                    ctx.fillRect(cellX, cellY, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);

                    ctx.strokeStyle = '#2d3748';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(cellX, cellY, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
                } else {
                    ctx.fillStyle = CONFIG.PATH_COLOR;
                    ctx.fillRect(cellX, cellY, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
                }
            }
        }
    }

    static drawGame(ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawMaze(ctx);

        candies.forEach(candy => candy.draw(ctx));

        enemy.draw(ctx);

        player.draw(ctx);
    }

    static showGameOver(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }

    static showWin(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('恭喜获胜！', canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }
}

// ==================== 游戏管理模块 ====================
class GameManager {
    static init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;

        this.setupEventListeners();
        this.resetGame();
    }

    static resetGame() {
        score = 0;
        this.updateScore();

        const mazeGenerator = new MazeGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        maze = mazeGenerator.generate();

        const emptyPositions = mazeGenerator.getEmptyPositions();

        const playerPos = emptyPositions[0];
        player = new Player(
            playerPos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            playerPos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
        );

        const enemyStartPos = emptyPositions[Math.floor(emptyPositions.length / 2)];
        const patrolPath = Enemy.generatePatrolPath(maze, enemyStartPos.x, enemyStartPos.y);
        enemy = new Enemy(
            enemyStartPos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            enemyStartPos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            patrolPath
        );

        candies = [];
        const candyPositions = emptyPositions.filter((_, index) => index % 3 === 0 && index > 2);
        candyPositions.forEach(pos => {
            const candy = new Candy(
                pos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
                pos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
            );
            candies.push(candy);
        });

        gameState = GameState.WAITING;
        this.updateMessage('按任意方向键开始游戏', false);
    }

    static startGame() {
        if (gameState === GameState.WAITING) {
            gameState = GameState.PLAYING;
            this.updateMessage('使用方向键移动，收集所有糖豆！', false);
            this.gameLoop();
        }
    }

    static renderInitialState() {
        Renderer.drawGame(ctx);
    }

    static gameLoop() {
        if (gameState !== GameState.PLAYING) return;

        player.update();
        enemy.update();

        candies.forEach(candy => {
            if (CollisionDetector.checkCandyCollection(player, candy)) {
                candy.collected = true;
                score++;
                this.updateScore();
            }
        });

        if (CollisionDetector.checkCircleCollision(player, enemy)) {
            gameState = GameState.GAME_OVER;
            this.updateMessage('按空格重新开始', true);
            Renderer.showGameOver(ctx);
            return;
        }

        const allCollected = candies.every(candy => candy.collected);
        if (allCollected) {
            gameState = GameState.WIN;
            this.updateMessage('按空格重新开始', true);
            Renderer.showWin(ctx);
            return;
        }

        Renderer.drawGame(ctx);
        animationId = requestAnimationFrame(() => this.gameLoop());
    }

    static updateScore() {
        document.getElementById('score').textContent = score;
    }

    static updateMessage(text, highlight) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.textContent = text;
        if (highlight) {
            messageElement.classList.add('highlight');
        } else {
            messageElement.classList.remove('highlight');
        }
    }

    static setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                
                if (gameState === GameState.WAITING) {
                    this.startGame();
                }

                if (gameState === GameState.PLAYING) {
                    player.setKeyState(e.key, true);
                }
            }

            if (gameState === GameState.GAME_OVER || gameState === GameState.WIN) {
                if (e.key === ' ') {
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                    }
                    this.resetGame();
                }
                return;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                
                if (gameState === GameState.PLAYING) {
                    player.setKeyState(e.key, false);
                }
            }
        });
    }
}

// ==================== 游戏入口 ====================
window.addEventListener('load', () => {
    GameManager.init();
    GameManager.renderInitialState();
});
