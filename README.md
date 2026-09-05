# PivotHub Web

枢集管理系统前端（Vue 2 + Element UI）

## 技术栈

- Vue 2.6.14（Options API）
- Element UI 2.15.14
- Vue Router 3.5.1
- Vuex 3.6.2 + vuex-persistedstate
- Axios（含 Token 自动刷新拦截器）
- ECharts 6

## 项目结构

```
src/
├── api/system/          # 系统管理模块 API（user / role / menu / auth）
├── assets/              # 静态资源
├── components/
│   └── SystemLayout.vue # 系统后台布局（侧边栏 + 顶栏 + 内容区）
├── router/
│   └── index.js         # 路由配置（含登录守卫）
├── store/
│   ├── modules/
│   │   ├── common.js    # 全局 Token / Role 状态（持久化）
│   │   └── system.js    # 系统状态（菜单树 / 用户信息）
│   └── index.js
├── utils/
│   └── request.js       # Axios 封装（含 40301/40302 Token 自动刷新）
└── views/
    ├── LoginView.vue    # 登录页
    └── System/
        ├── ManageUser.vue   # 用户管理（CRUD + 分页）
        ├── ManageRole.vue   # 角色管理（CRUD + 菜单分配）
        └── ManageMenu.vue   # 菜单管理（树形表格 + 新增/编辑/删除）
```

## 快速开始

```bash
# 安装依赖（已执行）
npm install

# 开发环境启动（默认端口 8080）
npm run serve

# 生产构建
npm run build
```

## 环境配置

编辑 `.env.development` 修改后端地址：

```bash
VUE_APP_BASE_API=http://localhost:8080   # Gateway 地址
VUE_APP_PREFIX_API=/api                  # 代理路径前缀
```

## 与后端对接说明

当前后端 `/system/user`、`/system/role`、`/system/menu` 接口已就绪，可直接联调。

**待后端补充的接口：**
- `POST /system/auth/login` — 管理员登录（返回 accessToken / refreshToken）
- `POST /system/auth/logout` — 退出登录
- `GET /system/auth/current` — 获取当前用户信息
- `GET /system/menu/tree/{userId}` — 获取菜单树（用于动态渲染侧边栏）

后端 Gateway 默认端口 **8080**，System 服务端口 **8081**（经 Gateway 统一转发）。

## 开发规范

- 严格使用 Options API，禁止 Composition API
- API 文件放在 `src/api/`，按模块分目录
- 组件命名 PascalCase，与文件名一致
- Vuex 模块必须 `namespaced: true`
- 统一使用 `request.js` 发请求，错误在拦截器处理
