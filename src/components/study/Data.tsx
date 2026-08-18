import { useRef, useState, type ChangeEvent } from 'react'
import { useStudyStore } from '../../store/useStudyStore'
import { downloadTextFile } from '../../lib/download'
import {
  backupCounts,
  backupFilename,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupError,
  type StudyBackup,
} from '../../services/backup'
import { useToast } from '../../lib/toast'
import { useI18n, type StringKey } from '../../i18n'
import { DownloadIcon, TrashIcon } from '../Icons'
import { Field, Modal } from './ui'

const ERROR_KEY: Record<BackupError, StringKey> = {
  invalidJson: 'data.errInvalidJson',
  notMeroBackup: 'data.errNotMeroBackup',
  unsupportedVersion: 'data.errUnsupportedVersion',
  malformed: 'data.errMalformed',
  empty: 'data.errEmpty',
}

export default function Data() {
  const { t, tn } = useI18n()
  const exportData = useStudyStore((s) => s.exportData)
  const replaceData = useStudyStore((s) => s.replaceData)
  const clearData = useStudyStore((s) => s.clearData)
  // Subscribed so the "stored now" line re-renders after an import or clear.
  const students = useStudyStore((s) => s.students)
  const courses = useStudyStore((s) => s.courses)
  const lectures = useStudyStore((s) => s.lectures)
  const tasks = useStudyStore((s) => s.tasks)
  const exams = useStudyStore((s) => s.exams)
  const showToast = useToast((s) => s.show)

  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<StudyBackup | null>(null)
  // Held as a key, not a resolved string: an error already on screen must
  // follow a language switch instead of freezing in the old language.
  const [importError, setImportError] = useState<StringKey | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearWord, setClearWord] = useState('')

  const stored = {
    students: students.length,
    courses: courses.length,
    lectures: lectures.length,
    tasks: tasks.length,
    exams: exams.length,
  }
  const isEmpty = Object.values(stored).every((n) => n === 0)

  /**
   * Inflect each count before it goes into a sentence. Interpolating bare
   * numbers gave "1 profiles" in English, and in Arabic ignored the dual and
   * the 3-10 / 11-99 distinctions entirely.
   */
  const phrases = (c: typeof stored) => ({
    students: tn('count.profile', c.students),
    courses: tn('count.course', c.courses),
    lectures: tn('count.lecture', c.lectures),
    tasks: tn('count.task', c.tasks),
    exams: tn('count.exam', c.exams),
  })

  const doExport = () => {
    const backup = buildBackup(exportData())
    downloadTextFile(backupFilename(), serializeBackup(backup), 'application/json')
    showToast(t('data.exportDone'))
  }

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset immediately so picking the same file twice still fires onChange.
    e.target.value = ''
    if (!file) return

    setImportError(null)
    let text: string
    try {
      text = await file.text()
    } catch {
      setImportError('data.errRead')
      return
    }

    const result = parseBackup(text)
    if (!result.ok) {
      setImportError(ERROR_KEY[result.reason])
      return
    }
    setPending(result.backup)
  }

  const confirmImport = () => {
    if (!pending) return
    replaceData(pending.data)
    setPending(null)
    showToast(t('data.importDone'))
  }

  const confirmClear = () => {
    clearData()
    setClearOpen(false)
    setClearWord('')
    showToast(t('data.clearDone'))
  }

  const clearWordRequired = t('data.clearWord')

  return (
    <div className="study-page">
      <div className="page-head">
        <h1>{t('data.title')}</h1>
        <p>{t('data.subtitle')}</p>
      </div>

      <p className="data-summary">{t('data.storedNow', phrases(stored))}</p>

      <div className="data-cards">
        <section className="data-card">
          <h2>{t('data.exportTitle')}</h2>
          <p>{t('data.exportBody')}</p>
          <div className="data-actions">
            <button className="btn btn-primary" onClick={doExport} disabled={isEmpty}>
              <DownloadIcon /> {t('data.exportButton')}
            </button>
            {isEmpty && <span className="data-note">{t('data.exportEmpty')}</span>}
          </div>
        </section>

        <section className="data-card">
          <h2>{t('data.importTitle')}</h2>
          <p>{t('data.importBody')}</p>
          <div className="data-actions">
            <button className="btn" onClick={() => fileInput.current?.click()}>
              {t('data.importButton')}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={onFileChosen}
            />
          </div>
          {importError && <p className="form-error">{t(importError)}</p>}
        </section>
      </div>

      <section className="data-card danger">
        <span className="danger-label">{t('data.dangerZone')}</span>
        <h2>{t('data.clearTitle')}</h2>
        <p>{t('data.clearBody')}</p>
        <div className="data-actions">
          <button
            className="btn btn-danger"
            onClick={() => {
              setClearWord('')
              setClearOpen(true)
            }}
            disabled={isEmpty}
          >
            <TrashIcon /> {t('data.clearButton')}
          </button>
        </div>
      </section>

      {pending && (
        <Modal title={t('data.importConfirmTitle')} onClose={() => setPending(null)}>
          <div className="form">
            <p className="muted-copy">
              {t('data.importSummary', phrases(backupCounts(pending.data)))}
            </p>
            <div className="notice notice-warn">
              <p>{t('data.importReplaceWarning')}</p>
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setPending(null)}>
                {t('form.cancel')}
              </button>
              <button className="btn btn-danger" onClick={confirmImport}>
                {t('data.importConfirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {clearOpen && (
        <Modal title={t('data.clearConfirmTitle')} onClose={() => setClearOpen(false)}>
          <div className="form">
            <div className="notice notice-warn">
              <p>{t('data.clearWarning', phrases(stored))}</p>
            </div>
            <Field label={t('data.clearPrompt', { word: clearWordRequired })}>
              <input
                className="input"
                // The confirmation word is Latin in both languages, so the
                // field stays LTR even when the page is RTL.
                dir="ltr"
                value={clearWord}
                onChange={(e) => setClearWord(e.target.value)}
                placeholder={clearWordRequired}
                autoFocus
                autoComplete="off"
              />
            </Field>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setClearOpen(false)}>
                {t('form.cancel')}
              </button>
              <button
                className="btn btn-danger"
                disabled={clearWord.trim().toUpperCase() !== clearWordRequired}
                onClick={confirmClear}
              >
                {t('data.clearConfirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
