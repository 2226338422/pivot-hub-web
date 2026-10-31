<!-- 展示活跃台风列表、更新状态和可重试的加载反馈。 -->
<template>
  <aside class="typhoon-list">
    <div class="panel-heading">
      <div>
        <h3>活跃台风</h3>
        <span>{{ items.length }} 个正在关注</span>
      </div>
      <el-button
        icon="el-icon-refresh"
        circle
        size="mini"
        :loading="loading"
        aria-label="刷新台风列表"
        @click="$emit('refresh')"
      />
    </div>
    <MapFeedback :error="error" retry :busy="loading" @retry="$emit('refresh')" />
    <div v-if="loading && !items.length" class="empty">正在获取活跃台风…</div>
    <el-empty v-else-if="!items.length && !error" description="当前暂无活跃台风" :image-size="75" />
    <div class="list-scroll">
      <button
        v-for="item in items"
        :key="item.id"
        class="typhoon-item"
        :class="{ selected: String(item.id) === String(selectedId) }"
        :aria-pressed="String(item.id) === String(selectedId)"
        @click="$emit('select', item.id)"
      >
        <div class="item-top">
          <strong>{{ item.name || '未命名台风' }}</strong>
          <span>{{ item.number || '—' }}</span>
        </div>
        <div class="item-info">
          <span :style="{ color: levelColor(item.level) }">{{ item.level || '强度未提供' }}</span>
          <span>{{ item.basin || '海域未提供' }}</span>
        </div>
        <div class="item-time">{{ formatTime(item.observedAt) }}</div>
      </button>
    </div>
    <div class="list-note">
      每分钟更新本地服务数据
      <br />
      点击地图实况点查看当时详情
    </div>
  </aside>
</template>
<script>
import MapFeedback from '@/views/Map/common/components/MapFeedback.vue'
import { formatTime, levelColor } from '@/utils/map/typhoon/typhoonFormat'
export default {
  name: 'TyphoonList',
  components: { MapFeedback },
  props: {
    items: { type: Array, default: () => [] },
    selectedId: [String, Number],
    loading: Boolean,
    error: [Object, String]
  },
  methods: { formatTime, levelColor }
}
</script>
<style scoped>
.typhoon-list {
  display: flex;
  flex-direction: column;
  background: white;
  min-height: 0;
  border: 1px solid #e6ebf1;
  border-radius: 10px;
  overflow: hidden;
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid #edf0f5;
}
.panel-heading h3 {
  font-size: 16px;
  margin: 0 0 8px;
  color: #253b55;
}
.panel-heading span,
.list-note {
  font-size: 12px;
  color: #909aa8;
}
.list-scroll {
  overflow: auto;
  flex: 1;
  padding: 10px;
}
.typhoon-item {
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  padding: 15px 12px;
  cursor: pointer;
  margin-bottom: 10px;
  color: #3d5066;
}
.typhoon-item:hover {
  background: #f7faff;
}
.typhoon-item.selected {
  border-color: #409eff;
  background: #eff7ff;
  box-shadow: inset 3px 0 #409eff;
}
.item-top,
.item-info {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.item-top strong {
  font-size: 16px;
}
.item-top span {
  font-size: 12px;
  color: #8493a4;
}
.item-info {
  font-size: 12px;
  margin: 13px 0;
}
.item-time {
  font-size: 11px;
  color: #8c99a8;
}
.list-note {
  padding: 16px;
  border-top: 1px solid #edf0f5;
  line-height: 1.9;
}
.empty {
  padding: 35px 15px;
  font-size: 13px;
  color: #8c99a8;
}
.map-feedback {
  margin: 10px;
}
</style>
