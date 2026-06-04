import PageHeader from '../components/PageHeader'

export default function SchedulePage() {
  return (
    <div>
      <PageHeader title="Practice Schedule" subtitle="All teams and facilities" />
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-4">◷</div>
          <h3 className="text-xl font-bold text-[#1B2E4B] mb-2">Practice Scheduling</h3>
          <p className="text-gray-500">Coming in Phase 2 — constraint-based schedule builder.</p>
        </div>
      </div>
    </div>
  )
}
