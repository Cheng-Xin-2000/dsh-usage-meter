window.__ModuleLoader__.load({
  id: 'dsh-usage-meter',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'usage-meter'
    const LOCALES = ['zh-CN', 'zh', 'en']

    const DICT = {
      en: {
        title: 'Balance & usage',
        deepseek: 'DeepSeek',
        opencode: 'OpenCode Go',
        rolling: '5h',
        weekly: 'Week',
        monthly: 'Month',
        weekShort: 'W',
        monthShort: 'M',
        total: 'Total',
        granted: 'Granted',
        toppedUp: 'Top-up',
        balance: 'Balance',
        bonus: 'Bonus',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        updatedAt: 'Updated',
        loading: 'Loading…',
        unavailable: 'Unavailable',
        unconfigured: 'Not configured',
        error: 'Error',
        soon: 'now',
        resetSuffix: 'left',
        noData: 'No data available',
      },
      'zh-CN': {
        title: '余额与额度',
        deepseek: 'DeepSeek',
        opencode: 'OpenCode Go',
        rolling: '5 小时',
        weekly: '本周',
        monthly: '本月',
        weekShort: '周',
        monthShort: '月',
        total: '总额',
        granted: '赠送',
        toppedUp: '充值',
        balance: '余额',
        bonus: '赠送',
        refresh: '刷新',
        refreshing: '刷新中…',
        updatedAt: '更新于',
        loading: '加载中…',
        unavailable: '不可用',
        unconfigured: '未配置',
        error: '错误',
        soon: '即将',
        resetSuffix: '后重置',
        noData: '暂无数据',
      },
    }
    DICT.zh = DICT['zh-CN']

    const SYMBOLS = { CNY: '¥', USD: '$' }

    const css = {
      root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        fontSize: 11,
        lineHeight: '16px',
        color: 'var(--dsw-alias-label-secondary)',
      },
      trigger: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        padding: '1px 8px',
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        lineHeight: '16px',
        cursor: 'pointer',
      },
      group: { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
      label: { color: 'var(--dsw-alias-label-secondary)' },
      value: {
        color: 'var(--dsw-alias-label-primary)',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      },
      dot: { width: 6, height: 6, borderRadius: 999, flex: '0 0 auto' },
      separator: { opacity: 0.4 },
      panel: {
        width: '100%',
        maxWidth: 620,
        marginTop: 6,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1)',
        textAlign: 'left',
      },
      panelHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      },
      panelTitle: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
      refresh: {
        padding: '1px 8px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        lineHeight: '18px',
        cursor: 'pointer',
      },
      section: { display: 'flex', flexDirection: 'column', gap: 6 },
      sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary)',
      },
      muted: { color: 'var(--dsw-alias-label-secondary)' },
      errorText: { color: 'var(--dsw-alias-state-error-primary)', overflowWrap: 'anywhere' },
      kvRow: { display: 'flex', flexWrap: 'wrap', gap: '4px 18px' },
      kv: { display: 'inline-flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' },
      windowRow: {
        display: 'grid',
        gridTemplateColumns: '52px minmax(50px, 1fr) 44px minmax(64px, auto)',
        alignItems: 'center',
        gap: 8,
        fontVariantNumeric: 'tabular-nums',
      },
      track: {
        height: 4,
        borderRadius: 999,
        background: 'var(--dsw-alias-bg-layer-2)',
        overflow: 'hidden',
      },
      divider: { height: 1, background: 'var(--dsw-alias-border-l1)' },
    }

    function localeText(locale) {
      return DICT[locale] || DICT.en
    }

    function percentText(percent) {
      const value = Number(percent)
      return Number.isFinite(value) ? Math.round(value) + '%' : '—'
    }

    function money(currency, amount) {
      if (amount == null || amount === '') return '—'
      const symbol = SYMBOLS[currency]
      return (symbol || (currency ? currency + ' ' : '')) + String(amount)
    }

    function percentColor(percent) {
      const value = Number(percent)
      if (value >= 90) return 'var(--dsw-alias-state-error-primary)'
      if (value >= 70) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-brand-primary)'
    }

    function statusDotColor(status) {
      if (status === 'ok') return 'var(--dsw-alias-state-success-primary)'
      if (status === 'error') return 'var(--dsw-alias-state-error-primary)'
      return 'var(--dsw-alias-state-idle-primary)'
    }

    function relativeReset(iso, tr) {
      const target = Date.parse(iso)
      if (!Number.isFinite(target)) return '—'
      const diff = target - Date.now()
      if (diff <= 0) return tr('soon')
      const minutes = Math.ceil(diff / 60000)
      if (minutes < 60) return minutes + 'm'
      const hours = Math.floor(minutes / 60)
      const restMinutes = minutes % 60
      if (hours < 24) return hours + 'h' + (restMinutes ? ' ' + restMinutes + 'm' : '')
      const days = Math.floor(hours / 24)
      const restHours = hours % 24
      return days + 'd' + (restHours ? ' ' + restHours + 'h' : '')
    }

    function absoluteTime(iso) {
      const value = Date.parse(iso)
      return Number.isFinite(value) ? new Date(value).toLocaleString() : ''
    }

    function clockTime(iso) {
      const value = Date.parse(iso)
      return Number.isFinite(value) ? new Date(value).toLocaleTimeString() : ''
    }

    function shortDeepseek(deepseek, tr) {
      if (!deepseek) return tr('loading')
      if (deepseek.status === 'unconfigured') return tr('unconfigured')
      if (deepseek.status !== 'ok') return tr('unavailable')
      if (Array.isArray(deepseek.wallets) && deepseek.wallets.length > 0) {
        return deepseek.wallets.map((wallet) => money(wallet.currency, wallet.balance)).join(' / ')
      }
      if (deepseek.total != null) return money(deepseek.currency, deepseek.total)
      return '—'
    }

    function shortOpencode(opencode, tr) {
      if (!opencode) return tr('loading')
      if (opencode.status === 'unconfigured') return tr('unconfigured')
      if (opencode.status !== 'ok') return tr('unavailable')
      const windows = opencode.windows || {}
      const parts = []
      if (windows.rolling) parts.push('5h ' + percentText(windows.rolling.percent))
      if (windows.weekly) parts.push(tr('weekShort') + ' ' + percentText(windows.weekly.percent))
      if (windows.monthly) parts.push(tr('monthShort') + ' ' + percentText(windows.monthly.percent))
      return parts.length > 0 ? parts.join(' · ') : '—'
    }

    function createComponent(ctx) {
      let translate = null
      try {
        translate = ctx.locale.bind(NS)
      } catch {
        translate = null
      }

      return function UsageMeter() {
        const [data, setData] = React.useState(null)
        const [failure, setFailure] = React.useState(null)
        const [open, setOpen] = React.useState(false)
        const [busy, setBusy] = React.useState(false)
        const [, bump] = React.useState(0)

        const refreshSeconds =
          data && Number.isFinite(data.refreshSeconds) ? data.refreshSeconds : 60

        const tr = (key) => {
          try {
            if (translate) {
              const text = translate(key)
              if (typeof text === 'string' && text !== key) return text
            }
          } catch {
            // Fall through to the built-in dictionary.
          }
          return localeText('zh-CN')[key] || key
        }

        const load = React.useCallback(async (force) => {
          if (force) setBusy(true)
          try {
            const response = await fetch(
              force ? '/dsh-usage-meter/refresh' : '/dsh-usage-meter/state',
              { cache: 'no-store' },
            )
            if (!response.ok) throw new Error('HTTP ' + response.status)
            const payload = await response.json()
            setData(payload)
            setFailure(payload && payload.ok === false ? payload.error || tr('error') : null)
          } catch (error) {
            setFailure(error && error.message ? error.message : String(error))
          } finally {
            if (force) setBusy(false)
          }
        }, [])

        React.useEffect(() => {
          load(false)
        }, [load])

        React.useEffect(() => {
          const timer = setInterval(() => load(false), Math.max(30, refreshSeconds) * 1000)
          return () => clearInterval(timer)
        }, [load, refreshSeconds])

        React.useEffect(() => {
          try {
            return ctx.locale.subscribe(() => bump((value) => value + 1))
          } catch {
            return undefined
          }
        }, [])

        const deepseek = data && data.deepseek ? data.deepseek : null
        const opencode = data && data.opencode ? data.opencode : null

        const details = open
          ? h(
              'div',
              { style: css.panel },
              h(
                'div',
                { style: css.panelHeader },
                h('span', { style: css.panelTitle }, tr('title')),
                h(
                  'span',
                  { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } },
                  h(
                    'span',
                    { style: css.muted },
                    data && data.updatedAt
                      ? tr('updatedAt') + ' ' + clockTime(data.updatedAt)
                      : '',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      onClick: () => load(true),
                      disabled: busy,
                      style: css.refresh,
                    },
                    busy ? tr('refreshing') : tr('refresh'),
                  ),
                ),
              ),
              failure ? h('div', { style: css.errorText }, failure) : null,
              renderDeepseek(deepseek, tr),
              h('div', { style: css.divider }),
              renderOpencode(opencode, tr),
            )
          : null

        const reasons = []
        if (deepseek && deepseek.status !== 'ok' && deepseek.message) reasons.push(deepseek.message)
        if (opencode && opencode.status !== 'ok' && opencode.message) reasons.push(opencode.message)

        return h(
          'div',
          { style: css.root },
          h(
            'button',
            {
              type: 'button',
              onClick: () => setOpen((value) => !value),
              'aria-expanded': open,
              title: reasons.length > 0 ? reasons.join('\n') : tr('title'),
              style: css.trigger,
            },
            h(
              'span',
              { style: css.group },
              dot(deepseek ? deepseek.status : null),
              h('span', { style: css.label }, tr('deepseek')),
              h('strong', { style: css.value }, shortDeepseek(deepseek, tr)),
            ),
            h('span', { style: css.separator }, '·'),
            h(
              'span',
              { style: css.group },
              dot(opencode ? opencode.status : null),
              h('span', { style: css.label }, tr('opencode')),
              h('strong', { style: css.value }, shortOpencode(opencode, tr)),
            ),
          ),
          details,
        )
      }
    }

    function dot(status) {
      return h('span', {
        style: { ...css.dot, background: statusDotColor(status) },
      })
    }

    function renderDeepseek(deepseek, tr) {
      if (!deepseek) return h('div', { style: css.muted }, tr('loading'))

      const header = h(
        'div',
        { style: css.sectionHeader },
        h('span', null, tr('deepseek')),
        badge(deepseek.status, tr),
      )

      if (deepseek.status !== 'ok') {
        const text = deepseek.message || (deepseek.status === 'unconfigured' ? tr('unconfigured') : tr('noData'))
        return h(
          'div',
          { style: css.section },
          header,
          h(
            'div',
            { style: deepseek.status === 'error' ? css.errorText : css.muted },
            text,
          ),
        )
      }

      const rows = []
      if (Array.isArray(deepseek.wallets) && deepseek.wallets.length > 0) {
        for (const wallet of deepseek.wallets) {
          rows.push(kv(tr('balance'), money(wallet.currency, wallet.balance)))
        }
        for (const wallet of deepseek.bonusWallets || []) {
          rows.push(kv(tr('bonus'), money(wallet.currency, wallet.balance)))
        }
      } else {
        if (deepseek.total != null) rows.push(kv(tr('total'), money(deepseek.currency, deepseek.total)))
        if (deepseek.granted != null) rows.push(kv(tr('granted'), money(deepseek.currency, deepseek.granted)))
        if (deepseek.toppedUp != null) rows.push(kv(tr('toppedUp'), money(deepseek.currency, deepseek.toppedUp)))
      }

      return h(
        'div',
        { style: css.section },
        header,
        h('div', { style: css.kvRow }, rows),
      )
    }

    function renderOpencode(opencode, tr) {
      if (!opencode) return h('div', { style: css.muted }, tr('loading'))

      const header = h(
        'div',
        { style: css.sectionHeader },
        h('span', null, tr('opencode')),
        badge(opencode.status, tr),
      )

      if (opencode.status !== 'ok') {
        const text =
          opencode.message || (opencode.status === 'unconfigured' ? tr('unconfigured') : tr('noData'))
        return h(
          'div',
          { style: css.section },
          header,
          h(
            'div',
            { style: opencode.status === 'error' ? css.errorText : css.muted },
            text,
          ),
        )
      }

      const windows = opencode.windows || {}
      const rows = [
        ['rolling', windows.rolling],
        ['weekly', windows.weekly],
        ['monthly', windows.monthly],
      ].filter((entry) => entry[1])

      if (rows.length === 0) {
        return h('div', { style: css.section }, header, h('div', { style: css.muted }, tr('noData')))
      }

      return h(
        'div',
        { style: css.section },
        header,
        h(
          'div',
          { style: { display: 'grid', gap: 6 } },
          rows.map(([key, window]) =>
            h(
              'div',
              { key, style: css.windowRow },
              h('span', { style: css.muted }, tr(key)),
              h(
                'div',
                { style: css.track },
                h('div', {
                  style: {
                    width: Math.max(0, Math.min(100, Number(window.percent) || 0)) + '%',
                    height: '100%',
                    borderRadius: 999,
                    background: percentColor(window.percent),
                  },
                }),
              ),
              h('span', { style: { textAlign: 'right', color: 'var(--dsw-alias-label-primary)' } }, percentText(window.percent)),
              h(
                'span',
                {
                  style: { textAlign: 'right', color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' },
                  title: absoluteTime(window.resetsAt),
                },
                window.status && window.status !== 'ok'
                  ? window.status
                  : relativeReset(window.resetsAt, tr) + ' ' + tr('resetSuffix'),
              ),
            ),
          ),
        ),
      )
    }

    function badge(status, tr) {
      if (status === 'ok') return null
      return h(
        'span',
        {
          style: {
            fontSize: 10,
            color:
              status === 'error'
                ? 'var(--dsw-alias-state-error-primary)'
                : 'var(--dsw-alias-state-idle-primary)',
          },
        },
        status === 'error' ? tr('error') : tr('unconfigured'),
      )
    }

    function kv(label, value) {
      return h(
        'span',
        { style: css.kv },
        h('span', { style: css.muted }, label),
        h('span', { style: css.value }, value),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const disposers = []
          for (const locale of LOCALES) {
            try {
              disposers.push(ctx.locale.register(NS, locale, localeText(locale)))
            } catch {
              // A locale may already be registered by a reload; keep the rest.
            }
          }
          return () => {
            for (const dispose of disposers) {
              try {
                dispose()
              } catch {
                // Disposal is best effort.
              }
            }
          }
        })

        const UsageMeter = createComponent(ctx)

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'usage-meter', order: 20 },
            UsageMeter,
          ),
        )
      },
    }
  },
})
