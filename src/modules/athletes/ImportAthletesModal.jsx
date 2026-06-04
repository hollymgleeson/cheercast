import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { getAgeDivision } from '../../utils/usasf-rules'
import { formatPhoneInput } from '../../utils/formatters'
import Modal from '../../components/Modal'
import Button from '../../components/Button'

const CURRENT_YEAR = new Date().getFullYear()

// CheerCast fields the user can map to
const CHEERCAST_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'parent_name', label: 'Parent Name' },
  { key: 'parent_email', label: 'Parent Email' },
  { key: 'parent_phone', label: 'Parent Phone' },
  { key: 'email', label: 'Athlete Email' },
  { key: 'phone', label: 'Athlete Phone' },
  { key: 'height_inches', label: 'Height (inches)' },
  { key: 'join_date', label: 'Join Date' },
  { key: 'current_level', label: 'Current Level' },
  { key: 'current_tier', label: 'Current Tier' },
  { key: 'status', label: 'Status' },
]

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Handle quoted fields
  function parseLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const values = parseLine(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })

  return { headers, rows }
}

function normalizeDate(val) {
  if (!val) return null
  // Try common formats: MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY
  const cleaned = val.trim()
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  // MM/DD/YYYY
  const mdy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`
  // MM-DD-YYYY
  const mdy2 = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdy2) return `${mdy2[3]}-${mdy2[1].padStart(2,'0')}-${mdy2[2].padStart(2,'0')}`
  return null
}

function normalizeStatus(val) {
  if (!val) return 'active'
  const v = val.toLowerCase().trim()
  if (['active','inactive','injured','withdrawn'].includes(v)) return v
  return 'active'
}

function normalizeTier(val) {
  if (!val) return null
  const v = val.toLowerCase().trim()
  if (['elite','prep','novice'].includes(v)) return v
  return null
}

export default function ImportAthletesModal({ open, onClose, onImported }) {
  const { gymId } = useAuth()
  const fileRef = useRef()
  const [step, setStep] = useState('upload') // upload | map | preview | importing | done
  const [csvData, setCsvData] = useState(null)
  const [mapping, setMapping] = useState({}) // cheercast_key -> csv_header
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [error, setError] = useState('')

  function reset() {
    setStep('upload')
    setCsvData(null)
    setMapping({})
    setPreview([])
    setImporting(false)
    setImportResults(null)
    setError('')
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result)
        if (parsed.headers.length === 0) {
          setError('Could not read the CSV file. Make sure it has a header row.')
          return
        }
        setCsvData(parsed)
        // Auto-detect mappings by fuzzy matching header names
        const autoMap = {}
        CHEERCAST_FIELDS.forEach(field => {
          const match = parsed.headers.find(h => {
            const hn = h.toLowerCase().replace(/[^a-z0-9]/g, '')
            const fn = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
            const fk = field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
            return hn === fn || hn === fk ||
              hn.includes(fn) || fn.includes(hn) ||
              hn.includes(fk) || fk.includes(hn)
          })
          if (match) autoMap[field.key] = match
        })
        setMapping(autoMap)
        setStep('map')
        setError('')
      } catch (err) {
        setError('Could not parse the CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  function buildPreview() {
    if (!mapping.first_name || !mapping.last_name) {
      setError('You must map at least First Name and Last Name.')
      return
    }
    setError('')
    const rows = csvData.rows.slice(0, 5).map(row => applyMapping(row))
    setPreview(rows)
    setStep('preview')
  }

  function applyMapping(row) {
    const athlete = {}
    CHEERCAST_FIELDS.forEach(field => {
      const csvHeader = mapping[field.key]
      if (csvHeader) {
        let val = row[csvHeader] || ''
        // Normalize specific fields
        if (field.key === 'date_of_birth' || field.key === 'join_date') {
          val = normalizeDate(val)
        } else if (field.key === 'parent_phone' || field.key === 'phone') {
          val = val ? formatPhoneInput(val) : null
        } else if (field.key === 'status') {
          val = normalizeStatus(val)
        } else if (field.key === 'current_tier') {
          val = normalizeTier(val)
        } else if (field.key === 'height_inches') {
          val = val ? parseInt(val) || null : null
        } else {
          val = val || null
        }
        athlete[field.key] = val
      }
    })
    // Auto-calculate age division
    if (athlete.date_of_birth) {
      athlete.age_division = getAgeDivision(athlete.date_of_birth, CURRENT_YEAR)
    }
    athlete.status = athlete.status || 'active'
    athlete.gym_id = gymId
    return athlete
  }

  async function runImport() {
    setImporting(true)
    setStep('importing')
    const allRows = csvData.rows.map(row => applyMapping(row))
    let success = 0
    let failed = 0
    const errors = []

    // Import in batches of 20
    const batchSize = 20
    for (let i = 0; i < allRows.length; i += batchSize) {
      const batch = allRows.slice(i, i + batchSize)
      try {
        const { data, error } = await supabase
          .from('athletes')
          .insert(batch)
          .select('id')
        if (error) throw error

        // Create preference rows for each imported athlete
        const prefRows = data.map(a => ({ athlete_id: a.id, gym_id: gymId }))
        await supabase.from('athlete_preferences').insert(prefRows)

        success += batch.length
      } catch (err) {
        failed += batch.length
        errors.push(`Rows ${i + 1}-${i + batch.length}: ${err.message}`)
      }
    }

    setImportResults({ success, failed, errors })
    setImporting(false)
    setStep('done')
    if (success > 0) onImported(success)
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Athletes from CSV" size="lg">
      <div className="p-6">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Upload', 'Map Columns', 'Preview', 'Import'].map((s, i) => {
            const stepKeys = ['upload', 'map', 'preview', 'done']
            const currentIdx = stepKeys.indexOf(step === 'importing' ? 'done' : step)
            const isDone = i < currentIdx
            const isActive = i === currentIdx
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  isActive ? 'text-[#1B2E4B]' : isDone ? 'text-green-600' : 'text-gray-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isDone ? 'bg-green-100 text-green-600' :
                    isActive ? 'bg-[#1B2E4B] text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {s}
                </div>
                {i < 3 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a CSV file exported from any system -- Google Sheets, Excel, your registration platform, or any spreadsheet. You'll map your column names to CheerCast fields in the next step.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-[#8b002e] hover:bg-[#8b002e]/5 transition-colors"
            >
              <div className="text-4xl mb-3">📄</div>
              <div className="font-semibold text-[#1B2E4B] mb-1">Click to upload a CSV file</div>
              <div className="text-sm text-gray-400">Exported from Google Sheets, Excel, JackRabbit, or any other system</div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="bg-[#F5F6F7] rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tips</div>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Your file must have a header row (column names in the first row)</li>
                <li>Column names don't need to match exactly -- you'll map them in the next step</li>
                <li>Dates can be in MM/DD/YYYY or YYYY-MM-DD format</li>
                <li>Duplicate athletes are not automatically detected -- review before importing</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 'map' && csvData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Match your CSV columns to CheerCast fields. We pre-filled what we could detect automatically.
              </p>
              <span className="text-xs text-gray-400">{csvData.rows.length} rows found</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-0 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2 bg-[#F5F6F7] border-b border-gray-100">
                <div>CheerCast Field</div>
                <div>Your CSV Column</div>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {CHEERCAST_FIELDS.map(field => (
                  <div key={field.key} className="grid grid-cols-2 gap-4 px-4 py-2.5 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1B2E4B] font-medium">{field.label}</span>
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </div>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value || undefined }))}
                      className={`px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] ${
                        mapping[field.key] ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <option value="">-- Skip this field --</option>
                      {csvData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Start Over</Button>
              <Button variant="gold" onClick={buildPreview}>Preview Import</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing first 5 of <strong>{csvData.rows.length}</strong> athletes. Review before importing.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F6F7] border-b border-gray-100">
                    {CHEERCAST_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <th key={f.key} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F5F6F7]">
                      {CHEERCAST_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} className="px-3 py-2 text-[#1B2E4B] whitespace-nowrap">
                          {row[f.key] ?? <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvData.rows.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                + {csvData.rows.length - 5} more athletes will be imported
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('map')}>Back to Mapping</Button>
              <Button variant="gold" onClick={runImport}>
                Import All {csvData.rows.length} Athletes
              </Button>
            </div>
          </div>
        )}

        {/* Importing */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1B2E4B]/10 mb-4">
              <svg className="animate-spin w-8 h-8 text-[#1B2E4B]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="font-semibold text-[#1B2E4B] text-lg">Importing athletes...</div>
            <div className="text-sm text-gray-400 mt-1">This will only take a moment.</div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && importResults && (
          <div className="space-y-4">
            <div className={`rounded-xl p-6 text-center ${importResults.failed === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
              <div className="text-4xl mb-3">{importResults.failed === 0 ? '✓' : '⚠'}</div>
              <div className="font-bold text-xl text-[#1B2E4B] mb-1">
                {importResults.success} athlete{importResults.success !== 1 ? 's' : ''} imported successfully
              </div>
              {importResults.failed > 0 && (
                <div className="text-amber-700 text-sm mt-1">
                  {importResults.failed} rows could not be imported
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Errors</div>
                {importResults.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-600">{e}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="gold" onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
