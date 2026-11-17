# dsh-no-shimmer

停掉 DeepSeek Harness 界面里「运行中 / 思考中」的扫光动画。

## 为什么

官方样式表里，运行状态文字用两层扫光：

```css
._sweep_1rdzk_34 {
  mask-image: linear-gradient(105deg, transparent 0%, black 40%, black 60%, transparent 100%);
  animation-name: _dsh-row-shimmer-sweep_1rdzk_1;   /* 无限循环 */
}
@keyframes _dsh-row-shimmer-sweep_1rdzk_1 {
  0%            { transform: translate(-100%); }
  66.6667%,100% { transform: translate(100%); }
}
```

动画只动 `transform`，本来可以走 GPU；但叠了 `mask-image`，带遮罩的图层每帧都要**主线程重新栅格化**，反而成了最贵的写法。

2026-11-07 在作者本机（240Hz 屏）实测，同一个渲染进程：

| 状态 | 活跃动画 | renderer CPU |
| --- | --- | --- |
| 2 组扫光在跑 | 7 | 47.5% |
| 扫光消失 | 2 | 9.5% |
| 只剩一个旋转图标 | 1 | 0.6% |

12 秒内 0 个 longtask、DOM 每秒只变 2 次，所以不是 JS 卡，是每帧重绘把主线程占住，点击只能排队。

## 它做什么

注入一段 CSS，把这两条动画设为 `animation: none`。元素位置不变，文字变成静态高亮。

另有一层兜底：监听 `animationstart`，动画名里带 `shimmer` 的一律停掉 —— 官方重新构建导致类名 hash 变化时仍然有效。

不隐藏任何元素，不改任何数据结构，出问题删掉插件即可恢复。

## 安装

1. 克隆本仓库到本地任意目录。
2. 在 Harness 插件面板里安装，路径指向这个目录；或手动改 profile：

   - `dependencies` 里加：`"dsh-no-shimmer": "link:<仓库的绝对路径>"`
   - `dsh.profile.bundles` 里加：`"dsh-no-shimmer"`
3. 重启 Harness。

## 停用

从 `bundles` 里删掉那一行，重启即可。或者临时在 DevTools Console 执行：

```js
document.getElementById('dsh-no-shimmer-style')?.remove()
```

## 兼容性

- 验证版本：DSH 0.2.1-rc.3（2026-11）。
- 依赖官方 CSS 里带 hash 的类名和动画名；hash 随构建变化，变化时由 `animationstart` 兜底，不需要改代码。
- 如果官方以后把扫光改成合成器友好（去掉遮罩或改用 `opacity`），本插件就失去意义，可以删掉。

## 另一种选择

如果更想保留扫光动效、只压开销，可以把 CSS 换成去掉遮罩 + 提示合成器：

```css
[class*="_sweep_1rdzk_"],
[class*="_highlight_1rdzk_"] {
  mask-image: none !important;
  will-change: transform;
}
```

代价是扫光会从「渐隐光带」变成整块矩形平移，视觉上更硬。
