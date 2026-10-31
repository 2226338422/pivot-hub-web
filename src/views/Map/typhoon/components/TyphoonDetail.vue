<!-- 展示选中台风实况、四象限风圈、预报点与真实数据来源时间。 -->
<template>
  <aside class="typhoon-detail">
    <div class="heading">
      <span class="eyebrow">台风详情</span>
      <h3>{{ detail && detail.typhoon ? detail.typhoon.name || '未命名台风' : '选择台风' }}</h3>
      <span v-if="detail && detail.typhoon" class="number">{{ detail.typhoon.number || '—' }}</span>
    </div>
    <MapFeedback :error="error" retry :busy="loading" @retry="$emit('retry')" />
    <div v-if="loading && !detail" class="empty">正在获取台风详情…</div>
    <el-empty v-else-if="!detail && !error" description="选择左侧台风查看详情" :image-size="70" />
    <template v-if="detail">
      <div v-if="detail.stale" class="stale">上游更新暂不可用，当前展示最近一次真实数据。</div>
      <div class="section">
        <div class="section-title">
          所选实况
          <el-tag size="mini" :style="{ color: levelColor(point && point.level) }">
            {{ (point && point.level) || '—' }}
          </el-tag>
        </div>
        <p class="time">{{ formatTime(point && point.time) }}</p>
        <div class="metrics">
          <div>
            <span>中心风速</span>
            <strong>{{ formatValue(point && point.windSpeed, 'm/s') }}</strong>
          </div>
          <div>
            <span>中心气压</span>
            <strong>{{ formatValue(point && point.pressure, 'hPa') }}</strong>
          </div>
          <div>
            <span>移动速度</span>
            <strong>{{ formatValue(point && point.moveSpeed, 'km/h') }}</strong>
          </div>
          <div>
            <span>移动方向</span>
            <strong>{{ formatValue(point && point.moveDirection) }}</strong>
          </div>
        </div>
        <div class="coordinates">
          经度 {{ formatValue(point && point.longitude, '°') }}
          <br />
          纬度 {{ formatValue(point && point.latitude, '°') }}
          <span>WGS84 原始坐标</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">
          风圈半径
          <small>km</small>
        </div>
        <div v-if="!circles.length" class="muted">所选实况暂无风圈数据</div>
        <table v-else>
          <thead>
            <tr>
              <th>等级</th>
              <th>东北</th>
              <th>东南</th>
              <th>西南</th>
              <th>西北</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="circle in circles" :key="circle.level">
              <td>{{ circle.level }}级</td>
              <td>{{ formatValue(circle.northeast) }}</td>
              <td>{{ formatValue(circle.southeast) }}</td>
              <td>{{ formatValue(circle.southwest) }}</td>
              <td>{{ formatValue(circle.northwest) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">预报路径</div>
        <template v-if="forecast && forecast.points && forecast.points.length">
          <div class="muted">{{ forecast.agency || '预报机构未提供' }}</div>
          <p v-if="forecast.issuedAt" class="time">发布 {{ formatTime(forecast.issuedAt) }}</p>
          <p v-if="forecast.updatedAt" class="time">更新 {{ formatTime(forecast.updatedAt) }}</p>
          <div class="forecast-scroll">
            <table>
              <thead>
                <tr>
                  <th>预报时间</th>
                  <th>强度</th>
                  <th>风速 m/s</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in forecast.points" :key="index">
                  <td>{{ formatTime(item.time) }}</td>
                  <td>{{ formatValue(item.level) }}</td>
                  <td>{{ formatValue(item.windSpeed) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="muted">暂无预报数据</div>
      </div>
      <div class="section source">
        <div>
          数据来源：
          <a v-if="sourceLink" :href="sourceLink" target="_blank" rel="noopener noreferrer">
            {{ detail.source || '来源链接' }}
          </a>
          <span v-else>{{ detail.source || '—' }}</span>
        </div>
        <div v-if="detail.sourceUpdatedAt">源更新：{{ formatTime(detail.sourceUpdatedAt) }}</div>
        <div v-if="detail.fetchedAt">获取时间：{{ formatTime(detail.fetchedAt) }}</div>
        <p>预报仅供参考，请以官方气象部门最新发布为准。</p>
      </div>
    </template>
  </aside>
</template>
<script>
import MapFeedback from '@/views/Map/common/components/MapFeedback.vue'
import { formatTime, formatValue, levelColor } from '@/utils/map/typhoon/typhoonFormat'
export default {
  name: 'TyphoonDetail',
  components: { MapFeedback },
  props: { detail: Object, point: Object, loading: Boolean, error: [Object, String] },
  computed: {
    circles() {
      return (this.point && this.point.windCircles) || []
    },
    forecast() {
      return this.detail && this.detail.forecast
    },
    sourceLink() {
      const url = this.detail && this.detail.sourceUrl
      return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : ''
    }
  },
  methods: { formatTime, formatValue, levelColor }
}
</script>
<style scoped>
.typhoon-detail {
  background: white;
  border: 1px solid #e6ebf1;
  border-radius: 10px;
  overflow: auto;
  min-height: 0;
  color: #3d5066;
}
.heading {
  padding: 20px;
  border-bottom: 1px solid #edf0f5;
  position: relative;
}
.eyebrow {
  font-size: 12px;
  color: #8c99a8;
}
.heading h3 {
  margin: 10px 0 0;
  font-size: 23px;
  color: #253b55;
}
.number {
  position: absolute;
  right: 20px;
  bottom: 24px;
  font-size: 12px;
  color: #8c99a8;
}
.section {
  padding: 18px;
  border-bottom: 1px solid #edf0f5;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
  color: #30445d;
  margin-bottom: 12px;
}
.section-title small {
  font-size: 11px;
  font-weight: 400;
  color: #909aa8;
}
.time,
.muted {
  font-size: 12px;
  color: #8c99a8;
  line-height: 1.7;
}
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 12px;
  margin-top: 18px;
}
.metrics span {
  display: block;
  color: #8c99a8;
  font-size: 12px;
  margin-bottom: 8px;
}
.metrics strong {
  font-size: 16px;
  font-weight: 500;
}
.coordinates {
  font-size: 12px;
  line-height: 1.9;
  background: #f6f8fb;
  padding: 10px;
  margin-top: 18px;
  border-radius: 6px;
}
.coordinates span {
  display: block;
  color: #9aa6b4;
  font-size: 11px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  text-align: left;
}
th {
  color: #8c99a8;
  font-weight: 400;
  background: #f6f8fb;
}
td,
th {
  padding: 9px 4px;
  border-bottom: 1px solid #edf0f5;
}
.forecast-scroll {
  max-height: 230px;
  overflow: auto;
}
.source {
  font-size: 11px;
  color: #8c99a8;
  line-height: 1.9;
}
.source a {
  color: #409eff;
}
.source p {
  margin-bottom: 0;
}
.stale {
  margin: 12px;
  padding: 10px;
  background: #fff7e6;
  font-size: 12px;
  color: #a87526;
  line-height: 1.6;
}
.empty {
  padding: 30px;
  text-align: center;
  color: #8c99a8;
  font-size: 13px;
}
.map-feedback {
  margin: 12px;
}
</style>
