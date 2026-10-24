<template><section class="map-workspace">
  <header class="workspace-toolbar"><div class="theme-select"><el-select v-model="themeId" placeholder="选择我的主题" :disabled="loadingThemes" @change="selectTheme"><el-option v-for="theme in themes" :key="theme.uuid" :label="theme.name" :value="theme.uuid" /></el-select><el-button type="primary" plain @click="openThemeForm(null)">创建主题</el-button></div><div><el-button :disabled="!themeId" @click="openThemeForm(currentTheme)">编辑主题</el-button><el-button :disabled="!themeId" @click="removeTheme">删除主题</el-button><el-button @click="categoryPanel = true">分类管理</el-button></div></header>
  <MapFeedback class="workspace-feedback" :error="pageError" :retry="true" :busy="loadingThemes" retry-label="重新加载数据" @retry="reload" />
  <div v-if="pickMode" class="pick-banner" role="status">{{ pickText }}<span v-if="selectionLoading"> 正在确认地点位置…</span><span v-if="selectionError" class="selection-error"> {{ selectionError.message }}</span><el-button type="text" @click="cancelPick">取消选点</el-button></div>
  <div class="workspace-body">
    <aside class="point-list">
      <div v-if="!themeId" class="empty-theme"><h3>创建第一个主题</h3><p>收藏自己的地点、分类和文字笔记。所有内容默认私有。</p><el-button type="primary" @click="openThemeForm(null)">创建主题</el-button></div>
      <template v-else>
        <h3>{{ currentTheme && currentTheme.name }}</h3><p class="muted">{{ currentTheme && currentTheme.description }}</p>
        <label>搜索已保存地点</label><el-input v-model="keyword" placeholder="按名称查找" clearable maxlength="200" @input="queueFilter"/>
        <el-select v-model="categoryFilter" placeholder="全部分类" @change="applyFilter"><el-option label="全部分类" value=""/><el-option label="未分类" value="__none"/><el-option v-for="category in categories" :key="category.uuid" :label="category.name" :value="category.uuid"/></el-select>
        <p class="filter-hint">仅筛选列表，地图保留全部地点。</p>
        <label>搜索地址添加</label><AddressSearch :key="contextKey" :context-key="contextKey" :selection-key="searchRevision" @resolving="beginSearchSelection" @select="addFromSearch"/>
        <p class="muted">也可点击地图空白处添加地点。搜索结果需确认保存。</p>
        <MapFeedback :error="listError" :retry="true" :busy="loadingPoints" retry-label="重试地点列表" @retry="loadPointPage" />
        <div v-loading="loadingPoints"><button v-for="point in pointPage.list" :key="point.uuid" type="button" class="point-row" :class="{ selected: selectedPoint && selectedPoint.uuid === point.uuid }" @click="openPoint(point.uuid)"><strong>{{ point.name }}</strong><span>{{ point.address || '未填写地址' }}</span><small>{{ categoryName(point.categoryId) }}</small></button><p v-if="!loadingPoints && !listError && !pointPage.list.length" class="muted">{{ keyword || categoryFilter ? '没有匹配的地点' : '尚未保存地点' }}</p></div>
        <el-pagination small layout="prev, pager, next" :current-page="pageNum" :page-size="20" :total="Number(pointPage.total) || 0" @current-change="changePage"/>
      </template>
    </aside>
    <div class="canvas-area"><MapCanvas v-if="loggedIn" ref="map" :points="markers" :categories="categories" :theme-view="themeView" :draft-point="draftPoint" :active-point-id="selectedPoint && selectedPoint.uuid" :view-generation="viewGeneration" :session-key="sessionVersion" @map-click="mapClick" @poi-click="selectMapPoi" @draft-click="openDraft" @point-click="openPoint" @position-change="position = $event" @ready="mapReadyChanged"/><div v-else class="signed-out">登录状态已结束，地图已关闭。</div>
      <div v-if="clickPoint && !clickPoint.uuid && !pickMode" class="map-click-menu"><strong>{{ clickPoint.amapPoiId ? '高德地点' : '地图选点' }} · {{ clickPoint.name }}</strong><p>{{ clickPoint.address || '未填写地址' }}</p><p v-if="validPointCoordinates(clickPoint)">{{ clickPoint.longitude }}, {{ clickPoint.latitude }}</p><p v-if="selectionLoading" role="status">正在确认地点详情…</p><MapFeedback :error="selectionError" :retry="!!clickPoint.pendingPoi" :busy="selectionLoading" retry-label="重试地点详情" @retry="selectMapPoi(clickPoint)" /><el-button size="small" type="primary" :disabled="!themeId || selectionLoading || !!selectionError || clickPoint.pendingPoi" @click="addClickedPoint">添加地点</el-button><el-button size="small" :disabled="selectionLoading || !!selectionError || clickPoint.pendingPoi || !validPointCoordinates(clickPoint)" @click="routeTo(clickPoint, true)">去这里</el-button><el-button size="small" @click="closeClickMenu">关闭</el-button></div>
    </div>
    <PointFormDrawer v-if="pointFormVisible" ref="pointForm" :visible="pointFormVisible" :point="editingPoint" :theme-id="themeId" :categories="categories" :context-key="contextKey" @close="closePointForm" @pick-coordinate="pickMode = 'point'" @draft-change="draftChanged" @selection-start="invalidateSelection" @saved="pointSaved" @open-existing="openExisting"/>
    <RoutePanel v-else-if="routeDestination" ref="routePanel" :key="routeGeneration" :destination="routeDestination" :position="position" :points="allPoints" :context-key="contextKey" :navigation-only="navigationOnly" :map-identity="mapIdentity" :map-ready="mapReady" @close="closeRoute" @pick-start="pickMode = 'start'" @start-change="cancelRoutePosition" @locate="locateForRoute" @clear-route="clearRoute" @route-result="showRoute"/>
    <aside v-else-if="selectedPoint" class="point-detail">
      <header><div><span class="detail-eyebrow">我的地点</span><h3>{{ selectedPoint.name }}</h3></div><el-button type="text" @click="closeDetail">关闭</el-button></header>
      <div class="detail-badges"><span class="saved-badge">已保存</span><span>{{ categoryName(selectedPoint.categoryId) }}</span></div>
      <section class="detail-address"><span class="section-label">地址</span><p>{{ selectedPoint.address || '尚未填写地址，可在编辑地点中补充' }}</p></section>
      <div v-if="validPointCoordinates(selectedPoint)" class="detail-coordinates"><span>{{ selectedPoint.longitude }}, {{ selectedPoint.latitude }}</span><el-button type="text" size="mini" @click="copyCoordinates">复制坐标</el-button></div><p v-if="coordinateCopyError" class="muted" role="status">{{ coordinateCopyError }}</p>
      <p v-if="detailLoading" class="muted" role="status">正在加载地点详情和笔记…</p><MapFeedback :error="detailError" :retry="true" :busy="detailLoading" retry-label="重试加载详情" @retry="openPoint(selectedPoint.uuid, selectedPoint)" />
      <section v-if="detailComplete" class="detail-note"><div class="note-heading"><h4>文字笔记</h4><el-button type="text" size="small" :disabled="detailLoading" @click="editSelected">{{ selectedPoint.note ? '编辑笔记' : '添加笔记' }}</el-button></div><p v-if="selectedPoint.note" class="note">{{ selectedPoint.note }}</p><p v-else class="note-empty">记下这个地点的提醒、计划或到访感受。</p></section>
      <div class="detail-actions"><el-button type="primary" :disabled="!validPointCoordinates(selectedPoint)" @click="routeTo(selectedPoint, false)">查看路线</el-button><el-button :disabled="!validPointCoordinates(selectedPoint)" @click="routeTo(selectedPoint, true)">去高德导航</el-button></div>
      <div class="detail-management"><el-button type="text" :disabled="detailLoading || !detailComplete" @click="editSelected">编辑地点</el-button><el-button type="text" class="delete-point" @click="removePoint">删除地点</el-button></div>
    </aside>
  </div>
  <ThemeFormDialog v-if="themeFormVisible" ref="themeForm" :visible="themeFormVisible" :picking="pickMode === 'theme'" :theme="editingTheme" :context-key="contextKey" @close="closeThemeForm" @pick-center="pickMode = 'theme'" @saved="themeSaved"/>
  <CategoryIconPanel v-if="categoryPanel" :visible="categoryPanel" :theme-id="themeId" :categories="categories" :context-key="contextKey" @close="categoryPanel = false" @changed="resourcesChanged"/>
