<template>
   <el-dialog
      v-model="dialogVisible"
      title="录像回放"
      width="1020px"
      append-to-body
      :close-on-click-modal="false"
      @opened="open"
      @closed="teardown"
   >
      <div class="playback-wrap">
         <div class="player-stage">
            <canvas ref="canvasRef" class="player-canvas"></canvas>
            <video ref="videoRef" class="player-video"></video>

            <div v-if="state === 'loading'" class="player-mask">
               <el-icon class="is-loading"><Loading /></el-icon>
               <span>正在加载播放器…</span>
            </div>
            <div v-else-if="state === 'error'" class="player-mask error">
               <el-icon><WarningFilled /></el-icon>
               <span>{{ errorMessage || "播放失败" }}</span>
            </div>
            <div v-else-if="state === 'ended'" class="player-mask">
               <el-icon><CircleCheckFilled /></el-icon>
               <span>播放完成</span>
            </div>
         </div>

         <div class="player-controls">
            <div class="controls-row">
               <el-button
                  type="primary"
                  :icon="isPlaying ? 'VideoPause' : 'VideoPlay'"
                  :disabled="!canControl"
                  @click="togglePlay"
               >{{ isPlaying ? "暂停" : "播放" }}</el-button>
               <el-button icon="SwitchButton" :disabled="!canControl" @click="handleStop">停止</el-button>
               <el-button icon="Camera" :disabled="!canControl" @click="handleCapture">抓图</el-button>

               <div class="speed-box">
                  <span class="ctrl-label">倍速</span>
                  <el-select v-model="speed" size="small" style="width: 96px" :disabled="!canControl" @change="handleSpeedChange">
                     <el-option v-for="item in speedOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
               </div>

               <div class="volume-box">
                  <el-button link :icon="volume > 0 ? 'Bell' : 'Mute'" :disabled="!canControl" @click="toggleMute">
                     {{ volume > 0 ? "静音" : "取消静音" }}
                  </el-button>
                  <el-slider
                     v-model="volume"
                     :min="0"
                     :max="1"
                     :step="0.1"
                     style="width: 120px"
                     :disabled="!canControl"
                     @change="handleVolumeChange"
                  />
                  <span v-if="volume === 0" class="mute-hint">默认静音</span>
               </div>

               <div class="time-box">{{ formatSec(currentSec) }} / {{ formatSec(totalSec) }}</div>
            </div>

            <el-slider
               class="progress-slider"
               :model-value="sliderSec"
               :max="Math.max(totalSec, 1)"
               :step="1"
               :format-tooltip="formatSec"
               :disabled="!canControl"
               @input="handleSliderInput"
               @change="handleSliderChange"
            />
         </div>
      </div>

      <template #footer>
         <div class="dialog-footer">
            <el-button @click="dialogVisible = false">关 闭</el-button>
         </div>
      </template>

      <el-dialog v-model="captureVisible" title="抓图预览" width="720px" append-to-body>
         <div class="capture-box">
            <el-image :src="captureSrc" fit="contain" style="width: 100%" />
         </div>
      </el-dialog>
   </el-dialog>
</template>

<script setup name="PlaybackDialog">
import { ElMessage } from "element-plus"
import { getCameraByIndexCode } from "@/api/rtsp/camera"
import { loadPlayerControl } from "@/utils/h5player"
import { derivePlaybackParams, buildFileRtspUrl } from "@/utils/rtsp"

const props = defineProps({
  visible: { type: Boolean, default: false },
  segments: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(["update:visible"])

const speedOptions = [
  { value: 1 / 16, label: "1/16x" },
  { value: 1 / 8, label: "1/8x" },
  { value: 1 / 4, label: "1/4x" },
  { value: 1 / 2, label: "1/2x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 4, label: "4x" },
  { value: 8, label: "8x" },
  { value: 16, label: "16x" }
]

const errorMessages = {
  101: "播放延时超过 8 秒",
  201: "音频无法解码",
  202: "WebSocket 连接错误",
  203: "文件播放完成",
  404: "未找到 RTSP 地址",
  457: "回放时间点非法",
  503: "SETUP 不可用",
  504: "对讲不可用"
}

const canvasRef = ref(null)
const videoRef = ref(null)

const state = ref("idle")
const errorMessage = ref("")
const playQueue = ref([])
const index = ref(0)
// firstTs 记录当前片段首帧 timestamp，frameBaseOffset 记录该帧对应的片段内偏移
const firstTs = ref(null)
const frameBaseOffset = ref(0)
const pendingSeekSec = ref(null)
const currentSec = ref(0)
const sliderSec = ref(0)
const isDragging = ref(false)
const isPlaying = ref(false)
const volume = ref(0)
const speed = ref(1)
const playerReady = ref(false)
const captureVisible = ref(false)
const captureSrc = ref("")

let player = null
let params = null
let opening = false

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val)
})

