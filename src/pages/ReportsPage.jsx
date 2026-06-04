import PageHeader from '../components/PageHeader'

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="AI summaries, choreography reports, development pathways" />
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-4">◫</div>
          <h3 className="text-xl font-bold text-[#1B2E4B] mb-2">Reports</h3>
          <p className="text-gray-500">AI eval reports will appear here after sessions are scored. Choreography reports available in Phase 3.</p>
        </div>
      </div>
    </div>
  )
}
