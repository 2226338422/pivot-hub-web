<!-- 主题编辑弹窗：创建或修改地图主题的名称、描述、默认中心、缩放级别和排序。 -->
<template><el-dialog :title="form.themeId ? '编辑主题' : '创建主题'" :visible="visible && !picking" :modal="false" width="440px" :close-on-click-modal="false" @close="handleClose">
  <el-form label-position="top" @submit.native.prevent="save">
    <el-form-item label="主题名称"><el-input v-model="form.name" maxlength="100" /></el-form-item>
    <el-form-item label="描述"><el-input v-model="form.description" type="textarea" maxlength="500" /></el-form-item>
    <el-form-item label="默认缩放（3–20）"><el-input-number v-model="form.defaultZoom" :min="3" :max="20" /></el-form-item>
    <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" :max="99999" /></el-form-item>
    <el-form-item label="默认中心（选填）"><AddressSearch :context-key="String(contextKey) + ':' + picking" @select="setCenter"/><p>{{ centerText }}</p><el-button size="small" @click="$emit('pick-center')">地图选中心</el-button><el-button size="small" @click="clearCenter">清除中心</el-button></el-form-item>
    <MapFeedback :error="error" />
  </el-form><span slot="footer"><el-button :disabled="saving" @click="$emit('close')">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存主题</el-button></span>
</el-dialog></template>
<script>
import AddressSearch from './AddressSearch.vue'
import { saveTheme } from '@/api/business/map'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { AddressSearch, MapFeedback }, props: { visible: Boolean, picking: Boolean, theme: Object, contextKey: [String, Number] },
  data: () => ({ form: {}, error: '', saving: false, sequence: 0 }),
  computed: { centerText() { return this.form.centerLongitude == null ? '未设置中心' : `${this.form.centerLongitude}, ${this.form.centerLatitude}` } },
  watch: { visible(value) { this.sequence++; if (value) this.reset() }, contextKey() { this.sequence++; this.saving = false } },
  created() { this.reset() },
  beforeDestroy() { this.sequence++ },
  methods: {
    handleClose() { if (!this.picking) this.$emit('close') },
    reset() { const t = this.theme || {}; this.form = { themeId: t.uuid || undefined, name: t.name || '', description: t.description || '', centerLongitude: t.centerLongitude == null ? null : Number(t.centerLongitude), centerLatitude: t.centerLatitude == null ? null : Number(t.centerLatitude), defaultZoom: t.defaultZoom || 14, sort: t.sort || 0 }; this.error = ''; this.saving = false },
    setCenter(point) { this.form.centerLongitude = Number(Number(point.longitude).toFixed(6)); this.form.centerLatitude = Number(Number(point.latitude).toFixed(6)) },
    clearCenter() { this.form.centerLongitude = null; this.form.centerLatitude = null },
    async save() {
      if (!this.form.name.trim()) { this.error = '请输入主题名称'; return }
      if (this.saving) return
      const seq = ++this.sequence; this.saving = true; this.error = ''
      try { const theme = await saveTheme({ ...this.form, name: this.form.name.trim() }); if (seq === this.sequence) this.$emit('saved', theme) }
      catch (error) { if (seq === this.sequence && !error.authChanged && !error.authHandled) this.error = getMapError(error, '主题暂时无法保存，填写内容已保留') }
      finally { if (seq === this.sequence) this.saving = false }
    }
  }
}
</script>
<style scoped>.error{color:#c43d3d}::v-deep .el-dialog{max-width:calc(100% - 24px)}</style>
