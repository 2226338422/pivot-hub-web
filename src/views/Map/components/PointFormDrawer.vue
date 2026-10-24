<!-- 地点编辑侧栏：维护地点位置、名称、地址、分类和笔记，并支持附近地点查询与保存。 -->
<template><aside v-if="visible" class="point-form">
  <header><div><span class="eyebrow">{{ form.pointId ? '我的地点' : '新地点' }}</span><h3>{{ form.pointId ? '编辑地点' : '添加地点' }}</h3></div><el-button type="text" :disabled="saving" @click="$emit('close')">关闭</el-button></header>
  <el-form label-position="top" :disabled="saving" @submit.native.prevent="save">
    <section class="form-section"><h4>选择位置</h4><p class="form-hint">选择具体地点，可自动填入名称、地址和位置。</p>
    <el-form-item label="搜索地址或地点"><AddressSearch :context-key="contextKey" :selection-key="revision" :disabled="saving" @resolving="beginSelection" @select="selectAddress" /></el-form-item>
    <p v-if="nearbyLoading" class="form-hint" role="status">正在查询附近地址和地点…</p>
    <MapFeedback :error="nearbyError" :retry="true" :busy="saving || nearbyLoading || candidateLoading" retry-label="重试自动填充" @retry="retryNearby"><p>附近地址暂时无法自动填充，可搜索或填写后保存。</p></MapFeedback>
    <div v-if="nearbyItems.length" class="nearby-places"><strong>附近地点候选（请明确选择）</strong><p>候选可能与点击位置不同；选择后使用该地点的正式坐标。</p><button v-for="(item,index) in nearbyItems" :key="item.poiId || index" type="button" :disabled="saving || candidateLoading" @click="selectNearby(item)"><strong>{{ item.name }}</strong><span>{{ addressText(item) }}</span></button></div>
    <p v-if="candidateLoading" class="form-hint" role="status">正在确认所选地点的位置…</p>
    <div class="coordinate-card"><span>当前坐标</span><p>{{ coordinateText }}</p><el-button type="text" size="small" @click="$emit('pick-coordinate')">在地图上更改位置</el-button></div>
    <p class="form-hint">在地图上修改位置，会保留已填写的名称、地址和笔记。</p></section>
    <section class="form-section"><h4>地点信息</h4>
    <el-form-item label="名称"><el-input v-model="form.name" maxlength="200" @input="manualEdit" /></el-form-item>
    <el-form-item label="地址"><el-input v-model="form.address" type="textarea" maxlength="500" @input="manualEdit" /></el-form-item>
    <el-form-item label="分类"><el-select v-model="form.categoryId" clearable placeholder="未分类" @change="manualEdit"><el-option v-for="item in categories" :key="item.uuid" :label="item.name" :value="item.uuid" /></el-select></el-form-item>
    </section><section class="form-section"><h4>文字笔记</h4><el-form-item><el-input v-model="form.note" type="textarea" :rows="5" maxlength="10000" show-word-limit placeholder="记录到访感受、提醒或计划" @input="manualEdit" /></el-form-item></section>
    <MapFeedback :error="error"><el-button v-if="existingPointId" type="text" @click="$emit('open-existing', existingPointId)">打开已保存的地点</el-button></MapFeedback>
    <footer class="form-actions"><el-button type="primary" :loading="saving" @click="save">保存地点</el-button><span>名称和位置为必填项</span></footer>
  </el-form>
