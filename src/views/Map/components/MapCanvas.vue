<!-- 地图画布组件：管理高德地图实例、地点标记、地图选点、定位与路线展示。 -->
<template><div class="map-canvas">
  <div ref="canvas" class="map-surface" />
  <div class="map-toolbar-overlay">
  <div class="map-tools"><el-tooltip :content="hasThemeCenter ? '主题中心：' + themeCenterCoordinates : '当前主题尚未设置中心，可在编辑主题中设置'" placement="bottom"><el-button size="small" type="primary" plain :disabled="!ready || !hasThemeCenter" @click="focusThemeCenter">回到主题中心</el-button></el-tooltip><el-button size="small" :loading="locating" :disabled="!ready" @click="locate">我的位置</el-button><el-select v-model="style" size="small" :disabled="!ready" @change="changeStyle"><el-option label="标准地图" value="normal"/><el-option label="深色地图" value="dark"/></el-select></div>
  <div class="map-legend"><span><i class="legend-saved"/>已保存地点</span><span><i class="legend-center"/>主题中心</span><span><i class="legend-draft"/>待保存／更新</span></div>
  <MapFeedback v-if="notice && !error" class="map-action-feedback" :error="notice"><el-button type="text" size="small" @click="notice = null">关闭提示</el-button></MapFeedback>
  </div>
  <div class="map-status" role="status">{{ status }}</div>
  <div v-if="error" class="map-error"><MapFeedback :error="error" /><el-button @click="initialize">重新加载地图</el-button></div>