const totalSec = computed(() => playQueue.value.reduce((sum, item) => sum + (item.durationSec || 0), 0))
const baseOffset = computed(() => playQueue.value.slice(0, index.value).reduce((sum, item) => sum + (item.durationSec || 0), 0))
const canControl = computed(() => playerReady.value && state.value !== "loading" && state.value !== "error")

watch(() => props.visible, (val) => {
  if (!val) {
    teardown()
  }
})

watch(currentSec, (val) => {
  if (!isDragging.value) {
    sliderSec.value = val
  }
})

onBeforeUnmount(() => {
  teardown()
})

/** 秒数格式化为 HH:mm:ss */
function formatSec(sec) {
  const total = Math.max(0, Math.floor(sec || 0))
  const h = String(Math.floor(total / 3600)).padStart(2, "0")
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  const s = String(total % 60).padStart(2, "0")
  return `${h}:${m}:${s}`
}

/** 重置全部播放状态 */
function resetState() {
  state.value = "idle"
  errorMessage.value = ""
  playQueue.value = []
  index.value = 0
  firstTs.value = null
  frameBaseOffset.value = 0
  pendingSeekSec.value = null
  currentSec.value = 0
  sliderSec.value = 0
  isDragging.value = false
  isPlaying.value = false
  volume.value = 0
  speed.value = 1
  captureSrc.value = ""
  captureVisible.value = false
  params = null
}

/** 打开弹窗：加载 SDK -> 查设备 -> 构建播放队列 -> 起播 */
async function open() {
  if (opening) {
    return
  }
  opening = true
  resetState()
  state.value = "loading"

  try {
    await loadPlayerControl()
  } catch (err) {
    fail(err.message || "播放器 SDK 加载失败")
    opening = false
    return
  }

  const startRow = props.segments[props.startIndex]
  if (!startRow || !startRow.cameraIndexCode) {
    fail("未获取到录像片段对应的监控点标识")
    opening = false
    return
  }

  let camera = null
  try {
    const response = await getCameraByIndexCode(startRow.cameraIndexCode)
    camera = response && response.data
  } catch (err) {
    fail("未找到对应的监控设备")
    opening = false
    return
  }
  if (!camera) {
    fail("未找到对应的监控设备，请先在设备管理中维护")
    opening = false
    return
  }

  try {
    params = derivePlaybackParams(camera)
  } catch (err) {
    fail(err.message)
    opening = false
    return
  }

  const rows = [...props.segments].sort((a, b) => new Date(a.beginTime) - new Date(b.beginTime))
  const queue = []
  for (const row of rows) {
    const filePath = buildFileRtspUrl(params.rtspURL, row.url)
    if (!filePath) {
      continue
    }
    const begin = new Date(row.beginTime).getTime()
    const end = new Date(row.endTime).getTime()
    const durationSec = (end - begin) / 1000
    queue.push({
      source: row,
      filePath,
      beginTime: row.beginTime,
      endTime: row.endTime,
      durationSec: durationSec > 0 ? durationSec : 0
    })
  }

  if (!queue.length) {
    fail("所选录像片段缺少可用的播放地址")
    opening = false
    return
  }

  playQueue.value = queue
  let startQueueIndex = queue.findIndex(item => item.source === startRow)
  if (startQueueIndex < 0) {
    startQueueIndex = 0
  }
  index.value = startQueueIndex
  currentSec.value = baseOffset.value
  sliderSec.value = currentSec.value
  state.value = "loading"
  createPlayer(queue[startQueueIndex].filePath)
  opening = false
}

