<!-- 协调活跃台风列表、地图和详情请求并防止过期响应覆盖用户选择。 -->
<template>
  <div class="typhoon-page">
    <header class="page-heading">
      <div>
        <h2>台风预测</h2>
        <p>关注活跃台风，查看实况路径与最新预报</p>
      </div>
      <span class="live-badge">
        <i />
        实况与预报
      </span>
    </header>
    <div v-if="listData && listData.stale" class="stale-banner">
      上游数据暂未更新，正在展示最近一次获取的真实台风数据。
    </div>
    <main class="typhoon-layout">
      <TyphoonList
        :items="items"
        :selected-id="selectedId"
        :loading="listLoading"
        :error="listError"
        @refresh="refresh(false)"
        @select="select"
      />
      <TyphoonMap
        v-if="loggedIn"
        :detail="detail"
        :point="selectedPoint"
        :selection-id="selectedId"
        :session-key="authVersion"
        :loading="detailLoading"
        @select-point="choosePoint"
      />
      <TyphoonDetail
        :detail="detail"
        :point="selectedPoint"
        :loading="detailLoading"
        :error="detailError"
        @retry="loadDetail(false)"
      />
    </main>
  </div>
</template>

<script>
import { listTyphoons, getTyphoonDetail } from '@/api/business/map/typhoon'
import TyphoonList from './components/TyphoonList.vue'
import TyphoonMap from './components/TyphoonMap.vue'
import TyphoonDetail from './components/TyphoonDetail.vue'
export default {
  name: 'MapTyphoonView',
  components: { TyphoonList, TyphoonMap, TyphoonDetail },
  data() {
    return {
      items: [],
      listData: null,
      selectedId: null,
      detail: null,
      selectedTime: null,
      listLoading: false,
      detailLoading: false,
      listError: null,
      detailError: null
    }
  },
  computed: {
    loggedIn() {
      return !!this.$store.state.common.token
    },
    authVersion() {
      return this.$store.state.common.authVersion
    },
    selectedPoint() {
      const points = (this.detail && this.detail.observations) || []
      return (
        points.find((point) => point.time === this.selectedTime) ||
        points[points.length - 1] ||
        null
      )
    }
  },
  watch: {
    authVersion() {
      this.reset()
      this.refresh(false)
    }
  },
  created() {
    this._context = 0
    this.refresh(false)
    this._timer = setInterval(() => this.refresh(true), 60000)
  },
  beforeDestroy() {
    clearInterval(this._timer)
    this.reset()
  },
  methods: {
    reset() {
      this._context = (this._context || 0) + 1
      if (this._listAbort) this._listAbort.abort()
      if (this._detailAbort) this._detailAbort.abort()
      this.items = []
      this.detail = null
      this.listData = null
      this.selectedId = null
      this.selectedTime = null
      this.listError = null
      this.detailError = null
      this.listLoading = false
      this.detailLoading = false
    },
    current(context, auth) {
      return (
        this.loggedIn &&
        !this._isDestroyed &&
        context === this._context &&
        auth === this.authVersion
      )
    },
    errorMessage(error, fallback) {
      const message = error && error.response && error.response.data && error.response.data.msg
      return typeof message === 'string' && message.trim() && message.length <= 240
        ? message
        : fallback
    },
    async refresh(background) {
      if (!this.loggedIn || (background && this.listLoading)) return
      if (this._listAbort) this._listAbort.abort()
      this._listAbort = new AbortController()
      const sequence = (this._listSequence = (this._listSequence || 0) + 1)
      const context = this._context
      const auth = this.authVersion
      this.listLoading = true
      this.listError = null
      try {
        const data = await listTyphoons({ signal: this._listAbort.signal })
        if (!this.current(context, auth) || sequence !== this._listSequence) return
        if (!data || !Array.isArray(data.typhoons)) throw new Error('台风列表数据格式异常')
        this.listData = data
        this.items = ((data && data.typhoons) || []).filter(
          (item) => item && item.id != null && item.active !== false
        )
        if (!this.items.some((item) => String(item.id) === String(this.selectedId)))
          this.select(this.items.length ? this.items[0].id : null)
        else if (this.selectedId != null) this.loadDetail(true)
      } catch (error) {
        if (
          this.current(context, auth) &&
          sequence === this._listSequence &&
          !error.authChanged &&
          !error.authHandled
        )
          this.listError = {
            title: '活跃台风列表获取失败',
            message: this.errorMessage(
              error,
              this.items.length
                ? '当前列表为上次成功获取的数据，请稍后重试。'
                : '请检查网络后重试。'
            )
          }
      } finally {
        if (this.current(context, auth) && sequence === this._listSequence) this.listLoading = false
      }
    },
    select(id) {
      if (id != null && !this.items.some((item) => String(item.id) === String(id))) return
      if (this._detailAbort) this._detailAbort.abort()
      this._detailSequence = (this._detailSequence || 0) + 1
      this.selectedId = id
      this.detail = null
      this.selectedTime = null
      this.detailError = null
      this.detailLoading = false
      this._pointChosen = false
      if (id != null) this.loadDetail(false)
    },
    choosePoint(point) {
      this.selectedTime = point.time
      this._pointChosen = true
    },
    async loadDetail(background) {
      if (!this.loggedIn || this.selectedId == null || (background && this.detailLoading)) return
      if (this._detailAbort) this._detailAbort.abort()
      this._detailAbort = new AbortController()
      const sequence = (this._detailSequence = (this._detailSequence || 0) + 1)
      const id = this.selectedId
      const context = this._context
      const auth = this.authVersion
      this.detailLoading = true
      this.detailError = null
      const valid = () =>
        this.current(context, auth) && sequence === this._detailSequence && id === this.selectedId
      try {
        const data = await getTyphoonDetail(id, { signal: this._detailAbort.signal })
        if (!valid()) return
        if (!data || !data.typhoon || !Array.isArray(data.observations))
          throw new Error('台风详情数据格式异常')
        const observations = ((data && data.observations) || [])
          .slice()
          .sort((a, b) => new Date(a.time) - new Date(b.time))
        this.detail = data ? { ...data, observations } : null
        if (data && data.typhoon)
          this.items = this.items.map((item) =>
            String(item.id) === String(id) ? { ...item, ...data.typhoon } : item
          )
        if (!this._pointChosen || !observations.some((point) => point.time === this.selectedTime))
          this.selectedTime = observations.length
            ? observations[observations.length - 1].time
            : null
      } catch (error) {
        if (valid() && !error.authChanged && !error.authHandled)
          this.detailError = {
            title: '台风详情获取失败',
            message: this.errorMessage(
              error,
              this.detail ? '当前展示上次成功获取的数据，请稍后重试。' : '请检查网络后重试。'
            )
          }
      } finally {
        if (valid()) this.detailLoading = false
      }
    }
  }
}
</script>

