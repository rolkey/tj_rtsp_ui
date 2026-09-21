/** 大华 H5Player 单例加载器：SDK 为传统脚本，禁止 import，加载后挂载 window.PlayerControl */

const SCRIPT_ATTR = "data-h5player"

// SDK 资源固定位于 public/module/：SDK 内部以 ./module/xxx.worker.js 相对文档路径加载 worker，
// 因此整个 module 目录必须放在站点根级，不能放在 static/video 等子目录下
const CANDIDATE_PATHS = [
  "module/PlayerControl.js"
]

let loadPromise = null

/** 注入脚本标签并等待加载完成（已存在则复用，不移除） */
function injectScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${SCRIPT_ATTR}][src="${src}"]`)
    if (existing) {
      if (window.PlayerControl) {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error(`播放器 SDK 资源加载失败：${src}`)), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.setAttribute(SCRIPT_ATTR, "")
    script.addEventListener("load", () => resolve(), { once: true })
    script.addEventListener("error", () => reject(new Error(`播放器 SDK 资源加载失败：${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

/** 依次尝试候选路径加载 SDK */
async function loadFromCandidates() {
  for (const path of CANDIDATE_PATHS) {
    const src = `${import.meta.env.BASE_URL}${path}`
    try {
      await injectScript(src)
    } catch (err) {
      continue
    }
    if (window.PlayerControl) {
      return window.PlayerControl
    }
  }
  throw new Error("播放器 SDK 加载失败，请确认静态资源 module/PlayerControl.js 是否存在")
}

/** 加载大华 H5Player SDK，返回 window.PlayerControl */
export function loadPlayerControl() {
  if (window.PlayerControl) {
    return Promise.resolve(window.PlayerControl)
  }
  if (loadPromise) {
    return loadPromise
  }
  loadPromise = loadFromCandidates()
    .then((PlayerControl) => {
      if (!PlayerControl) {
        throw new Error("播放器 SDK 加载失败：未找到 window.PlayerControl")
      }
      return PlayerControl
    })
    .catch((err) => {
      loadPromise = null
      throw err
    })
  return loadPromise
}
