<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="90px">
         <el-form-item label="设备名称" prop="cameraName">
            <el-input
               v-model="queryParams.cameraName"
               placeholder="请输入设备名称"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="监控点标识" prop="cameraIndexCode">
            <el-input
               v-model="queryParams.cameraIndexCode"
               placeholder="请输入监控点标识"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
          <el-form-item label="状态" prop="status">
             <el-select v-model="queryParams.status" placeholder="设备状态" clearable style="width: 200px">
                <el-option
                   v-for="item in statusOptions"
                   :key="item.value"
                   :label="item.label"
                   :value="item.value"
                />
             </el-select>
          </el-form-item>
          <el-form-item label="设备类型" prop="deviceType">
             <el-select v-model="queryParams.deviceType" placeholder="设备类型" clearable style="width: 200px">
                <el-option
                   v-for="item in deviceTypeOptions"
                   :key="item.value"
                   :label="item.label"
                   :value="item.value"
                />
             </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['rtsp:camera:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['rtsp:camera:remove']"
            >删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               icon="Refresh"
               @click="handleQuery"
            >刷新</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table border v-loading="loading" :data="cameraList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="设备名称" align="center" prop="cameraName" :show-overflow-tooltip="true" />
          <el-table-column label="设备类型" align="center" prop="deviceType" width="100">
             <template #default="scope">
                <el-tag v-if="scope.row.deviceType === 'NVR'">录像机</el-tag>
                <el-tag v-else-if="scope.row.deviceType === 'SERVER'" type="warning">服务器</el-tag>
                <el-tag v-else-if="scope.row.deviceType === 'IPC'" type="success">摄像头</el-tag>
                <span v-else>-</span>
             </template>
          </el-table-column>
          <el-table-column label="所属设备" align="center" width="180" :show-overflow-tooltip="true">
             <template #default="scope">
                <span>{{ scope.row.parentId && cameraMap[scope.row.parentId] ? cameraMap[scope.row.parentId].cameraName + ' ' + scope.row.channelNo + '号口' : '-' }}</span>
             </template>
          </el-table-column>
          <el-table-column label="监控点标识" align="center" prop="cameraIndexCode" :show-overflow-tooltip="true" />
         <el-table-column label="设备编码" align="center" prop="devCode" :show-overflow-tooltip="true" />
         <el-table-column label="安装位置" align="center" prop="location" :show-overflow-tooltip="true" />
         <el-table-column label="设备IP" align="center" prop="deviceIp" :show-overflow-tooltip="true" />
         <el-table-column label="设备厂家" align="center" prop="manufacturer">
            <template #default="scope">
               <dict-tag :options="rtsp_device_manufacturer" :value="scope.row.manufacturer" />
            </template>
         </el-table-column>
         <el-table-column label="RTSP地址" align="center" prop="streamUrl" :show-overflow-tooltip="true" />
         <el-table-column label="状态" align="center" prop="status" width="100">
            <template #default="scope">
               <el-tag :type="scope.row.status == '0' ? 'success' : 'danger'">{{ scope.row.status == '0' ? '正常' : '停用' }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="最近上传" align="center" prop="lastUploadTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.lastUploadTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="上传次数" align="center" prop="uploadCount" width="100" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="160">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['rtsp:camera:edit']">修改</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['rtsp:camera:remove']">删除</el-button>
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

      <!-- 添加或修改摄像头对话框 -->
      <el-dialog draggable :title="title" v-model="open" width="680px" append-to-body>
         <el-form ref="cameraRef" :model="form" :rules="rules" label-width="120px">
            <el-row>
               <el-col :span="12">
                  <el-form-item label="设备名称" prop="cameraName">
                     <el-input v-model="form.cameraName" placeholder="请输入设备名称" />
                  </el-form-item>
               </el-col>
                <el-col :span="12">
                   <el-form-item label="监控点标识" prop="cameraIndexCode">
                      <el-input v-model="form.cameraIndexCode" placeholder="请输入监控点标识" />
                   </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item label="设备类型" prop="deviceType">
                      <el-select v-model="form.deviceType" placeholder="请选择设备类型" @change="handleDeviceTypeChange">
                         <el-option
                            v-for="item in deviceTypeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                         />
                      </el-select>
                   </el-form-item>
                </el-col>
                <el-col v-if="form.deviceType === 'IPC'" :span="12">
                   <el-form-item label="主控设备" prop="parentId">
                      <el-select v-model="form.parentId" placeholder="请选择主控设备" clearable>
                         <el-option
                            v-for="item in masterOptions"
                            :key="item.cameraId"
                            :label="item.cameraName"
                            :value="item.cameraId"
                         />
                      </el-select>
                   </el-form-item>
                </el-col>
                <el-col v-if="form.deviceType === 'IPC'" :span="12">
                   <el-form-item label="接口号" prop="channelNo">
                      <el-input-number v-model="form.channelNo" :min="1" :controls="false" placeholder="请输入接口号" />
                      <div style="font-size: 12px; color: #909399; line-height: 1; padding-top: 4px">SDK 拉流通道号 = 接口号 - 1</div>
                   </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item label="设备编码" prop="devCode">
                     <el-input v-model="form.devCode" placeholder="请输入设备编码" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="安装位置" prop="location">
                     <el-input v-model="form.location" placeholder="请输入安装位置" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="设备厂家" prop="manufacturer">
                     <el-select v-model="form.manufacturer" placeholder="请选择设备厂家" clearable>
                        <el-option
                           v-for="dict in rtsp_device_manufacturer"
                           :key="dict.value"
                           :label="dict.label"
                           :value="dict.value"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="设备IP" prop="deviceIp">
                     <el-input v-model="form.deviceIp" placeholder="请输入设备IP" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="设备端口" prop="devicePort">
                     <el-input v-model="form.devicePort" placeholder="请输入设备端口" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="设备账号" prop="username">
                     <el-input v-model="form.username" placeholder="请输入设备账号" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="设备密码" prop="password">
                     <el-input v-model="form.password" type="password" show-password placeholder="请输入设备密码" />
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="RTSP基础地址" prop="rtspBaseUrl">
                     <el-input v-model="form.rtspBaseUrl" placeholder="请输入RTSP基础地址" />
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="RTSP地址" prop="streamUrl">
                     <el-input v-model="form.streamUrl" placeholder="请输入RTSP地址" />
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="状态">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="item in statusOptions"
                           :key="item.value"
                           :value="item.value"
                        >{{ item.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
          <template #footer>
             <div class="dialog-footer">
                <el-button type="primary" plain icon="Link" :loading="testLoading" @click="handleTestLogin" v-hasPermi="['rtsp:camera:test']">登录设备</el-button>
                <el-button type="warning" plain icon="SwitchButton" @click="handleTestLogout" v-hasPermi="['rtsp:camera:test']">注销设备</el-button>
                <el-button type="primary" @click="submitForm">确 定</el-button>
                <el-button @click="cancel">取 消</el-button>
             </div>
          </template>
      </el-dialog>
   </div>
</template>

<script setup name="RtspCamera">
import { listCamera, getCamera, delCamera, addCamera, updateCamera, testLogin, testLogout } from "@/api/rtsp/camera"

const { proxy } = getCurrentInstance()
const { rtsp_device_manufacturer } = useDict("rtsp_device_manufacturer")

const cameraList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const testLoading = ref(false)

// 状态选项
const statusOptions = [
  { value: "0", label: "正常" },
  { value: "1", label: "停用" }
]

// 设备类型选项
const deviceTypeOptions = [
  { value: "NVR", label: "录像机" },
  { value: "SERVER", label: "服务器" },
  { value: "IPC", label: "摄像头" }
]

// 设备映射（cameraId → 设备对象）
const cameraMap = ref({})

// 主控设备选项（非 IPC 设备）
const masterOptions = computed(() => Object.values(cameraMap.value).filter(c => c.deviceType !== 'IPC'))

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    cameraName: undefined,
    cameraIndexCode: undefined,
    status: undefined,
    deviceType: undefined
  },
  rules: {
    cameraName: [{ required: true, message: "设备名称不能为空", trigger: "blur" }],
    cameraIndexCode: [{ required: true, message: "监控点标识不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询摄像头列表 */
function getList() {
  loading.value = true
  listCamera(queryParams.value).then(response => {
    cameraList.value = response.rows
    total.value = response.total
    loading.value = false
  })
  // 拉取全量设备构建映射（用于「所属设备」列 + 主控设备下拉）
  listCamera({ pageNum: 1, pageSize: 1000 }).then(res => {
    res.rows.forEach(c => {
      cameraMap.value[c.cameraId] = c
    })
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    cameraId: undefined,
    cameraName: undefined,
    cameraIndexCode: undefined,
    devCode: undefined,
    location: undefined,
    manufacturer: undefined,
    deviceIp: undefined,
    devicePort: undefined,
    username: undefined,
    password: undefined,
    rtspBaseUrl: undefined,
    streamUrl: undefined,
    deviceType: 'NVR',
    parentId: undefined,
    channelNo: undefined,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("cameraRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.cameraId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加设备"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const cameraId = row.cameraId || ids.value
  getCamera(cameraId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改设备"
  })
}

/** 设备类型切换 */
function handleDeviceTypeChange(val) {
  if (val !== 'IPC') {
    form.value.parentId = undefined
  }
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["cameraRef"].validate(valid => {
    if (valid) {
      if (form.value.cameraId != undefined) {
        updateCamera(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addCamera(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 组装连接测试参数 */
function buildTestParam() {
  return {
    cameraId: form.value.cameraId,
    manufacturer: form.value.manufacturer,
    deviceIp: form.value.deviceIp,
    devicePort: form.value.devicePort,
    username: form.value.username,
    password: form.value.password
  }
}

/** 登录设备（连接测试） */
function handleTestLogin() {
  if (!form.value.deviceIp || !form.value.devicePort || !form.value.username) {
    proxy.$modal.msgWarning("请先填写设备IP、端口、账号")
    return
  }
  testLoading.value = true
  testLogin(buildTestParam()).then(response => {
    const info = response.data
    const detail = info
      ? `序列号: ${info.serialNumber || '-'}；设备类型: ${info.deviceType ?? '-'}；通道数: ${info.channelNum ?? '-'}`
      : ''
    proxy.$modal.msgSuccess(response.msg + (detail ? '（' + detail + '）' : ''))
  }).catch(() => {}).finally(() => { testLoading.value = false })
}

/** 注销设备 */
function handleTestLogout() {
  testLogout(buildTestParam()).then(response => {
    proxy.$modal.msgSuccess(response.msg)
  }).catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  const cameraIds = row.cameraId || ids.value
  proxy.$modal.confirm('是否确认删除摄像头编号为"' + cameraIds + '"的数据项？').then(function () {
    return delCamera(cameraIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>
