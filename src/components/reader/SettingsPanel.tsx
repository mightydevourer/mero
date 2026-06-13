import { DEFAULT_SETTINGS, useStore } from '../../store/useStore'
import type { PageMode, ThemeName } from '../../types'
import { LANGUAGE_NAMES, clamp } from '../../lib/format'
import { CloseIcon } from '../Icons'

const FONTS = [
  { label: 'Serif', value: 'var(--font-serif)' },
  { label: 'Sans', value: 'var(--font-sans)' },
  { label: 'Mono', value: 'var(--font-mono)' },
]

const THEMES: { key: ThemeName; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'sepia', label: 'Sepia' },
  { key: 'dark', label: 'Dark' },
]

const PAGE_MODES: { key: PageMode; label: string }[] = [
  { key: 'scroll', label: 'Scroll' },
  { key: 'paged', label: 'Paged' },
]

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="panel" aria-label="Reading settings">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Reading</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="panel-section">
          <label>Theme</label>
          <div className="theme-row">
            {THEMES.map((t) => (
              <button
                key={t.key}
                className={'theme-btn' + (settings.theme === t.key ? ' active' : '')}
                onClick={() => update({ theme: t.key })}
              >
                <span className={`chip-preview tp-${t.key}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <label>Typeface</label>
          <div className="segmented">
            {FONTS.map((f) => (
              <button
                key={f.value}
                className={'seg-btn' + (settings.fontFamily === f.value ? ' active' : '')}
                onClick={() => update({ fontFamily: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <label>
            Font size <span className="value">{settings.fontSize}px</span>
          </label>
          <div className="stepper">
            <button
              className="icon-btn"
              aria-label="Smaller"
              onClick={() => update({ fontSize: clamp(settings.fontSize - 1, 13, 30) })}
            >
              A−
            </button>
            <input
              type="range"
              min={13}
              max={30}
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
            />
            <button
              className="icon-btn"
              aria-label="Larger"
              onClick={() => update({ fontSize: clamp(settings.fontSize + 1, 13, 30) })}
            >
              A+
            </button>
          </div>
        </div>

        <div className="panel-section">
          <label>
            Line spacing <span className="value">{settings.lineHeight.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={1.2}
            max={2.2}
            step={0.05}
            value={settings.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          />
        </div>

        <div className="panel-section">
          <label>
            Reading width <span className="value">{settings.contentWidth}px</span>
          </label>
          <input
            type="range"
            min={440}
            max={900}
            step={20}
            value={settings.contentWidth}
            onChange={(e) => update({ contentWidth: Number(e.target.value) })}
          />
        </div>

        <div className="panel-section">
          <label>Page turn</label>
          <div className="segmented">
            {PAGE_MODES.map((m) => (
              <button
                key={m.key}
                className={'seg-btn' + (settings.pageMode === m.key ? ' active' : '')}
                onClick={() => update({ pageMode: m.key })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="toggle-row">
            <span>Justify text</span>
            <button
              className={'switch' + (settings.justify ? ' on' : '')}
              aria-pressed={settings.justify}
              aria-label="Justify text"
              onClick={() => update({ justify: !settings.justify })}
            />
          </div>
        </div>

        <div className="panel-section">
          <label>Translate into</label>
          <select
            className="select"
            value={settings.targetLanguage}
            onChange={(e) => update({ targetLanguage: e.target.value })}
          >
            {Object.entries(LANGUAGE_NAMES)
              .filter(([k]) => k !== 'auto')
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </div>

        <div className="panel-section">
          <button className="btn" style={{ width: '100%' }} onClick={() => update(DEFAULT_SETTINGS)}>
            Reset to defaults
          </button>
        </div>
      </aside>
    </>
  )
}
