import type { PageId } from '@shared/types'

const items: { id: PageId; label: string; hint: string }[] = [
  { id: 'subjects', label: 'Subjects', hint: 'Teachers & contact' },
  { id: 'classes', label: 'Classes', hint: 'Monthly calendar' },
  { id: 'summary', label: 'Summary', hint: 'Attendance dashboard' }
]

interface SidebarProps {
  current: PageId
  onChange: (page: PageId) => void
}

export function Sidebar({ current, onChange }: SidebarProps): React.JSX.Element {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-forest pt-12 text-paper">
      <div className="px-5 pb-8">
        <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Workspace</p>
        <h1 className="mt-1 text-xl font-semibold">Attendance</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const active = item.id === current
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`rounded-xl px-3 py-3 text-left transition ${
                active ? 'bg-white/12 text-white' : 'text-paper/75 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-paper/55">{item.hint}</span>
            </button>
          )
        })}
      </nav>
      <p className="px-5 py-4 text-[11px] text-paper/40">Local SQLite · macOS</p>
    </aside>
  )
}
