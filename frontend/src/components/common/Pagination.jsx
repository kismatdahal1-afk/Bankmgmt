import { useMemo } from 'react'

const PAGE_SIZES = [10, 25, 50, 100]

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.ceil(totalItems / pageSize)

  const pages = useMemo(() => {
    const arr = []
    let start, end
    if (totalPages <= 5) { start = 1; end = totalPages }
    else if (currentPage <= 3) { start = 1; end = 5 }
    else if (currentPage >= totalPages - 2) { start = totalPages - 4; end = totalPages }
    else { start = currentPage - 2; end = currentPage + 2 }
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [currentPage, totalPages])

  const first = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const last = Math.min(currentPage * pageSize, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="pagination-bar">
      <div className="pagination-left">
        <span className="pagination-label">Rows per page:</span>
        <select className="pagination-select" value={pageSize} onChange={e => { onPageSizeChange(parseInt(e.target.value)); onPageChange(1) }}>
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="pagination-center">
        Showing {first}&ndash;{last} of {totalItems} records
      </div>
      <div className="pagination-right">
        <button className="pag-btn" disabled={currentPage <= 1 || totalPages <= 1} onClick={() => onPageChange(1)} title="First page">
          <span className="material-symbols-rounded pag-icon">first_page</span>
        </button>
        <button className="pag-btn" disabled={currentPage <= 1 || totalPages <= 1} onClick={() => onPageChange(p => p - 1)} title="Previous page">
          <span className="material-symbols-rounded pag-icon">chevron_left</span>
        </button>
        {pages.map(i => (
          <button key={i} className={`pag-btn${currentPage === i ? ' active' : ''}`} onClick={() => onPageChange(i)}>
            {i}
          </button>
        ))}
        <button className="pag-btn" disabled={currentPage >= totalPages || totalPages <= 1} onClick={() => onPageChange(p => p + 1)} title="Next page">
          <span className="material-symbols-rounded pag-icon">chevron_right</span>
        </button>
        <button className="pag-btn" disabled={currentPage >= totalPages || totalPages <= 1} onClick={() => onPageChange(totalPages)} title="Last page">
          <span className="material-symbols-rounded pag-icon">last_page</span>
        </button>
      </div>
    </div>
  )
}
