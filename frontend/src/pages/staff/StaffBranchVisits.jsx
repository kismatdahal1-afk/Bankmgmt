import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffListLoanApplications, staffScheduleVisit } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'

export default function StaffBranchVisits() {
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [scheduleModal, setScheduleModal] = useState(null)
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const res = await staffListLoanApplications('visit_scheduled')
      setVisits(res.data.applications || [])
    } catch (_) { }
    setLoading(false)
  }

  useEffect(() => { fetchVisits() }, [])

  const allVisits = visits.map(v => ({
    ...v,
    visitDate: v.appointment_date || '—',
    visitTime: v.appointment_time || '—',
  }))

  const paginatedVisits = useMemo(() => allVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize), [allVisits, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [visits.length])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayVisits = allVisits.filter(v => v.appointment_date === todayStr)
  const upcomingVisits = allVisits.filter(v => v.appointment_date && v.appointment_date > todayStr)
  const pastVisits = allVisits.filter(v => v.appointment_date && v.appointment_date < todayStr)

  const handleSchedule = async (e) => {
    e.preventDefault()
    if (!visitDate) return
    setProcessing(true)
    try {
      await staffScheduleVisit(scheduleModal.id, { appointment_date: visitDate, appointment_time: visitTime, notes: visitNotes })
      setMsg('Visit scheduled successfully')
      setScheduleModal(null)
      setVisitDate(''); setVisitTime(''); setVisitNotes('')
      fetchVisits()
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      setMsg(e.response?.data?.error || 'Failed to schedule')
    } finally { setProcessing(false) }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Branch Visits</div>
          <div className="page-subtitle">Manage physical verification visits for loan applications.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {todayVisits.length} Today
          </span>
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {allVisits.length} Total
          </span>
        </div>
      </div>

      {msg && (
        <div className={`flash-message flash-${msg.includes('successfully') ? 'success' : 'danger'}`} style={{ marginBottom: '16px' }}>
          <span className="material-symbols-rounded" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
            {msg.includes('successfully') ? 'check_circle' : 'error'}
          </span>
          {msg}
        </div>
      )}

      {allVisits.length === 0 ? (
        <div className="table-container">
          <div className="empty" style={{ padding: '30px 20px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>event</span>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>No branch visits scheduled.</div>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">All Branch Visits</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {todayVisits.length > 0 && <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{todayVisits.length} Today</span>}
              {upcomingVisits.length > 0 && <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{upcomingVisits.length} Upcoming</span>}
              {pastVisits.length > 0 && <span className="badge badge-muted" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{pastVisits.length} Past</span>}
            </div>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Customer</th>
                <th>Visit Date</th>
                <th>Visit Time</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisits.map(v => (
                <tr key={v.id} className="clickable" onClick={() => navigate(`/staff/loan/review/${v.id}`)}>
                  <td><span className="mono">{v.application_number}</span></td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{v.customer_name}</td>
                  <td>{v.visitDate}</td>
                  <td>{v.visitTime}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(v.amount)}</td>
                  <td>
                    <span className="badge badge-info">Scheduled</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${v.id}`) }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={allVisits.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </>
  )
}
