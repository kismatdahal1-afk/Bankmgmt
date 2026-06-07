export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00'
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getInitials(name) {
  if (!name) return 'JD'
  return name.split(' ').map(w => w[0].toUpperCase()).slice(0, 2).join('')
}

export function calculateProgress(paid, total) {
  if (!total || total === 0) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

export function calculateEMI(principal, annualRate, durationMonths) {
  const p = parseFloat(principal) || 0
  const r = parseFloat(annualRate) || 0
  const n = parseInt(durationMonths) || 0

  if (p <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0 }

  if (r === 0) {
    const emi = p / n
    return { emi, totalInterest: 0, totalPayable: p }
  }

  const mr = (r / 12) / 100
  const onePlusR_n = Math.pow(1 + mr, n)
  const emi = p * mr * onePlusR_n / (onePlusR_n - 1)
  const totalPayable = emi * n
  const totalInterest = totalPayable - p

  return {
    emi: Math.round(emi * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100
  }
}

export function getStatusBadgeClass(status) {
  const map = {
    'pending': 'badge-warning',
    'approved': 'badge-info',
    'active': 'badge-info',
    'rejected': 'badge-danger',
    'fully_paid': 'badge-success',
    'overdue': 'badge-danger',
    'paid': 'badge-success',
    'deposit': 'badge-success',
    'withdrawal': 'badge-danger'
  }
  return map[status] || 'badge-muted'
}