</div></template>
<script>
import { loadAMap, syncAMapProxyAuth } from '@/utils/map/amapLoader'
import { getMapCity } from '@/api/business/map'
import { hasCoordinates, coordinates } from '@/utils/map/mapSearch'
import { renderRoute } from '@/utils/map/mapRoute'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { MapFeedback },
  props: {
    points: { type: Array, default: () => [] }, categories: { type: Array, default: () => [] },
    themeView: Object, activePointId: String, draftPoint: Object,
    viewGeneration: Number, sessionKey: [String, Number]
  },
  data: () => ({ ready: false, locating: false, status: '正在加载地图…', error: '', notice: null, style: 'normal' }),
  computed: {
    hasThemeCenter() { return hasCoordinates(this.themeView && this.themeView.center) },
    themeCenterCoordinates() { return this.hasThemeCenter ? coordinates(this.themeView.center).map(value => value.toFixed(6)).join(', ') : '' }
  },
  watch: {
    points() { this.drawPoints() },
    themeView() { this.applyThemeView() }, activePointId() { this.updatePointHighlight(); this.focusPoint() },
    draftPoint: { deep: true, handler() { this.drawDraft() } },
    sessionKey() { this.initialize() }
  },
  mounted() { this.initialize() }, beforeDestroy() { this.cleanup() },
  methods: {
    isCurrent(seq) { return this._sequence === seq && !this._isDestroyed },
    cleanup() {
      this._sequence = (this._sequence || 0) + 1; this._geoSequence = (this._geoSequence || 0) + 1
      this.ready = false; this.locating = false; this.notice = null; clearTimeout(this._geoTimer); clearTimeout(this._cityTimer)
      clearTimeout(this._blankClickTimer); this._blankClickTimer = null
      this.removeMarkerListeners(); this.removeDraftListener()
      if (this._loadAbort) this._loadAbort.abort(); this._loadAbort = null
      if (this._listeners) this._listeners.forEach(([event, handler]) => this.$refs.canvas && this.$refs.canvas.removeEventListener(event, handler))
      this._listeners = []; this.clearRoute()
      if (this._map) { this._map.destroy(); this._map = null }
      this._markers = []; this._markerRecords = []; this._centerMarker = null; this._draftMarker = null
      this._positionMarker = null; this._accuracy = null; this._geolocation = null; this._AMap = null; this._city = null
      this._lastSelectionAt = 0; this._lastOverlaySelectionAt = 0; this._lastSavedClick = null
      this.$emit('position-change', null); this.$emit('ready', false)
    },
    async initialize() {
      this.cleanup(); const seq = this._sequence; this.error = ''; this.status = '正在加载地图…'; this._gesture = 0
      this._loadAbort = new AbortController()
      try {
        const AMap = await loadAMap({ signal: this._loadAbort.signal }); if (!this.isCurrent(seq)) return
        this._AMap = AMap
        this._map = new AMap.Map(this.$refs.canvas, { zoom: 4, center: [104.2, 35.8], isHotspot: true, mapStyle: `amap://styles/${this.style}` })
        this._map.on('click', event => {
          if (!this.isCurrent(seq)) return
          if (event.poi && (event.poi.id || event.poi.poiId)) { this.selectHotspot(event.poi, seq); return }
          const point = this.eventPoint(event.lnglat)
          if (!point || Date.now() - this._lastSelectionAt < 180) return
          this._gesture++; clearTimeout(this._blankClickTimer)
          const generation = this.viewGeneration; const gesture = this._gesture
          // 热点事件可能紧接普通 click 到达，先让带 POI 身份的事件优先。
          this._blankClickTimer = setTimeout(() => {
            this._blankClickTimer = null
            if (this.isCurrent(seq) && generation === this.viewGeneration && gesture === this._gesture) this.$emit('map-click', { ...point, source: 0 })
          }, 180)
        })
        this._map.on('hotspotclick', event => this.selectHotspot(event, seq))
        const markGesture = event => {
          if (!event.isTrusted) return
          if (event.type === 'wheel' || event.type === 'keydown' || (event.type === 'pointermove' && event.buttons) || event.type === 'touchmove' || event.type === 'dblclick') this._gesture++
        }
        this._listeners = ['wheel', 'keydown', 'pointermove', 'touchmove', 'dblclick'].map(event => {
          this.$refs.canvas.addEventListener(event, markGesture, { passive: true }); return [event, markGesture]
        })
        this.ready = true; this.status = '城市识别中；精确定位仅在点击「我的位置」后请求'
        this.drawPoints(); this.applyThemeView(); this.drawDraft(); this.$emit('ready', true)
        this.loadCity(seq)
      } catch (error) { if (this.isCurrent(seq)) { this.cleanup(); if (!error.authChanged && !error.authHandled) this.error = getMapError(error, '地图暂时无法加载'); this.status = '地图未就绪' } }
    },
    async loadCity(seq) {
      const generation = this.viewGeneration; const gesture = this._gesture
      let cityTimer
      try {
        const city = await Promise.race([getMapCity(), new Promise((resolve, reject) => { cityTimer = setTimeout(() => reject(new Error('城市识别超时')), 8000); this._cityTimer = cityTimer })])
        if (!this.isCurrent(seq)) return
        this._city = city
        this.status = city.available ? `网络城市：${city.cityName}；不代表精确位置` : '未识别网络城市，可搜索地址或在地图选点'
        if (generation === this.viewGeneration && gesture === this._gesture && !this.hasThemeView()) this.applyCity()
      } catch (error) { if (this.isCurrent(seq)) this.status = '未识别网络城市，可搜索地址或在地图选点' }
      finally { clearTimeout(cityTimer); if (this._cityTimer === cityTimer) this._cityTimer = null }
    },
    hasThemeView() { return this.themeView && (hasCoordinates(this.themeView.center) || (this.themeView.points || []).length) },
    applyCity() {
      if (!this._map || !this._city || !this._city.available) return
      const bounds = this._city.bounds
      if (bounds && bounds.southWest && bounds.northEast) this._map.setBounds(new this._AMap.Bounds(bounds.southWest, bounds.northEast))
    },
    applyThemeView() {
      if (!this._map) return
      clearTimeout(this._blankClickTimer); this._blankClickTimer = null
      this.drawThemeCenter()
      this.clearRoute(); this._gesture = (this._gesture || 0) + 1
      const view = this.themeView
      if (view && hasCoordinates(view.center)) this._map.setZoomAndCenter(view.zoom || 14, coordinates(view.center))
      else if (view && (view.points || []).length) {
        const points = view.points.filter(hasCoordinates)
        if (points.length === 1) this._map.setZoomAndCenter(14, coordinates(points[0]))
        else if (points.length) {
          const lngs = points.map(p => Number(p.longitude)); const lats = points.map(p => Number(p.latitude))
          this._map.setBounds(new this._AMap.Bounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]))
        }
      } else this.applyCity()
    },
    drawPoints() {
      if (!this._map) return
      this.removeMarkerListeners()
      this._map.remove(this._markers || []); this._markers = []
      this._markerRecords = []
      this.points.filter(hasCoordinates).forEach(point => {
        if (!point.uuid) return
        const pointId = String(point.uuid); const seq = this._sequence; const generation = this.viewGeneration
        const button = document.createElement('button'); button.type = 'button'; button.className = 'map-saved-marker'
        button.title = `${point.name || '已保存地点'} ${point.address || ''}`
        button.setAttribute('aria-label', `查看已保存地点：${point.name || pointId}`)
        const core = document.createElement('span'); core.className = 'map-saved-marker-core'; button.appendChild(core)
        const label = document.createElement('span'); label.className = 'map-saved-marker-label'; label.textContent = point.name || '已保存地点'; button.appendChild(label)
        const selected = () => {
          if (!this.isCurrent(seq) || generation !== this.viewGeneration || !this._markerRecords.some(record => record.button === button)) return
          const now = Date.now()
          if (this._lastSavedClick && this._lastSavedClick.id === pointId && now - this._lastSavedClick.at < 120) return
          this._lastSavedClick = { id: pointId, at: now }; this.markSelection(true)
          this.$emit('point-click', pointId, { ...point, uuid: pointId })
        }
        const onClick = event => { event.preventDefault(); event.stopPropagation(); selected() }
        button.addEventListener('click', onClick)
        const options = { position: coordinates(point), content: button, anchor: 'bottom-center', clickable: true, zIndex: 200, title: button.title, bubble: false, extData: { pointId } }
        const marker = new this._AMap.Marker(options)
        this._markerRecords.push({ id: pointId, button, onClick, marker, selected })
        marker.on('click', selected); this._markers.push(marker)
      })
      this._map.add(this._markers); this.updatePointHighlight()
    },
    removeMarkerListeners() { (this._markerRecords || []).forEach(({ button, onClick, marker, selected }) => { button.removeEventListener('click', onClick); if (marker) marker.off('click', selected) }); this._markerRecords = [] },
    updatePointHighlight() { (this._markerRecords || []).forEach(record => { const active = record.id === String(this.activePointId || ''); record.button.classList.toggle('is-active', active); record.button.setAttribute('aria-pressed', String(active)) }) },
    eventPoint(value) {
      if (!value) return null
      const rawLongitude = typeof value.getLng === 'function' ? value.getLng() : Array.isArray(value) ? value[0] : value.longitude == null ? value.lng : value.longitude
      const rawLatitude = typeof value.getLat === 'function' ? value.getLat() : Array.isArray(value) ? value[1] : value.latitude == null ? value.lat : value.latitude
      if (rawLongitude == null || rawLatitude == null || rawLongitude === '' || rawLatitude === '') return null
      const longitude = Number(rawLongitude); const latitude = Number(rawLatitude)
      return hasCoordinates({ longitude, latitude }) ? { longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)) } : null
    },
    markSelection(overlay = false) { this._gesture++; this._lastSelectionAt = Date.now(); if (overlay) this._lastOverlaySelectionAt = this._lastSelectionAt; clearTimeout(this._blankClickTimer); this._blankClickTimer = null },
    selectHotspot(event, seq) {
      if (!this.isCurrent(seq) || Date.now() - this._lastOverlaySelectionAt < 180) return
      const hotspot = event && (event.poi || event); if (!hotspot) return
      const poiId = hotspot.poiId || hotspot.id
      const point = this.eventPoint(hotspot.lnglat || hotspot.location || hotspot)
      if (!poiId && !point) return
      this.markSelection()
      if (!poiId) { this.$emit('map-click', { ...point, source: 0 }); return }
      this.$emit('poi-click', { ...(point || {}), poiId: poiId ? String(poiId) : null, name: typeof hotspot.name === 'string' ? hotspot.name : '', source: poiId ? 1 : 0 })
    },
    drawThemeCenter() {
      if (!this._map) return
      if (this._centerMarker) this._map.remove(this._centerMarker); this._centerMarker = null
      const point = this.themeView && this.themeView.center
      if (!hasCoordinates(point)) return
      const content = document.createElement('div'); content.className = 'map-theme-center'
      const boundary = document.createElement('span'); boundary.className = 'map-theme-center-boundary'; content.appendChild(boundary)
      const ring = document.createElement('span'); ring.className = 'map-theme-center-ring'; content.appendChild(ring)
      const echo = document.createElement('span'); echo.className = 'map-theme-center-ring map-theme-center-echo'; content.appendChild(echo)
      const dot = document.createElement('span'); dot.className = 'map-theme-center-dot'; content.appendChild(dot)
      const label = document.createElement('span'); label.className = 'map-theme-center-label'
      const name = document.createElement('strong'); name.textContent = '主题中心'; label.appendChild(name)
      const coordinate = document.createElement('small'); coordinate.textContent = this.themeCenterCoordinates; label.appendChild(coordinate); content.appendChild(label)
      this._centerMarker = new this._AMap.Marker({ position: coordinates(point), content, anchor: 'center', title: '主题中心：' + this.themeCenterCoordinates, bubble: true, clickable: false, zIndex: 180 })
      this._map.add(this._centerMarker)
    },
    focusThemeCenter() {
      if (!this.ready || !this._map || !this.hasThemeCenter) return
      this.markSelection()
      this._map.setZoomAndCenter(this.themeView.zoom || 14, coordinates(this.themeView.center))
    },
    removeDraftListener() { if (this._draftButton && this._draftClick) this._draftButton.removeEventListener('click', this._draftClick); this._draftButton = null; this._draftClick = null },
    drawDraft() {
      if (!this._map) return
      this.removeDraftListener()
      if (this._draftMarker) this._map.remove(this._draftMarker); this._draftMarker = null
      const point = this.draftPoint; if (!hasCoordinates(point)) return
      const seq = this._sequence; const generation = this.viewGeneration; const button = document.createElement('button'); button.type = 'button'; button.className = 'map-draft-marker'
      const updating = !!(point.pointId || point.uuid)
      button.textContent = `${updating ? '待更新' : '待保存'}${point.name ? ' · ' + point.name : ''}`
      button.title = point.address || button.textContent; button.setAttribute('aria-label', button.textContent)
      const selected = () => { if (this.isCurrent(seq) && generation === this.viewGeneration && this._draftButton === button) { this.markSelection(true); this.$emit('draft-click', { ...point }) } }
      this._draftClick = event => { event.preventDefault(); event.stopPropagation(); selected() }
      this._draftButton = button; button.addEventListener('click', this._draftClick)
      this._draftMarker = new this._AMap.Marker({ position: coordinates(point), content: button, anchor: 'bottom-center', clickable: true, bubble: false, zIndex: 220 })
      this._map.add(this._draftMarker)
    },
    focusPoint() { const point = this.points.find(p => p.uuid === this.activePointId); if (this._map && hasCoordinates(point)) this.focus(point) },
    focus(point) { if (this._map && hasCoordinates(point)) { this._gesture++; this._map.setZoomAndCenter(16, coordinates(point)) } },
    async changeStyle() {
      const seq = this._sequence; this.notice = null
      try { await syncAMapProxyAuth(); if (this.isCurrent(seq) && this._map) this._map.setMapStyle(`amap://styles/${this.style}`) }
      catch (error) { if (this.isCurrent(seq) && !error.authChanged && !error.authHandled) this.notice = getMapError(error, '地图样式暂时无法切换') }
    },
    async locate() {
      if (this.locating || !this._map) return
      const seq = this._sequence; const geoSeq = (this._geoSequence || 0) + 1; this._geoSequence = geoSeq; this.locating = true; this.notice = null
      const viewGeneration = this.viewGeneration; const gesture = this._gesture
      try {
        await syncAMapProxyAuth(); if (!this.isCurrent(seq) || this._geoSequence !== geoSeq) return
        this._geolocation = new this._AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000, convert: true, GeoLocationFirst: true, noIpLocate: 3, getCityWhenFail: false, showMarker: false, showCircle: false, panToLocation: false, zoomToAccuracy: false })
        const result = await new Promise((resolve, reject) => {
          this._geoTimer = setTimeout(() => reject(new Error('设备定位超时，请重试或显式选择起点')), 10000)
          this._geolocation.getCurrentPosition((status, result) => status === 'complete' ? resolve(result) : reject(new Error('设备定位失败，请检查位置权限或选择起点')))
        })
        if (!this.isCurrent(seq) || this._geoSequence !== geoSeq) return
        const locationType = result && typeof result.location_type === 'string' ? result.location_type.trim().toLowerCase() : ''
        if (!['h5', 'html5', 'sdk'].includes(locationType)) throw new Error('未获得可信设备定位；IP、城市或未知来源不能作为我的位置，请选择地图起点或重试')
        if (!result.position || typeof result.position.getLng !== 'function' || typeof result.position.getLat !== 'function') throw new Error('设备定位没有有效坐标')
        const longitude = Number(result.position.getLng()); const latitude = Number(result.position.getLat())
        if (!hasCoordinates({ longitude, latitude })) throw new Error('设备定位没有有效坐标')
        const point = { longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)), name: '我的位置', source: 'device' }
        if (!hasCoordinates(point)) throw new Error('设备定位没有有效坐标')
        if (this._positionMarker) this._map.remove(this._positionMarker)
        if (this._accuracy) this._map.remove(this._accuracy)
        const dot = document.createElement('span'); dot.className = 'map-position-dot'
        this._positionMarker = new this._AMap.Marker({ position: coordinates(point), content: dot, anchor: 'center', bubble: true, zIndex: 150 })
        this._map.add(this._positionMarker)
        const accuracy = Number(result.accuracy)
        if (Number.isFinite(accuracy) && accuracy > 0) { this._accuracy = new this._AMap.Circle({ center: coordinates(point), radius: accuracy, strokeColor: '#3478f6', fillColor: '#3478f6', fillOpacity: 0.12, strokeOpacity: 0.3, bubble: true }); this._map.add(this._accuracy) }
        if (viewGeneration === this.viewGeneration && gesture === this._gesture) this.focus(point)
        this.status = '已获取设备位置'; this.$emit('position-change', point)
      } catch (error) { if (this.isCurrent(seq) && this._geoSequence === geoSeq && !error.authChanged && !error.authHandled) this.notice = getMapError(error, '暂时无法获取我的位置') }
      finally { if (this.isCurrent(seq) && this._geoSequence === geoSeq) { clearTimeout(this._geoTimer); this.locating = false } }
    },
    clearRoute() { if (this._route) this._route.clear(); this._route = null },
    showRoute(result) { this.clearRoute(); if (!this._map || !this.ready) return false; this._route = renderRoute(this._map, result, this._AMap); this._gesture++; return true },
    identity() { return this._sequence }
  }
}
</script>
<style>
.map-position-dot{display:block;width:14px;height:14px;background:#2879f7;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #2879f777}
.map-theme-center{position:relative;pointer-events:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center;isolation:isolate}
.map-theme-center .map-theme-center-dot{box-sizing:border-box;width:26px;height:26px;transform:none;border-radius:50%;background:#7541ce;border:4px solid white;box-shadow:0 0 0 3px #7541ce88,0 3px 10px #54329666;position:relative;z-index:1}
.map-theme-center-dot:after{content:'';position:absolute;inset:5px;border-radius:50%;background:white}
.map-theme-center-boundary{position:absolute;box-sizing:border-box;width:82px;height:82px;left:50%;top:50%;transform:translate(-50%,-50%);border:2px solid #8258d499;background:#8258d422;border-radius:50%;pointer-events:none;z-index:0}
.map-theme-center .map-theme-center-ring{position:absolute;box-sizing:border-box;width:64px;height:64px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #8258d47a;border-radius:50%;background:#8258d416;animation:map-center-pulse 3.6s ease-out infinite;pointer-events:none;z-index:0}
.map-theme-center .map-theme-center-echo{width:100px;height:100px;animation-delay:-1.8s;background:transparent;border-color:#8258d444}
.map-theme-center .map-theme-center-label{left:38px;top:-7px;z-index:2;padding:7px 10px;border:1px solid #8258d466;background:#fffd;box-shadow:0 3px 12px #54329622}
.map-theme-center-label strong{display:block;font-size:13px;line-height:1.5}.map-theme-center-label small{display:block;font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums}
@keyframes map-center-pulse{0%{opacity:.8;transform:translate(-50%,-50%) scale(.55)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.25)}}
@media(prefers-reduced-motion:reduce){.map-theme-center .map-theme-center-ring{animation:none;opacity:.55}}
.map-saved-marker{position:relative;width:27px;height:27px;display:flex;align-items:center;justify-content:center;background:#2677cf;border:2px solid white;border-radius:50%;padding:0;cursor:pointer;box-shadow:0 2px 7px #0005;color:white}.map-saved-marker:after{content:'';position:absolute;bottom:-4px;left:8px;width:8px;height:8px;transform:rotate(45deg);background:#2677cf;z-index:-1}.map-saved-marker-core{width:7px;height:7px;border:2px solid white;border-radius:50%;pointer-events:none}.map-saved-marker.is-active{box-shadow:0 0 0 5px #2677cf55,0 2px 7px #0005}.map-saved-marker-label{display:none;position:absolute;left:31px;top:0;background:white;color:#24415f;padding:5px 9px;border-radius:5px;white-space:nowrap;box-shadow:0 2px 8px #0002;max-width:220px;overflow:hidden;text-overflow:ellipsis;pointer-events:none}.map-saved-marker:hover .map-saved-marker-label,.map-saved-marker.is-active .map-saved-marker-label{display:block}.map-theme-center-label{position:absolute;left:22px;top:-2px;background:#fff;color:#6a3cb1;padding:3px 6px;border-radius:4px;font-size:11px;white-space:nowrap;box-shadow:0 1px 6px #0002}.map-draft-marker{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#fff4d9;border:2px solid #e79824;color:#8b5308;padding:5px 10px;border-radius:15px;box-shadow:0 2px 8px #0002;cursor:pointer;font-size:12px}
</style>
<style scoped>
.map-toolbar-overlay{position:absolute;left:12px;right:12px;top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;z-index:190}
.map-toolbar-overlay .map-tools{position:static;max-width:100%;flex-wrap:wrap;justify-content:flex-end;pointer-events:auto}.map-tools .el-button+.el-button{margin-left:0}
.map-toolbar-overlay .map-legend{position:static;align-self:flex-start;max-width:100%}
.map-toolbar-overlay .map-action-feedback{position:static;max-width:320px;box-sizing:border-box;margin:0;pointer-events:auto}
.map-action-feedback{position:absolute;right:12px;top:52px;max-width:320px;z-index:180;box-shadow:0 4px 16px #0001}.map-error .map-feedback{max-width:360px;text-align:left}
.map-canvas{position:relative;height:100%;min-height:420px;background:#e9eef4}.map-surface{height:100%;min-height:420px}.map-tools{position:absolute;right:12px;top:12px;display:flex;gap:8px}.map-tools .el-select{width:120px}.map-status{position:absolute;bottom:12px;left:12px;max-width:85%;background:#fffffff0;border-radius:6px;padding:8px 12px;font-size:12px;color:#44516a}.map-error{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#f2f5f9f5;padding:24px;text-align:center}
.map-legend{position:absolute;left:12px;top:12px;background:#ffffffed;border-radius:6px;padding:7px 10px;display:flex;gap:10px;font-size:11px;color:#526074;pointer-events:none;flex-wrap:wrap;max-width:calc(100% - 240px)}.map-legend span{display:flex;align-items:center;gap:4px}.map-legend i{width:8px;height:8px;border-radius:50%;display:inline-block}.legend-saved{background:#2677cf}.legend-center{background:#8258d4}.legend-draft{background:#e79824}@media(max-width:600px){.map-legend{top:54px;max-width:calc(100% - 44px)}}
</style>
