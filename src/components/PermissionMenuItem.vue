<template>
  <el-submenu v-if="node.children.length" :index="'group:' + node.uuid">
    <template slot="title">
      <i :class="node.icon || 'el-icon-menu'"></i><span>{{ node.menuName }}</span>
    </template>
    <el-menu-item v-if="node.webUrl" :index="node.webUrl">概览</el-menu-item>
    <permission-menu-item v-for="child in node.children" :key="child.uuid" :node="child" />
  </el-submenu>
  <el-menu-item v-else :index="node.webUrl">
    <i :class="node.icon || 'el-icon-menu'"></i><span slot="title">{{ node.menuName }}</span>
  </el-menu-item>
</template>

<script>
export default {
  name: 'PermissionMenuItem',
  props: { node: { type: Object, required: true } }
}
</script>
