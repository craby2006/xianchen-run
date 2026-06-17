import { Player } from './player.js';
import { Obstacle } from './obstacle.js';

let canvas = null;
let ctx = null;
let player = null;
let animationFrameId = null;
let isRunning = false;
let isGameOver = false;

// 动态布局地平线高度
let groundY = 0;

// 障碍物队列、生成帧计数器与下次生成间隔时间
let obstacles = [];
let frameCount = 0;
let nextSpawnFrame = 90; // 每 90 - 150 帧随机生成一个

// 基础物理速度 (按屏幕宽度动态伸缩以保障体验一致)
let currentSpeed = 6; 

// 分数跟踪系统
let score = 0;
let scoreFrameCount = 0; // 控制分数增长频率
let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);

// 状态回调接口：用于在碰撞发生时通知 main.js 弹出结算界面
let gameOverCallback = null;

/**
 * 初始化游戏引擎
 */
export function initGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('未找到 id 为 gameCanvas 的画布元素');
        return;
    }
    ctx = canvas.getContext('2d');
    
    // 初始化时同步 Canvas 精度大小并建立坐标参数
    resizeCanvasLayout();
    
    // 载入 localStorage 记录的最高分
    const highScoreText = document.getElementById('highScoreText');
    if (highScoreText) {
        highScoreText.textContent = formatScore(highScore);
    }
    
    // 监听窗口尺寸变化，保障响应式精度不断层
    window.addEventListener('resize', handleResize);
}

/**
 * 格式化分数字符串为 5 位等宽形式 (如 00012)
 */
function formatScore(num) {
    return String(num).padStart(5, '0');
}

/**
 * 注册游戏结束回调函数
 */
export function onGameOver(callback) {
    gameOverCallback = callback;
}

/**
 * 重新计算画布布局、地平线以及自适应障碍物速度与大小
 */
function resizeCanvasLayout() {
    if (!canvas) return;
    
    // 同步内部渲染分辨率与 CSS 实际显示尺寸
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // 地平线设定在底部的 10% 处
    groundY = canvas.height * 0.9;
    
    // 动态速度缩放比：以 800px 宽度作为 1.0x 标准（确保不同设备跨屏速度在物理视觉上一致）
    const scaleX = canvas.width / 800;
    currentSpeed = scaleX * 6; // 800px 下速度为 6px/帧
    
    // 实例化或重置主角大小
    if (!player) {
        player = new Player(canvas.width, canvas.height, groundY);
    } else {
        player.resize(canvas.width, canvas.height, groundY);
    }

    // 动态同步现存的所有障碍物的尺寸和物理参数
    obstacles.forEach(obstacle => {
        obstacle.resize(canvas.width, canvas.height, groundY);
        obstacle.speed = currentSpeed;
    });
}

/**
 * 窗口改变大小时的处理程序
 */
function handleResize() {
    resizeCanvasLayout();
    
    // 若游戏尚未开始或在静止画面，刷新一帧以更新渲染
    if (!isRunning && !isGameOver) {
        renderStaticScene();
    }
}

/**
 * 绘制初始静态场景（地面和静止的主角）
 */
function renderStaticScene() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGroundLine();
    if (player) {
        player.draw(ctx);
    }
}

/**
 * 绘制地面的水平参照线
 */
function drawGroundLine() {
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = '#201c1a'; // 深石色
    ctx.lineWidth = 4;
    ctx.stroke();
}

/**
 * 启动游戏循环
 */
export function startGame() {
    if (isRunning) return;
    isRunning = true;
    isGameOver = false;
    
    // 初始化下一次生成的随机时间
    nextSpawnFrame = 90 + Math.floor(Math.random() * 61);
    
    gameLoop();
}

/**
 * 重置游戏状态 (重新开始)
 */
