/* eslint-disable react/prop-types */
/* eslint-disable react-refresh/only-export-components */
import { formatCurrency } from '../../utils/helpers'

const FOOTER_TEXT = `Thank you for using Village Bank.
For any transaction-related inquiries,
please contact your nearest branch or customer support.
Village Bank Management System`

export function buildPrintHTML(receipt, triggerPrint = false) {
  const sections = renderReceiptSections(receipt)
  return `
    <html>
    <head>
      <title>Transaction Receipt - ${receipt.reference}</title>
      <style>
        @page { margin: 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 30px; }
        .receipt-container { max-width: 680px; margin: 0 auto; border: 2px solid #e5e7eb; border-radius: 12px; padding: 36px; }
        .receipt-header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
        .bank-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: #111; }
        .bank-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .receipt-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #059669; margin-top: 6px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111; text-align: right; }
        .value.mono { font-family: 'Courier New', monospace; font-size: 12px; }
        .value.amount { font-size: 16px; font-weight: 700; color: #059669; }
        .divider { border-top: 1px dashed #d1d5db; margin: 16px 0; }
        .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; line-height: 1.7; }
        .footer strong { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="bank-name">Village Bank</div>
          <div class="bank-sub">Bank Management System</div>
          <div class="receipt-title">Transaction Receipt</div>
        </div>
        ${sections}
        <div class="divider"></div>
        <div class="footer">
          ${FOOTER_TEXT.replace(/\n/g, '<br>')}
        </div>
      </div>
      ${triggerPrint ? '<script>window.onload = function() { window.print(); window.close(); }</script>' : ''}
    </body>
    </html>
  `
}

function renderReceiptSections(r) {
  return `
    <div class="section">
      <div class="section-title">Transaction Information</div>
      <div class="row"><span class="label">Transaction ID</span><span class="value mono">${r.reference}</span></div>
      <div class="row"><span class="label">Transaction Type</span><span class="value">${r.transaction_type}</span></div>
      <div class="row"><span class="label">Status</span><span class="value" style="color:#059669">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${r.date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${r.time}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Sender Information</div>
      <div class="row"><span class="label">Account Holder</span><span class="value">${r.from_customer || '—'}</span></div>
      <div class="row"><span class="label">Account Number</span><span class="value mono">${r.from_account || '—'}</span></div>
    </div>
    ${r.transaction_type && r.transaction_type.includes('Transfer') ? `
    <div class="section">
      <div class="section-title">Receiver Information</div>
      <div class="row"><span class="label">Account Holder</span><span class="value">${r.to_customer || '—'}</span></div>
      <div class="row"><span class="label">Account Number</span><span class="value mono">${r.to_account || '—'}</span></div>
    </div>
    ` : ''}
    <div class="section">
      <div class="section-title">Transfer Details</div>
      <div class="row"><span class="label">${r.transaction_type && r.transaction_type.includes('Transfer') ? 'Transfer Amount' : 'Amount'}</span><span class="value amount">${formatCurrency(r.amount)}</span></div>
      <div class="row"><span class="label">Remaining Balance</span><span class="value">${formatCurrency(r.remaining_balance)}</span></div>
    </div>
    ${r.description ? `
    <div class="section">
      <div class="section-title">Description / Remarks</div>
      <div class="row"><span class="label">Description</span><span class="value" style="max-width:300px;word-break:break-word">${r.description}</span></div>
    </div>
    ` : ''}
  `
}

