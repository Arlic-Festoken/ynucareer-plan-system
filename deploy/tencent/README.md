# 腾讯云部署

生产入口使用独立主机名 `career.139-199-69-46.sslip.io`，不占用服务器现有站点路径。

- 应用目录：`/opt/career-navigation`
- API 服务：`career-navigation.service`
- 内部端口：`127.0.0.1:8795`
- SQLite：`/opt/career-navigation/shared/career.db`
- Nginx：`/etc/nginx/conf.d/career-navigation.conf`

每次发布创建新的 `releases/<timestamp>`，验证后原子切换 `current`。回滚时将
`current` 指向上一版本，然后重启 `career-navigation.service` 并重载 Nginx。
DeepSeek 密钥只允许写入服务器上的 `/etc/career-navigation.env`，权限必须为
`0600`，不得进入发布包或仓库。

## 发布约定

前端必须使用 `/career/` 作为基础路径，并将 API 基础地址设置为
`/career/api`。使用仓库内已固定这两个值的腾讯云构建命令，禁止直接打包
默认根路径构建：

```bash
npm run build:tencent
```

发布包只包含生产构建、服务端和生产依赖清单，上传后执行：

```bash
sudo bash deploy-release.sh /tmp/career-navigation-release.tar.gz 20260726-120000-v0.7.0
```

脚本会验证发布包中的 Linux/Node 20 生产依赖；未预打包依赖时才在服务器
安装。脚本也会拒绝不是按 `/career/` 子路径构建的前端。随后创建 SQLite
一致性备份并原子切换 `current`。服务健康检查、schema 版本或 Nginx 校验
失败时会自动恢复上一版本。

## 邀请试点学生

不在聊天、命令行或配置文件中预设学生密码。管理员只把测试邮箱加入邀请
名单，由学生在注册页自行设置密码：

```bash
sudo bash invite-student.sh pilot-student@example.edu.cn
```

脚本会备份运行时环境文件、保持 `0600` 权限、重启 API 并验证 schema 8
和邀请制注册状态；验证失败时自动恢复原配置。
