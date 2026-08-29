import { useState } from 'react'
import type { PageId } from '@shared/types'
import { Sidebar } from './components/Sidebar'
import { ClassesPage } from './pages/ClassesPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { SummaryPage } from './pages/SummaryPage'

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<PageId>('subjects')

  return (
    <div className="flex h-full">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-11">
        {page === 'subjects' ? <SubjectsPage /> : null}
        {page === 'classes' ? <ClassesPage /> : null}
        {page === 'summary' ? <SummaryPage /> : null}
      </main>
    </div>
  )
}