export function resetGame() {
    // 停止运行中的帧循环
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // 状态归零
    isGameOver = false;
    isRunning = false;
    score = 0;
    scoreFrameCount = 0;
    frameCount = 0;
    obstacles = [];

    // 重置 UI 分数显示
    const scoreText = document.getElementById('scoreText');
    if (scoreText) {
        scoreText.textContent = '00000';
    }

    // 重置主角姿态
    if (player) {
        player.standUp(); // 确保下蹲恢复到正常高度
        player.y = player.groundY - player.height + player.yOffset;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    // 重新启动游戏
    startGame();
}

/**
 * 核心游戏循环 (Game Loop)
 */
function gameLoop() {
    if (isGameOver || !isRunning) return;

    // 1. 清理画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 绘制地面线
    drawGroundLine();

    // 3. 更新与绘制主角
    player.update();
    player.draw(ctx);

    // ---- 新增：天花板碰撞判定 ----
    const paddingY = player.height * 0.1; // 顶部缩进比率 (更新为 10% 以匹配非对称 hitbox 的 top 值)
    const playerBoxTop = player.y + paddingY;
    if (playerBoxTop <= 0) {
        triggerGameOver('ceiling'); // 触发天花板判定死因
        return; // 立即终止循环
    }

    // 4. 障碍物生成调度逻辑
    frameCount++;
    if (frameCount >= nextSpawnFrame) {
        obstacles.push(new Obstacle(canvas.width, canvas.height, groundY, currentSpeed));
        frameCount = 0;
        nextSpawnFrame = 90 + Math.floor(Math.random() * 61); // 下一次生成的随机帧数 (90-150)
    }

    // 5. 遍历障碍物：更新、碰撞检测与绘制
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.update();
        obs.draw(ctx);

        // 核心：AABB 矩形重叠碰撞检测
        if (checkCollision(player, obs)) {
            triggerGameOver('obstacle'); // 触发障碍物碰撞死因
            return; // 立即跳出循环，终止绘制
        }
    }

    // 清理已飞出屏幕的障碍物，防止内存溢出
    obstacles = obstacles.filter(obs => !obs.isOffScreen());

    // 6. 分数累计逻辑：每隔 5 帧分数 +1
    scoreFrameCount++;
    if (scoreFrameCount >= 5) {
        score++;
        scoreFrameCount = 0;
        updateScoreUI();
    }

    // 7. 循环帧调用
    animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * 精确的高精度 AABB 碰撞检测算法，融入较大的相对容错 Padding 缩进，防止误判
 */
function checkCollision(player, obstacle) {
    const playerBox = {
        left: player.x + player.width * 0.35, // 左右各缩进 35%
        right: player.x + player.width - player.width * 0.35,
        top: player.y + player.height * 0.1, // 上下各缩进 10%
        bottom: player.y + player.height - player.height * 0.1
    };

    const obsBox = {
        left: obstacle.x + obstacle.width * 0.3, // 左右各缩进 30%
        right: obstacle.x + obstacle.width - obstacle.width * 0.3,
        top: obstacle.y + obstacle.height * 0.25, // 顶部缩进 25%
        bottom: obstacle.y + obstacle.height // 底部贴地，不缩进
    };

    return (
        playerBox.right > obsBox.left && 
        playerBox.left < obsBox.right && 
        playerBox.bottom > obsBox.top && 
        playerBox.top < obsBox.bottom
    );
}

/**
 * 实时刷新分数板 UI 显式，自动更新最高纪录到 localStorage
 */
function updateScoreUI() {
    const scoreText = document.getElementById('scoreText');
    const highScoreText = document.getElementById('highScoreText');
    
    if (scoreText) {
        scoreText.textContent = formatScore(score);
    }
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        if (highScoreText) {
            highScoreText.textContent = formatScore(highScore);
        }
    }
}

/**
 * 触发游戏结束
 */
function triggerGameOver(deathReason) {
    isGameOver = true;
    isRunning = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // 再次核准最高分记录
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }

    // 回调通知主线程弹出 Game Over 结算弹窗，传入死因
    if (gameOverCallback) {
        gameOverCallback(score, deathReason);
    }
}

/**
 * 暴露给外部调用的主角跳跃接口
 */
export function triggerJump() {
    if (player && !isGameOver) {
        player.jump();
        player.isHoldingJump = true; // 确保置为按压状态
    }
}

/**
 * 暴露给外部调用的松开跳跃接口（实现短按低跳，长按高跳物理微调）
 */
export function cancelJump() {
    if (player && !isGameOver) {
        player.isHoldingJump = false; // 清除按压状态，切换回重力下落
    }
}

/**
 * 暴露给外部调用的下蹲接口
 */
export function triggerCrouch() {
    if (player && !isGameOver) {
        player.duck();
    }
}

/**
 * 暴露给外部调用的取消下蹲接口
 */
export function cancelCrouch() {
    if (player && !isGameOver) {
        player.standUp();
    }
}
