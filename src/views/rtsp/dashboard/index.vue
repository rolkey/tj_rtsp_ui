<template>
   <div class="app-container">
      <el-row :gutter="12">
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-label">摄像头总数</div>
               <div class="stat-value">{{ summary.cameraTotal ?? '-' }}</div>
               <div class="stat-sub">停用：{{ summary.cameraInactive ?? '-' }}</div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-label">正常运行</div>
               <div class="stat-value">{{ summary.cameraActive ?? '-' }}</div>
               <div class="stat-sub">今日活跃：{{ summary.todayActiveCameras ?? '-' }}</div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-label">今日上传</div>
               <div class="stat-value">{{ summary.todayUploadSuccess ?? '-' }}<span class="stat-unit">/{{ summary.todayUploadTotal ?? '-' }}</span></div>
               <div class="stat-sub">失败：{{ summary.todayUploadFailed ?? '-' }}</div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-label">累计图片</div>
               <div class="stat-value">{{ summary.totalImages ?? '-' }}</div>
               <div class="stat-sub">&nbsp;</div>
            </el-card>
         </el-col>
      </el-row>

      <el-card shadow="never" class="mt8">
         <template #header><span>上传趋势</span></template>
         <div ref="trendChart" style="height: 360px" />
      </el-card>

      <el-card shadow="never" class="mt8">
         <template #header><span>最近上传记录</span></template>
         <el-table border v-loading="recentLoading" :data="recentList">
            <el-table-column label="摄像头" align="center" prop="cameraName" :show-overflow-tooltip="true" />
            <el-table-column label="上传时间" align="center" prop="faceTime" width="180">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.faceTime) }}</span>
               </template>
            </el-table-column>
            <el-table-column label="上传状态" align="center" prop="uploadStatus" width="120">
               <template #default="scope">
                  <el-tag :type="uploadStatusMap[scope.row.uploadStatus]?.type">{{ uploadStatusMap[scope.row.uploadStatus]?.label || '-' }}</el-tag>
               </template>
            </el-table-column>
         </el-table>
      </el-card>

      <el-card shadow="never" class="mt8">
         <template #header><span>摄像头统计</span></template>
         <el-table border v-loading="statsLoading" :data="cameraStatsList">
            <el-table-column label="设备名称" align="center" prop="cameraName" :show-overflow-tooltip="true" />
            <el-table-column label="安装位置" align="center" prop="location" :show-overflow-tooltip="true" />
            <el-table-column label="状态" align="center" prop="status" width="100">
               <template #default="scope">
                  <el-tag :type="scope.row.status == '0' ? 'success' : 'danger'">{{ scope.row.status == '0' ? '正常' : '停用' }}</el-tag>
               </template>
            </el-table-column>
            <el-table-column label="上传总数" align="center" prop="totalUploads" width="100" />
            <el-table-column label="成功" align="center" prop="successUploads" width="90" />
            <el-table-column label="失败" align="center" prop="failedUploads" width="90" />
            <el-table-column label="成功率" align="center" prop="successRate" width="120">
               <template #default="scope">
                  <span>{{ formatRate(scope.row.successRate) }}</span>
               </template>
            </el-table-column>
         </el-table>
         <pagination
            v-show="statsTotal > 0"
            :total="statsTotal"
            v-model:page="statsQueryParams.pageNum"
            v-model:limit="statsQueryParams.pageSize"
            @pagination="getCameraStatsList"
         />
      </el-card>
   </div>
</template>

<script setup name="RtspDashboard">
import { getSummary, getRecent, getCameraStats, getUploadTrend } from "@/api/rtsp/dashboard"
import * as echarts from 'echarts'

const { proxy } = getCurrentInstance()

const summary = ref({})
const recentList = ref([])
const recentLoading = ref(false)
const cameraStatsList = ref([])
const statsLoading = ref(false)
const statsTotal = ref(0)
const trendChart = ref(null)
let trendInstance = null
let pollTimer = null
let resizeHandler = null

// 上传状态标签映射
const uploadStatusMap = {
  "0": { label: "成功", type: "success" },
  "1": { label: "失败", type: "danger" },
  "2": { label: "处理中", type: "info" }
}

const statsQueryParams = ref({
  pageNum: 1,
  pageSize: 10
})

/** 加载汇总统计 */
function getSummaryData() {
  getSummary().then(response => {
    summary.value = response.data || {}
  })
}

/** 加载最近上传记录 */
function getRecentList() {
  recentLoading.value = true
  getRecent(20).then(response => {
    recentList.value = response.rows || []
    recentLoading.value = false
  })
}

/** 加载摄像头统计列表 */
function getCameraStatsList() {
  statsLoading.value = true
  getCameraStats(statsQueryParams.value).then(response => {
    cameraStatsList.value = response.rows
    statsTotal.value = response.total
    statsLoading.value = false
  })
}

/** 加载上传趋势并渲染图表 */
function getTrendData() {
  getUploadTrend(7).then(response => {
    const rows = response.data || response.rows || []
    const dates = rows.map(item => item.date)
    const success = rows.map(item => item.success)
    const failed = rows.map(item => item.failed)
    renderTrendChart(dates, success, failed)
  })
}

/** 渲染上传趋势折线图 */
function renderTrendChart(dates, success, failed) {
  if (!trendChart.value) return
  if (!trendInstance) {
    trendInstance = echarts.init(trendChart.value, "macarons")
    resizeHandler = () => {
      trendInstance.resize()
    }
    window.addEventListener("resize", resizeHandler)
  }
  trendInstance.setOption({
    tooltip: {
      trigger: "axis"
    },
    legend: {
      data: ["成功", "失败"]
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: "value"
    },
    series: [
      {
        name: "成功",
        type: "line",
        smooth: true,
        data: success
      },
      {
        name: "失败",
        type: "line",
        smooth: true,
        data: failed
      }
    ]
  })
}

/** 格式化成功率 */
function formatRate(rate) {
  if (rate == null || rate === "") {
    return "-"
  }
  return Number(rate).toFixed(2) + "%"
}

onMounted(() => {
  getSummaryData()
  getRecentList()
  getCameraStatsList()
  getTrendData()
  pollTimer = setInterval(() => {
    getSummaryData()
    getTrendData()
  }, 30000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (trendInstance) {
    window.removeEventListener("resize", resizeHandler)
    trendInstance.dispose()
    trendInstance = null
    resizeHandler = null
  }
})
</script>

<style scoped>
.stat-card {
   text-align: center;
}
.stat-label {
   font-size: 13px;
   color: #909399;
}
.stat-value {
   font-size: 28px;
   font-weight: 600;
   color: #303133;
   margin: 8px 0 4px;
}
.stat-unit {
   font-size: 14px;
   font-weight: 400;
   color: #909399;
}
.stat-sub {
   font-size: 12px;
   color: #c0c4cc;
}
.mt8 {
   margin-top: 8px;
}
</style>
