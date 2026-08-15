<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="监控点标识" prop="cameraIndexCode">
            <el-input
               v-model="queryParams.cameraIndexCode"
               placeholder="请输入监控点标识"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="录像时间" style="width: 308px">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD HH:mm:ss"
               type="datetimerange"
               range-separator="-"
               start-placeholder="开始时间"
               end-placeholder="结束时间"
               :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
            ></el-date-picker>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Refresh"
               @click="handleQuery"
            >刷新</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table border v-loading="loading" :data="recordList">
         <el-table-column label="监控点标识" align="center" prop="cameraIndexCode" :show-overflow-tooltip="true" />
         <el-table-column label="开始时间" align="center" prop="beginTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.beginTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="结束时间" align="center" prop="endTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.endTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="片段大小" align="center" prop="size" width="120">
            <template #default="scope">
               <span>{{ formatSize(scope.row.size) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="锁定类型" align="center" prop="lockType" width="100">
            <template #default="scope">
               <el-tag :type="lockTypeMap[scope.row.lockType]?.type">{{ lockTypeMap[scope.row.lockType]?.label || '-' }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="RTSP地址" align="center" prop="url" :show-overflow-tooltip="true">
            <template #default="scope">
               <el-button link type="primary" icon="CopyDocument" v-copyText="scope.row.url" v-copyText:callback="copyTextSuccess">复制</el-button>
               <span>{{ scope.row.url }}</span>
            </template>
         </el-table-column>
         <el-table-column label="录像日期" align="center" prop="recordDate" width="120">
            <template #default="scope">
               <span>{{ parseTime(scope.row.recordDate, '{y}-{m}-{d}') }}</span>
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />
   </div>
</template>

<script setup name="RtspRecord">
import { listRecord } from "@/api/rtsp/record"

const { proxy } = getCurrentInstance()

const recordList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const dateRange = ref([])

// 锁定类型标签映射
const lockTypeMap = {
  "0": { label: "全部", type: "info" },
  "1": { label: "未锁定", type: "success" },
  "2": { label: "已锁定", type: "warning" }
}

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  cameraIndexCode: undefined
})

/** 查询录像片段列表 */
function getList() {
  loading.value = true
  listRecord(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    recordList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 格式化字节大小为 MB */
function formatSize(size) {
  if (size == null || size === "") {
    return "-"
  }
  return (size / 1024 / 1024).toFixed(2) + " MB"
}

/** 复制成功回调 */
function copyTextSuccess() {
  proxy.$modal.msgSuccess("复制成功")
}

getList()
</script>
