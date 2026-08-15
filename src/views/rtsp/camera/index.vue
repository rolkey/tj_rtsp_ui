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
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['rtsp:camera:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['rtsp:camera:remove']"
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

      <el-table border v-loading="loading" :data="cameraList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="设备名称" align="center" prop="cameraName" :show-overflow-tooltip="true" />
         <el-table-column label="监控点标识" align="center" prop="cameraIndexCode" :show-overflow-tooltip="true" />
         <el-table-column label="设备编码" align="center" prop="devCode" :show-overflow-tooltip="true" />
         <el-table-column label="安装位置" align="center" prop="location" :show-overflow-tooltip="true" />
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
         <el-form ref="cameraRef" :model="form" :rules="rules" label-width="100px">
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
                  <el-form-item label="设备编码" prop="devCode">
                     <el-input v-model="form.devCode" placeholder="请输入设备编码" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="安装位置" prop="location">
                     <el-input v-model="form.location" placeholder="请输入安装位置" />
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
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="RtspCamera">
import { listCamera, getCamera, delCamera, addCamera, updateCamera } from "@/api/rtsp/camera"

const { proxy } = getCurrentInstance()

const cameraList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

// 状态选项
const statusOptions = [
  { value: "0", label: "正常" },
  { value: "1", label: "停用" }
]

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    cameraName: undefined,
    cameraIndexCode: undefined,
    status: undefined
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
    rtspBaseUrl: undefined,
    streamUrl: undefined,
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
  title.value = "添加摄像头"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const cameraId = row.cameraId || ids.value
  getCamera(cameraId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改摄像头"
  })
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
