<!-- 地图反馈组件：统一展示错误说明、详细信息及重试入口。 -->
<template><div v-if="error" class="map-feedback" role="status">
  <strong v-if="feedback.title">{{ feedback.title }}</strong>
  <p>{{ feedback.message }}</p>
  <slot />
  <el-button v-if="retry && feedback.retryable !== false" type="text" size="small" :disabled="busy" @click="$emit('retry')">{{ retryLabel }}</el-button>
  <details v-if="feedback.details"><summary>查看说明</summary><p>{{ feedback.details }}</p></details>
</div></template>
<script>
export default {
  props: { error: [Object, String], retry: Boolean, busy: Boolean, retryLabel: { type: String, default: '重试' } },
  computed: { feedback() { return typeof this.error === 'string' ? { message: this.error } : this.error || {} } }
}
</script>
<style scoped>
.map-feedback{padding:12px 14px;margin:12px 0;background:#fff8eb;border:1px solid #efdfbc;border-radius:8px;color:#775c2b;font-size:12px;line-height:1.65;overflow-wrap:anywhere}.map-feedback strong{font-size:13px}.map-feedback p{margin:4px 0}.map-feedback .el-button{padding:5px 0;margin:4px 12px 0 0}.map-feedback details{margin-top:8px;color:#7b715f}.map-feedback summary{cursor:pointer}.map-feedback details p{white-space:pre-wrap}
</style>
