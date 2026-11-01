import { getFileUrls } from '@/api/system/file'

/**
 * 通用文件 URL 工具：根据文件 uuid 返回可访问 URL。
 * 内置缓存 + 并发去重；私有 URL 带时效，过期自动重新请求。
 *
 * 缓存条目结构：
 *   { url, expiresAt }  // 公共读 expiresAt=Infinity，私有 expiresAt=时间戳
 */

const cache = new Map()      // uuid -> { url, expiresAt }
const pending = new Map()    // uuid -> Promise<string>

function isExpired(entry) {
  if (!entry) return true
  if (entry.expiresAt === Infinity) return false
  return Date.now() >= entry.expiresAt
}

/** 从签名 URL 里解析过期时间（提前 60 秒视为过期）；公共读返回 Infinity。 */
function expiresFromUrl(url) {
  if (!url || url.indexOf('Expires=') < 0) return Infinity
  const m = url.match(/Expires=(\d+)/)
  if (!m) return Infinity
  return parseInt(m[1], 10) * 1000 - 60000
}

/**
 * 批量获取文件 URL。自动过滤有效缓存的 uuid，剩余一次性批量请求。
 * @param {string[]} uuids
 * @returns {Promise<Object<string,string>>} uuid -> url
 */
export async function fileUrls(uuids) {
  if (!Array.isArray(uuids) || uuids.length === 0) return {}
  const need = [...new Set(uuids.filter(Boolean).filter(u => isExpired(cache.get(u))))]
  if (need.length) {
    try {
      const map = await getFileUrls(need)
      if (map && typeof map === 'object') {
        Object.entries(map).forEach(([k, v]) => {
          cache.set(k, { url: v, expiresAt: expiresFromUrl(v) })
        })
      }
    } catch (e) {
      // 失败不抛，逐个返回空串
    }
  }
  const result = {}
  uuids.forEach(u => {
    const entry = cache.get(u)
    result[u] = entry ? entry.url : ''
  })
  return result
}

/**
 * 单个文件 URL，带并发去重（同一 uuid 多处同时调用只发一次请求）。
 * @param {string} uuid
 * @returns {Promise<string>} url，无则返回空串
 */
export async function fileUrl(uuid) {
  if (!uuid) return ''
  const entry = cache.get(uuid)
  if (entry && !isExpired(entry)) return entry.url
  if (pending.has(uuid)) return pending.get(uuid)
  const p = fileUrls([uuid]).then(() => {
    const e = cache.get(uuid)
    return e ? e.url : ''
  }).finally(() => pending.delete(uuid))
  pending.set(uuid, p)
  return p
}

/** 清空缓存（换 bucket / 用户切换时调用）。 */
export function clearFileUrlCache() {
  cache.clear()
  pending.clear()
}
