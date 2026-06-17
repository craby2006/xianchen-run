/**
 * 贤琛快跑 - 障碍物实体类
 */
export class Obstacle {
    constructor(canvasWidth, canvasHeight, groundY, speed) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY; // 地平线 Y 坐标
        this.speed = speed;     // 移动速度

        // 障碍物尺寸：高度设为画布高度的 0.25 (25%，确保玩家容易跃过地面障碍物)
        this.height = this.canvasHeight * 0.25;
        this.width = this.height; // 默认 1:1，图片 onload 后自适应调整

        // 视觉微调量
        this.yOffset = 0;

        // 80% 概率生成地面障碍物，20% 概率生成半空飞行障碍物
        this.type = Math.random() < 0.8 ? 'ground' : 'air';

        // 初始位置：放置在画布最右侧外边缘，Y 坐标根据类型进行差值化计算
        this.x = this.canvasWidth;
        
        // 核心高度基准 (获取主角的正常高度来进行精准空位避障设计)
        const playerNormalHeight = this.canvasHeight * 0.4;
        
        if (this.type === 'ground') {
            // 地面障碍：常规踩地
            this.y = this.groundY - this.height + this.yOffset;
        } else {
            // 半空飞行障碍：底部悬空
            // 依据主角非对称 hitbox（左右缩进35%, 顶部缩进10%, 底部缩进10%），
            // 确保下蹲头部（Y=288）无碰擦，站立腹部（Y=216-344）完全吃碰撞
            this.y = this.groundY - (playerNormalHeight * 0.48) - this.height;
        }

        // 加载障碍物图片
        this.image = new Image();
        
        // 关键逻辑：在 src 设置之前绑定 onload，防止缓存导致不触发
        this.image.onload = () => {
            if (this.image.naturalHeight > 0) {
                const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
                this.width = this.height * aspectRatio;
                
                // 重新校准垂直位置
                if (this.type === 'ground') {
                    this.y = this.groundY - this.height + this.yOffset;
                } else {
                    this.y = this.groundY - (playerNormalHeight * 0.48) - this.height;
                }
            }
        };
        this.image.src = '/assets/obstacle.png';

        // 备用状态：图片未加载完成时绘制一个复古红色的色块
        this.fallbackColor = '#b91c1c'; // 对应 Tailwind 中的 red-700
    }

    /**
     * 响应式重设大小接口：在窗口 resize 时被 engine.js 调用
     */
    resize(canvasWidth, canvasHeight, groundY) {
        // 保持障碍物在画布中的水平百分比位置不变，避免重设大小导致障碍物突变闪现
        const xPercent = this.x / this.canvasWidth;

        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY;

        this.height = this.canvasHeight * 0.25;

        // 重新计算宽度 (防拉伸)
        if (this.image.complete && this.image.naturalHeight > 0) {
            const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
            this.width = this.height * aspectRatio;
        } else {
            this.width = this.height;
        }

        // 重新计算 Y 坐标
        const playerNormalHeight = this.canvasHeight * 0.4;
        if (this.type === 'ground') {
            this.y = this.groundY - this.height + this.yOffset;
        } else {
            this.y = this.groundY - (playerNormalHeight * 0.48) - this.height;
        }

        this.x = xPercent * this.canvasWidth;
    }

    /**
     * 更新状态：不断向左平移
     */
    update() {
        this.x -= this.speed;
    }

    /**
     * 绘制障碍物到画布
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.fallbackColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    /**
     * 判断障碍物是否已经完全移出屏幕左侧（用于从内存中清理销毁）
     * @returns {boolean}
     */
    isOffScreen() {
        return this.x + this.width < 0;
    }
}