/** 创建播放器实例并绑定事件 */
function createPlayer(filePath) {
  destroyPlayer()
  if (!canvasRef.value || !videoRef.value) {
    return
  }

  canvasRef.value.style.display = "none"
  videoRef.value.style.display = "none"

  const p = new window.PlayerControl({
    wsURL: params.wsURL,
    rtspURL: filePath,
    username: params.username,
    password: params.password,
    lessRateCanvas: true,
    playbackIndex: 0,
    wndIndex: 0
  })
  player = p
  playerReady.value = true

  p.on("WorkerReady", () => {
    if (player !== p) {
      return
    }
    try {
      p.connect()
    } catch (err) {
      // 忽略重复连接异常
    }
  })

  // 按厂商映射切换 H264(video)/H265(canvas) 渲染元素
  p.on("DecodeStart", (e) => {
    if (player !== p || !canvasRef.value || !videoRef.value) {
      return
    }
    if (e && e.decodeMode === "video") {
      videoRef.value.style.display = ""
      canvasRef.value.style.display = "none"
    } else {
      videoRef.value.style.display = "none"
      canvasRef.value.style.display = ""
    }
  })

  p.on("PlayStart", () => {
    if (player !== p) {
      return
    }
    isPlaying.value = true
    if (state.value !== "paused") {
      state.value = "playing"
    }
    try {
      p.setAudioVolume(volume.value)
    } catch (err) {
      // 忽略音量设置异常
    }
    if (speed.value !== 1) {
      try {
        p.playFF(speed.value)
      } catch (err) {
        // 忽略倍速设置异常
      }
    }
    if (pendingSeekSec.value != null) {
      const target = pendingSeekSec.value
      pendingSeekSec.value = null
      try {
        p.playByTime(target)
      } catch (err) {
        // 忽略跳转异常
      }
    }
  })

  p.on("GetTotalTime", (e) => {
    if (player !== p) {
      return
    }
    const segment = playQueue.value[index.value]
    if (segment && typeof e === "number" && e > 0) {
      segment.durationSec = e
    }
  })

  p.on("UpdateCanvas", (rs) => {
    if (player !== p || !rs || typeof rs.timestamp !== "number") {
      return
    }
    if (firstTs.value == null) {
      firstTs.value = rs.timestamp - frameBaseOffset.value
    }
    let sec = baseOffset.value + (rs.timestamp - firstTs.value)
    if (sec < 0) {
      sec = 0
    }
    if (totalSec.value > 0 && sec > totalSec.value) {
      sec = totalSec.value
    }
    currentSec.value = sec
  })

  p.on("FileOver", () => {
    if (player !== p) {
      return
    }
    handleFileOver()
  })

  p.on("Error", (rs) => {
    if (player !== p) {
      return
    }
    handlePlayerError(rs)
  })

  p.init(canvasRef.value, videoRef.value)
}

/** 关闭并销毁播放器实例 */
function destroyPlayer() {
  if (player) {
    try {
      player.close()
    } catch (err) {
      // SDK 重复关闭可能抛异常
    }
    player = null
  }
  playerReady.value = false
}

/** 释放播放器并复位状态 */
function teardown() {
  destroyPlayer()
  opening = false
  resetState()
}

/** 进入错误态并提示 */
function fail(message) {
  errorMessage.value = message
  state.value = "error"
  ElMessage.error(message)
}

/** 播放器错误码处理，203 视为正常播放完成 */
function handlePlayerError(rs) {
  const code = rs && rs.errorCode
  if (code === 203) {
    handleFileOver()
    return
  }
  const message = errorMessages[code] || `播放错误（错误码 ${code == null ? "未知" : code}）`
  fail(message)
}

/** 当前片段播放完成，自动续播下一段 */
function handleFileOver() {
  if (index.value < playQueue.value.length - 1) {
    index.value += 1
    firstTs.value = null
    frameBaseOffset.value = 0
    pendingSeekSec.value = null
    currentSec.value = baseOffset.value
    sliderSec.value = currentSec.value
    createPlayer(playQueue.value[index.value].filePath)
  } else {
    isPlaying.value = false
    state.value = "ended"
  }
}

/** 播放/暂停切换 */
function togglePlay() {
  if (!player) {
    return
  }
  if (state.value === "ended" || state.value === "stopped") {
    restartFromStart()
    return
  }
  if (isPlaying.value) {
    try {
      player.pause()
    } catch (err) {
      // 忽略暂停异常
    }
    isPlaying.value = false
    state.value = "paused"
  } else {
    try {
      player.play()
    } catch (err) {
      // 忽略播放异常
    }
    isPlaying.value = true
    state.value = "playing"
  }
}

/** 从头重新起播 */
function restartFromStart() {
  if (!playQueue.value.length) {
    return
  }
  index.value = 0
  firstTs.value = null
  frameBaseOffset.value = 0
  pendingSeekSec.value = null
  currentSec.value = 0
  sliderSec.value = 0
  isPlaying.value = false
  state.value = "loading"
  createPlayer(playQueue.value[0].filePath)
}

