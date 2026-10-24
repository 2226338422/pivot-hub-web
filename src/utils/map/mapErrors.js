// 将地图接口和高德服务异常转换为界面可展示的错误说明、详情及重试状态。
const REASONS = {
  CONFIG_MISSING: '后台地图配置未就绪', KEY_INVALID: '高德凭证无效', KEY_PLATFORM_MISMATCH: '高德服务平台不匹配',
  SERVICE_PERMISSION: '高德服务权限不足', SERVICE_EXPIRED: '高德服务权限已过期', SIGNATURE_INVALID: '高德签名校验失败',
  ACCESS_RESTRICTED: '高德访问条件受限', QUOTA_EXCEEDED: '高德调用额度已达上限', RATE_LIMITED: '查询频率已达上限',
  UPSTREAM_TIMEOUT: '上游服务响应超时', UPSTREAM_NETWORK: '上游连接暂时失败', UPSTREAM_FORMAT: '上游结果格式暂不支持',
  UPSTREAM_UNAVAILABLE: '上游服务暂不可用', UPSTREAM_PARAMETERS: '上游查询参数未通过校验'
}
const OPERATIONS = { STYLES: '地图样式', IP: '城市识别', IP_V5: '城市识别', DISTRICTS: '城市列表', REGEO: '地址识别', GEO: '地址查询', CONVERT: '坐标转换', TIPS: '输入提示', POIS: '地点搜索', POI_DETAIL: '地点详情', DRIVING: '驾车路线', WALKING: '步行路线', BICYCLING: '骑行路线', TRANSIT: '公交路线' }
function safeMessage(value) {
  if (typeof value !== 'string') return ''
  const message = value.trim()
  if (!message || message.length > 240 || /https?:|Bearer|Authorization|jscode|secret|signature|\bsig\b|token|[a-f0-9]{24,}/i.test(message)) return ''
  if (!/[\u3400-\u9fff]/.test(message) || /Request failed|status code|Network Error|timeout|AxiosError/i.test(message)) return ''
  return message
}
export function getMapError(error, fallback = '暂时无法完成此操作') {
  const response = error && error.response
  const status = response && Number.isInteger(response.status) ? response.status : null
  const body = (response && response.data) || {}
  const data = body.data && typeof body.data === 'object' ? body.data : {}
  const reasonCode = Object.prototype.hasOwnProperty.call(REASONS, data.reasonCode) ? data.reasonCode : ''
  const operation = Object.prototype.hasOwnProperty.call(OPERATIONS, data.operation) ? OPERATIONS[data.operation] : ''
  const providerCode = typeof data.providerCode === 'string' && /^\d{5}$/.test(data.providerCode) ? data.providerCode : ''
  const path = error && error.config && error.config.url || ''
  const route = path.includes('/amap/route') || /路线|公交/.test(fallback)
  const nearby = path.includes('/amap/reverseGeocode') || /附近|识别|自动填/.test(fallback)
  const cities = path.includes('/amap/cities') || /城市列表/.test(fallback)
  const handled = !!(error && (error.authHandled || error.authChanged))
  let title = fallback
  let message = safeMessage(body.msg) || safeMessage(error && error.message) || '填写内容已保留，可以稍后重试。'
  let retryable = true
  if (status === 401 || handled) {
    title = '登录状态已变化'; message = '请重新登录后继续，填写内容仍保留在当前页面。'; retryable = false
  } else if (status === 404) {
    title = cities ? '城市列表暂未就绪' : nearby ? '地址识别暂未就绪' : route ? '路线功能暂未就绪' : '暂时没有找到对应内容'
    message = cities ? '可以继续全国查询，或稍后重新加载城市列表。' : nearby ? '可以搜索真实地址，或手动填写名称和地址后保存。' : route ? '可以先打开高德网页查看路线。' : '可以稍后重试，当前填写内容已保留。'
  } else if (status === 403) {
    title = '没有操作权限'; message = '请联系管理员确认地图菜单权限。'; retryable = false
  } else if (status === 429 || reasonCode === 'QUOTA_EXCEEDED' || reasonCode === 'RATE_LIMITED') {
    title = '查询暂时受限'; message = cities ? '请稍后重新加载城市列表，仍可继续全国查询。' : route ? '请稍后重试，或打开高德网页查看路线。' : '请稍后重试，也可以手动填写地点信息。'
  } else if (status >= 500 || reasonCode) {
    title = cities ? '城市列表暂时无法获取' : route ? '路线暂时无法获取' : nearby ? '附近地址暂时无法识别' : '自动查询暂不可用'
    message = cities ? '可以继续全国查询，或稍后重新加载城市列表。' : route ? '可以切换出行方式重试，或打开高德网页查看路线。' : nearby ? '已保留选点坐标，可以搜索真实地址或手动填写后保存。' : '当前填写内容已保留，可以稍后重试。'
  } else if (!status && !safeMessage(error && error.message)) {
    message = '暂时无法连接服务，请检查网络后重试。当前填写内容已保留。'
  } else if (status === 400 || status === 422) {
    title = '请检查填写内容'; retryable = false
  }
  const details = [status ? 'HTTP ' + status : '', operation ? '服务：' + operation : '', reasonCode ? '原因：' + REASONS[reasonCode] : '', providerCode ? '高德代码：' + providerCode : ''].filter(Boolean).join('；')
  return { title, message, details, status, reasonCode, retryable, handled }
}
