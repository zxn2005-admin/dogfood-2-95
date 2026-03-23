/**
 * 吃糖豆小游戏
 * 基于 HTML5 Canvas 技术实现
 * 模块化设计：迷宫生成、角色控制、敌人AI、碰撞检测、游戏状态管理
 */

// ============================================
// 游戏配置常量
// ============================================
const CONFIG = {
    // 画布设置
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    
    // 迷宫设置
    CELL_SIZE: 30,
    WALL_COLOR: '#2c3e50',
    PATH_COLOR: '#0a0a0a',
    
    // 玩家设置
    PLAYER_RADIUS: 10,
    PLAYER_COLOR: '#feca57',
    PLAYER_SPEED: 2.5,
    
    // 敌人设置
    ENEMY_RADIUS: 10,
    ENEMY_COLOR: '#ff6b6b',
    ENEMY_SPEED: 1.8,
    
    // 糖豆设置
    DOT_RADIUS: 4,
    DOT_COLOR: '#48dbfb',
    DOT_GLOW_COLOR: 'rgba(72, 219, 251, 0.5)',
    
    // 游戏状态
    STATE: {
        WAITING: 'waiting',
        PLAYING: 'playing',
        GAME_OVER: 'gameOver',
        VICTORY: 'victory'
    }
};

// ============================================
// 迷宫生成模块
// ============================================
class MazeGenerator {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.grid = [];
        this.generate();
    }

    /**
     * 生成迷宫地图
     * 使用递归回溯算法生成完美迷宫
     */
    generate() {
        // 初始化网格，全部设为墙
        this.grid = Array(this.rows).fill(null).map(() => 
            Array(this.cols).fill(1)
        );

        // 从起点开始生成
        this.carve(1, 1);
        
        // 确保边界是墙
        this.addBorders();
        
        // 添加一些额外的通道，使迷宫不那么复杂
        this.addExtraPaths();
    }

    /**
     * 递归回溯 carve 算法
     * @param {number} x - 当前 x 坐标
     * @param {number} y - 当前 y 坐标
     */
    carve(x, y) {
        this.grid[y][x] = 0; // 0 表示通道

        // 随机方向
        const directions = [
            { dx: 0, dy: -2 }, // 上
            { dx: 2, dy: 0 },  // 右
            { dx: 0, dy: 2 },  // 下
            { dx: -2, dy: 0 }  // 左
        ].sort(() => Math.random() - 0.5);

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (this.isValid(nx, ny) && this.grid[ny][nx] === 1) {
                // 打通墙壁
                this.grid[y + dir.dy / 2][x + dir.dx / 2] = 0;
                this.carve(nx, ny);
            }
        }
    }

    /**
     * 检查坐标是否有效
     */
    isValid(x, y) {
        return x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1;
    }

    /**
     * 添加边界墙
     */
    addBorders() {
        for (let x = 0; x < this.cols; x++) {
            this.grid[0][x] = 1;
            this.grid[this.rows - 1][x] = 1;
        }
        for (let y = 0; y < this.rows; y++) {
            this.grid[y][0] = 1;
            this.grid[y][this.cols - 1] = 1;
        }
    }

    /**
     * 添加额外通道，降低迷宫难度
     */
    addExtraPaths() {
        const extraPaths = Math.floor((this.cols * this.rows) * 0.05);
        for (let i = 0; i < extraPaths; i++) {
            const x = Math.floor(Math.random() * (this.cols - 2)) + 1;
            const y = Math.floor(Math.random() * (this.rows - 2)) + 1;
            if (this.grid[y][x] === 1) {
                // 检查是否不会破坏迷宫结构
                const neighbors = this.countPathNeighbors(x, y);
                if (neighbors >= 2) {
                    this.grid[y][x] = 0;
                }
            }
        }
    }

    /**
     * 计算通道邻居数量
     */
    countPathNeighbors(x, y) {
        let count = 0;
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                if (this.grid[ny][nx] === 0) count++;
            }
        }
        return count;
    }

    /**
     * 获取所有通道位置
     */
    getPathPositions() {
        const paths = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 0) {
                    paths.push({ x, y });
                }
            }
        }
        return paths;
    }

    /**
     * 检查是否为墙
     */
    isWall(x, y) {
        const col = Math.floor(x / CONFIG.CELL_SIZE);
        const row = Math.floor(y / CONFIG.CELL_SIZE);
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return true;
        }
        return this.grid[row][col] === 1;
    }

    /**
     * 检查点是否在通道内
     */
    isValidPosition(x, y, radius) {
        const points = [
            { x: x - radius, y: y - radius },
            { x: x + radius, y: y - radius },
            { x: x - radius, y: y + radius },
            { x: x + radius, y: y + radius }
        ];
        return points.every(p => !this.isWall(p.x, p.y));
    }
}

