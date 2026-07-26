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
`/career/api`。发布包只包含生产构建、服务端和生产依赖清单，上传后执行：

```bash
sudo bash deploy-release.sh /tmp/career-navigation-release.tar.gz 20260726-120000-v0.7.0
```

脚本会先安装生产依赖并创建 SQLite 一致性备份，再原子切换 `current`。
服务健康检查、schema 版本或 Nginx 校验失败时会自动恢复上一版本。
