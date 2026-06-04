// Flag visual system per BRIEF Section 9
// HARD_VIOLATION: Red. SOFT_FLAG: Yellow. INFO_FLAG: Blue.

export default function Flag({ flag, onDismiss }) {
  const styles = {
    HARD_VIOLATION: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: '✕',
      iconBg: 'bg-red-100 text-red-600',
      label: 'Violation',
    },
    SOFT_FLAG: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: '▲',
      iconBg: 'bg-amber-100 text-amber-600',
      label: 'Warning',
    },
    INFO_FLAG: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: 'i',
      iconBg: 'bg-blue-100 text-blue-600',
      label: 'Info',
    },
  }

  const s = styles[flag.type] || styles.INFO_FLAG

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${s.iconBg}`}>
        {s.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${s.text}`}>{s.label}</div>
        <div className={`text-sm ${s.text}`}>{flag.message}</div>
      </div>
      {onDismiss && flag.type !== 'HARD_VIOLATION' && (
        <button
          onClick={() => onDismiss(flag)}
          className={`text-xs ${s.text} opacity-60 hover:opacity-100 flex-shrink-0`}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export function FlagList({ flags, onDismiss }) {
  if (!flags || flags.length === 0) return null
  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <Flag key={i} flag={flag} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
