import request from '@/utils/request'

// 查询录像片段列表
export function listRecord(query) {
  return request({
    url: '/rtsp/record/list',
    method: 'get',
    params: query
  })
}
