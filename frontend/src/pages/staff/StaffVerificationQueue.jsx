import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'

const STATUSES = ['documents_verified', 'final_review']

export default function StaffVerificationQueue() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginatedApps = useMemo(() => apps.slice((currentPage - 1) * pageSize, currentPage * pageSize), [apps, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [apps.length])

  useEffect(() => {
    setLoading(true)
    Promise.all(STATUSES.map(s => staffListLoanApplications(s)))
      .then(results => {
        const all = results.flatMap(r => r.data.applications || [])
        setApps(all)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])



  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Verification Queue</div>
          <div className="page-subtitle">Applications verified and ready for administrative decision.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {apps.filter(a => a.status === 'documents_verified').length} Verified
          </span>
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {apps.filter(a => a.status === 'final_review').length} Under Review
          </span>
        </div>
      </div>

      {apps.length > 0 ? (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Customer</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Verification Date</th>
                <th>Verified By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map(app => {
                const verifiedEntry = (app.status_history || []).find(h => h.new_status === 'documents_verified')
                return (
                  <tr key={app.id} className="clickable" onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                    <td><span className="mono">{app.application_number}</span></td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{app.customer_name}</td>
                    <td>{app.loan_type}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(app.amount)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {verifiedEntry ? formatDate(verifiedEntry.changed_at) : '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{verifiedEntry?.changed_by_name || verifiedEntry?.changed_by || '—'}</td>
                    <td>
                      <span className={`badge ${app.status === 'documents_verified' ? 'badge-success' : 'badge-info'}`}>
                        {app.status === 'documents_verified' ? 'Verified' : 'Admin Review'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={apps.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      ) : (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>verified</span>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '12px' }}>Verification queue is empty</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Verified applications waiting for admin review will appear here.
          </div>
        </div>
      )}
    </>
  )
}
