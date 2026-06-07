import React from 'react'

const badgeClassMap = {
  'pending': 'badge-warning',
  'approved': 'badge-info',
  'active': 'badge-info',
  'rejected': 'badge-danger',
  'fully_paid': 'badge-success',
  'overdue': 'badge-danger',
  'paid': 'badge-success',
  'deposit': 'badge-success',
  'withdrawal': 'badge-danger',
  'savings': 'badge-success',
  'current': 'badge-info',
  'fixed_deposit': 'badge-warning',
  'inactive': 'badge-muted',
  'closed': 'badge-muted',
  'suspended': 'badge-warning',
  'frozen': 'badge-danger',
  'successful': 'badge-success',
  'failed': 'badge-danger',
  'reversed': 'badge-warning',
  'transfer': 'badge-info',
  'loan_disbursement': 'badge-info',
  'emi_payment': 'badge-success',
  'interest_collection': 'badge-warning'
}

export default function StatusBadge({ status, children }) {
  const label = children || (status ? status.replace(/_/g, ' ') : status)
  const cls = badgeClassMap[status] || 'badge-muted'

  return (
    <span className={`badge ${cls}`}>
      {label}
    </span>
  )
}
