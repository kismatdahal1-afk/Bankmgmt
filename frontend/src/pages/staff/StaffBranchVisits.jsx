import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffListLoanApplications, staffScheduleVisit } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'

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

  const renderTable = (rows, emptyMsg) => (
    <div className="table-container" style={{ marginTop: rows === allVisits ? 0 : '16px' }}>
      {rows.length > 0 ? (
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
            {rows.map(v => (
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
      ) : (
        <div className="empty" style={{ padding: '30px 20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>event</span>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>{emptyMsg}</div>
        </div>
      )}
    </div>
  )

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

      {allVisits.length === 0 ? renderTable([], 'No branch visits scheduled.') : (
        <>
          {todayVisits.length > 0 && (
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#f59e0b' }}>today</span>
                Today's Visits
                <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '2px 10px', marginLeft: '4px' }}>{todayVisits.length}</span>
              </div>
              {renderTable(todayVisits, '')}
            </div>
          )}

          {upcomingVisits.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#3b82f6' }}>calendar_month</span>
                Upcoming Visits
                <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '2px 10px', marginLeft: '4px' }}>{upcomingVisits.length}</span>
              </div>
              {renderTable(upcomingVisits, '')}
            </div>
          )}

          {pastVisits.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#64748b' }}>history</span>
                Past Visits
                <span className="badge badge-muted" style={{ fontSize: '0.75rem', padding: '2px 10px', marginLeft: '4px' }}>{pastVisits.length}</span>
              </div>
              {renderTable(pastVisits, '')}
            </div>
          )}
        </>
      )}
    </>
  )
}