// ============================================
// 玩家类
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.speed = CONFIG.PLAYER_SPEED;
        this.color = CONFIG.PLAYER_COLOR;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.mouthAngle = 0;
        this.mouthSpeed = 0.15;
    }

    /**
     * 设置移动方向
     */
    setDirection(dx, dy) {
        this.nextDirection = { x: dx, y: dy };
    }

    /**
     * 更新玩家位置
     */
    update(maze) {
        // 尝试转向
        if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
            const nextX = this.x + this.nextDirection.x * this.speed;
            const nextY = this.y + this.nextDirection.y * this.speed;
            if (maze.isValidPosition(nextX, nextY, this.radius - 2)) {
                this.direction = { ...this.nextDirection };
            }
        }

        // 沿当前方向移动
        const newX = this.x + this.direction.x * this.speed;
        const newY = this.y + this.direction.y * this.speed;

        if (maze.isValidPosition(newX, newY, this.radius - 2)) {
            this.x = newX;
            this.y = newY;
        }

        // 更新嘴巴动画
        this.mouthAngle += this.mouthSpeed;
    }

    /**
     * 绘制玩家
     */
    draw(ctx) {
        ctx.save();
        
        // 发光效果
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // 计算嘴巴角度
        const mouthOpen = Math.abs(Math.sin(this.mouthAngle)) * 0.3 + 0.1;
        let startAngle, endAngle;
        
        if (this.direction.x > 0) {
            startAngle = mouthOpen;
            endAngle = Math.PI * 2 - mouthOpen;
        } else if (this.direction.x < 0) {
            startAngle = Math.PI + mouthOpen;
            endAngle = Math.PI - mouthOpen;
        } else if (this.direction.y > 0) {
            startAngle = Math.PI / 2 + mouthOpen;
            endAngle = Math.PI / 2 - mouthOpen;
        } else if (this.direction.y < 0) {
            startAngle = -Math.PI / 2 + mouthOpen;
            endAngle = -Math.PI / 2 - mouthOpen;
        } else {
            startAngle = mouthOpen;
            endAngle = Math.PI * 2 - mouthOpen;
        }
        
        ctx.arc(this.x, this.y, this.radius, startAngle, endAngle);
        ctx.lineTo(this.x, this.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// ============================================
// 敌人类
// ============================================
class Enemy {
    constructor(x, y, patrolType = 'horizontal') {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.radius = CONFIG.ENEMY_RADIUS;
        this.speed = CONFIG.ENEMY_SPEED;
        this.color = CONFIG.ENEMY_COLOR;
        this.patrolType = patrolType; // 'horizontal', 'vertical', 'rectangle'
        this.direction = 1; // 1 或 -1
        this.patrolDistance = 80;
        this.traveled = 0;
        this.rectanglePhase = 0; // 矩形巡逻阶段
    }

    /**
     * 更新敌人位置
     */
    update(maze) {
        switch (this.patrolType) {
            case 'horizontal':
                this.patrolHorizontal(maze);
                break;
            case 'vertical':
                this.patrolVertical(maze);
                break;
            case 'rectangle':
                this.patrolRectangle(maze);
                break;
        }
    }

    /**
     * 水平巡逻
     */
    patrolHorizontal(maze) {
        const newX = this.x + this.speed * this.direction;
        if (maze.isValidPosition(newX, this.y, this.radius) && 
            Math.abs(newX - this.startX) <= this.patrolDistance) {
            this.x = newX;
        } else {
            this.direction *= -1;
        }
    }

    /**
     * 垂直巡逻
     */
    patrolVertical(maze) {
        const newY = this.y + this.speed * this.direction;
        if (maze.isValidPosition(this.x, newY, this.radius) && 
            Math.abs(newY - this.startY) <= this.patrolDistance) {
            this.y = newY;
        } else {
            this.direction *= -1;
        }
    }

    /**
     * 矩形巡逻
     */
    patrolRectangle(maze) {
        const sideLength = this.patrolDistance;
        const speed = this.speed;
        
        switch (this.rectanglePhase) {
            case 0: // 向右
                if (this.traveled < sideLength && maze.isValidPosition(this.x + speed, this.y, this.radius)) {
                    this.x += speed;
                    this.traveled += speed;
                } else {
                    this.traveled = 0;
                    this.rectanglePhase = 1;
                }
                break;
            case 1: // 向下
                if (this.traveled < sideLength && maze.isValidPosition(this.x, this.y + speed, this.radius)) {
                    this.y += speed;
                    this.traveled += speed;
                } else {
                    this.traveled = 0;
                    this.rectanglePhase = 2;
                }
                break;
            case 2: // 向左
                if (this.traveled < sideLength && maze.isValidPosition(this.x - speed, this.y, this.radius)) {
                    this.x -= speed;
                    this.traveled += speed;
                } else {
                    this.traveled = 0;
                    this.rectanglePhase = 3;
                }
                break;
            case 3: // 向上
                if (this.traveled < sideLength && maze.isValidPosition(this.x, this.y - speed, this.radius)) {
                    this.y -= speed;
                    this.traveled += speed;
                } else {
                    this.traveled = 0;
                    this.rectanglePhase = 0;
                }
                break;
        }
    }

    /**
     * 绘制敌人
     */
    draw(ctx) {
        ctx.save();
        
        // 发光效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制眼睛
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        
        // 左眼
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 右眼
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳孔
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ============================================
// 糖豆类
// ============================================
class Dot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.DOT_RADIUS;
        this.color = CONFIG.DOT_COLOR;
        this.collected = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    /**
     * 更新动画
     */
    update() {
        this.pulsePhase += 0.05;
    }

    /**
     * 绘制糖豆
     */
    draw(ctx) {
        if (this.collected) return;

        ctx.save();
        
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 1;
        const radius = this.radius * pulse;
        
        // 发光效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.DOT_GLOW_COLOR;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ============================================
// 游戏主类
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.overlayHint = document.getElementById('overlayHint');
        this.scoreElement = document.getElementById('score');
        this.remainingElement = document.getElementById('remaining');

        this.state = CONFIG.STATE.WAITING;
        this.score = 0;
        this.animationId = null;

        this.init();
    }

    /**
     * 初始化游戏
     */
    init() {
        // 设置画布尺寸
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        // 计算迷宫行列数
        this.cols = Math.floor(CONFIG.CANVAS_WIDTH / CONFIG.CELL_SIZE);
        this.rows = Math.floor(CONFIG.CANVAS_HEIGHT / CONFIG.CELL_SIZE);

        // 确保行列数为奇数（迷宫算法要求）
        if (this.cols % 2 === 0) this.cols--;
        if (this.rows % 2 === 0) this.rows--;

        // 生成迷宫
        this.maze = new MazeGenerator(this.cols, this.rows);

        // 获取所有通道位置
        const paths = this.maze.getPathPositions();

        // 放置玩家（选择第一个通道）
        const playerPos = paths[0];
        this.player = new Player(
            playerPos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            playerPos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
        );

        // 放置敌人（选择较远的通道）
        const enemyPos = paths[Math.floor(paths.length / 2)];
        this.enemy = new Enemy(
            enemyPos.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            enemyPos.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            'rectangle' // 矩形巡逻
        );

        // 生成糖豆
        this.dots = [];
        for (let i = 2; i < paths.length; i++) {
            if (Math.random() > 0.3) { // 70% 概率生成糖豆
                this.dots.push(new Dot(
                    paths[i].x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
                    paths[i].y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
                ));
            }
        }

        this.totalDots = this.dots.length;
        this.updateUI();

        // 绑定事件
        this.bindEvents();

        // 开始渲染循环
        this.render();
    }

    /**
     * 绑定键盘事件
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            // 防止方向键滚动页面
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            // 空格键重新开始
            if (e.key === ' ') {
                if (this.state === CONFIG.STATE.GAME_OVER || this.state === CONFIG.STATE.VICTORY) {
                    this.restart();
                }
                return;
            }

            // 方向键控制
            if (this.state === CONFIG.STATE.WAITING) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    this.start();
                }
            }

            if (this.state === CONFIG.STATE.PLAYING) {
                switch (e.key) {
                    case 'ArrowUp':
                        this.player.setDirection(0, -1);
                        break;
                    case 'ArrowDown':
                        this.player.setDirection(0, 1);
                        break;
                    case 'ArrowLeft':
                        this.player.setDirection(-1, 0);
                        break;
                    case 'ArrowRight':
                        this.player.setDirection(1, 0);
                        break;
                }
            }
        });
    }

    /**
     * 开始游戏
     */
    start() {
        this.state = CONFIG.STATE.PLAYING;
        this.overlay.classList.add('hidden');
        this.gameLoop();
    }

    /**
     * 重新开始游戏
     */
    restart() {
        this.state = CONFIG.STATE.WAITING;
        this.score = 0;
        this.overlay.classList.remove('game-over', 'victory');
        this.overlayTitle.textContent = '按任意方向键开始游戏';
        this.overlayMessage.textContent = '收集所有糖豆，避开敌人！';
        this.overlayHint.style.display = 'none';
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.init();
    }

    /**
     * 游戏主循环
     */
    gameLoop() {
        if (this.state !== CONFIG.STATE.PLAYING) return;

        this.update();
        this.render();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * 更新游戏状态
     */
    update() {
        // 更新玩家
        this.player.update(this.maze);

        // 更新敌人
        this.enemy.update(this.maze);

        // 更新糖豆
        this.dots.forEach(dot => dot.update());

        // 检测碰撞
        this.checkCollisions();

        // 更新UI
        this.updateUI();
    }

    /**
     * 碰撞检测
     */
    checkCollisions() {
        // 检测玩家与糖豆碰撞
        this.dots.forEach(dot => {
            if (!dot.collected) {
                const dx = this.player.x - dot.x;
                const dy = this.player.y - dot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.player.radius + dot.radius) {
                    dot.collected = true;
                    this.score++;
                }
            }
        });

        // 检测玩家与敌人碰撞
        const enemyDx = this.player.x - this.enemy.x;
        const enemyDy = this.player.y - this.enemy.y;
        const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

        if (enemyDistance < this.player.radius + this.enemy.radius - 5) {
            this.gameOver();
        }

        // 检测胜利条件
        const remainingDots = this.dots.filter(dot => !dot.collected).length;
        if (remainingDots === 0) {
            this.victory();
        }
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.state = CONFIG.STATE.GAME_OVER;
        this.overlay.classList.remove('hidden', 'victory');
        this.overlay.classList.add('game-over');
        this.overlayTitle.textContent = '游戏结束';
        this.overlayMessage.textContent = `最终得分: ${this.score}`;
        this.overlayHint.style.display = 'block';
    }

    /**
     * 游戏胜利
     */
    victory() {
        this.state = CONFIG.STATE.VICTORY;
        this.overlay.classList.remove('hidden', 'game-over');
        this.overlay.classList.add('victory');
        this.overlayTitle.textContent = '恭喜胜利！';
        this.overlayMessage.textContent = `最终得分: ${this.score}`;
        this.overlayHint.style.display = 'block';
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        this.scoreElement.textContent = this.score;
        const remaining = this.dots.filter(dot => !dot.collected).length;
        this.remainingElement.textContent = remaining;
    }

    /**
     * 渲染游戏画面
     */
    render() {
        // 清空画布
        this.ctx.fillStyle = CONFIG.PATH_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制迷宫
        this.drawMaze();

        // 绘制糖豆
        this.dots.forEach(dot => dot.draw(this.ctx));

        // 绘制敌人
        this.enemy.draw(this.ctx);

        // 绘制玩家
        this.player.draw(this.ctx);
    }

    /**
     * 绘制迷宫墙体
     */
    drawMaze() {
        this.ctx.fillStyle = CONFIG.WALL_COLOR;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = 'rgba(44, 62, 80, 0.5)';

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze.grid[y][x] === 1) {
                    this.ctx.fillRect(
                        x * CONFIG.CELL_SIZE,
                        y * CONFIG.CELL_SIZE,
                        CONFIG.CELL_SIZE,
                        CONFIG.CELL_SIZE
                    );
                }
            }
        }

        this.ctx.shadowBlur = 0;
    }
}

// ============================================
// 启动游戏
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