</aside></template>
<script>
import AddressSearch from './AddressSearch.vue'
import { savePoint, reverseGeocode } from '@/api/business/map'
import { hasCoordinates, resolveAddress, displayAddress } from '@/utils/map/mapSearch'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { AddressSearch, MapFeedback }, props: { visible: Boolean, point: Object, themeId: String, categories: Array, contextKey: [String, Number] },
  data: () => ({ form: {}, error: '', saving: false, sequence: 0, selectionSequence: 0, nearbySequence: 0, revision: 0, existingPointId: null, nearbyItems: [], nearbyLoading: false, nearbyError: null, candidateLoading: false, retryCandidate: null }),
  computed: { coordinateText() { return hasCoordinates(this.form) ? `${this.form.longitude}, ${this.form.latitude}` : '请通过地址搜索或地图选择具体坐标' } },
  watch: { visible(value) { this.sequence++; this.selectionSequence++; this.nearbySequence++; if (value) this.reset() }, point() { if (this.visible) { this.sequence++; this.reset() } }, contextKey() { this.sequence++; this.selectionSequence++; this.nearbySequence++; this.saving = false }, form: { deep: true, handler(value) { this.$emit('draft-change', { ...value }) } } },
  created() { this.reset() },
  beforeDestroy() { this.sequence++; this.selectionSequence++; this.nearbySequence++ },
  methods: {
    addressText: displayAddress,
    reset() { const p = this.point || {}; this.selectionSequence++; this.nearbySequence++; this.revision++; this.form = { pointId: p.uuid || undefined, themeId: this.themeId, categoryId: p.categoryId || null, name: p.name || '', address: p.address || '', longitude: p.longitude, latitude: p.latitude, note: p.note || '', source: p.source == null ? 0 : p.source, amapPoiId: p.amapPoiId || null }; this.error = ''; this.existingPointId = null; this.saving = false; this.nearbyItems = []; this.nearbyError = ''; this.nearbyLoading = false; this.candidateLoading = false; this.retryCandidate = null; if (p.lookupNearby) this.loadNearby() },
    manualEdit() { this.selectionSequence++; this.revision++; this.candidateLoading = false; this.$emit('selection-start') },
    beginSelection() { this.selectionSequence++; this.nearbySequence++; this.nearbyLoading = false; this.candidateLoading = false; this.$emit('selection-start') },
    setCoordinate(point) { if (this.saving || !hasCoordinates(point)) return; this.manualEdit(); this.nearbySequence++; this.nearbyLoading = false; this.form.longitude = Number(Number(point.longitude).toFixed(6)); this.form.latitude = Number(Number(point.latitude).toFixed(6)); this.retryCandidate = null; this.nearbyItems = []; this.nearbyError = ''; if (!this.form.pointId) { this.form.source = 0; this.form.amapPoiId = null } },
    selectAddress(point) { if (this.saving) return; this.beginSelection(); this.form.longitude = Number(point.longitude); this.form.latitude = Number(point.latitude); this.form.name = point.name || '地图选点'; this.form.address = point.address || ''; this.retryCandidate = null; this.nearbyItems = []; this.nearbyError = ''; if (!this.form.pointId) { this.form.amapPoiId = point.amapPoiId || point.poiId || null; this.form.source = this.form.amapPoiId ? 1 : 0 } },
    retryNearby() { if (this.saving || this.nearbyLoading || this.candidateLoading) return; if (this.retryCandidate) this.selectNearby(this.retryCandidate); else this.loadNearby() },
    async loadNearby() {
      if (this.saving || !hasCoordinates(this.form)) return
      const seq = ++this.nearbySequence; const context = this.contextKey; const revision = this.revision; const address = this.form.address; this.nearbyLoading = true; this.nearbyError = null; this.retryCandidate = null
      try { const result = await reverseGeocode({ longitude: this.form.longitude, latitude: this.form.latitude }); if (seq !== this.nearbySequence || context !== this.contextKey || !this.visible || this.saving) return; this.nearbyItems = ((result && result.pois) || []).filter(item => item.poiId && item.name).slice(0, 10); if (revision === this.revision && !address && !this.form.address && result) this.form.address = displayAddress(result) }
      catch (error) { if (seq === this.nearbySequence && context === this.contextKey && this.visible && !error.authChanged && !error.authHandled) this.nearbyError = getMapError(error, '附近地址暂时无法自动填充') }
      finally { if (seq === this.nearbySequence && context === this.contextKey) this.nearbyLoading = false }
    },
    async selectNearby(item) {
      if (this.saving) return
      this.beginSelection(); const seq = this.selectionSequence; const context = this.contextKey; this.candidateLoading = true; this.nearbyError = null; this.retryCandidate = item
      try { const point = await resolveAddress(item); if (seq === this.selectionSequence && context === this.contextKey && this.visible && !this.saving) this.selectAddress(point) }
      catch (error) { if (seq === this.selectionSequence && context === this.contextKey && this.visible && !error.authChanged && !error.authHandled) this.nearbyError = getMapError(error, '暂时无法确认所选地点，可重新选择或手工填写后保存') }
      finally { if (seq === this.selectionSequence) this.candidateLoading = false }
    },
    async save() {
      if (!this.form.name.trim()) { this.error = '请输入地点名称'; return }
      if (!hasCoordinates(this.form)) { this.error = '请先选择有效的地图坐标'; return }
      if (this.saving) return
      this.selectionSequence++; this.nearbySequence++; this.nearbyLoading = false; this.candidateLoading = false; const seq = ++this.sequence; this.saving = true; this.error = ''; this.existingPointId = null
      const data = { ...this.form, name: this.form.name.trim(), categoryId: this.form.categoryId || null }
      if (data.pointId) { delete data.themeId; delete data.source; delete data.amapPoiId }
      try { const point = await savePoint(data); if (seq === this.sequence) this.$emit('saved', point) }
      catch (error) { if (seq === this.sequence && !error.authChanged && !error.authHandled) { const body = error.response && error.response.data; this.error = getMapError(error, '地点暂时无法保存，填写内容已保留，请稍后重试'); if (body && body.data) this.existingPointId = body.data.existingPointId } }
      finally { if (seq === this.sequence) this.saving = false }
    }
  }
}
</script>
<style scoped>
.point-form{width:350px;flex-shrink:0;max-width:100%;overflow:auto;padding:20px;background:white;box-sizing:border-box;border-left:1px solid #e8edf3}.point-form header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.point-form h3{margin:4px 0 0;font-size:20px}.eyebrow{font-size:11px;color:#8390a4}.point-form .el-select{width:100%}.form-section{border-top:1px solid #edf0f5;padding-top:16px;margin-top:16px}.form-section h4{font-size:13px;margin:0 0 12px}.point-form .el-form-item{margin-bottom:16px}.form-hint,.nearby-places p{font-size:12px;color:#737d90;line-height:1.6}.coordinate-card{background:#f6f8fb;border-radius:8px;padding:10px 12px;font-size:12px;color:#737d90}.coordinate-card p{margin:6px 0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.coordinate-card .el-button{padding:5px 0}.form-actions{position:sticky;bottom:-20px;display:flex;align-items:center;gap:12px;padding:14px 0;background:white;border-top:1px solid #edf0f5;z-index:1}.form-actions span{font-size:11px;color:#8390a4}.nearby-places{margin-bottom:16px}.nearby-places button{display:block;width:100%;text-align:left;border:1px solid #e4e7ed;background:white;padding:10px;cursor:pointer}.nearby-places button:hover{background:#eff5ff}.nearby-places span{display:block;font-size:12px;color:#737d90;margin-top:5px}@media(max-width:800px){.point-form{position:absolute;bottom:0;left:0;right:0;width:100%;max-height:65%;z-index:200;box-shadow:0 -4px 20px #0002}}
</style>
