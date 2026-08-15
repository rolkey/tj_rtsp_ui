import request from '@/utils/request'

// 查询监控平台汇总统计
export function getSummary() {
  return request({
    url: '/rtsp/dashboard/summary',
    method: 'get'
  })
}

// 查询最近上传记录
export function getRecent(limit) {
  return request({
    url: '/rtsp/dashboard/recent',
    method: 'get',
    params: { limit }
  })
}

// 查询摄像头统计列表
export function getCameraStats(query) {
  return request({
    url: '/rtsp/dashboard/cameraStats',
    method: 'get',
    params: query
  })
}

// 查询上传趋势
export function getUploadTrend(days) {
  return request({
    url: '/rtsp/dashboard/uploadTrend',
    method: 'get',
    params: { days }
  })
}
