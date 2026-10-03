import request from '@/utils/request'

export const getCurrentUser = () => request.get('/system/user/getUserInfo')