export default function ReceiptView({ receipt, showActions = false, onViewReceipt, onDownloadPDF, variant = 'default' }) {
  if (!receipt) return null

  const handleViewReceipt = () => {
    const w = window.open('', '_blank')
    w.document.write(buildPrintHTML(receipt))
    w.document.close()
  }

  const handleDownloadPDF = () => {
    const w = window.open('', '_blank')
    w.document.write(buildPrintHTML(receipt, true))
    w.document.close()
  }

  const showSuccess = variant === 'success'

  return (
    <div className="receipt-view">
      <div className="receipt-card">
        <div className="receipt-header-section">
          <div className="receipt-brand">
            <span className="material-symbols-rounded" style={{ fontSize: '1.8rem', color: 'var(--accent-color)' }}>account_balance</span>
            <span className="receipt-brand-name">Village Bank</span>
          </div>
          <div className="receipt-brand-sub">Bank Management System</div>
          {!showSuccess && (
            <div className="receipt-brand-title">Transaction Receipt</div>
          )}
        </div>

        {showSuccess && (
          <div className="receipt-success-section">
            <div className="receipt-success-icon">
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className="receipt-success-title">Transfer Successful</div>
            <div className="receipt-success-amount">{formatCurrency(receipt.amount)}</div>
            <div className="receipt-success-subtitle">transferred successfully</div>
            <div className="receipt-success-meta">
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Transaction ID</span>
                <span className="receipt-meta-value">{receipt.reference}</span>
              </div>
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Date</span>
                <span className="receipt-meta-value">{receipt.date}</span>
              </div>
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Time</span>
                <span className="receipt-meta-value">{receipt.time}</span>
              </div>
            </div>
          </div>
        )}

        <div className="receipt-body">
          <div className="receipt-body-header">Receipt Details</div>

          <div className="receipt-section">
            <div className="receipt-section-title">Transaction Information</div>
            <div className="receipt-row">
              <span className="receipt-label">Transaction ID</span>
              <span className="receipt-value mono">{receipt.reference}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Transaction Type</span>
              <span className="receipt-value">{receipt.transaction_type}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="receipt-value" style={{ color: 'var(--success)' }}>{receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Date</span>
              <span className="receipt-value">{receipt.date}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Time</span>
              <span className="receipt-value">{receipt.time}</span>
            </div>
          </div>

          <div className="receipt-section">
            <div className="receipt-section-title">Sender Information</div>
            <div className="receipt-row">
              <span className="receipt-label">Account Holder</span>
              <span className="receipt-value">{receipt.from_customer || '—'}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Account Number</span>
              <span className="receipt-value mono">{receipt.from_account || '—'}</span>
            </div>
          </div>

          {receipt.transaction_type && receipt.transaction_type.includes('Transfer') ? (
            <div className="receipt-section">
              <div className="receipt-section-title">Receiver Information</div>
              <div className="receipt-row">
                <span className="receipt-label">Account Holder</span>
                <span className="receipt-value">{receipt.to_customer || '—'}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Account Number</span>
                <span className="receipt-value mono">{receipt.to_account || '—'}</span>
              </div>
            </div>
          ) : null}

          <div className="receipt-section">
            <div className="receipt-section-title">Transfer Details</div>
            <div className="receipt-row">
              <span className="receipt-label">{receipt.transaction_type && receipt.transaction_type.includes('Transfer') ? 'Transfer Amount' : 'Amount'}</span>
              <span className="receipt-value receipt-amount">{formatCurrency(receipt.amount)}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Remaining Balance</span>
              <span className="receipt-value">{formatCurrency(receipt.remaining_balance)}</span>
            </div>
          </div>

          {receipt.description && (
            <div className="receipt-section">
              <div className="receipt-section-title">Description / Remarks</div>
              <div className="receipt-row">
                <span className="receipt-label">Description</span>
                <span className="receipt-value" style={{ maxWidth: '280px', wordBreak: 'break-word', textAlign: 'right' }}>{receipt.description}</span>
              </div>
            </div>
          )}

          <div className="receipt-divider" />

          <div className="receipt-footer-text">
            Thank you for using <strong>Village Bank</strong>.<br />
            For any transaction-related inquiries,<br />
            please contact your nearest branch or customer support.<br />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>Village Bank Management System</span>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="receipt-actions">
          <button className="btn btn-secondary" onClick={onViewReceipt || handleViewReceipt}>
            <span className="material-symbols-rounded">visibility</span>
            View Receipt
          </button>
          <button className="btn btn-primary" onClick={onDownloadPDF || handleDownloadPDF}>
            <span className="material-symbols-rounded">download</span>
            Download Receipt
          </button>
        </div>
      )}

      <style>{`
        .receipt-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          width: 100%;
        }
        .receipt-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          width: 100%;
          max-width: 680px;
          box-shadow: var(--card-shadow);
        }
        .receipt-header-section {
          background: linear-gradient(135deg, #0a1628, #111827);
          border-bottom: 1px solid var(--border-color);
          padding: 24px 24px 18px;
          text-align: center;
        }
        .receipt-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .receipt-brand-name {
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .receipt-brand-sub {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .receipt-brand-title {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 6px;
        }
        .receipt-success-section {
          text-align: center;
          padding: 28px 24px 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .receipt-success-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(16,185,129,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }
        .receipt-success-icon .material-symbols-rounded {
          font-size: 2rem;
          color: var(--success);
        }
        .receipt-success-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--success);
          margin-bottom: 8px;
        }
        .receipt-success-amount {
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .receipt-success-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 2px;
          margin-bottom: 16px;
        }
        .receipt-success-meta {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
        }
        .receipt-meta-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .receipt-meta-label {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .receipt-meta-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: #fff;
        }
        .receipt-body {
          padding: 20px 24px 0;
        }
        .receipt-body-header {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .receipt-section {
          margin-bottom: 16px;
        }
        .receipt-section-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 5px;
          margin-bottom: 8px;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 0.88rem;
        }
        .receipt-label {
          color: var(--text-secondary);
        }
        .receipt-value {
          font-weight: 600;
          color: #fff;
          text-align: right;
        }
        .receipt-value.mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          color: var(--accent-color);
        }
        .receipt-amount {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--success);
        }
        .receipt-divider {
          border-top: 1px dashed var(--border-color);
          margin: 14px 0;
        }
        .receipt-footer-text {
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-dim);
          line-height: 1.6;
          padding-bottom: 4px;
        }
        .receipt-footer-text strong {
          color: var(--text-muted);
        }
        .receipt-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (max-width: 600px) {
          .receipt-body { padding: 14px 16px 0; }
          .receipt-header-section { padding: 14px 16px; }
          .receipt-success-section { padding: 20px 16px 16px; }
          .receipt-success-meta { gap: 14px; flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  )
}
