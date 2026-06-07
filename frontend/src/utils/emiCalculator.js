export function calculateEMIAndPayable(principal, annualRate, durationMonths) {
  const p = parseFloat(principal) || 0
  const r = parseFloat(annualRate) || 0
  const n = parseInt(durationMonths) || 0

  if (p <= 0 || n <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 }

  if (r === 0) {
    const emi = p / n
    return { emi: round2(emi), totalPayable: round2(p), totalInterest: 0 }
  }

  const mr = (r / 12) / 100
  const onePlusR_n = Math.pow(1 + mr, n)
  const emi = p * mr * onePlusR_n / (onePlusR_n - 1)
  const totalPayable = emi * n
  const totalInterest = totalPayable - p

  return {
    emi: round2(emi),
    totalPayable: round2(totalPayable),
    totalInterest: round2(totalInterest)
  }
}

function round2(val) {
  return Math.round(val * 100) / 100
}
