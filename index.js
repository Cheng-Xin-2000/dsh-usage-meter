/**
 * Host half of dsh-usage-meter.
 *
 * Resolves DeepSeek and OpenCode Go credentials from the plugin config, the
 * Harness credential store, the process environment, and OpenCode's own auth
 * file — then serves one small JSON snapshot to the Web UI over a local route.
 * Secrets never leave the Host process.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const STATE_PATH = '/dsh-usage-meter/state'
const REFRESH_PATH = '/dsh-usage-meter/refresh'

const DEEPSEEK_DEFAULT_BASE = 'https://api.deepseek.com'
const OPENCODE_DEFAULT_BASE = 'https://opencode.ai'

export const inject = ['webServer']

export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)

  let cache = null
  let cachedAt = 0
  let pending = null

  async function readState(force) {
    const now = Date.now()
    if (!force && cache && now - cachedAt < config.refreshSeconds * 1000) {
      return cache
    }
    if (pending) return pending

    pending = (async () => {
      const [deepseek, opencode] = await Promise.all([readDeepseek(ctx, config), readOpencode(ctx, config)])
      const state = {
        ok: true,
        refreshSeconds: config.refreshSeconds,
        updatedAt: new Date().toISOString(),
        deepseek,
        opencode,
      }
      cache = state
      cachedAt = Date.now()
      return state
    })()

    try {
      return await pending
    } finally {
      pending = null
    }
  }

  function respond(res, statusCode, body) {
    res.statusCode = statusCode
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(body))
  }

  function handlerFor(force) {
    return async (req, res) => {
      try {
        respond(res, 200, await readState(force))
      } catch (error) {
        respond(res, 500, {
          ok: false,
          refreshSeconds: config.refreshSeconds,
          updatedAt: new Date().toISOString(),
          error: errorMessage(error),
        })
      }
    }
  }

  ctx.effect(() => {
    const offState = ctx.webServer.register({ kind: 'exact', path: STATE_PATH, handler: handlerFor(false) })
    const offRefresh = ctx.webServer.register({ kind: 'exact', path: REFRESH_PATH, handler: handlerFor(true) })
    return () => {
      offState()
      offRefresh()
    }
  })
}

/* ------------------------------------------------------------------ config */

function normalizeConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  return {
    deepseekApiKey: text(input.deepseekApiKey),
    deepseekBaseUrl: baseUrl(input.deepseekBaseUrl, DEEPSEEK_DEFAULT_BASE),
    opencodeApiKey: text(input.opencodeApiKey),
    opencodeBaseUrl: baseUrl(input.opencodeBaseUrl, OPENCODE_DEFAULT_BASE),
    opencodeAuthFile: text(input.opencodeAuthFile),
    refreshSeconds: integer(input.refreshSeconds, 60, 15, 3600),
    requestTimeoutMs: integer(input.requestTimeoutMs, 15000, 2000, 60000),
  }
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function baseUrl(value, fallback) {
  const candidate = text(value) || fallback
  return candidate.replace(/\/+$/, '')
}

function integer(value, fallback, min, max) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

/* ------------------------------------------------------------- credentials */

async function resolveSecret(ctx, explicit, ref) {
  if (explicit) return { value: explicit, source: 'config' }

  const credentials = ctx.get('credentials')
  if (credentials) {
    try {
      const resolved = await credentials.resolve(ref)
      if (resolved && typeof resolved.value === 'string' && resolved.value.trim()) {
        return { value: resolved.value.trim(), source: resolved.source || 'credentials' }
      }
    } catch {
      // A missing credential service entry is not an error; fall through.
    }
  }

  const ambient = process.env[ref]
  if (typeof ambient === 'string' && ambient.trim()) return { value: ambient.trim(), source: 'env' }
  return undefined
}

async function resolveOpencodeSecret(ctx, config) {
  const explicit = await resolveSecret(ctx, config.opencodeApiKey, 'OPENCODE_GO_API_KEY')
  if (explicit) return explicit
  const fromFile = await readOpencodeAuthKey(config.opencodeAuthFile)
  return fromFile ? { value: fromFile, source: 'opencode-auth' } : undefined
}

async function readOpencodeAuthKey(configuredPath) {
  const inline = process.env.OPENCODE_AUTH_CONTENT
  if (inline) {
    try {
      const key = pickOpencodeKey(JSON.parse(inline))
      if (key) return key
    } catch {
      // Ignore malformed inline content; the auth file is still tried.
    }
  }

  for (const file of authFileCandidates(configuredPath)) {
    try {
      const raw = await fs.readFile(file, 'utf8')
      const key = pickOpencodeKey(JSON.parse(raw))
      if (key) return key
    } catch {
      // Try the next candidate.
    }
  }
  return undefined
}

function pickOpencodeKey(root) {
  const entry = root && typeof root === 'object' ? root['opencode-go'] : undefined
  const key = typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? entry.key : undefined
  return typeof key === 'string' && key.trim() ? key.trim() : undefined
}

function authFileCandidates(configuredPath) {
  if (configuredPath) return [expandHome(configuredPath)]
  const candidates = []
  const dataHome = process.env.XDG_DATA_HOME
  if (dataHome) candidates.push(path.join(dataHome, 'opencode', 'auth.json'))
  candidates.push(path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json'))
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'opencode', 'auth.json'))
  return candidates
}

function expandHome(file) {
  if (file === '~') return os.homedir()
  if (file.startsWith('~/') || file.startsWith('~\\')) return path.join(os.homedir(), file.slice(2))
  return file
}

