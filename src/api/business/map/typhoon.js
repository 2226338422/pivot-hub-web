// 请求业务服务的活跃台风列表和台风实况、预报详情。
import request from '@/utils/request'
import { getResultData } from '@/utils/result'
export const listTyphoons = (options) =>
  request.get('/business/map/typhoon/list', { silentError: true, ...options }).then(getResultData)
export const getTyphoonDetail = (typhoonId, options) =>
  request
    .get('/business/map/typhoon/detail', { silentError: true, ...options, params: { typhoonId } })
    .then(getResultData)
