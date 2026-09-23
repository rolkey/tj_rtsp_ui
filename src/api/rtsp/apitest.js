import axios from 'axios'

// 独立 axios 实例：不挂 RuoYi request.js 拦截器，完整返回原始响应
// （RuoYi 拦截器在 code !== 200 时会弹错误框并 reject，导致拿不到失败响应的原始 message/msg）
const service = axios.create({
  timeout: 60000
})

/**
 * 发送接口测试请求
 * @param {string} baseUrl 后端地址，默认 '/dev-api'（走 vite 代理），可切换 'http://localhost:8080' 直连
 * @param {string} path 接口路径，形如 '/api/upload/base64'
 * @param {object} data 请求体
 * @returns {Promise} 原始 axios 响应（成功/失败均进 then，只有网络错误/超时/CORS 才进 catch）
 */
export function sendRequest(baseUrl, path, data) {
  return service.post(baseUrl + path, data)
}