/** 停止并复位进度 */
function handleStop() {
  if (player) {
    try {
      player.stop()
    } catch (err) {
      // 忽略停止异常
    }
  }
  firstTs.value = null
  frameBaseOffset.value = 0
  pendingSeekSec.value = null
  currentSec.value = 0
  sliderSec.value = 0
  isPlaying.value = false
  state.value = "stopped"
}

/** 倍速切换 */
function handleSpeedChange(val) {
  speed.value = val
  if (player) {
    try {
      player.playFF(val)
    } catch (err) {
      // 忽略倍速异常
    }
  }
}

/** 音量调整（SDK 默认静音） */
function handleVolumeChange(val) {
  volume.value = val
  if (player) {
    try {
      player.setAudioVolume(val)
    } catch (err) {
      // 忽略音量异常
    }
  }
}

/** 静音/取消静音 */
function toggleMute() {
  handleVolumeChange(volume.value > 0 ? 0 : 0.6)
}

/** 抓图并弹窗预览（不落盘） */
function handleCapture() {
  if (!player) {
    return
  }
  try {
    const base64 = player.getCapture("jpg", 0.9)
    if (!base64) {
      ElMessage.warning("抓图失败，请稍后重试")
      return
    }
    captureSrc.value = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`
    captureVisible.value = true
  } catch (err) {
    ElMessage.error("抓图失败")
  }
}

/** 拖动进度条 */
function handleSliderInput(val) {
  isDragging.value = true
  sliderSec.value = val
}

/** 松开进度条触发跳转 */
function handleSliderChange(val) {
  isDragging.value = false
  seekTo(val)
}

/** 定位到目标秒数，跨片段时重建播放器 */
function seekTo(targetSec) {
  if (!player || !playQueue.value.length) {
    return
  }
  let target = targetSec
  if (target < 0) {
    target = 0
  }
  if (totalSec.value > 0 && target > totalSec.value) {
    target = totalSec.value
  }

  let acc = 0
  let segIndex = playQueue.value.length - 1
  for (let i = 0; i < playQueue.value.length; i++) {
    const duration = playQueue.value[i].durationSec || 0
    if (target < acc + duration || i === playQueue.value.length - 1) {
      segIndex = i
      break
    }
    acc += duration
  }
  const localOffset = Math.max(0, target - acc)

  currentSec.value = target
  sliderSec.value = target

  if (segIndex === index.value) {
    try {
      player.playByTime(localOffset)
    } catch (err) {
      // 忽略跳转异常
    }
  } else {
    index.value = segIndex
    firstTs.value = null
    frameBaseOffset.value = localOffset
    pendingSeekSec.value = localOffset
    createPlayer(playQueue.value[segIndex].filePath)
  }
}
</script>

<style scoped>
.playback-wrap {
   display: flex;
   flex-direction: column;
   gap: 16px;
}

.player-stage {
   position: relative;
   width: 100%;
   max-width: 960px;
   margin: 0 auto;
   aspect-ratio: 16 / 9;
   background: #000;
   border-radius: 6px;
   overflow: hidden;
}

.player-canvas,
.player-video {
   position: absolute;
   inset: 0;
   width: 100%;
   height: 100%;
   object-fit: contain;
   background: #000;
}

.player-mask {
   position: absolute;
   inset: 0;
   display: flex;
   flex-direction: column;
   align-items: center;
   justify-content: center;
   gap: 8px;
   color: #fff;
   font-size: 14px;
   background: rgba(0, 0, 0, 0.6);
}

.player-mask.error {
   color: #f56c6c;
}

.player-mask .el-icon {
   font-size: 28px;
}

.player-controls {
   display: flex;
   flex-direction: column;
   gap: 12px;
}

.controls-row {
   display: flex;
   align-items: center;
   flex-wrap: wrap;
   gap: 16px;
}

.ctrl-label {
   margin-right: 6px;
   color: #606266;
   font-size: 13px;
}

.speed-box,
.volume-box {
   display: flex;
   align-items: center;
}

.volume-box {
   gap: 8px;
}

.mute-hint {
   color: #e6a23c;
   font-size: 12px;
}

.time-box {
   margin-left: auto;
   color: #303133;
   font-size: 14px;
   font-variant-numeric: tabular-nums;
}

.progress-slider {
   padding: 0 4px;
}

.capture-box {
   display: flex;
   justify-content: center;
}
</style>
