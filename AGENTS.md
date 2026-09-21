# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-09
**Commit:** 583784c
**Branch:** main

## OVERVIEW

唐境 RTSP 前端 — Vue 3 admin SPA based on RuoYi-Vue 3.9.2. Plain JS (no TS), Element Plus + Pinia + vue-router. Backend is a Spring Boot app proxied at `/dev-api` → `http://localhost:88`.

## STRUCTURE

```
./
├── src/
│   ├── api/            # Backend API wrappers (login, menu, system/, monitor/, tool/)
│   ├── assets/         # SCSS styles, SVG icons (icons/svg/), images
│   ├── components/     # Shared Vue components (Pagination, DictTag, Editor, FileUpload, ...)
│   ├── directive/      # v-hasRole, v-hasPermi, v-copyText
│   ├── layout/         # Admin shell: Sidebar, Navbar, TagsView, AppMain, Settings
│   ├── plugins/        # Global $auth, $cache, $download, $modal, $tab
│   ├── router/         # constantRoutes + dynamicRoutes (backend-driven)
│   ├── store/          # Pinia: user, permission, app, settings, tagsView, dict, lock
│   ├── utils/          # request.js (axios), auth.js, dict.js, ruoyi.js, generator/
│   ├── views/          # Pages: system/, monitor/, tool/, error/, login, index, lock
│   ├── main.js         # Bootstrap: createApp → router/store/plugins/directives/ElementPlus
│   ├── App.vue          # Bare <router-view /> + theme init
│   ├── permission.js    # Router guard: token → user info → dynamic routes → permissions
│   └── settings.js      # Layout defaults (theme, navType, tagsView, ...)
├── vite/plugins/        # Vite plugin composition (out of vite.config.js)
├── bin/                 # Windows .bat launchers (NOTE: use yarn, but project uses pnpm)
├── .env.{development,production,staging}  # VITE_APP_BASE_API, VITE_APP_TITLE, VITE_BUILD_COMPRESS
└── vite.config.js       # Aliases (@→src, ~→root), port 80, proxy /dev-api→:88, custom output layout
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Bootstrap chain | `index.html` → `src/main.js` → `src/App.vue` | Single entry |
| Routing & auth guard | `src/router/index.js`, `src/permission.js` | Dynamic routes from backend |
| API calls | `src/api/`, `src/utils/request.js` | All HTTP goes through request.js |
| Layout shell | `src/layout/index.vue`, `src/layout/components/` | Sidebar/Navbar/TagsView/AppMain |
| State management | `src/store/modules/` | Pinia: user, permission, app, settings, dict, tagsView, lock |
| Permissions | `src/directive/permission/`, `src/store/modules/permission.js` | v-hasPermi, v-hasRole |
| Commands | `src/plugins/` | $auth, $cache, $download, $modal, $tab |
| UI config | `src/settings.js` | sideTheme, navType, tagsView, fixedHeader |
| Env vars | `.env.*` | VITE_APP_TITLE, VITE_APP_BASE_API, VITE_BUILD_COMPRESS |
| Vite plugins | `vite/plugins/` | auto-import, svg-icons, compression, setup-extend |
| New RTSP pages | `src/views/rtsp/` + `src/api/rtsp/` | 见下方 "RTSP FEATURES & OPERATION FLOW" |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `request` | Axios instance | `src/utils/request.js` | Central HTTP client, Bearer token, error mapping |
| `constantRoutes` | Route array | `src/router/index.js` | Always-present routes (login, index, 404, lock, profile) |
| `dynamicRoutes` | Route array | `src/router/index.js` | Permission-gated routes added at runtime |
| `useUserStore` | Pinia store | `src/store/modules/user.js` | Token, user info, roles, permissions, login/logout |
| `usePermissionStore` | Pinia store | `src/store/modules/permission.js` | `generateRoutes()` builds accessible route tree |
| `useSettingsStore` | Pinia store | `src/store/modules/settings.js` | Theme, layout toggles |
| `useDict` | Composable | `src/utils/dict.js` | Dictionary labels (auto-imported globally) |
| `getToken` / `setToken` | Util | `src/utils/auth.js` | Cookie-based JWT management |
| `Layout` | Component | `src/layout/index.vue` | Admin shell wrapper |
| `isRelogin` | Export | `src/utils/request.js` | Re-login guard flag |

## RTSP FEATURES & OPERATION FLOW

RTSP 监控子系统前端 — 4 个页面（`src/views/rtsp/`）+ 4 个 API 模块（`src/api/rtsp/`），全部由后端 `sys_menu` 菜单数据驱动路由（无需手动编辑 `router/index.js`）。

### 页面概览

| 页面 | 路径 | API 模块 | 权限前缀 | 性质 |
|------|------|----------|----------|------|
| 监控仪表盘 | `views/rtsp/dashboard/index.vue` | `api/rtsp/dashboard.js` | `rtsp:dashboard:view` | 只读，默认首页 |
| 设备管理 | `views/rtsp/camera/index.vue` | `api/rtsp/camera.js` | `rtsp:camera:*` | CRUD |
| 人脸记录 | `views/rtsp/face/index.vue` | `api/rtsp/face.js` | `rtsp:face:*` | 查询 + 手动推送 |
| 录像回放 | `views/rtsp/record/index.vue` | `api/rtsp/record.js` | `rtsp:record:*` | 只读查询 |

### 各页面功能与操作流程

#### 1. 监控仪表盘（`dashboard/index.vue`）
**功能**: 4 统计卡片 + ECharts 上传趋势图 + 最近上传列表 + 摄像头维度统计表

**操作流程**:
1. 登录后进入仪表盘（后端菜单设为默认首页 `is_cache=1`）
2. 挂载时并行调用 `summary` / `uploadTrend` / `recent` / `cameraStats` 四个接口
3. 统计卡片每 30 秒自动刷新（`setInterval`）
4. 点击"最近上传"列表缩略图 → 弹窗查看大图
5. 点击"摄像头统计"某行 → 跳转人脸记录页并自动按该摄像头筛选（`query` 参数传递）

**接口映射**: `/rtsp/dashboard/summary`、`/upload-trend?days=7`、`/recent?limit=20`、`/camera-stats`

#### 2. 设备管理（`camera/index.vue`）
**功能**: 摄像头 CRUD + 启停用 + 导出（参考 `views/system/notice/index.vue` 模式）

**操作流程**:
1. 搜索区筛选（设备名称 / 监控点标识 / 设备编码 / 状态）
2. 表格列：名称、监控点标识、设备编码、安装位置、RTSP URL、状态 Tag、最近上传时间、累计上传次数、创建时间、操作
3. 新增 / 编辑：弹窗表单（含 RTSP 基础 URL、流 URL 模板字段）
4. 删除：`$modal.confirm` 二次确认，支持批量
5. 启用 / 停用：状态开关（`changeStatus`）
6. 导出：`download('rtsp/camera/export', ...)`

**接口映射**: `/rtsp/camera/list`、`/{id}`、`POST/PUT /rtsp/camera`、`DELETE /{ids}`、`/export`

#### 3. 人脸记录（`face/index.vue`）— 核心页面
**功能**: 人脸图片查询 + **手动推送（单条/批量）** + 推送日志查看 + 图片预览

**操作流程**:
1. 搜索区筛选：监控点标识/设备编码（模糊）、上传状态、**推送状态**、时间范围
2. 表格列：复选框、摄像头名称（关联查询）、人脸缩略图、全景缩略图、上传状态 Tag、**推送状态 Tag**、最近推送时间、推送重试次数、失败原因（tooltip）、操作
3. 点击缩略图 → 弹窗并排查看人脸图 + 全景图
4. **批量推送**：勾选多条 → 工具栏"批量推送"按钮（对 `push_status IN ('2','3')` 记录，`v-hasPermi="['rtsp:face:push']"`）
5. **单条推送**：行内按钮（仅 `push_status=2 或 3` 显示），二次确认
6. **推送日志**：行内按钮 → 弹窗展示 `rtsp_push_log` 表内容
7. 删除：二次确认，同时删文件 + DB 记录

**推送状态 Tag 颜色**: `0`待推送=灰、`1`已推送=绿、`2`失败=红、`3`放弃推送=橙

**接口映射**: `/rtsp/face/list`、`/push/{ids}`、`/pushLog/{id}`、`/image/{id}/{type}`、`DELETE /{ids}`

#### 4. 录像回放（`record/index.vue`）
**功能**: 录像片段查询（纯只读）

**操作流程**:
1. 搜索区筛选：监控点标识、时间范围
2. 表格列：监控点标识、开始时间、结束时间、片段大小（格式化 MB）、锁定类型、RTSP URL、操作
3. 复制 RTSP URL（`v-clipboard` + `el-tooltip`）
4. 查看详情弹窗

**接口映射**: `/rtsp/record/list`

### 路由说明

- 采用**后端菜单驱动**（标准 RuoYi 模式）：后端 `sys_menu` 表 `component` 字段设为 `rtsp/dashboard/index` 等，前端 `permission.js` → `permission store` → `import.meta.glob('./../../views/**/*.vue')` 自动解析
- `dynamicRoutes` **无需新增**（RTSP 页面均由后端 menu 数据驱动，非 `constantRoutes`/`dynamicRoutes` 静态声明）
- 图片缩略图通过 `GET /rtsp/face/image/{imageId}/{type}` 加载（`type`: `face` / `scene`），建议懒加载 + HTTP 缓存头

## CONVENTIONS

**File naming:**
- API modules: `lowerCamelCase.js` (`login.js`, `jobLog.js`)
- View pages: lowercase dir + `index.vue` (`system/menu/index.vue`), sub-views lowercase (`resetPwd.vue`, `authUser.vue`)
- Shared components: `PascalCase/` dirs (`Pagination/`, `RightToolbar/`)
- Store modules: single-word `.js` files (`user.js`, `dict.js`), exported as `useXxxStore`

**Vue components:**
- `<script setup name="PascalCase">` (via `unplugin-vue-setup-extend-plus`)
- Views use `reactive({ form, queryParams, rules })` + `const { ... } = toRefs(data)` pattern
- `const { proxy } = getCurrentInstance()` for accessing `proxy.$modal`, `proxy.handleTree`, etc.
- Dicts: `useDict("sys_show_hide", "sys_normal_disable")` with snake_case type keys

**Imports (top → bottom):**
1. Third-party libs
2. Project styles (scss)
3. `@/` aliased imports (no `.vue` extension needed)
4. Relative imports

**API modules:** named exports only. Pattern: `export function listMenu(query) { return request({ url: '/system/menu/list', method: 'get', params: query }) }`

**Permissions:** `v-hasPermi="['system:menu:add']"`, `v-hasRole="['admin']"`. Route meta uses `permissions: [...], roles: [...], hidden: true`.

**Auto-imported globals (NO import needed):** `ref`, `computed`, `watch`, `onMounted`, `nextTick`, `reactive`, `toRefs`, `useDict`, `selectDictLabel`, `useXxxStore()`. See `vite/plugins/auto-import.js`.

**Comments:** All source comments in Chinese.

## ANTI-PATTERNS

- **NEVER** create ad-hoc axios instances — all HTTP must route through `src/utils/request.js`
- **NEVER** add `eslint-disable` (only existing override: `max-len` in generator/html.js)
- **NEVER** add `debugger`, `console.log` debug leftovers, `@ts-ignore`
- **NEVER** hardcode secrets in frontend (jsencrypt.js private key is an existing violation, not a pattern to repeat)
- **NEVER** hardcode backend URLs — use env vars (`VITE_APP_BASE_API`)
- Generated code from `src/utils/generator/` MUST replace TODO stubs before shipping
- External links MUST be prefixed with `http(s)://`
- Backend encrypted ciphertext MUST NOT be returned to the frontend (changelog at `src/views/index.vue:957`)

