import React, { useState } from 'react'

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>System Settings</h1>
          <p>Configure bank parameters and system preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="form-card" style={{ maxWidth: '550px' }}>
          <h3 style={{ marginBottom: '20px', color: '#fff' }}>Bank Configuration</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="bank_name">Bank Name</label>
              <input type="text" id="bank_name" className="form-control" defaultValue="Village Bank" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="interest_rate">Default Interest Rate (%)</label>
                <input type="number" id="interest_rate" className="form-control" step="0.01" defaultValue="12.00" />
              </div>
              <div className="form-group">
                <label htmlFor="max_loan_term">Max Loan Term (Months)</label>
                <input type="number" id="max_loan_term" className="form-control" defaultValue="120" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select id="currency" className="form-control" defaultValue="NPR">
                <option value="NPR">NPR - Nepalese Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date_format">Date Format</label>
              <select id="date_format" className="form-control" defaultValue="YYYY-MM-DD">
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
              <span className="material-symbols-rounded">save</span>
              Save Settings
            </button>

            {saved && (
              <div className="flash-message flash-success" style={{ marginTop: '16px' }}>
                <span>Settings saved successfully.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  )
}
