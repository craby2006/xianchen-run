技术栈
骨架与逻辑：Vanilla HTML5 + 原生 JavaScript

原因：大模型对原生 JS 操控 <canvas> 的 API 极其熟练。所有代码可以浓缩在一个 index.html（或拆分为 index.html, style.css, game.js）中，无需 npm install，用浏览器的 Live Server 插件双击就能看效果，极大降低 Vibecoding 时的上下文干扰和报错率。

游戏渲染核心：HTML5 Canvas 2D API

原因：处理位图（贤琛小人、愤怒女人）平移、重力下落和矩形碰撞检测性能极佳，且代码量极小，不需要引入庞大的游戏引擎（如 Phaser）。

视觉与 UI：Tailwind CSS (通过 CDN 引入)

原因：只需在 <head> 贴一行 CDN 链接，就能用原子化类名快速堆出你想要的“温情功能主义”极简高质感 UI（比如低饱和度的按钮、柔和阴影的弹窗）。
项目目录结构
在你的本地电脑上新建一个文件夹（例如 xianchen-run），然后按照以下结构创建文件和文件夹：

Plaintext
xianchen-run/
│
├── index.html           # 骨架：游戏的主页面，引入 Tailwind CDN，搭好UI。
├── style.css            # 皮肤：少量的自定义样式（保证像素图不模糊）。
│
├── assets/              # 素材库：存放你的图片
│   ├── player.png       # (替换为你的贤琛小人图)
│   └── obstacle.png     # (替换为你的愤怒女人图)
│
└── js/                  # 大脑：游戏逻辑（使用 ES6 模块拆分）
    ├── main.js          # 总控中心：处理点击按钮、开始/结束 UI 切换。
    ├── engine.js        # 物理引擎：Game Loop（帧循环）、碰撞检测、计分板。
    ├── player.js        # 主角类：负责贤琛的跳跃、重力下落、绘制。
    └── obstacle.js      # 障碍类：负责愤怒女人的生成规则、向左移动、绘制。
🧩 核心文件职责说明（投喂给 AI 的语料）
你在向 AI 提问时，可以参考以下职责划分来约束它：

1. index.html (UI 与入口)
职责：通过 <script src="https://cdn.tailwindcss.com"></script> 引入样式。绘制顶部的计分板、居中的 <canvas id="gameCanvas"></canvas>，以及开始/重玩弹窗和底部的触控大按钮。

关键点：在底部使用 <script type="module" src="js/main.js"></script> 引入主脚本。

2. js/main.js (状态与事件桥梁)
职责：获取 DOM 元素（按钮、弹窗、Canvas）。监听用户的点击或键盘按键。控制 UI 的显示与隐藏。

交互：当用户点击“开始”时，调用 engine.js 里的 startGame()；当监听到按键时，调用 player.js 里的 jump()。

3. js/engine.js (游戏心脏)
职责：管理全局状态（分数、游戏是否结束）。维护 requestAnimationFrame 构成的死循环。

交互：每一帧清空画布，然后循环调用 Player.update() 和 Obstacle.update()。进行 AABB 矩形碰撞检测，如果撞了，触发 Game Over 逻辑并通知 main.js 弹出结算界面。

4. js/player.js & js/obstacle.js (游戏实体)
职责：封装成 ES6 的 Class。

Player：维护 x, y, velocityY, gravity 等属性。拥有 jump() 方法给向上的速度，update() 方法处理重力下落和地面碰撞。

Obstacle：维护 x, y, speed 属性。update() 方法让它一直向左飞，飞出屏幕就销毁。