/* ---------------------------------------------------------------- DeepSeek */

async function readDeepseek(ctx, config) {
  const secret = await resolveSecret(ctx, config.deepseekApiKey, 'DEEPSEEK_API_KEY')
  if (secret) return readDeepseekApi(secret, config)

  const account = ctx.get('deepseekAccount')
  if (account) return readDeepseekAccount(account)
  return {
    status: 'unconfigured',
    message: '未找到 DEEPSEEK_API_KEY，也没有可用的 DeepSeek 登录账号',
  }
}

async function readDeepseekApi(secret, config) {
  let response
  try {
    response = await fetch(`${config.deepseekBaseUrl}/user/balance`, {
      headers: { authorization: `Bearer ${secret.value}`, accept: 'application/json' },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    })
  } catch (error) {
    return { status: 'error', message: requestFailure(error) }
  }

  const body = await response.text()
  const parsed = parseJson(body)
  if (!response.ok) {
    return {
      status: 'error',
      httpStatus: response.status,
      message: response.status === 401 ? 'DeepSeek API Key 无效或已过期（HTTP 401）' : apiFailure(response.status, parsed, body),
    }
  }

  const infos = Array.isArray(parsed?.balance_infos) ? parsed.balance_infos : []
  const info = infos.find((entry) => entry && entry.currency === 'CNY') || infos[0]
  if (!info) return { status: 'error', message: 'DeepSeek 响应中没有余额信息' }

  return {
    status: 'ok',
    source: secret.source,
    isAvailable: parsed?.is_available !== false,
    currency: typeof info.currency === 'string' ? info.currency : 'CNY',
    total: amount(info.total_balance),
    granted: amount(info.granted_balance),
    toppedUp: amount(info.topped_up_balance),
  }
}

async function readDeepseekAccount(account) {
  try {
    const view = await account.getState()
    if (!view || view.status !== 'credential-stored') {
      return { status: 'unconfigured', message: '未配置 DEEPSEEK_API_KEY，且未登录 DeepSeek 账号' }
    }

    const balance = await account.getBalance({
      version: '1.0.0',
      locale: 'zh-CN',
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    })
    if (!balance || balance.status !== 'ready') {
      return { status: 'error', message: 'DeepSeek 账号余额查询失败' }
    }

    const wallets = walletsOf(balance.value)
    const bonusWallets = walletsOf(balance.bonusWallets)
    if (wallets.length === 0 && bonusWallets.length === 0) {
      return { status: 'error', message: 'DeepSeek 账号没有返回钱包余额' }
    }
    return { status: 'ok', source: 'account', wallets, bonusWallets }
  } catch (error) {
    return { status: 'error', message: errorMessage(error) }
  }
}

function walletsOf(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((wallet) => wallet && typeof wallet === 'object')
    .map((wallet) => ({
      currency: typeof wallet.currency === 'string' ? wallet.currency : 'CNY',
      balance: amount(wallet.balance),
    }))
}

/* --------------------------------------------------------------- OpenCode */

async function readOpencode(ctx, config) {
  const secret = await resolveOpencodeSecret(ctx, config)
  if (!secret) {
    return {
      status: 'unconfigured',
      message: '未找到 OpenCode Go 密钥（配置、凭据库、OPENCODE_GO_API_KEY 或 auth.json）',
    }
  }

  let response
  try {
    response = await fetch(`${config.opencodeBaseUrl}/zen/go/v1/usage`, {
      headers: { authorization: `Bearer ${secret.value}`, accept: 'application/json' },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    })
  } catch (error) {
    return { status: 'error', message: requestFailure(error) }
  }

  const body = await response.text()
  const parsed = parseJson(body)
  if (!response.ok) {
    let message
    if (response.status === 401 || response.status === 403) {
      message = `OpenCode Go 密钥无效或没有套餐（HTTP ${response.status}）`
    } else if (response.status === 404) {
      message = 'OpenCode Go 用量接口不存在（HTTP 404）'
    } else {
      message = apiFailure(response.status, parsed, body)
    }
    return { status: 'error', httpStatus: response.status, message }
  }

  const usage = parsed?.usage
  if (!usage || !usage.rolling) {
    return { status: 'error', message: 'OpenCode Go 响应格式无法识别' }
  }
  return {
    status: 'ok',
    source: secret.source,
    windows: {
      rolling: opencodeWindow(usage.rolling),
      weekly: opencodeWindow(usage.weekly),
      monthly: opencodeWindow(usage.monthly),
    },
  }
}

function opencodeWindow(window) {
  if (!window || typeof window !== 'object') return null
  const percent = Number(window.percent)
  return {
    status: typeof window.status === 'string' ? window.status : 'ok',
    percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0,
    resetsAt: typeof window.resetsAt === 'string' ? window.resetsAt : null,
  }
}

/* ------------------------------------------------------------------ helpers */

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function amount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function apiFailure(status, parsed, body) {
  const message = parsed?.error?.message || parsed?.message
  if (typeof message === 'string' && message.trim()) return `${message.trim()}（HTTP ${status}）`
  const snippet = String(body || '').trim().slice(0, 160)
  return snippet ? `HTTP ${status}: ${snippet}` : `HTTP ${status}`
}

function requestFailure(error) {
  const name = error && error.name === 'TimeoutError' ? '请求超时' : '网络请求失败'
  return `${name}：${errorMessage(error)}`
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
