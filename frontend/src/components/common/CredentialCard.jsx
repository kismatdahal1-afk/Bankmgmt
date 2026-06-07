import React from 'react'

export default function CredentialCard({ credentials, onClose }) {
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Customer Credentials</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 40px; text-align: center; }
        h1 { color: #111; font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .box { border: 2px dashed #333; padding: 30px; margin: 20px auto; max-width: 400px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
        .label { font-weight: bold; color: #555; }
        .value { font-family: monospace; font-size: 16px; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; }
      </style></head><body>
      <h1>Village Bank - Customer Credentials</h1>
      <div class="box">
        <div class="row"><span class="label">Customer ID</span><span class="value">${credentials.customer_id}</span></div>
        <div class="row"><span class="label">Account Number</span><span class="value">${credentials.account_number}</span></div>
        <div class="row"><span class="label">Username</span><span class="value">${credentials.username}</span></div>
        <div class="row"><span class="label">Temporary Password</span><span class="value">${credentials.temporary_password}</span></div>
      </div>
      <p>Please share these credentials with the customer securely.</p>
      <p class="footer">Generated on ${new Date().toLocaleString()}</p>
      <script>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  const handleCopy = () => {
    const text = `Customer ID: ${credentials.customer_id}\nAccount Number: ${credentials.account_number}\nUsername: ${credentials.username}\nTemporary Password: ${credentials.temporary_password}`
    navigator.clipboard.writeText(text)
      .then(() => alert('Credentials copied to clipboard!'))
      .catch(() => alert('Failed to copy'))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }}>
      <div className="form-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '12px' }}>check_circle</span>
        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Customer Created Successfully</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>
          Please save these credentials. The customer will need them to log in.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          {[
            { label: 'Customer ID', value: credentials.customer_id },
            { label: 'Account Number', value: credentials.account_number },
            { label: 'Username', value: credentials.username },
            { label: 'Temporary Password', value: credentials.temporary_password }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < 3 ? '1px solid var(--border-color)' : 'none'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={handlePrint} className="btn btn-primary">
            <span className="material-symbols-rounded">print</span> Print Credentials
          </button>
          <button onClick={handleCopy} className="btn btn-secondary">
            <span className="material-symbols-rounded">content_copy</span> Copy Credentials
          </button>
        </div>

        <button onClick={onClose} className="btn" style={{ marginTop: '16px', width: '100%' }}>
          Close
        </button>
      </div>
    </div>
  )
}
