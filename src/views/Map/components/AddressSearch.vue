<!-- 地址搜索组件：支持按城市查询候选地点，并在选中后获取完整地点信息。 -->
<template><div class="address-search">
  <MapCitySelect :value="city" :disabled="disabled" @input="changeCity" />
  <el-input v-model="keyword" :disabled="disabled" placeholder="搜索地址或具体地点" clearable maxlength="200" @input="search" />
  <small v-if="loading" role="status">正在查找地址…</small>
  <MapFeedback :error="error" :retry="!disabled" :busy="loading" retry-label="重新查询" @retry="retry" />
  <ul v-if="items.length"><li v-for="(item,index) in items" :key="item.poiId || index"><button type="button" :disabled="disabled" @click="select(item)"><strong>{{ item.name }}</strong><span>{{ addressText(item) }}</span></button></li></ul>
</div></template>
<script>
import { findAddresses, resolveAddress, displayAddress } from '@/utils/map/mapSearch'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
import MapCitySelect from './MapCitySelect.vue'
import { getMapCitySession } from '@/utils/map/mapCities'
export default {
  components: { MapFeedback, MapCitySelect },
  props: { contextKey: [String, Number], selectionKey: [String, Number], disabled: Boolean },
  data: () => ({ keyword: '', city: '', items: [], itemsScope: null, loading: false, error: null, sequence: 0, retryItem: null, retryScope: null }),
  computed: { authSession() { return getMapCitySession() } },
  watch: { contextKey() { this.reset(); this.keyword = ''; this.error = null }, selectionKey() { this.reset(); this.error = null }, disabled(value) { if (value) this.reset() }, authSession() { this.reset(); this.city = ''; this.error = null } }, beforeDestroy() { this.reset() },
  methods: {
    addressText: displayAddress,
    reset() { clearTimeout(this._timer); this.sequence++; this.items = []; this.itemsScope = null; this.loading = false; this.retryItem = null; this.retryScope = null },
    scope() { return { city: this.city, session: getMapCitySession(), contextKey: this.contextKey, selectionKey: this.selectionKey } },
    isScopeCurrent(scope) { return scope && scope.city === this.city && scope.session === getMapCitySession() && scope.contextKey === this.contextKey && scope.selectionKey === this.selectionKey && !this.disabled },
    isCurrent(seq, scope) { return seq === this.sequence && this.isScopeCurrent(scope) },
    changeCity(city) {
      if (this.disabled || city === this.city) return
      this.reset(); this.city = city; this.error = null
      this.$emit('resolving')
      this.search()
    },
    search() {
      this.reset(); this.error = null; const keyword = this.keyword.trim(); const seq = this.sequence; const scope = this.scope()
      if (keyword.length < 2 || this.disabled) return
      this._timer = setTimeout(async () => {
        if (!this.isCurrent(seq, scope)) return
        this.loading = true
        try { const items = await findAddresses(keyword, scope.city || undefined); if (this.isCurrent(seq, scope)) { this.items = items; this.itemsScope = scope } }
        catch (error) { if (this.isCurrent(seq, scope) && !error.authChanged && !error.authHandled) this.error = getMapError(error, '地址暂时查询不到，请重试或在地图上选择位置') }
        finally { if (this.isCurrent(seq, scope)) this.loading = false }
      }, 300)
    },
    retry() { if (this.disabled || this.loading) return; if (this.retryItem) this.select(this.retryItem); else this.search() },
    async select(item) {
      if (this.disabled) return
      const candidate = this.items.includes(item) && this.isScopeCurrent(this.itemsScope)
      const retry = item === this.retryItem && this.isScopeCurrent(this.retryScope)
      if (!candidate && !retry) return
      const seq = ++this.sequence; const scope = this.scope(); clearTimeout(this._timer); this.loading = true; this.error = null; this.retryItem = item; this.retryScope = scope
      this.$emit('resolving', item)
      try { const point = await resolveAddress(item); if (this.isCurrent(seq, scope)) { this.items = []; this.itemsScope = null; this.keyword = point.name; this.retryItem = null; this.retryScope = null; this.$emit('select', point) } }
      catch (error) { if (this.isCurrent(seq, scope) && !error.authChanged && !error.authHandled) this.error = getMapError(error, '暂时无法确认这个地点，请重试、选择其他地点或在地图上选点') }
      finally { if (this.isCurrent(seq, scope)) this.loading = false }
    }
  }
}
</script>
<style scoped>
.address-search ul{list-style:none;margin:6px 0;padding:0;max-height:230px;overflow:auto;border:1px solid #e4e7ed;border-radius:6px}.address-search button{width:100%;padding:10px;background:white;border:0;text-align:left;cursor:pointer}.address-search button:hover{background:#eff5ff}.address-search span{display:block;color:#737d90;font-size:12px;margin-top:4px}.error{color:#c43d3d}
</style>