## UNIQUE STYLES

- **No lint/format/test tooling** — no ESLint, Prettier, Stylelint, or test framework
- **Dev server on port 80** (requires root), auto-open browser
- **Proxy**: `/dev-api` → `http://localhost:88` with path rewrite; `/v3/api-docs/*` → same target (springdoc)
- **Build output**: `static/js/[name]-[hash].js`, `static/[ext]/[name]-[hash].[ext]` (not default `assets/`)
- **Alias** `~` → project root (in addition to `@` → `./src`)
- **SVG icons**: registered via `vite-plugin-svg-icons`, used as `<svg-icon icon-class="name" />`. Icons in `src/assets/icons/svg/`.
- **Inline PostCSS plugin** strips `@charset` rules (vite/plugins/index.js)
- **gzip/brotli compression** on build, controlled by `VITE_BUILD_COMPRESS` env (default `gzip` in prod/staging)
- **Package manager**: pnpm (`pnpm-lock.yaml`). Legacy `bin/*.bat` scripts use yarn — ignore them, use pnpm.
- **SCSS dark mode**: `html.dark` CSS variables; theme vars in `variables.module.scss` exported via `:export` for JS

## COMMANDS

```bash
pnpm install              # Install deps (bin/*.bat uses yarn, ignore)
pnpm dev                  # Dev server on port 80, proxied to :88 backend
pnpm build:prod           # Production build → dist/ (gzip, no sourcemaps)
pnpm build:stage          # Staging build (--mode staging, VITE_APP_BASE_API=/stage-api)
pnpm preview              # Preview production build
```

