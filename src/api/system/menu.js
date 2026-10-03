import request from '@/utils/request'

export const getMenuTree = () => request.get('/system/menu/getCurrentUserMenuTree')
