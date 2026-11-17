/**
 * dsh-no-shimmer —— 浏览器端
 *
 * 背景（2026-11-07 实测，作者本机 240Hz 屏）：
 *   Harness 聊天区/侧栏里「运行中 · 思考中」的文字扫光，来自官方样式表
 *   dsh-app://app/assets/index-*.css 的两条无限动画：
 *
 *     ._sweep_1rdzk_34     { mask-image: linear-gradient(105deg, ...);
 *                            animation-name: _dsh-row-shimmer-sweep_1rdzk_1; }
 *     ._highlight_1rdzk_54 { animation-name: _dsh-row-shimmer-highlight_1rdzk_1; }
 *
 *   动画本身只动 transform，但叠了 mask-image。带遮罩的图层每帧都要主线程
 *   重新栅格化，交不到合成器。这两个图层叠起来时 renderer 单核从 0.6% 升到
 *   47%，点击事件只能排在每帧的重绘后面。
 *
 * 做法：把这两条动画停掉。元素留在原位，文字变成静态高亮，不再每帧重绘。
 *
 * 两层保险：
 *   1. CSS 按编译后的类名匹配 —— 立刻生效，但类名里的 hash 会随官方构建变；
 *   2. 监听 animationstart，按动画名（含 shimmer）兜底 —— 官方换了 hash 也命中。
 */
window.__ModuleLoader__.load({
  id: 'dsh-no-shimmer',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var name = 'dsh-no-shimmer'
    var inject = []

    var STYLE_ID = 'dsh-no-shimmer-style'

    var CSS = [
      '/* dsh-no-shimmer: 停掉扫光动画，避免 mask-image 每帧主线程重栅格化 */',
      '[class*="_sweep_1rdzk_"],',
      '[class*="_highlight_1rdzk_"] {',
      '  animation: none !important;',
      '}',
      '/* 万一官方换成不带 hash 的类名 */',
      '[class*="row-shimmer-sweep"],',
      '[class*="row-shimmer-highlight"] {',
      '  animation: none !important;',
      '}'
    ].join('\n')

    function isShimmerName(value) {
      return String(value || '').indexOf('shimmer') >= 0
    }

    function install() {
      var tag = document.createElement('style')
      tag.id = STYLE_ID
      tag.setAttribute('data-dsh-plugin', 'dsh-no-shimmer')
      tag.textContent = CSS
      var parent = document.head || document.documentElement
      parent.appendChild(tag)

      // 兜底：官方重新构建后 hash 变了，按动画名语义再拦一次
      function onAnimationStart(event) {
        if (!isShimmerName(event.animationName)) return
        try {
          event.target.style.setProperty('animation', 'none', 'important')
        } catch (error) {
          // 单个元素失败不影响其它元素
        }
      }
      document.addEventListener('animationstart', onAnimationStart, true)

      return function () {
        document.removeEventListener('animationstart', onAnimationStart, true)
        if (tag.parentNode) tag.parentNode.removeChild(tag)
      }
    }

    function apply(ctx) {
      try {
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(install, 'dsh-no-shimmer: styles')
        } else {
          install()
        }
      } catch (error) {
        console.error('[dsh-no-shimmer] 挂载失败，Harness 会照常运行', error)
      }
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
