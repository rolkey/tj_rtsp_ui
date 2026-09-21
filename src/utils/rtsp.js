/** RTSP 地址解析与回放连接参数推导 */

/** 解析 rtsp://[user[:pass]@]host[:port][/path][?query] */
export function parseRtspUrl(raw) {
  if (!raw || typeof raw !== "string") {
    return null
  }
  const trimmed = raw.trim()
  if (!/^rtsp:\/\//i.test(trimmed)) {
    return null
  }

  let rest = trimmed.slice("rtsp://".length)
  let path = ""
  const slashIndex = rest.indexOf("/")
  if (slashIndex >= 0) {
    path = rest.slice(slashIndex + 1)
    rest = rest.slice(0, slashIndex)
  }
  const queryIndex = path.search(/[?#]/)
  if (queryIndex >= 0) {
    path = path.slice(0, queryIndex)
  }

  let username = ""
  let password = ""
  const atIndex = rest.lastIndexOf("@")
  if (atIndex >= 0) {
    const userinfo = rest.slice(0, atIndex)
    rest = rest.slice(atIndex + 1)
    const colonIndex = userinfo.indexOf(":")
    if (colonIndex >= 0) {
      username = userinfo.slice(0, colonIndex)
      password = userinfo.slice(colonIndex + 1)
    } else {
      username = userinfo
    }
    try {
      username = decodeURIComponent(username)
    } catch (err) {
      // 保留原始值
    }
    try {
      password = decodeURIComponent(password)
    } catch (err) {
      // 保留原始值
    }
  }

  let host = rest
  let port = 554
  const portIndex = rest.lastIndexOf(":")
  if (portIndex >= 0) {
    const portStr = rest.slice(portIndex + 1)
    if (/^\d+$/.test(portStr)) {
      host = rest.slice(0, portIndex)
      port = parseInt(portStr, 10)
    }
  }

  if (!host) {
    return null
  }
  return { username, password, host, port, path }
}

/** 根据摄像头信息推导回放所需的 wsURL / rtspURL / 账号密码 */
export function derivePlaybackParams(camera) {
  if (!camera) {
    throw new Error("无法解析设备地址，请在设备管理中配置设备IP或RTSP地址")
  }
  const parsed = parseRtspUrl(camera.streamUrl) || parseRtspUrl(camera.rtspBaseUrl) || null
  const ip = (camera.deviceIp && String(camera.deviceIp).trim()) || (parsed && parsed.host) || ""
  if (!ip) {
    throw new Error("无法解析设备地址，请在设备管理中配置设备IP或RTSP地址")
  }
  const port = Number(camera.devicePort) || (parsed && parsed.port) || 80
  const username = camera.username || (parsed && parsed.username) || ""
  const password = camera.password || (parsed && parsed.password) || ""
  return {
    wsURL: "ws://" + ip + ":" + port + "/rtspoverwebsocket",
    rtspURL: "rtsp://" + ip + ":" + port + "/",
    username,
    password
  }
}

/** 将录像片段短路径拼接到回放地址前缀，空值返回 null */
export function buildFileRtspUrl(rtspURLPrefix, segmentUrl) {
  if (!segmentUrl) {
    return null
  }
  const url = String(segmentUrl).trim()
  if (!url) {
    return null
  }
  if (/^rtsp:\/\//i.test(url)) {
    return url
  }
  if (url.charAt(0) === "/") {
    return rtspURLPrefix + url.slice(1)
  }
  return rtspURLPrefix + url
}
