import request from '@/utils/request'
import { getResultData } from '@/utils/result'

export const getCurrentUser = () => request.get('/system/user/getUserInfo')

/** 更新个人资料（昵称、头像文件uuid、备注） */
export const updateProfile = (data) =>
  request.put('/system/user/updateUserInfo', data).then(getResultData)

/** 换绑邮箱 */
export const rebindEmail = (email, code) =>
  request.put('/system/user/rebindEmail', { email, code }, { silentError: true }).then(getResultData)

/** 发送换绑邮箱验证码（scene=rebind，需登录态） */
export const sendRebindCode = (email) =>
  request.post('/system/auth/mail/code', null, { params: { email, scene: 'rebind' }, silentError: true })
