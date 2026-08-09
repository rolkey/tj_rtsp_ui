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
| New RTSP pages | `src/views/` (new dir), `src/api/` (new module) | Planned, not yet implemented |

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

- **No RTSP code exists yet.** README says "唐境：rtsp前端" but src/ is stock RuoYi. RTSP features are planned.
- **Single git commit** (583784c). Working tree has only line-ending diffs (CRLF↔LF) — source is identical to upstream.
- **No CI/CD**, no Docker config in this repo. Backend sibling `tj_rtsp/` has docker-compose (MySQL dev DB).
- **jsencrypt.js** contains a hardcoded RSA private key in the frontend — the login encryption is security theater.
- Backend URL (`localhost:88` in vite.config.js) differs from backend AGENTS.md port (80). Verify which is correct for your setup.
- **pnpm 11.x `allowBuilds`**: `pnpm-workspace.yaml` must set `@parcel/watcher`, `esbuild`, `vue-demi` to `true` or pnpm blocks their build scripts. If `pnpm dev` fails with `ERR_PNPM_IGNORED_BUILDS`, verify these are set.
- **pnpm strict mode**: packages imported directly in source (e.g. `sortablejs`) must be listed as direct dependencies in `package.json`, even if transitively available via another dep. npm/yarn would hoist these but pnpm won't.
- Upstream: [RuoYi-Vue](https://gitee.com/y_project/RuoYi-Vue), v3.9.2
