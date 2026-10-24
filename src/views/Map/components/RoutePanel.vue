<!-- 路线规划侧栏：选择起点与出行方式，展示路线结果，并提供高德外部导航入口。 -->
<template><aside class="route-panel">
  <header><div><span class="eyebrow">出行计划</span><h3>{{ navigationOnly ? '打开高德导航' : '查看路线' }}</h3></div><el-button type="text" @click="$emit('close')">关闭</el-button></header>
  <div class="endpoint-card destination"><span class="endpoint-label">终点</span><strong>{{ destination.name || '地图选点' }}</strong><small>{{ destination.address || '已选择地图位置' }}</small></div>
  <el-form label-position="top">
    <div class="endpoint-card"><span class="endpoint-label">起点</span><strong>{{ startLabel }}</strong><small v-if="start">{{ start.address || '已确认坐标' }}</small><div class="start-actions"><el-button size="small" @click="usePosition">使用我的位置</el-button><el-button size="small" @click="pickStart">地图选起点</el-button></div></div>
    <el-form-item label="从已保存地点选起点"><el-select v-model="startId" filterable clearable placeholder="选择地点" @change="chooseSaved"><el-option v-for="point in points" :key="point.uuid" :label="point.name + ' · ' + (point.address || '无地址')" :value="point.uuid"/></el-select></el-form-item>
    <el-form-item label="搜索起点"><AddressSearch ref="startSearch" :context-key="contextKey" :selection-key="startRevision" @resolving="beginStartSearch" @select="setStart"/></el-form-item>
    <el-form-item label="出行方式"><el-radio-group v-model="mode" @change="invalidate"><el-radio-button label="car">驾车</el-radio-button><el-radio-button label="walk">步行</el-radio-button><el-radio-button label="ride">骑行</el-radio-button><el-radio-button label="bus">公交</el-radio-button></el-radio-group></el-form-item>
  </el-form>
  <el-button v-if="!navigationOnly" class="route-primary" type="primary" :loading="loading" @click="calculate">{{ result ? '重新计算路线' : '查看路线' }}</el-button>
  <MapFeedback :error="error" :retry="routeFailed && !navigationOnly" :busy="loading" retry-label="重试路线" @retry="calculate"><p v-if="routeFailed">可重试、切换出行方式，或使用下方高德导航。</p></MapFeedback>
  <section v-if="result" class="route-result"><div class="route-summary"><div><span>路程</span><strong>{{ distanceText }}</strong></div><div><span>预计用时</span><strong>{{ durationText }}</strong></div></div><h4>路线步骤</h4><ol><li v-for="(step,index) in result.steps" :key="index">{{ step }}</li></ol></section>
  <div class="external-navigation"><span class="section-label">高德导航</span><template v-if="browser.mobile"><el-button class="navigation-primary" :type="navigationOnly ? 'primary' : 'default'" @click="navigate(true)">打开高德 App</el-button><a v-if="webUrl" :href="webUrl" target="_blank" rel="noopener noreferrer">使用高德网页路线</a></template><el-button v-else class="navigation-primary" :type="navigationOnly ? 'primary' : 'default'" :disabled="!webUrl" @click="navigate(false)">打开高德网页路线</el-button><p v-if="!browser.mobile && mode === 'ride'">电脑网页暂不支持骑行导航，可在本页查看路线或切换出行方式。</p><p v-else-if="!browser.mobile && !start">选择起点后可打开网页路线。</p><p v-if="browser.restricted">微信或 QQ 可能限制打开 App，请使用网页路线或在外部浏览器打开。</p><el-button type="text" @click="copyAddress">复制目的地地址</el-button></div>
