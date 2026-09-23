<template>
   <div class="app-container">
      <el-alert
         type="info"
         :closable="false"
         class="mb8"
         title="接口测试工具：用于测试 3 个对外匿名接口，绕过 RuoYi 登录与拦截器，完整展示原始响应。"
      />

      <el-form :inline="true" label-width="90px">
         <el-form-item label="后端地址">
            <el-input
               v-model="baseUrl"
               placeholder="可填 http://localhost:8080 直连"
               clearable
               style="width: 260px"
            />
         </el-form-item>
      </el-form>

      <el-tabs v-model="activeTab" type="border-card">
         <!-- Tab1 人脸推送 -->
         <el-tab-pane label="人脸推送" name="face">
            <el-form :model="forms.face" ref="faceRef" label-width="120px">
               <el-row>
                  <el-col :span="12">
                     <el-form-item label="监控点标识" prop="cameraIndexCode">
                        <el-input v-model="forms.face.cameraIndexCode" placeholder="cameraIndexCode（必填）" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="设备编码" prop="devCode">
                        <el-input v-model="forms.face.devCode" placeholder="devCode" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="抓拍时间" prop="faceTime">
                        <el-date-picker
                           v-model="forms.face.faceTime"
                           type="datetime"
                           value-format="yyyy-MM-dd HH:mm:ss"
                           placeholder="yyyy-MM-dd HH:mm:ss"
                           style="width: 100%"
                        />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="人脸图片" prop="faceBase64">
                        <div class="base64-upload">
                           <el-input
                              v-model="forms.face.faceBase64"
                              type="textarea"
                              :rows="4"
                              placeholder="人脸图片 Base64（必填）"
                           />
                           <el-upload
                              class="upload-btn"
                              :auto-upload="false"
                              :show-file-list="false"
                              accept="image/*"
                              :on-change="handleFaceImage"
                           >
                              <el-button type="primary" plain icon="Upload">上传图片转Base64</el-button>
                           </el-upload>
                        </div>
                     </el-form-item>
                  </el-col>
                  <el-col :span="24">
                     <el-form-item label="全景图片" prop="sceneBase64">
                        <el-input
                           v-model="forms.face.sceneBase64"
                           type="textarea"
                           :rows="3"
                           placeholder="全景图片 Base64（可选）"
                        />
                     </el-form-item>
                  </el-col>
                  <el-col :span="24">
                     <el-form-item>
                        <el-button type="primary" icon="Position" :loading="loading.face" @click="sendFace">发送请求</el-button>
                        <el-button icon="Refresh" @click="resetFace">重置</el-button>
                     </el-form-item>
                  </el-col>
               </el-row>
            </el-form>

            <el-divider content-position="left">响应结果</el-divider>
            <template v-if="responses.face">
               <el-alert
                  :type="responses.face.code === 0 ? 'success' : 'error'"
                  :closable="false"
                  show-icon
                  class="mb8"
               >
                  <template #title>
                     <span>code：{{ responses.face.code }}&nbsp;&nbsp;message：{{ responses.face.message }}</span>
                  </template>
               </el-alert>
            </template>
            <pre class="resp-json">{{ faceJson }}</pre>
         </el-tab-pane>

         <!-- Tab2 视频预览 -->
         <el-tab-pane label="视频预览" name="preview">
            <el-form :model="forms.preview" ref="previewRef" label-width="120px">
               <el-row>
                  <el-col :span="12">
                     <el-form-item label="监控点标识" prop="cameraIndexCode">
                        <el-input v-model="forms.preview.cameraIndexCode" placeholder="cameraIndexCode（必填）" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="码流类型" prop="streamType">
                        <el-select v-model="forms.preview.streamType" style="width: 100%">
                           <el-option label="0-主码流" value="0" />
                           <el-option label="1-子码流" value="1" />
                        </el-select>
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="传输模式" prop="transmode">
                        <el-select v-model="forms.preview.transmode" style="width: 100%">
                           <el-option label="0-UDP" value="0" />
                           <el-option label="1-TCP" value="1" />
                        </el-select>
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="协议" prop="protocol">
                        <el-input v-model="forms.preview.protocol" placeholder="protocol（如 rtsp）" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="expand" prop="expand">
                        <el-input v-model="forms.preview.expand" placeholder="expand" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="streamform" prop="streamform">
                        <el-input v-model="forms.preview.streamform" placeholder="streamform" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="24">
                     <el-form-item>
                        <el-button type="primary" icon="Position" :loading="loading.preview" @click="sendPreview">发送请求</el-button>
                        <el-button icon="Refresh" @click="resetPreview">重置</el-button>
                     </el-form-item>
                  </el-col>
               </el-row>
            </el-form>

            <el-divider content-position="left">响应结果</el-divider>
            <template v-if="previewUrl">
               <el-alert type="success" :closable="false" class="mb8">
                  <template #title>
                     <span>取流地址：{{ previewUrl }}</span>
                  </template>
                  <el-button link type="primary" icon="CopyDocument" v-copyText="previewUrl" v-copyText:callback="copySuccess">复制</el-button>
                  <div class="vlc-tip">可在 VLC 播放器：媒体 → 打开网络串流，粘贴该地址进行播放</div>
               </el-alert>
            </template>
            <pre class="resp-json">{{ previewJson }}</pre>
         </el-tab-pane>

         <!-- Tab3 录像回放 -->
         <el-tab-pane label="录像回放" name="playback">
            <el-form :model="forms.playback" ref="playbackRef" label-width="120px">
               <el-row>
                  <el-col :span="12">
                     <el-form-item label="监控点标识" prop="cameraIndexCode">
                        <el-input v-model="forms.playback.cameraIndexCode" placeholder="cameraIndexCode（必填）" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="存储位置" prop="recordLocation">
                        <el-select v-model="forms.playback.recordLocation" style="width: 100%">
                           <el-option label="0-中心存储" value="0" />
                           <el-option label="1-设备存储" value="1" />
                        </el-select>
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="协议" prop="protocol">
                        <el-input v-model="forms.playback.protocol" placeholder="protocol（如 rtsp）" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="传输模式" prop="transmode">
                        <el-select v-model="forms.playback.transmode" style="width: 100%">
                           <el-option label="0-UDP" value="0" />
                           <el-option label="1-TCP" value="1" />
                        </el-select>
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="开始时间" prop="beginTime">
                        <el-date-picker
                           v-model="forms.playback.beginTime"
                           type="datetime"
                           value-format="YYYY-MM-DDTHH:mm:ss"
                           placeholder="开始时间（必填）"
                           style="width: 100%"
                        />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="结束时间" prop="endTime">
                        <el-date-picker
                           v-model="forms.playback.endTime"
                           type="datetime"
                           value-format="YYYY-MM-DDTHH:mm:ss"
                           placeholder="结束时间（必填）"
                           style="width: 100%"
                        />
                     </el-form-item>
                  </el-col>
                  <el-col :span="24">
                     <el-form-item>
                        <el-button type="primary" icon="Position" :loading="loading.playback" @click="sendPlayback">发送请求</el-button>
                        <el-button icon="Refresh" @click="resetPlayback">重置</el-button>
                     </el-form-item>
                  </el-col>
               </el-row>
            </el-form>

            <el-divider content-position="left">响应结果</el-divider>
            <template v-if="playbackUrl">
               <el-alert type="success" :closable="false" class="mb8">
                  <template #title>
                     <span>回放地址：{{ playbackUrl }}</span>
                  </template>
                  <el-button link type="primary" icon="CopyDocument" v-copyText="playbackUrl" v-copyText:callback="copySuccess">复制</el-button>
                  <div class="vlc-tip">可在 VLC 播放器：媒体 → 打开网络串流，粘贴该地址进行播放</div>
               </el-alert>
            </template>
            <el-table
               v-if="playbackList.length"
               border
               :data="playbackList"
               class="mb8"
            >
               <el-table-column label="开始时间" align="center" prop="beginTime" width="220" />
               <el-table-column label="结束时间" align="center" prop="endTime" width="220" />
               <el-table-column label="片段大小" align="center" prop="size" width="140">
                  <template #default="scope">
                     <span>{{ formatSize(scope.row.size) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="锁定类型" align="center" prop="lockType" width="120">
                  <template #default="scope">
                     <el-tag :type="lockTypeMap[scope.row.lockType]?.type">{{ lockTypeMap[scope.row.lockType]?.label || '-' }}</el-tag>
                  </template>
               </el-table-column>
            </el-table>
            <pre class="resp-json">{{ playbackJson }}</pre>
         </el-tab-pane>
      </el-tabs>
   </div>
</template>

<script setup name="RtspApiTest">
import { sendRequest } from "@/api/rtsp/apitest"

const { proxy } = getCurrentInstance()

const activeTab = ref("face")
const baseUrl = ref("/dev-api")

const forms = reactive({
  face: {
    cameraIndexCode: undefined,
    devCode: undefined,
    faceTime: undefined,
    faceBase64: undefined,
    sceneBase64: undefined
  },
  preview: {
    cameraIndexCode: undefined,
    streamType: "0",
    transmode: "0",
    protocol: "rtsp",
    expand: undefined,
    streamform: undefined
  },
  playback: {
    cameraIndexCode: undefined,
    recordLocation: "0",
    protocol: "rtsp",
    transmode: "0",
    beginTime: undefined,
    endTime: undefined
  }
})

const responses = reactive({
  face: null,
  preview: null,
  playback: null
})

const loading = reactive({
  face: false,
  preview: false,
  playback: false
})

const lockTypeMap = {
  "0": { label: "全部", type: "info" },
  "1": { label: "未锁定", type: "success" },
  "2": { label: "已锁定", type: "warning" }
}

const faceJson = computed(() => (responses.face ? JSON.stringify(responses.face, null, 2) : "暂无响应"))
const previewJson = computed(() => (responses.preview ? JSON.stringify(responses.preview, null, 2) : "暂无响应"))
const playbackJson = computed(() => (responses.playback ? JSON.stringify(responses.playback, null, 2) : "暂无响应"))

const previewUrl = computed(() => responses.preview?.data?.url)
const playbackUrl = computed(() => responses.playback?.data?.url)
const playbackList = computed(() => responses.playback?.data?.list || [])

/** 通用发送逻辑：独立 axios，业务失败（HTTP 200 且 code=-1）也进 then，仅网络错误进 catch */
function send(key, path, data) {
  loading[key] = true
  sendRequest(baseUrl.value, path, data)
    .then(res => {
      responses[key] = res.data
    })
    .catch(err => {
      responses[key] = { error: err.message }
    })
    .finally(() => {
      loading[key] = false
    })
}

/** 人脸图片转 Base64 */
function handleFaceImage(uploadFile) {
  const file = uploadFile.raw
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => {
    const dataUrl = reader.result
    if (typeof dataUrl === "string" && dataUrl.indexOf(",") !== -1) {
      forms.face.faceBase64 = dataUrl.split(",")[1]
      proxy.$modal.msgSuccess("图片已转换为 Base64")
    }
  }
}

/** 发送人脸推送 */
function sendFace() {
  if (!forms.face.cameraIndexCode) {
    proxy.$modal.msgWarning("请输入监控点标识 cameraIndexCode")
    return
  }
  if (!forms.face.faceBase64) {
    proxy.$modal.msgWarning("请上传图片生成 faceBase64")
    return
  }
  send("face", "/api/upload/base64", forms.face)
}

/** 发送视频预览 */
function sendPreview() {
  if (!forms.preview.cameraIndexCode) {
    proxy.$modal.msgWarning("请输入监控点标识 cameraIndexCode")
    return
  }
  send("preview", "/api/video/v2/cameras/previewURLs", forms.preview)
}

/** 发送录像回放 */
function sendPlayback() {
  if (!forms.playback.cameraIndexCode) {
    proxy.$modal.msgWarning("请输入监控点标识 cameraIndexCode")
    return
  }
  if (!forms.playback.beginTime || !forms.playback.endTime) {
    proxy.$modal.msgWarning("请选择开始时间和结束时间")
    return
  }
  const data = {
    ...forms.playback,
    beginTime: forms.playback.beginTime + "+08:00",
    endTime: forms.playback.endTime + "+08:00"
  }
  send("playback", "/api/video/v2/cameras/playbackURLs", data)
}

function resetFace() {
  proxy.resetForm("faceRef")
  responses.face = null
}

function resetPreview() {
  proxy.resetForm("previewRef")
  responses.preview = null
}

function resetPlayback() {
  proxy.resetForm("playbackRef")
  responses.playback = null
}

function copySuccess() {
  proxy.$modal.msgSuccess("复制成功")
}

function formatSize(size) {
  if (size == null || size === "") {
    return "-"
  }
  return (size / 1024 / 1024).toFixed(2) + " MB"
}
</script>

<style scoped>
.base64-upload {
   display: flex;
   align-items: flex-start;
   gap: 8px;
   width: 100%;
}

.upload-btn {
   flex-shrink: 0;
}

.resp-json {
   margin: 0;
   padding: 12px;
   background-color: #f5f7fa;
   border: 1px solid #dcdfe6;
   border-radius: 4px;
   font-size: 12px;
   line-height: 1.6;
   white-space: pre-wrap;
   word-break: break-all;
   max-height: 400px;
   overflow: auto;
}

.vlc-tip {
   margin-top: 4px;
   color: #909399;
   font-size: 12px;
}
</style>
