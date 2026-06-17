import { initGame, startGame, triggerJump, cancelJump, triggerCrouch, cancelCrouch, resetGame, onGameOver } from './engine.js';

// DOM 元素引用 (在 DOMContentLoaded 事件触发后赋值)
let startScreen = null;
let startButton = null;
let gameOverScreen = null;
let gameOverSubTitle = null; // 新增：生日礼物副标题
let gameOverTitle = null;    // 新增：死因恶搞主标题
let restartButton = null;
let finalScoreEl = null;
let mobileJumpBtn = null;
let mobileCrouchBtn = null;

// 游戏运行与结束状态标记
let gameStarted = false;

/**
 * 页面加载完毕后初始化游戏
 */
window.addEventListener('DOMContentLoaded', () => {
    // 获取 DOM 元素，防止脚本在元素完全渲染前执行导致的 null 报错
    startScreen = document.getElementById('startScreen');
    startButton = document.getElementById('startButton');
    gameOverScreen = document.getElementById('gameOverScreen');
    gameOverSubTitle = document.getElementById('gameOverSubTitle');
    gameOverTitle = document.getElementById('gameOverTitle');
    restartButton = document.getElementById('restartButton');
    finalScoreEl = document.getElementById('finalScore');
    mobileJumpBtn = document.getElementById('mobileJump');
    mobileCrouchBtn = document.getElementById('mobileCrouch');

    // 检查核心元素是否存在
    if (!startScreen || !startButton || !gameOverScreen || !gameOverSubTitle || !gameOverTitle || !restartButton || !finalScoreEl) {
        console.error('错误：未找到必要的 UI 元素！请检查 index.html 的 id 配置。', {
            startScreen,
            startButton,
            gameOverScreen,
            gameOverSubTitle,
            gameOverTitle,
            restartButton,
            finalScoreEl
        });
        return;
    }

    // 初始化画布与主角
    initGame();

    // 注册游戏结束回调：当 engine.js 检测到碰撞或撞天花板时触发，接收死因参数
    onGameOver((finalScore, deathReason) => {
        showGameOver(finalScore, deathReason);
    });

    // 绑定事件监听
    setupEventListeners();
});

/**
 * 显示 Game Over 结算弹窗 (带死因恶搞生日礼物文本)
 */
function showGameOver(score, deathReason) {
    gameStarted = false; // 重置开始标记

    // 显示结算弹窗
    if (gameOverScreen) {
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.style.display = 'flex';
    }

    // 修改顶部副标题为 "生日礼物"
    if (gameOverSubTitle) {
        gameOverSubTitle.textContent = "生日礼物";
    }

    // 根据死因展示不同的恶搞大标题
    if (gameOverTitle) {
        if (deathReason === 'ceiling') {
            gameOverTitle.textContent = "和天花版砰砰砰";
        } else if (deathReason === 'obstacle') {
            gameOverTitle.textContent = "和王静共度蜜月";
        } else {
            gameOverTitle.textContent = "游戏结束"; // 兜底防错
        }
    }

    // 填充得分
    if (finalScoreEl) {
        finalScoreEl.textContent = String(score).padStart(5, '0');
    }
    console.log(`游戏结束。死因: ${deathReason}, 最终得分: ${score}`);
}

/**
 * 绑定所有用户交互事件（PC端键盘 + 移动端触摸）
 */
function setupEventListeners() {
    // 1. 开始按钮点击事件
    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            
            // 隐藏准备界面弹窗
            startScreen.classList.add('hidden');
            startScreen.style.display = 'none';
            
            console.log('游戏开始：隐藏准备弹窗，启动游戏循环。');
            
            // 启动物理引擎及主循环
            startGame();
        }
    });

    // 2. 重新开始按钮点击事件
    restartButton.addEventListener('click', () => {
        // 隐藏游戏结束弹窗
        gameOverScreen.classList.add('hidden');
        gameOverScreen.style.display = 'none';
        
        gameStarted = true;
        console.log('游戏重置：清空障碍与分数，重新启动游戏。');
        
        // 调用重置并开始方法
        resetGame();
    });

    // 3. PC 端键盘操作监听
    window.addEventListener('keydown', (e) => {
        // 游戏未启动/已结束时，按空格或回车可以直接开始/重新开始游戏
        if (!gameStarted && (e.code === 'Space' || e.code === 'Enter')) {
            // 如果处于 Game Over 界面，执行重新开始
            if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
                restartButton.click();
            } else {
                startButton.click();
            }
            e.preventDefault();
            return;
        }

        if (gameStarted) {
            // 跳跃控制：空格或上箭头
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                triggerJump();
                e.preventDefault(); // 阻止浏览器默认滚动
            }
            // 下蹲控制：下箭头
            if (e.code === 'ArrowDown') {
                triggerCrouch();
                e.preventDefault();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (gameStarted) {
            // 松开跳跃键
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                cancelJump(); // 松开跳跃键，触发低跳微调
            }
            // 松开下蹲键
            if (e.code === 'ArrowDown') {
                cancelCrouch();
                e.preventDefault();
            }
        }
    });

    // 4. 移动端触控按钮监听 (同时兼容 Touch 和 Mouse 事件，方便PC端模拟调试)
    if (mobileJumpBtn) {
        const handleJumpStart = (e) => {
            e.preventDefault();
            if (!gameStarted) {
                if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
                    restartButton.click();
                } else {
                    startButton.click();
                }
                return;
            }
            triggerJump();
        };
        
        const handleJumpEnd = (e) => {
            e.preventDefault();
            if (gameStarted) {
                cancelJump();
            }
        };

        mobileJumpBtn.addEventListener('touchstart', handleJumpStart, { passive: false });
        mobileJumpBtn.addEventListener('touchend', handleJumpEnd, { passive: false });
        mobileJumpBtn.addEventListener('touchcancel', handleJumpEnd, { passive: false });
        mobileJumpBtn.addEventListener('mousedown', handleJumpStart);
        mobileJumpBtn.addEventListener('mouseup', handleJumpEnd);
        mobileJumpBtn.addEventListener('mouseleave', handleJumpEnd);
    }

    if (mobileCrouchBtn) {
        const handleCrouchStart = (e) => {
            e.preventDefault();
            if (!gameStarted) return;
            
            triggerCrouch();
            mobileCrouchBtn.classList.add('bg-stone-800');
        };

        const handleCrouchEnd = (e) => {
            e.preventDefault();
            if (gameStarted) {
                cancelCrouch();
            }
            mobileCrouchBtn.classList.remove('bg-stone-800');
        };

        mobileCrouchBtn.addEventListener('touchstart', handleCrouchStart, { passive: false });
        mobileCrouchBtn.addEventListener('touchend', handleCrouchEnd, { passive: false });
        mobileCrouchBtn.addEventListener('touchcancel', handleCrouchEnd, { passive: false });
        mobileCrouchBtn.addEventListener('mousedown', handleCrouchStart);
        mobileCrouchBtn.addEventListener('mouseup', handleCrouchEnd);
        mobileCrouchBtn.addEventListener('mouseleave', handleCrouchEnd);
    }
}
