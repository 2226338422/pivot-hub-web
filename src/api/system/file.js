import request from '@/utils/request'
import { getResultData } from '@/utils/result'

/**
 * 上传文件到 OSS。
 * @param {File} file 文件对象
 * @param {string} module 业务模块/目录（如 'Avatar'）
 * @param {string} [type] 文件类型（如 'avatar'）
 * @param {string} [acl] 访问模式 'public' | 'private'，默认 public
 * @returns {Promise<{uuid:string}>}
 */
export function uploadFile(file, module, type, acl) {
  const form = new FormData()
  form.append('file', file)
  form.append('module', module)
  if (type) form.append('type', type)
  if (acl) form.append('acl', acl)
  return request
    .post('/system/file/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      silentError: true
    })
    .then(getResultData)
}

/**
 * 批量根据文件 uuid 查询访问地址。
 * @param {string[]} uuids
 * @returns {Promise<Object<string,string>>} uuid -> url 的映射
 */
export function getFileUrls(uuids) {
  return request
    .get('/system/file/url', {
      params: { uuids: uuids.join(',') },
      silentError: true
    })
    .then(getResultData)
}
