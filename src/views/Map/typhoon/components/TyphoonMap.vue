<!-- 管理台风地图实例、实况预报风圈图层及适配视野和资源释放。 -->
<template>
  <section class="typhoon-map">
    <div ref="canvas" class="map-surface" />
    <div class="toolbar">
      <div class="switches">
        <el-checkbox v-model="enabled.observed" @change="draw">实况路径</el-checkbox>
        <el-checkbox v-model="enabled.forecast" :disabled="!hasForecast" @change="draw">
          预报路径
        </el-checkbox>
        <el-checkbox v-model="enabled.wind" :disabled="!hasWind" @change="draw">风圈</el-checkbox>
      </div>
      <el-button size="small" icon="el-icon-full-screen" :disabled="!ready || !detail" @click="fit">
        适配视野
      </el-button>
    </div>
    <div class="legend">
      <span>
        <i class="observed" />
        实况路径
      </span>
      <span>
        <i class="forecast" />
        预报路径
      </span>
      <span>
        <i class="wind" />
        7 / 10 / 12 级风圈
      </span>
    </div>
    <div v-if="error || !ready" class="map-message">
      <MapFeedback v-if="error" :error="error" retry @retry="initialize" />
      <span v-else>正在加载地图…</span>
    </div>
    <div v-if="ready && !detail" class="map-hint">
      {{ loading ? '正在加载台风数据…' : '选择活跃台风查看路径' }}
    </div>
  </section>
</template>
<script>
import { loadAMap } from '@/utils/map/common/amapLoader'
import { createTyphoonLayers } from '@/utils/map/typhoon/typhoonLayers'
import { windCirclePaths } from '@/utils/map/typhoon/typhoonGeometry'
import MapFeedback from '@/views/Map/common/components/MapFeedback.vue'
export default {
  name: 'TyphoonMap',
  components: { MapFeedback },
  props: {
    detail: Object,
    point: Object,
    selectionId: [String, Number],
    sessionKey: [String, Number],
    loading: Boolean
  },
  data() {
    return {
      ready: false,
      error: '',
      enabled: {
        observed: true,
        forecast: true,
        wind: true
      }
    }
  },
  computed: {
    hasForecast() {
      return !!(this.detail && this.detail.forecast && (this.detail.forecast.points || []).length)
    },
    hasWind() {
      return !!(
        this.point &&
        (this.point.windCircles || []).some((circle) => windCirclePaths(this.point, circle).length)
      )
    }
  },
  watch: {
    detail() {
      this.scheduleDraw()
    },
    point() {
      this.scheduleDraw()
    },
    selectionId() {
      this._fitId = null
      this.clearLayers()
      this.scheduleDraw()
    },
    sessionKey() {
      this.initialize()
    }
  },
  mounted() {
    this.initialize()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    cleanup() {
      this._sequence = (this._sequence || 0) + 1
      if (this._abort) this._abort.abort()
      this.clearLayers()
      if (this._map) this._map.destroy()
      this._map = null
      this._AMap = null
      this.ready = false
    },
    clearLayers() {
      if (this._layers) this._layers.destroy()
      this._layers = null
    },
    scheduleDraw() {
      if (this._drawScheduled) return
      this._drawScheduled = true
      this.$nextTick(() => {
        this._drawScheduled = false
        if (this._isDestroyed || !this._map) return
        this.draw()
        if (this.detail && this._fitId !== this.selectionId) {
          this.fit()
          this._fitId = this.selectionId
        }
      })
    },
    async initialize() {
      this.cleanup()
      this.error = ''
      const sequence = this._sequence
      this._abort = new AbortController()
      try {
        const AMap = await loadAMap({ signal: this._abort.signal })
        if (sequence !== this._sequence || this._isDestroyed) return
        this._AMap = AMap
        this._map = new AMap.Map(this.$refs.canvas, {
          center: [125, 24],
          zoom: 4,
          isHotspot: false
        })
        this.ready = true
        this.draw()
        this.fit()
        this._fitId = this.detail ? this.selectionId : null
      } catch (error) {
        if (
          sequence === this._sequence &&
          !this._isDestroyed &&
          !error.authChanged &&
          !error.authHandled
        ) {
          const message = error.response && error.response.data && error.response.data.msg
          this.error = {
            title: '地图暂时无法加载',
            message:
              typeof message === 'string' && message.trim() && message.length <= 240
                ? message
                : '请检查网络或地图配置后重试。'
          }
        }
      }
    },
    draw() {
      this.clearLayers()
      if (!this._map || !this.detail) return
      this._layers = createTyphoonLayers(
        this._AMap,
        this._map,
        this.detail,
        this.point,
        this.enabled,
        (point) => this.$emit('select-point', point)
      )
    },
    fit() {
      if (this._map && this._layers && this._layers.overlays.length)
        this._map.setFitView(this._layers.overlays, false, [80, 45, 65, 45], 8)
    }
  }
}
</script>
<style scoped>
.typhoon-map {
  position: relative;
  border: 1px solid #e6ebf1;
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
  min-height: 500px;
  background: #eaf1f7;
}
.map-surface {
  position: absolute;
  inset: 0;
}
.toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}
.toolbar > * {
  pointer-events: auto;
}
.switches {
  background: white;
  border-radius: 7px;
  padding: 11px 14px;
  box-shadow: 0 2px 12px #24456818;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.switches .el-checkbox {
  margin: 0;
}
.switches ::v-deep .el-checkbox__label {
  font-size: 12px;
  padding-left: 5px;
}
.legend {
  position: absolute;
  bottom: 20px;
  left: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  background: #fffffff0;
  padding: 12px;
  border-radius: 7px;
  font-size: 11px;
  color: #62778d;
  pointer-events: none;
}
.legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend i {
  display: inline-block;
  width: 18px;
  border-top: 3px solid #287bd0;
}
.legend .forecast {
  border-top: 3px dashed #e59b31;
}
.legend .wind {
  width: 12px;
  height: 12px;
  border: 1px solid #6bb4e8;
  background: #6bb4e830;
  border-radius: 50%;
}
.map-message {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: min(320px, 85%);
  font-size: 13px;
  color: #76899d;
  text-align: center;
}
.map-hint {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translateX(-50%);
  background: #fffffff0;
  border-radius: 8px;
  padding: 15px 20px;
  color: #8495a7;
  font-size: 13px;
  white-space: nowrap;
}
</style>
