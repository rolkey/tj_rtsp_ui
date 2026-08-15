import request from '@/utils/request'

// 查询人脸抓拍列表
export function listFace(query) {
  return request({
    url: '/rtsp/face/list',
    method: 'get',
    params: query
  })
}

// 删除人脸抓拍记录
export function delFace(imageId) {
  return request({
    url: '/rtsp/face/' + imageId,
    method: 'delete'
  })
}