## NOTES

- **RTSP 功能规划**: 4 页面（仪表盘/设备/人脸/录像）+ 4 API 模块，功能与操作流程见 "RTSP FEATURES & OPERATION FLOW" 章节。`src/` 目前仍是 stock RuoYi，RTSP 页面待实现。
- **Single git commit** (583784c). Working tree has only line-ending diffs (CRLF↔LF) — source is identical to upstream.
- **No CI/CD**, no Docker config in this repo. Backend sibling `tj_rtsp/` has docker-compose (MySQL dev DB).
- **jsencrypt.js** contains a hardcoded RSA private key in the frontend — the login encryption is security theater.
- Backend URL (`localhost:88` in vite.config.js) differs from backend AGENTS.md port (80). Verify which is correct for your setup.
- **pnpm 11.x `allowBuilds`**: `pnpm-workspace.yaml` must set `@parcel/watcher`, `esbuild`, `vue-demi` to `true` or pnpm blocks their build scripts. If `pnpm dev` fails with `ERR_PNPM_IGNORED_BUILDS`, verify these are set.
- **pnpm strict mode**: packages imported directly in source (e.g. `sortablejs`) must be listed as direct dependencies in `package.json`, even if transitively available via another dep. npm/yarn would hoist these but pnpm won't.
- Upstream: [RuoYi-Vue](https://gitee.com/y_project/RuoYi-Vue), v3.9.2