</section></template>
<script>
import * as api from '@/api/business/map'
import { invalidateMapProxyAuth } from '@/config/amap'
import { syncAMapProxyAuth } from '@/utils/map/amapLoader'
import { hasCoordinates, resolveAddress } from '@/utils/map/mapSearch'
import MapCanvas from './components/MapCanvas.vue'
import ThemeFormDialog from './components/ThemeFormDialog.vue'
import CategoryIconPanel from './components/CategoryIconPanel.vue'
import PointFormDrawer from './components/PointFormDrawer.vue'
import RoutePanel from './components/RoutePanel.vue'
import AddressSearch from './components/AddressSearch.vue'
import MapFeedback from './components/MapFeedback.vue'
import { getMapError } from '@/utils/map/mapErrors'
export default {
  name: 'MapWorkspaceView', components: { MapCanvas, ThemeFormDialog, CategoryIconPanel, PointFormDrawer, RoutePanel, AddressSearch, MapFeedback },
  data: () => ({
    themes: [], themeId: '', categories: [], markers: [], allPoints: [], pointPage: { list: [], total: 0 },
    keyword: '', categoryFilter: '', pageNum: 1, selectedPoint: null, editingPoint: null, pointFormVisible: false,
    editingTheme: null, themeFormVisible: false, categoryPanel: false, clickPoint: null, pickMode: '',
    routeDestination: null, routeGeneration: 0, navigationOnly: false, position: null, mapReady: false, mapIdentity: 0,
    themeView: null, viewGeneration: 0, contextGeneration: 0, loadingThemes: false, loadingPoints: false, pageError: '',
    dataSequence: 0, detailSequence: 0, themeSequence: 0, pointsSequence: 0, selectionSequence: 0, searchRevision: 0,
    detailLoading: false, detailError: '', detailComplete: false, selectionLoading: false, selectionError: '', draftPoint: null, listError: null, coordinateCopyError: ''
  }),
  computed: {
    currentTheme() { return this.themes.find(t => t.uuid === this.themeId) || null },
    loggedIn() { return !!this.$store.state.common.token }, token() { return this.$store.state.common.token },
    sessionVersion() { return this.$store.state.common.authVersion },
    contextKey() { return `${this.sessionVersion}:${this.themeId}:${this.contextGeneration}` },
    pickText() { return { theme: '请点击地图设置主题中心；选择后仍需点击保存。', point: '请点击地图更改地点坐标；选择后仍需点击保存。', start: '请点击地图明确选择路线起点。' }[this.pickMode] }
  },
  watch: {
    sessionVersion() { this.resetSession(); if (this.loggedIn) this.reload() },
    token(value) { invalidateMapProxyAuth(false); if (value) this.syncProxyAuth(); else this.resetSession() },
    position(value) { if (value && this._routeAwaitingPosition && this.$refs.routePanel) { this.$refs.routePanel.setStart(value); this._routeAwaitingPosition = false } }
  },
  created() { this._alive = true; this.reload() },
  beforeDestroy() { this._alive = false; this.resetSession() },
  methods: {
    validPointCoordinates: hasCoordinates,
    invalidateSelection() { this.selectionSequence++; this.searchRevision++; this.selectionLoading = false; this.selectionError = '' },
    beginSearchSelection() { this.selectionSequence++; this.selectionLoading = false; this.selectionError = '' },
    draftChanged(point) { if (!this.pointFormVisible) return; this.invalidateSelection(); this.draftPoint = hasCoordinates(point) ? { ...point, uuid: point.pointId || undefined } : null },
    closeClickMenu() { this.invalidateSelection(); this.clickPoint = null; if (!this.pointFormVisible) this.draftPoint = null },
    validContext(context) { return this._alive && this.loggedIn && context === this.contextKey },
    errorMessage(error, fallback) { return error.authChanged || error.authHandled ? null : getMapError(error, fallback || '暂时无法加载地图数据，请稍后重试') },
    async syncProxyAuth() { const version = this.sessionVersion; try { await syncAMapProxyAuth() } catch (error) { if (this._alive && version === this.sessionVersion && this.loggedIn && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error, '地图暂时无法连接，请重新加载数据') } },
    resetSession() {
      this.invalidateSelection(); this.draftPoint = null; this.detailLoading = false; this.detailError = ''; this.detailComplete = false; this.listError = null; this.coordinateCopyError = ''
      invalidateMapProxyAuth(); this.themeSequence++; this.dataSequence++; this.detailSequence++; this.pointsSequence++; this.contextGeneration++; this.viewGeneration++
      clearTimeout(this._filterTimer); this._routeAwaitingPosition = false
      this.closeRoute(); this.themes = []; this.themeId = ''; this.categories = []; this.markers = []; this.allPoints = []; this.pointPage = { list: [], total: 0 }; this.selectedPoint = null; this.position = null; this.themeView = null; this.pointFormVisible = false; this.themeFormVisible = false; this.categoryPanel = false; this.pickMode = ''; this.clickPoint = null; this.pageError = ''; this.loadingPoints = false; this.loadingThemes = false
    },
    async reload() {
      if (!this.loggedIn) return
      const seq = ++this.themeSequence; const version = this.sessionVersion; this.loadingThemes = true; this.pageError = ''
      try {
        const themes = await api.listThemes(); if (!this._alive || seq !== this.themeSequence || version !== this.sessionVersion) return
        this.themes = themes; const id = themes.some(t => t.uuid === this.themeId) ? this.themeId : (themes[0] && themes[0].uuid) || ''
        this.themeId = id; await this.selectTheme(id)
      } catch (error) { if (this._alive && seq === this.themeSequence && version === this.sessionVersion && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) }
      finally { if (seq === this.themeSequence) this.loadingThemes = false }
    },
    async selectTheme(id) {
      this.invalidateSelection(); this.draftPoint = null; this.detailLoading = false; this.detailError = ''; this.detailComplete = false; this.listError = null; this.coordinateCopyError = ''
      this.loadingPoints = false
      this.themeId = id || ''; this.contextGeneration++; this.viewGeneration++; this.dataSequence++; this.detailSequence++; this.pointsSequence++
      clearTimeout(this._filterTimer); this.closeRoute(); this.selectedPoint = null; this.pointFormVisible = false; this.themeFormVisible = false; this.categoryPanel = false; this.clickPoint = null; this.pickMode = ''; this.keyword = ''; this.categoryFilter = ''; this.pageNum = 1; this.categories = []; this.markers = []; this.allPoints = []; this.pointPage = { list: [], total: 0 }; this.pageError = ''
      const theme = this.currentTheme; this.themeView = theme ? { center: { longitude: theme.centerLongitude, latitude: theme.centerLatitude }, zoom: theme.defaultZoom, points: [] } : null
      if (!id) return
      const context = this.contextKey
      try {
        const [categories, points] = await Promise.all([api.listCategories(id), api.listMarkers({ themeId: id })]); if (!this.validContext(context)) return
        this.categories = categories; this.allPoints = points; this.markers = points
        this.themeView = { center: { longitude: theme.centerLongitude, latitude: theme.centerLatitude }, zoom: theme.defaultZoom, points }
        await this.loadPointPage()
      } catch (error) { if (this.validContext(context) && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) }
    },
    filterParams() { return { themeId: this.themeId, keyword: this.keyword.trim() || undefined, categoryId: this.categoryFilter && this.categoryFilter !== '__none' ? this.categoryFilter : undefined, uncategorized: this.categoryFilter === '__none' ? true : undefined } },
    queueFilter() { clearTimeout(this._filterTimer); this.dataSequence++; this._filterTimer = setTimeout(() => this.applyFilter(), 300) },
    applyFilter() { this.pageNum = 1; this.loadPointPage() }, changePage(page) { this.pageNum = page; this.loadPointPage() },
    async loadPointPage() {
      if (!this.themeId) return
      const seq = ++this.dataSequence; const context = this.contextKey; const params = this.filterParams(); this.loadingPoints = true; this.listError = null
      try {
        const page = await api.pagePoints({ ...params, pageNum: this.pageNum, pageSize: 20 })
        if (seq !== this.dataSequence || !this.validContext(context)) return
        this.pointPage = page
      } catch (error) { if (seq === this.dataSequence && this.validContext(context) && !error.authChanged && !error.authHandled) this.listError = this.errorMessage(error, '地点列表暂时无法加载，地图上仍保留全部地点') }
      finally { if (seq === this.dataSequence) this.loadingPoints = false }
    },
    categoryName(id) { const category = this.categories.find(c => c.uuid === id); return category ? category.name : '未分类' },
    async copyCoordinates() {
      const point = this.selectedPoint; const context = this.contextKey
      if (!hasCoordinates(point)) return
      this.coordinateCopyError = ''
      try { await navigator.clipboard.writeText(`${point.longitude}, ${point.latitude}`); if (this.validContext(context) && this.selectedPoint && this.selectedPoint.uuid === point.uuid) this.$message.success('坐标已复制') }
      catch (error) { if (this.validContext(context) && this.selectedPoint && this.selectedPoint.uuid === point.uuid) this.coordinateCopyError = '无法自动复制，可选中上方坐标手动复制。' }
    },
    closeDetail() { this.invalidateSelection(); this.detailSequence++; this.selectedPoint = null; this.detailLoading = false; this.detailError = ''; this.detailComplete = false; this.clickPoint = null; this.draftPoint = null },
    async openPoint(id, summary) {
      if (!id || !this.themeId) return
      this.invalidateSelection(); this.closeRoute(); this.closePointForm(); this.themeFormVisible = false
      const seq = ++this.detailSequence; const context = this.contextKey
      const cached = this.allPoints.find(point => point.uuid === id) || this.pointPage.list.find(point => point.uuid === id) || summary || {}
      this.selectedPoint = { ...cached, uuid: id, name: cached.name || '已保存地点' }; this.clickPoint = null; this.pickMode = ''; this.detailLoading = true; this.detailError = ''; this.detailComplete = false; this.coordinateCopyError = ''
      if (this.$refs.map && hasCoordinates(this.selectedPoint)) this.$refs.map.focus(this.selectedPoint)
      try { const point = await api.getPoint(id); if (seq !== this.detailSequence || !this.validContext(context)) return; if (!point || point.uuid !== id || !this.hasCompleteNote(point)) throw new Error('未取得地点完整详情和笔记，请重试加载'); this.selectedPoint = point; this.detailComplete = true }
      catch (error) { if (seq === this.detailSequence && this.validContext(context) && !error.authChanged && !error.authHandled) this.detailError = this.errorMessage(error, '地点详情和笔记暂时无法加载，请重试后再编辑') }
      finally { if (seq === this.detailSequence && this.validContext(context)) this.detailLoading = false }
    },
    openThemeForm(theme) { this.editingTheme = theme ? { ...theme } : null; this.themeFormVisible = true; this.pickMode = ''; this.closePointForm(); this.closeRoute() },
    closeThemeForm() { this.themeFormVisible = false; if (this.pickMode === 'theme') this.pickMode = '' },
    async themeSaved(theme) { this.closeThemeForm(); const index = this.themes.findIndex(t => t.uuid === theme.uuid); if (index < 0) this.themes.push(theme); else this.$set(this.themes, index, theme); this.themeId = theme.uuid; await this.selectTheme(theme.uuid); this.$message.success('主题已保存') },
    async removeTheme() {
      const theme = this.currentTheme; const context = this.contextKey; if (!theme) return
      try { await this.$confirm(`删除主题「${theme.name}」及其分类、地点和笔记？`, '删除主题', { type: 'warning' }); if (!this.validContext(context)) return; await api.deleteTheme(theme.uuid); if (this.validContext(context)) { this.themeId = ''; await this.reload() } }
      catch (error) { if (error !== 'cancel' && error !== 'close' && this.validContext(context) && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) }
    },
    existingPoi(point) { const poiId = point.amapPoiId || point.poiId; return poiId ? this.allPoints.find(saved => saved.amapPoiId === poiId) : null },
    addFromSearch(point) { if (!this.themeId || !this.loggedIn) return; const existing = this.existingPoi(point); if (existing && !this.pointFormVisible) { this.openPoint(existing.uuid, existing); return }; if (this.pointFormVisible && this.$refs.pointForm) this.$refs.pointForm.selectAddress(point); else this.openPointForm(point); if (this.$refs.map) this.$refs.map.focus(point) },
    openPointForm(point) { this.invalidateSelection(); this.closeRoute(); this.detailSequence++; this.detailLoading = false; this.editingPoint = { ...point }; this.pointFormVisible = true; this.draftPoint = hasCoordinates(point) ? { ...point } : null; this.selectedPoint = null; this.clickPoint = null; this.pickMode = ''; this.themeFormVisible = false },
    closePointForm() { this.invalidateSelection(); this.pointFormVisible = false; this.draftPoint = null; if (this.pickMode === 'point') this.pickMode = '' },
    editSelected() { if (this.selectedPoint && this.detailComplete && !this.detailLoading) this.openPointForm(this.selectedPoint) },
    hasCompleteNote(point) { return !!point && Object.prototype.hasOwnProperty.call(point, 'note') && (typeof point.note === 'string' || point.note === null) },
    cancelPick() { this.invalidateSelection(); this.pickMode = '' },
    openDraft(point) { if (!this.draftPoint || !point || !hasCoordinates(point) || Number(point.longitude) !== Number(this.draftPoint.longitude) || Number(point.latitude) !== Number(this.draftPoint.latitude)) return; this.invalidateSelection(); if (this.pointFormVisible) { this.pickMode = ''; return }; this.clickPoint = { ...this.draftPoint } },
    async selectMapPoi(item) {
      if (!this.mapReady || !item || !item.poiId) return
      const picking = this.pickMode
      if (!this.themeId && picking !== 'theme') { this.$message.info('请先创建主题，再添加地图地点。'); return }
      if (!picking && this.pointFormVisible) { this.invalidateSelection(); this.$message.info('请在当前表单搜索或选择附近地点，保存或关闭后可重新添加地图地点。'); return }
      this.invalidateSelection()
      if (!picking) {
        this.closePointForm(); this.closeRoute(); this.closeDetail(); this.themeFormVisible = false
        const existing = this.existingPoi(item); if (existing) { this.openPoint(existing.uuid, existing); return }
        this.clickPoint = { ...item, name: item.name || '高德地点', amapPoiId: item.poiId, source: 1, pendingPoi: true }
      }
      const seq = ++this.selectionSequence; const context = this.contextKey; const identity = this.mapIdentity
      this.selectionLoading = true
      try {
        const point = await resolveAddress(item); if (seq !== this.selectionSequence || !this.validContext(context) || !this.mapReady || identity !== this.mapIdentity || this.pickMode !== picking) return
        if (picking) {
          if (picking === 'theme' && this.$refs.themeForm) this.$refs.themeForm.setCenter(point)
          else if (picking === 'point' && this.$refs.pointForm) this.$refs.pointForm.selectAddress(point)
          else if (picking === 'start' && this.$refs.routePanel) this.$refs.routePanel.setStart(point)
          this.pickMode = ''; this.clickPoint = null
        } else {
          const saved = this.existingPoi(point); if (saved) { this.openPoint(saved.uuid, saved); return }
          this.clickPoint = point; this.draftPoint = { ...point }
        }
        if (this.$refs.map) this.$refs.map.focus(point)
      }
      catch (error) { if (seq === this.selectionSequence && this.validContext(context) && identity === this.mapIdentity && !error.authChanged && !error.authHandled) this.selectionError = this.errorMessage(error) }
      finally { if (seq === this.selectionSequence && this.validContext(context)) this.selectionLoading = false }
    },
    mapClick(point) {
      this.invalidateSelection()
      if (!this.themeId && this.pickMode !== 'theme') { this.$message.info('请先创建主题，再添加地图地点。'); return }
      if (this.pickMode === 'theme' && this.$refs.themeForm) this.$refs.themeForm.setCenter(point)
      else if (this.pickMode === 'point' && this.$refs.pointForm) this.$refs.pointForm.setCoordinate(point)
      else if (this.pickMode === 'start' && this.$refs.routePanel) this.$refs.routePanel.setStart({ ...point, name: '地图选起点' })
      else { if (this.pointFormVisible) { this.$message.info('请先保存或关闭当前地点表单，或点击「在地图上明确更改坐标」。'); return }; this.detailSequence++; this.detailLoading = false; this.selectedPoint = null; this.detailComplete = false; this.clickPoint = { longitude: point.longitude, latitude: point.latitude, name: '地图选点', address: '', source: 0, amapPoiId: null }; this.draftPoint = { ...this.clickPoint }; return }
      this.pickMode = ''; this.clickPoint = null
    },
    addClickedPoint() { if (!this.clickPoint || this.clickPoint.pendingPoi || this.selectionLoading || this.selectionError) return; const point = this.clickPoint; const existing = this.existingPoi(point); if (existing) { this.openPoint(existing.uuid, existing); return }; this.openPointForm({ ...point, lookupNearby: !point.amapPoiId }) },
    async pointSaved(point) {
      const context = this.contextKey; this.closePointForm(); this.detailSequence++; this.selectedPoint = point; this.clickPoint = null; this.detailComplete = this.hasCompleteNote(point); this.detailError = this.detailComplete ? '' : '地点已保存，请加载完整详情后查看和编辑笔记'; this.detailLoading = false; this.pickMode = ''; this.keyword = ''; this.categoryFilter = ''; this.pageNum = 1; clearTimeout(this._filterTimer)
      this.allPoints = [...this.allPoints.filter(item => item.uuid !== point.uuid), point]; this.markers = [...this.allPoints]; this.pointPage = { ...this.pointPage, list: [point, ...this.pointPage.list.filter(item => item.uuid !== point.uuid)].slice(0, 20) }
      if (this.$refs.map) this.$refs.map.focus(point)
      await this.refreshPoints(); if (this.validContext(context)) this.$message.success('地点已保存')
    },
    openExisting(id) { this.closePointForm(); this.openPoint(id) },
    async refreshPoints() {
      const context = this.contextKey; const seq = ++this.pointsSequence
      try { const points = await api.listMarkers({ themeId: this.themeId }); if (seq !== this.pointsSequence || !this.validContext(context)) return; this.allPoints = points; this.markers = points; await this.loadPointPage() }
      catch (error) { if (seq === this.pointsSequence && this.validContext(context) && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) }
    },
    async removePoint() {
      const point = this.selectedPoint; const context = this.contextKey; if (!point) return
      try { await this.$confirm(`删除地点「${point.name}」及其笔记？`, '删除地点', { type: 'warning' }); if (!this.validContext(context)) return; await api.deletePoint(point.uuid); if (this.validContext(context)) { this.allPoints = this.allPoints.filter(item => item.uuid !== point.uuid); this.markers = [...this.allPoints]; this.pointPage = { ...this.pointPage, list: this.pointPage.list.filter(item => item.uuid !== point.uuid) }; if (this.selectedPoint && this.selectedPoint.uuid === point.uuid) this.closeDetail(); if (this.clickPoint && this.clickPoint.uuid === point.uuid) this.clickPoint = null; await this.refreshPoints() } }
      catch (error) { if (error !== 'cancel' && error !== 'close' && this.validContext(context) && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) }
    },
    async resourcesChanged() { if (!this.themeId) return; const context = this.contextKey; try { const categories = await api.listCategories(this.themeId); if (!this.validContext(context)) return; this.categories = categories; await this.refreshPoints() } catch (error) { if (this.validContext(context) && !error.authChanged && !error.authHandled) this.pageError = this.errorMessage(error) } },
    mapReadyChanged(ready) { this.invalidateSelection(); this.mapReady = ready; this.mapIdentity = this.$refs.map ? this.$refs.map.identity() : this.mapIdentity + 1; if (!ready) this.clearRoute() },
    routeTo(point, navigationOnly) { if (!hasCoordinates(point)) return; this.detailSequence++; if (this.detailLoading) this.detailError = '详情加载已取消，可返回后重试加载'; this.detailLoading = false; this.closePointForm(); this.themeFormVisible = false; this.closeRoute(); this.routeDestination = { ...point }; this.navigationOnly = navigationOnly; this.routeGeneration++; this.clickPoint = null; this.pickMode = '' },
    closeRoute() { this.clearRoute(); this.routeDestination = null; this.routeGeneration++; this._routeAwaitingPosition = false; if (this.pickMode === 'start') this.pickMode = '' },
    clearRoute() { if (this.$refs.map) this.$refs.map.clearRoute() },
    showRoute({ result, context, identity }) { if (this.validContext(context) && this.mapReady && identity === this.mapIdentity && this.$refs.map && this.$refs.map.identity() === identity) this.$refs.map.showRoute(result) },
    cancelRoutePosition() { this._routeAwaitingPosition = false; this.invalidateSelection(); if (this.pickMode === 'start') this.pickMode = '' },
    locateForRoute() { this._routeAwaitingPosition = true; if (this.$refs.map) this.$refs.map.locate() }
  }
}
</script>
<style scoped>
.selection-error{color:#c43d3d;overflow-wrap:anywhere}.map-click-menu strong,.map-click-menu p{overflow-wrap:anywhere}
.workspace-feedback{margin:8px 14px}.filter-hint{font-size:11px;line-height:1.6;color:#7a8598;margin:8px 0}.point-detail{border-left:1px solid #e8edf3}.point-detail header{align-items:center;margin-bottom:12px}.point-detail header h3{font-size:21px;line-height:1.4;margin:5px 0 0;overflow-wrap:anywhere}.detail-eyebrow,.section-label{font-size:11px;color:#8390a4}.detail-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}.detail-badges span{padding:4px 8px;background:#f0f3f8;border-radius:5px;font-size:11px;color:#6b7a90}.detail-badges .saved-badge{background:#edf7f1;color:#458260}.detail-address{background:#f6f8fb;border-radius:8px;padding:12px 14px}.detail-address p{font-size:13px;line-height:1.7;margin:6px 0 0;overflow-wrap:anywhere}.detail-coordinates{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:#8993a4;margin:6px 0 18px;font-variant-numeric:tabular-nums}.detail-coordinates span{overflow-wrap:anywhere}.detail-coordinates .el-button{font-size:11px}.detail-note{border-top:1px solid #edf0f5;padding-top:10px;margin-top:18px}.note-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.note-heading h4{font-size:13px;margin:8px 0}.note-heading .el-button{font-size:11px}.note-empty{font-size:12px;line-height:1.7;padding:12px;background:#f8f9fb;border-radius:6px;color:#8b95a5}.point-detail .detail-actions{display:grid;grid-template-columns:1fr;gap:8px;border-top:1px solid #edf0f5;padding-top:18px;margin-top:20px}.detail-management{display:flex;justify-content:space-between;margin-top:10px}.detail-management .el-button{font-size:12px}.detail-management .delete-point{color:#9e7780}
.map-workspace{height:calc(100vh - 120px);min-height:560px;display:flex;flex-direction:column;background:#f5f7fb;border:1px solid #e4e8f0;border-radius:10px;overflow:hidden;color:#26344a}.workspace-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px;background:white;border-bottom:1px solid #e4e8f0}.theme-select{display:flex;gap:10px}.workspace-body{position:relative;display:flex;flex:1;min-height:0}.point-list{width:280px;flex-shrink:0;padding:18px;box-sizing:border-box;overflow:auto;background:white}.point-list h3{margin:0 0 8px}.point-list label{display:block;font-size:13px;font-weight:600;margin:18px 0 8px}.point-list .el-select{width:100%;margin-top:8px}.canvas-area{position:relative;flex:1;min-width:0}.point-row{display:block;width:100%;text-align:left;padding:13px 4px;background:white;border:0;border-bottom:1px solid #e9edf2;cursor:pointer}.point-row:hover,.point-row.selected{background:#eff5ff}.point-row span,.point-row small{display:block;color:#758096;line-height:1.6;margin-top:4px}.point-detail{width:330px;flex-shrink:0;padding:20px;overflow:auto;box-sizing:border-box;background:white}.point-detail header{display:flex;justify-content:space-between;gap:10px}.point-detail h3{margin-top:0}.point-detail .note{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}.detail-actions{display:flex;gap:10px;flex-wrap:wrap}.detail-actions .el-button{margin:0}.muted{font-size:12px;color:#7a8598;line-height:1.6}.map-click-menu{position:absolute;left:24px;bottom:64px;background:white;padding:14px;border-radius:8px;box-shadow:0 5px 22px #0002;z-index:150;font-size:12px;max-width:90%;box-sizing:border-box}.pick-banner{padding:6px 16px;background:#fff6d9;color:#795518;font-size:13px}.signed-out{padding:60px;text-align:center}.empty-theme{line-height:1.7}
@media(max-width:1100px){.workspace-toolbar .el-button{padding:10px}.point-list{width:230px}.point-detail{width:285px}}
@media(max-width:800px){.map-workspace{height:calc(100vh - 110px);min-height:620px}.workspace-toolbar{padding:10px}.theme-select{width:100%}.theme-select .el-select{flex:1}.point-list{width:200px;padding:12px}.point-detail{position:absolute;bottom:0;left:0;right:0;width:100%;max-height:60%;z-index:200;box-shadow:0 -4px 20px #0002}.map-click-menu{left:10px}.workspace-toolbar .el-button{font-size:12px}}
@media(max-width:500px){.workspace-body{flex-direction:column}.point-list{width:100%;max-height:220px;flex-shrink:0;border-bottom:1px solid #eee}.point-list h3,.point-list>.muted{display:none}.canvas-area{min-height:350px}.point-list label{margin-top:8px}.point-row{padding:7px 2px}.map-workspace{min-height:790px}}
</style>
