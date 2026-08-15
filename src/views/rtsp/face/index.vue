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
         <el-form-item label="设备编码" prop="devCode">
            <el-input
               v-model="queryParams.devCode"
               placeholder="请输入设备编码"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="上传状态" prop="uploadStatus">
            <el-select v-model="queryParams.uploadStatus" placeholder="上传状态" clearable style="width: 200px">
               <el-option
                  v-for="item in uploadStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="推送状态" prop="pushStatus">
            <el-select v-model="queryParams.pushStatus" placeholder="推送状态" clearable style="width: 200px">
               <el-option
                  v-for="item in pushStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="人脸照时间" style="width: 308px">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD HH:mm:ss"
               type="daterange"
               range-separator="-"
               start-placeholder="开始日期"
               end-placeholder="结束日期"
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
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['rtsp:face:remove']"
            >删除</el-button>
         </el-col>
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

      <el-table border v-loading="loading" :data="faceList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="摄像头" align="center" prop="cameraName" :show-overflow-tooltip="true" />
         <el-table-column label="监控点标识" align="center" prop="cameraIndexCode" :show-overflow-tooltip="true" />
         <el-table-column label="人脸照时间" align="center" prop="faceTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.faceTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="人脸缩略图" align="center" width="90">
            <template #default="scope">
               <el-image
                  v-if="scope.row.faceImagePath"
                  :src="scope.row.faceImagePath"
                  :preview-src-list="[scope.row.faceImagePath]"
                  fit="cover"
                  style="width: 50px; height: 50px"
                  preview-teleported
               />
               <span v-else>-</span>
            </template>
         </el-table-column>
         <el-table-column label="上传状态" align="center" prop="uploadStatus" width="100">
            <template #default="scope">
               <el-tag :type="uploadStatusMap[scope.row.uploadStatus]?.type">{{ uploadStatusMap[scope.row.uploadStatus]?.label || '-' }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="推送状态" align="center" prop="pushStatus" width="100">
            <template #default="scope">
               <el-tag :type="pushStatusMap[scope.row.pushStatus]?.type">{{ pushStatusMap[scope.row.pushStatus]?.label || '-' }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="失败原因" align="center" prop="errorMsg" :show-overflow-tooltip="true" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
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

<script setup name="RtspFace">
import { listFace, delFace } from "@/api/rtsp/face"

const { proxy } = getCurrentInstance()

const faceList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const dateRange = ref([])

// 上传状态选项
const uploadStatusOptions = [
  { value: "0", label: "成功" },
  { value: "1", label: "失败" },
  { value: "2", label: "处理中" }
]

// 推送状态选项
const pushStatusOptions = [
  { value: "0", label: "待推送" },
  { value: "1", label: "已推送" },
  { value: "2", label: "失败" },
  { value: "3", label: "放弃" }
]

// 上传状态标签映射
const uploadStatusMap = {
  "0": { label: "成功", type: "success" },
  "1": { label: "失败", type: "danger" },
  "2": { label: "处理中", type: "info" }
}

// 推送状态标签映射
const pushStatusMap = {
  "0": { label: "待推送", type: "info" },
  "1": { label: "已推送", type: "success" },
  "2": { label: "失败", type: "danger" },
  "3": { label: "放弃", type: "warning" }
}

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  cameraIndexCode: undefined,
  devCode: undefined,
  uploadStatus: undefined,
  pushStatus: undefined
})

/** 查询人脸抓拍列表 */
function getList() {
  loading.value = true
  listFace(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    faceList.value = response.rows
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

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.imageId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 删除按钮操作 */
function handleDelete(row) {
  const imageIds = row.imageId || ids.value
  proxy.$modal.confirm('是否确认删除人脸抓拍编号为"' + imageIds + '"的数据项？').then(function () {
    return delFace(imageIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>
