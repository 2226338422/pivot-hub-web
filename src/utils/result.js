export function getResultData(response) {
  const body = response && response.data
  if (!body || (body.code !== 200 && body.code !== 201)) {
    throw new Error((body && body.msg) || '请求失败')
  }
  return body.data
}
