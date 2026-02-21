import ScheduleGridA from '../components/ScheduleGridA'
import ScheduleGridB from '../components/ScheduleGridB'
import ScheduleGridC from '../components/ScheduleGridC'
import '../index.css'

export default function SchedulePreview() {
  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="text-lg font-bold text-stone-900 text-center">Schedule Grid — Design Comparison</h1>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">A: Compact rows + expandable detail</h2>
          <ScheduleGridA />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">B: Inline pill chips</h2>
          <ScheduleGridB />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">C: Start time only (simplest)</h2>
          <ScheduleGridC />
        </div>
      </div>
    </div>
  )
}
