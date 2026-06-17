/**
 * 贤琛快跑 - 主角实体类
 */
export class Player {
    constructor(canvasWidth, canvasHeight, groundY) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY; // 地平线的 Y 坐标

        // 视觉微调偏移量
        this.yOffset = 0;

        this.isGrounded = false;
        this.isDucking = false;      // 是否处于下蹲状态
        this.isHoldingJump = false;  // 是否持续按住跳跃键 (用于实现长按高跳)
        this.velocityY = 0;
        this.fallbackColor = '#047857'; // 对应 Tailwind 中的 emerald-700

        // 加载主角图片素材
        this.image = new Image();
        
        this.image.onload = () => {
            this.recalculateDimensions();
            // 重新校准位置
            this.y = this.groundY - this.height + this.yOffset;
            console.log(`主角素材加载成功。尺寸: ${this.width.toFixed(1)}x${this.height}`);
        };
        this.image.src = '/assets/player.png';

        // 初始化尺寸与动态缩放的物理引擎变量
        this.updateDimensionsAndPhysics();

        // 初始位置
        this.x = 80;
        this.y = this.groundY - this.height + this.yOffset;
    }

    /**
     * 基于当前画布高度动态计算主角尺寸与重力参数
     */
    updateDimensionsAndPhysics() {
        // 记录站立状态下的正常高度 (画布高度的 40%)
        this.normalHeight = this.canvasHeight * 0.4;
        
        // 如果正在下蹲，高度减半；否则为正常高度
        this.height = this.isDucking ? this.normalHeight / 2 : this.normalHeight;
        
        // 计算宽度 (防拉伸)
        this.recalculateDimensions();

        // 物理动力学参数缩放比：以 400px 画布高度作为基础比例 (1.0x)
        const scale = this.canvasHeight / 400;
        
        // 核心微调：太空漫步与撞顶判定结合配置
        this.gravity = scale * 0.7;        // 基础重力设定为 0.7
        this.jumpForce = scale * -13.0;    // 起跳初速度设为 -13.0
    }

    /**
     * 根据图片的长宽比重新计算宽度，防止拉伸变形
     */
    recalculateDimensions() {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
            this.normalWidth = this.normalHeight * aspectRatio;
            this.width = this.normalWidth;
        } else {
            this.normalWidth = this.normalHeight;
            this.width = this.normalWidth;
        }
    }

    /**
     * 响应式重置大小接口：在窗口 resize 时被 engine.js 调用
     */
    resize(canvasWidth, canvasHeight, groundY) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY;

        const wasGrounded = this.isGrounded;

        // 重新计算并应用新的比例尺寸和重力变量
        this.updateDimensionsAndPhysics();

        // 重新定位 Y 坐标防止穿地或悬空
        if (wasGrounded) {
            this.y = this.groundY - this.height + this.yOffset;
            this.velocityY = 0;
        } else {
            if (this.y + this.height - this.yOffset >= this.groundY) {
                this.y = this.groundY - this.height + this.yOffset;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }
    }

    /**
     * 下蹲与空中下坠机制
     */
    duck() {
        if (this.isGrounded) {
            // 地面下蹲：正常折半高度并贴地
            if (!this.isDucking) {
                this.isDucking = true;
                this.height = this.normalHeight / 2;
                this.y = this.groundY - this.height + this.yOffset;
            }
        } else {
            // 空中千斤坠 (Fast Fall)：瞬间获得极大的向下初速度，快速落地
            this.velocityY = Math.max(this.velocityY + 15, 15);
            
            // 标记为下蹲状态。当落地时，update() 触发碰撞恢复后，会无缝衔接地面的下蹲滑铲状态！
            this.isDucking = true;
            this.height = this.normalHeight / 2;
        }
    }

    /**
     * 取消下蹲
     */
    standUp() {
        if (this.isDucking) {
            this.isDucking = false;
            this.height = this.normalHeight;
            this.y = this.groundY - this.height + this.yOffset; // 修正 Y 坐标
        }
    }

    /**
     * 更新主角物理状态
     */
    update() {
        let activeGravity = this.gravity;

        if (this.velocityY < 0) {
            // 上升阶段
            if (this.isHoldingJump) {
                activeGravity = this.gravity * 0.25;
            }
        } else if (this.velocityY > 0) {
            // 下落阶段：重力乘以 1.25，下落干脆爽利
            activeGravity = this.gravity * 1.25;
        }

        // 应用动态重力
        this.velocityY += activeGravity;
        this.y += this.velocityY;

        // 地面碰撞检测 (防穿地，同时考虑 yOffset 视觉微调量)
        if (this.y + this.height - this.yOffset >= this.groundY) {
            this.y = this.groundY - this.height + this.yOffset;
            this.velocityY = 0;
            this.isGrounded = true;
            this.isHoldingJump = false; // 触地时重置按住状态
        }
    }

    /**
     * 将主角绘制到画布上
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.isDucking) {
            ctx.save();
            // 将画布原点移动到玩家底部中心
            ctx.translate(this.x + this.width / 2, this.y + this.height);
            // 进行形变：变扁（高度0.5），变宽（宽度1.2）
            ctx.scale(1.2, 0.5);
            // 注意：由于原点变了，绘制的坐标需要反向偏移。使用 standing 的 normalHeight 作为绘制基准以获得正确的 0.5 变形比例
            if (this.image.complete && this.image.naturalWidth !== 0) {
                ctx.drawImage(this.image, -this.width / 2, -this.normalHeight, this.width, this.normalHeight);
            } else {
                ctx.fillStyle = this.fallbackColor;
                ctx.fillRect(-this.width / 2, -this.normalHeight, this.width, this.normalHeight);
            }
            ctx.restore();
        } else {
            if (this.image.complete && this.image.naturalWidth !== 0) {
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = this.fallbackColor;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    /**
     * 触发跳跃
     */
    jump() {
        if (this.isGrounded) {
            if (this.isDucking) {
                this.standUp();
            }
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.isHoldingJump = true; // 标志开始按住跳跃
        }
    }
}