<style scoped>
.typhoon-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: calc(100vh - 130px);
  min-height: 600px;
  color: #30445d;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.page-heading h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}
.page-heading p {
  font-size: 13px;
  color: #8b98a8;
  margin: 9px 0 0;
}
.live-badge {
  font-size: 12px;
  color: #4e779b;
  border: 1px solid #d9e6f1;
  background: #f4f9ff;
  border-radius: 18px;
  padding: 8px 13px;
}
.live-badge i {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #409eff;
  border-radius: 50%;
  margin-right: 6px;
}
.typhoon-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 300px;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
.stale-banner {
  font-size: 12px;
  background: #fff7e6;
  color: #a87526;
  padding: 10px 14px;
  border-radius: 6px;
}
@media (max-width: 1200px) {
  .typhoon-layout {
    grid-template-columns: 210px minmax(300px, 1fr) 270px;
    gap: 10px;
  }
}
@media (max-width: 1000px) {
  .typhoon-page {
    height: auto;
  }
  .typhoon-layout {
    grid-template-columns: 200px minmax(0, 1fr);
  }
  .typhoon-layout > :last-child {
    grid-column: 1/-1;
    max-height: 500px;
  }
}
@media (max-width: 650px) {
  .typhoon-layout {
    display: flex;
    flex-direction: column;
  }
  .typhoon-layout > :first-child {
    max-height: 300px;
  }
  .live-badge {
    display: none;
  }
  .typhoon-layout > :nth-child(2) {
    min-height: 480px;
  }
}
</style>