</aside></template>
<script>
import AddressSearch from './AddressSearch.vue'
import { planRoute } from '@/utils/map/mapRoute'
import { hasCoordinates } from '@/utils/map/mapSearch'
import { buildAmapNavigationUrl, browserNavigationContext } from '@/utils/map/mapNavigation'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { AddressSearch, MapFeedback },
  props: { destination: Object, position: Object, points: Array, contextKey: [String, Number], navigationOnly: Boolean, mapIdentity: [Number, String], mapReady: Boolean },
  data: () => ({ start: null, startId: '', startRevision: 0, mode: 'car', loading: false, error: '', routeFailed: false, result: null, sequence: 0, browser: browserNavigationContext() }),
  computed: {
    startLabel() { return hasCoordinates(this.start) ? this.start.name || '地图选起点' : '请选择出发位置' },
    webUrl() { return (!this.browser.mobile && this.mode === 'ride') ? '' : hasCoordinates(this.start) || this.browser.mobile ? buildAmapNavigationUrl({ start: this.start, destination: this.destination, mode: this.mode }) : '' },
    distanceText() { return this.result.distance == null ? '未知' : this.result.distance >= 1000 ? `${(this.result.distance / 1000).toFixed(1)} 公里` : `${this.result.distance} 米` },
    durationText() { return this.result.duration == null ? '未知' : `${Math.ceil(this.result.duration / 60)} 分钟` }
  },
  watch: { destination() { this.invalidate() }, contextKey() { this.cancelStartSelection(); this.start = null; this.startId = '' }, mapIdentity() { this.invalidate() } },
  mounted() { if (hasCoordinates(this.position)) this.setStart(this.position) }, beforeDestroy() { this.invalidate() },
  methods: {
    invalidate() { this.sequence++; this.result = null; this.loading = false; this.error = ''; this.routeFailed = false; this.$emit('clear-route') },
    cancelStartSelection() { this.startRevision++; if (this.$refs.startSearch) this.$refs.startSearch.reset(); this.invalidate(); this.$emit('start-change') },
    beginStartSearch() { this.invalidate(); this.$emit('start-change') },
    setStart(point) { this.cancelStartSelection(); this.startId = ''; this.start = { ...point, longitude: Number(Number(point.longitude).toFixed(6)), latitude: Number(Number(point.latitude).toFixed(6)) } },
    chooseSaved(id) { const point = this.points.find(p => p.uuid === id); this.cancelStartSelection(); this.start = point ? { ...point } : null },
    pickStart() { this.cancelStartSelection(); this.$emit('pick-start') },
    usePosition() { this.cancelStartSelection(); if (hasCoordinates(this.position)) this.setStart(this.position); else { this.error = '正在请求设备位置，也可以直接选择起点'; this.$emit('locate') } },
    async calculate() {
      this.invalidate()
      if (!this.mapReady) { this.error = '请先加载地图'; return }
      if (!hasCoordinates(this.start)) { this.error = '请明确选择起点'; return }
      if (Number(this.start.longitude) === Number(this.destination.longitude) && Number(this.start.latitude) === Number(this.destination.latitude)) { this.error = '起点与终点相同'; return }
      const seq = this.sequence; const context = this.contextKey; const identity = this.mapIdentity; this.loading = true
      try {
        const result = await planRoute({ mode: this.mode, start: { longitude: Number(Number(this.start.longitude).toFixed(6)), latitude: Number(Number(this.start.latitude).toFixed(6)) }, end: { longitude: Number(Number(this.destination.longitude).toFixed(6)), latitude: Number(Number(this.destination.latitude).toFixed(6)) }, originCityCode: this.start.cityCode || undefined, destinationCityCode: this.destination.cityCode || undefined })
        if (seq !== this.sequence || context !== this.contextKey || identity !== this.mapIdentity || !this.mapReady) return
        if (!result.paths || !result.paths.some(p => p.coordinates && p.coordinates.length > 1)) { this.error = '未找到可用路线，请更换起终点或出行方式'; this.routeFailed = true; return }
        this.result = result; this.$emit('route-result', { result, context, identity })
      } catch (error) { if (seq === this.sequence && context === this.contextKey && identity === this.mapIdentity && !error.authChanged && !error.authHandled) { this.error = getMapError(error, '暂时无法规划这条路线，请重试或切换出行方式'); this.routeFailed = true } }
      finally { if (seq === this.sequence) this.loading = false }
    },
    navigate(callNative = false) {
      if (!this.browser.mobile && this.mode === 'ride') { this.error = '高德电脑网页导航不支持骑行。可在本页面查看骑行路线，或改选其他出行方式。'; return }
      if (!this.browser.mobile && !hasCoordinates(this.start)) { this.error = '电脑网页路线需要明确起点，请先定位或选择起点'; return }
      const url = buildAmapNavigationUrl({ start: this.start, destination: this.destination, mode: this.mode, callNative: this.browser.mobile && callNative })
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    async copyAddress() { try { await navigator.clipboard.writeText(`${this.destination.name || '地图选点'} ${this.destination.address || ''} (${this.destination.longitude}, ${this.destination.latitude})`); this.$message.success('地址已复制') } catch (error) { this.error = '无法自动复制，请复制上方地址和坐标' } }
  }
}
</script>
<style scoped>
.route-panel{width:360px;flex-shrink:0;max-width:100%;padding:20px;overflow:auto;box-sizing:border-box;background:white;border-left:1px solid #e8edf3}.route-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.route-panel h3{margin:4px 0 0;font-size:20px}.eyebrow,.section-label{font-size:11px;color:#8390a4}.route-panel small{display:block;color:#738098;margin-top:5px;font-size:12px;line-height:1.6}.endpoint-card{background:#f6f8fb;border:1px solid #e8edf3;border-radius:8px;padding:12px;margin-bottom:16px;overflow-wrap:anywhere}.endpoint-card strong{display:block;font-size:14px;margin-top:5px}.endpoint-label{font-size:11px;font-weight:600;color:#64758e}.destination .endpoint-label{color:#3478f6}.start-actions{display:flex;gap:8px;margin-top:12px}.start-actions .el-button{margin:0}.route-panel .el-select{width:100%}.route-panel .el-form-item{margin-bottom:16px}.route-primary,.navigation-primary{width:100%}.external-navigation{margin-top:20px;border-top:1px solid #edf0f5;padding-top:16px}.external-navigation .section-label{display:block;margin-bottom:10px}.external-navigation a{display:block;color:#3478f6;margin:12px 0;font-size:12px}.external-navigation p{font-size:12px;color:#738098;line-height:1.6}.route-summary{display:flex;gap:16px;padding:16px 12px;background:#eef5ff;border-radius:8px;margin-top:16px}.route-summary>div{flex:1}.route-summary span{display:block;font-size:11px;color:#738098;margin-bottom:6px}.route-summary strong{font-size:17px}.route-result h4{font-size:13px;margin:20px 0 10px}.route-result ol{padding-left:24px;font-size:13px;line-height:1.75}.route-result li{padding:5px 0 9px;color:#59687e}@media(max-width:800px){.route-panel{position:absolute;bottom:0;left:0;right:0;width:100%;max-height:65%;z-index:200;box-shadow:0 -4px 20px #0002}}
</style>
