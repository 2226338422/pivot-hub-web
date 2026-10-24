<!-- 城市选择组件：按省份分组展示和筛选城市，为地址搜索提供城市范围。 -->
<template><div class="map-city-select">
  <el-select :value="value" :disabled="disabled" size="small" filterable clearable :filter-method="filterCities" :loading="loading" loading-text="正在加载城市…" :no-data-text="error ? '城市暂时加载不到，可在下方重试' : '没有匹配的城市'" placeholder="全国（不限定城市）" aria-label="搜索城市" @change="$emit('input', $event || '')" @visible-change="opened">
    <el-option-group v-for="group in groups" :key="group.province" :label="group.province">
      <el-option v-for="city in group.cities" :key="city.adcode" :label="city.label" :value="city.adcode" />
    </el-option-group>
  </el-select>
  <MapFeedback :error="error" :retry="!disabled" :busy="loading" retry-label="重试城市列表" @retry="load"><p>仍可按全国搜索地址，或在地图上选择位置。</p></MapFeedback>
</div></template>
<script>
import { getMapCitySession, loadMapCities, groupMapCities } from '@/utils/map/mapCities'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { MapFeedback },
  props: { value: { type: String, default: '' }, disabled: Boolean },
  data: () => ({ cities: [], query: '', loading: false, error: null, sequence: 0 }),
  computed: {
    session() { return getMapCitySession() },
    groups() { return groupMapCities(this.cities, this.query) }
  },
  watch: {
    session() { this.sequence++; this.cities = []; this.query = ''; this.loading = false; this.error = null }
  },
  beforeDestroy() { this.sequence++ },
  methods: {
    filterCities(query) { this.query = query },
    opened(visible) { if (visible) { this.query = ''; if (!this.cities.length && !this.error) this.load() } },
    async load() {
      if (this.disabled || this.loading) return
      const seq = ++this.sequence; const session = getMapCitySession()
      this.loading = true; this.error = null
      try {
        const cities = await loadMapCities()
        if (seq === this.sequence && session === getMapCitySession()) this.cities = cities
      } catch (error) {
        if (seq === this.sequence && session === getMapCitySession() && !error.authChanged && !error.authHandled) this.error = getMapError(error, '城市列表暂时加载不到，请重试')
      } finally {
        if (seq === this.sequence && session === getMapCitySession()) this.loading = false
      }
    }
  }
}
</script>
<style scoped>
.map-city-select{margin-bottom:6px;min-width:0}.map-city-select .el-select{width:100%;max-width:100%}
</style>
