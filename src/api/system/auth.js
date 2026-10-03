import request from '@/utils/request'

export const sendMailCode = email => request.post('/system/auth/mail/code', null, {
  params: { email, scene: 'login' }, skipAuth: true
})

export const login = ({ email, code }) => request.post('/system/auth/login/email', {
  email, code, clientType: 1
}, { skipAuth: true })


// /system/auth/refresh 在request.js直接调用，防止循环import
