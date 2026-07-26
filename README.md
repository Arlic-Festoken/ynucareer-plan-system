# 向前 · 大学生生涯导航 v0.7.0

面向校内试点的成长行动与资源协同系统。平台不把一次自评包装成“岗位准备度”，而是支持一条可以被学生和教师共同完成的真实闭环：

> 发现资源 → 加入行动 → 确认报名 → 提交成果 → 匿名核验/退回 → 更新能力画像 → 形成匿名培养洞察

## v0.7.0 能做什么

### 学生工作区

- “今天最值得做的三件事”按退回修改、临近截止、进行中行动、能力缺口资源和普通计划确定性排序。
- 七维能力采用沟通协作、创新思维、专业技能、数字素养、责任担当、持续学习、心理韧性。
- 能力画像分开保存自评、核验证据分和当前画像；有证据的维度使用 `35% 自评 + 65% 核验证据`。
- 少于 2 条已核验证据为低可信，2–4 条为中可信；至少 5 条、覆盖两类来源且包含 180 天内证据时才是高可信。
- 校内资源支持收藏、确认报名、进行中、成果提交、退回补充、完成核验和撤回。打开外部报名页不会自动视为已报名。
- 成果只接收文字、反思和可选的 HTTPS 公开链接；本版本不上传简历、成绩单或二进制文件。
- 行动、进度、反思和成果以服务端为权威数据源，旧浏览器计划按稳定指纹迁移并保留完成状态。
- 通知在读取工作台时幂等生成：截止前 7/3/1 天、成果退回和核验完成；已加入资源可导出 `.ics` 日历。

### 教师与学院工作区

- 资源经过 `草稿 → 待审核 → 已发布 → 已关闭/已归档`；过期资源停止新加入，但既有参与者仍可提交成果。
- 三步资源发布抽屉要求官方来源、责任单位、适用范围、成果要求和关联能力维度。
- 成果队列默认使用匿名编号；教师按 0–4 级、1–3 权重核验，或填写具体意见退回补充。
- 漏斗采用累计口径：加入、确认报名、提交成果和完成核验不会因状态前进而倒退。
- 学院洞察样本少于 10 人时隐藏细分；当前版本不生成少于 30 人群体的个体位置或百分位。
- 成员权限为 `student`、`publisher`、`reviewer`、`career_admin`，资源和成果审核按组织范围校验；校级管理员可跨学院处理。

### AI 边界

- AI 不参与能力打分，也不能把自评升级为高可信结论。
- AI 只解释规则结果、提出候选方向并拆解行动；未绑定真实资源的任务会明确标记为“可自主完成”。
- 保存模型名、提示词版本、规则版本、生成时间和资源 ID，不保存模型内部推理。
- 缺少模型密钥时，规则计划、资源、行动、证据和教师反馈闭环仍可使用。

## 视觉与无障碍

界面采用暖米白、纸张白、深棕黑和陶土橙；蓝色只用于链接和系统操作。桌面端为自适应左侧栏，手机端为“工作台、行动、资源、我的”四项底部导航。

- 浅色/深色主题，跟随系统并可手动切换。
- 关键触控区域至少 44px。
- 可见焦点、跳转到主内容、语义化表单和键盘导航。
- 支持 `prefers-reduced-motion` 与 `prefers-reduced-transparency`。
- 视觉门禁覆盖 1440、1024、390、360、深色、减少动效和 200% 页面缩放。

## 本地开发

```bash
npm ci
npm run dev:api
npm run dev
```

前端默认访问 `http://127.0.0.1:5173/`，并将 `/api/*` 代理到 `127.0.0.1:8787`。

AI 服务可使用安全输入脚本启动，密钥不会写入文件：

```powershell
.\scripts\start-local-ai.ps1
```

## 账号、身份与试点邀请

开发环境默认开放注册；生产环境未显式配置时默认邀请制。参考 [.env.example](./.env.example)：

```dotenv
REGISTRATION_MODE=invite
CAREER_INVITED_EMAILS=student-a@ynu.edu.cn,student-b@ynu.edu.cn
CAREER_TEACHER_EMAILS=teacher-a@ynu.edu.cn
IDENTITY_PROVIDER=local
```

`CAREER_TEACHER_EMAILS` 仅用于旧试点账号的一次性兼容。项目预留 OIDC 参数，但在取得云南大学真实 issuer、client id 和角色映射前不会伪造统一身份认证。

## 核心 API

账号与旧版兼容：

- `POST /api/auth/register|login|logout`
- `GET /api/auth/session`
- `GET|PATCH /api/me/profile`
- `GET|PUT /api/me/career-state`
- `/api/teacher/*` 保留为一个版本的兼容别名

学生闭环：

- `GET /api/me/dashboard`
- `GET|PATCH /api/me/ability-profile`
- `GET|POST /api/me/actions`、`PATCH /api/me/actions/:id`
- `POST /api/me/evidence`
- `GET|PATCH /api/me/notifications`
- `GET /api/me/calendar.ics`
- `GET /api/opportunities`
- `POST /api/opportunities/:id/participation`

教师与学院：

- `GET|POST|PATCH /api/staff/opportunities`
- `POST /api/staff/opportunities/:id/submit|review|status`
- `GET /api/staff/evidence`
- `POST /api/staff/evidence/:id/review`
- `GET /api/staff/insights`

## 数据迁移与恢复

SQLite schema 当前版本为 8。首次升级旧数据库时，服务会在同目录创建：

```text
career.db.pre-schema-8.bak
```

备份使用 SQLite 一致性快照并通过 `integrity_check` 后才继续迁移。迁移保留账号、资料、旧规划状态和参与记录；旧技术能力字段只迁移为“待复核自评”，心理韧性使用中性值，不生成虚假证据。

生产升级前仍应在数据库副本上运行一次完整迁移演练，并保留独立的卷级备份。

## 质量门禁

```bash
npm run check:server
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:visual
npm run build
npm run audit
docker compose config --quiet
```

`npm run check:release` 会依次运行全部应用层门禁。Playwright 每次启动独立 API 进程、固定隔离端口和临时 SQLite 数据库，不复用本机 8787 服务。视觉审计使用另一组隔离端口，截图写入 `test-results/release-audit/`。

## 容器部署

```bash
export DEEPSEEK_API_KEY='created-outside-chat'
export DEEPSEEK_MODEL='deepseek-v4-flash'
export COOKIE_SECURE='true'
export REGISTRATION_MODE='invite'
export CAREER_INVITED_EMAILS='approved-student@ynu.edu.cn'
export CAREER_TEACHER_EMAILS='approved-teacher@ynu.edu.cn'
docker compose up --build -d
curl http://127.0.0.1:8080/healthz
docker compose exec api wget -qO- http://127.0.0.1:8787/healthz
```

健康接口返回 schema 版本、身份适配器、注册模式和工作流能力。数据库位于命名卷，必须验证容器重建后的数据持久化。

## 尚未伪装成“已完成”的外部依赖

- 云南大学统一身份认证与正式组织角色映射。
- 教务、课程、就业和活动系统的授权数据接口。
- 邮件/短信推送、文件上传、密码找回、正式数据保留与删除流程。
- 真实同群体百分位、自动岗位权重、LoRA 或校内模型部署。

在这些条件满足前，平台只声明为邀请制校内试点，不把示例或人工发布资源称为学校实时官方数据。
