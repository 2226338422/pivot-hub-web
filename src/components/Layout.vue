<template>
  <div class="system-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
      <div class="logo">
        <span class="logo-letter">P</span>
        <span class="logo-text" v-if="!isCollapsed">PivotHub</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :router="true"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        class="sidebar-menu"
      >
        <permission-menu-item v-for="node in menuTree" :key="node.uuid" :node="node" />
      </el-menu>
    </aside>

    <!-- 主内容区 -->
    <div class="main-container">
      <header class="header">
        <el-button
          type="text"
          icon="el-icon-d-arrow-left"
          class="collapse-btn"
          @click="isCollapsed = !isCollapsed"
        />
        <span class="page-title">{{ pageTitle }}</span>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <img v-if="avatarUrl" :src="avatarUrl" class="user-avatar" alt="" />
              <span v-else class="user-avatar-fallback">{{ avatarLetter }}</span>
              {{ currentUserName }}
              <i class="el-icon-arrow-down"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import PermissionMenuItem from './PermissionMenuItem.vue'
import { fileUrl } from '@/utils/fileUrl'

export default {
  name: 'Layout',
  components: { PermissionMenuItem },
  data() {
    return {
      isCollapsed: false,
      avatarUrl: ''
    }
  },
  computed: {
    activeMenu() {
      return this.$route.path
    },
    pageTitle() {
      return this.$route.meta.title || '系统管理'
    },
    currentUserName() {
      const user = this.$store.state.system.userInfo || {}
      return user.nickname || user.email || '用户'
    },
    avatarLetter() {
      const user = this.$store.state.system.userInfo || {}
      return (user.nickname || user.email || 'U').charAt(0).toUpperCase()
    },
    avatarFileId() {
      const user = this.$store.state.system.userInfo || {}
      return user.avatarFileId || ''
    },
    menuTree() {
      return this.$store.state.system.menuTree
    }
  },
  watch: {
    avatarFileId: {
      immediate: true,
      async handler(id) {
        this.avatarUrl = id ? await fileUrl(id) : ''
      }
    }
  },
  methods: {
    async handleCommand(cmd) {
      if (cmd === 'profile') {
        this.$router.push('/profile')
      } else if (cmd === 'logout') {
        await this.$store.dispatch('common/logout')
        await this.$router.replace('/login')
      }
    }
  }
}
</script>

<style scoped>
.system-layout {
  display: flex;
  height: 100vh;
  width: 100%;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 210px;
  min-width: 210px;
  background: #304156;
  transition: width 0.3s;
  overflow: hidden;
  overflow-y: auto;
}

.sidebar-collapsed {
  width: 64px;
  min-width: 64px;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #263445;
  gap: 8px;
}

.logo-letter {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #409eff, #337ecc);
  border-radius: 6px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  border: none;
}

/* ========== 主区域 ========== */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
}

.collapse-btn {
  font-size: 18px;
  color: #606266;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-fallback {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f0f2f5;
}
</style>
