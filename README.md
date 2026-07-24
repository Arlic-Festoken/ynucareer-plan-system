# 向前 · 大学生生涯导航

可部署的隐私优先产品原型。它把“先认识自己”落实为任务、证据和复盘，而不是给学生一份无法解释的职业测评分数。

## 产品入口

- **低年级学生**：六步探索，将价值、专业场景、动机、愿景转为方向与探索行动。
- **高年级学生**：就业、推免、考研、考公路径；岗位诊断会解释能力差距，并生成按阶段安排的成长计划。
- **DeepSeek 个性化规划**：结合专业、兴趣、价值、能力自评、已有经历、现实限制和时间预算，先生成 3 个可比较的细分方向，再为选定方向生成 4–12 周行动计划并保存到任务中心。
- **研究生**：录入研究方向和成果，获得科研与职业准备并行的双线计划，以及成果到能力证据的映射。
- **教师端**：只展示明确标注的脱敏模拟样本，用于演示聚合筛选、资源需求和教学建议。

学生可注册账号、编辑个人资料并在不同设备继续任务与复盘。浏览器保留即时缓存，服务端使用 SQLite 按账号隔离持久化；短暂断网或快速刷新不会覆盖尚未同步的本地修改。

## 数据边界

本原型只收集登录邮箱、昵称以及用户主动填写的生涯资料，不收集学号、手机号、成绩、家庭信息或真实就业数据。密码使用带独立盐值的 scrypt 哈希，登录态使用 HttpOnly、SameSite 会话 Cookie；教师数据是独立的脱敏模拟样本。AI 辅导必须由学生主动点击，并且只发送界面中明确列出的最小字段。

不要将密钥写入仓库、前端代码、浏览器存储或日志。

## 本地开发

```bash
npm ci
npm run dev
```

浏览器访问 `http://127.0.0.1:5173/`。

AI 服务使用 DeepSeek V4 的 OpenAI 兼容接口和 JSON 输出模式。先在另一个终端运行以下命令，脚本会安全提示输入新的密钥，不会落盘：

```powershell
.\scripts\start-local-ai.ps1
```

前端会把 `/api/*` 代理到 `127.0.0.1:8787`。缺少密钥时，AI 卡片会明确降级，所有规则推荐与行动计划仍可使用。

服务端同时提供账号与规划能力边界：

- `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`：账号与会话。
- `GET|PATCH /api/me/profile`：当前账号个人资料。
- `GET|PUT /api/me/career-state`：按账号隔离的生涯状态同步。
- `POST /api/planning/directions`：生成 3 个细分方向、适配依据、现实取舍和首个验证实验。
- `POST /api/planning/actions`：围绕已选方向生成带周期、产出证据和复盘节点的个性化计划。
- `POST /api/coach`：针对当前单项任务继续拆解执行建议。

所有模型返回都在服务端进行结构、数量和长度校验；不完整 JSON、超时或供应商错误不会写入本地行动计划。

## 质量门禁

```bash
npm run check:server
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:visual
npm run build
npm audit --omit=dev
docker compose config --quiet
```

也可以使用 `npm run check:release` 一次执行应用层完整发布门禁。视觉审计会自动启动缺失的本地服务，检查桌面与手机关键页的控制台错误和水平溢出，并把截图写入被 Git 忽略的 `test-results/release-audit/`。

## 自管服务器部署

项目使用双容器：Nginx 负责静态文件、深链接回退、`/healthz` 和 `/api` 代理；Node API 提供账号、SQLite 数据库和 DeepSeek 代理。数据库文件位于 `career-data` 命名卷，容器重建后仍保留。

在受权限保护的部署环境中设置变量后再启动：

```bash
export DEEPSEEK_API_KEY='new-key-created-outside-chat'
export DEEPSEEK_MODEL='deepseek-v4-flash'
export COOKIE_SECURE='true'
docker compose up --build -d
curl http://127.0.0.1:8080/healthz
docker compose exec api wget -qO- http://127.0.0.1:8787/healthz
```

Windows 本机容器也可以使用安全输入脚本重建服务，密钥不会进入文件或命令历史：

```powershell
.\scripts\start-docker-ai.ps1 -Model deepseek-v4-flash
```

部署前请验证注册、登录、退出、个人资料、四个角色入口、任意深链接刷新、AI 降级状态、数据库卷重启持久化与 `/healthz`。生产站点必须使用 HTTPS，并设置 `COOKIE_SECURE=true`。

## 真实数据接入前

当前学生账号可用于产品原型和小范围受控试用；教师端仍是公开的脱敏演示入口，不是正式教职工后台。接入学号、真实学院统计或正式校级数据前，仍需补齐校内统一身份认证、教师角色授权、审计日志、密码找回、数据保留与删除流程、隐私告知和审批。规则引擎位于 `src/services/recommendation.ts`，账号及 AI 服务位于 `server/`，可独立替换为校内服务。
