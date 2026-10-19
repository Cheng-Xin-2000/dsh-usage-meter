# dsh-usage-meter

DeepSeek 余额 + OpenCode Go 额度，在 DSH（DeepSeek Harness）Web GUI 输入框下方常驻显示。

> A DSH Web GUI plugin that shows your DeepSeek balance and OpenCode Go quota windows under the composer.

```
● DeepSeek ¥14.46   ·   ● OpenCode Go 5h 0% · 周 0% · 月 0%
```

默认每 60 秒自动刷新；点击状态行展开详情，可查看 DeepSeek 赠送/充值明细、OpenCode Go 三档进度条与重置倒计时，并手动刷新。

## 功能

- **DeepSeek**：显示账户余额（CNY），展开后显示总额、赠送、充值；没有 API Key 时回退到已登录的 DeepSeek 桌面账号钱包。
- **OpenCode Go**：显示滚动 5 小时、本周、本月三档用量百分比；展开后显示进度条、百分比和重置倒计时。
- 状态异常时用状态点提示，悬停可看到具体原因。
- 密钥只在 Host 进程内使用，浏览器只拿到余额数字和百分比。
- 全部显示文案走 DSH locale（中文 / English），界面颜色使用主题 token，跟随明暗主题。

## 安装

需要 DSH Desktop / Web GUI（profile 中包含 `@deepseek-ai/dsh-web-app`）。

```bash
git clone https://github.com/Cheng-Xin-2000/dsh-usage-meter.git
```

然后在 DSH 中把克隆下来的目录安装为 bundle：让 agent 执行“把 `<克隆目录>` 作为 bundle 安装”（对应 Plugin Manager 的 `install_bundle`），或使用 Plugin Manager 的本地目录安装入口。

安装完成后输入框下方会出现状态行；如果当前页面没有立即出现，刷新一次页面。

## 凭据解析顺序

插件不需要配置即可工作，两个密钥按以下顺序查找：

1. 插件配置项 `deepseekApiKey` / `opencodeApiKey`
2. DSH 凭据库中的 `DEEPSEEK_API_KEY` / `OPENCODE_GO_API_KEY`（设置页保存的密钥）
3. 进程环境变量 `DEEPSEEK_API_KEY` / `OPENCODE_GO_API_KEY`
4. OpenCode 自己的 `auth.json` 中的 `opencode-go` 条目（`XDG_DATA_HOME`、`~/.local/share/opencode`、`%APPDATA%/opencode`）
5. DeepSeek 桌面账号钱包（仅在找不到 API Key 时回退）

## 配置

在 profile 的 `cordis.patch.yml` 里按 id 覆盖（`config` 会整体替换，未写字段使用默认值）：

```yaml
- id: usage-meter
  name: dsh-usage-meter
  config:
    refreshSeconds: 60        # 15–3600，前端轮询与 Host 缓存共用
    requestTimeoutMs: 15000   # 2000–60000
    # 可选：显式指定密钥，留空则自动查找
    deepseekApiKey: ''
    opencodeApiKey: ''
    # 可选：自定义接口地址（代理/镜像）
    deepseekBaseUrl: https://api.deepseek.com
    opencodeBaseUrl: https://opencode.ai
    # 可选：自定义 OpenCode auth.json 路径
    opencodeAuthFile: ''
```

## 工作原理

```
Host（Node）                                    Browser
  credentials / env / auth.json
        │
        ├── GET https://api.deepseek.com/user/balance
        └── GET https://opencode.ai/zen/go/v1/usage
        │
  60s 缓存 + 脱敏快照
        │
  GET /dsh-usage-meter/state      ←───────  fetch（同源，每 60s）
  GET /dsh-usage-meter/refresh    ←───────  手动刷新
        │
  client.js 注册到 conversation.composer.dock
```

- Host 半在 `apply()` 中注册两条本地 HTTP 路由，返回的 JSON 只含余额、百分比、重置时间和错误原因，不含密钥。
- Client 半通过 `ctx.slots.register` 渲染到 `conversation.composer.dock`，用 `ctx.locale` 注册中英文案。
- 依赖 DSH 内置的 `webServer` 服务；没有该服务的 profile 中插件会保持未激活。

## 接口

- `GET https://api.deepseek.com/user/balance`，`Authorization: Bearer <DEEPSEEK_API_KEY>`
- `GET https://opencode.ai/zen/go/v1/usage`，`Authorization: Bearer <OPENCODE_GO_API_KEY>`，返回 `usage.rolling/weekly/monthly` 的 `percent` 与 `resetsAt`

这两个接口由第三方维护，结构变化可能导致显示失败；插件会把 HTTP 状态和错误消息显示在详情里。

## 已知限制

- OpenCode Go 用量接口只返回百分比和重置时间，不提供金额明细。
- DeepSeek 余额接口需要有效的 API Key；如果既没有 Key、也没有登录桌面账号，会显示“未配置”。
- 没有做 historical 记录或图表，只显示当前快照。

## License

[MIT](./LICENSE)
