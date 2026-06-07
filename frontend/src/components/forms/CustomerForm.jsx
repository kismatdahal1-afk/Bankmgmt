import React from 'react'

export default function CustomerForm({ action, customer, onSubmit }) {
  const isCreate = action === 'Create'

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="form-card">
        <form onSubmit={onSubmit}>
          <h3 style={{ marginBottom: '20px', color: '#fff' }}>Personal Demographics</h3>

          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              type="text" id="full_name" name="full_name" className="form-control"
              defaultValue={customer?.full_name || ''} required placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Residential Address</label>
            <input
              type="text" id="address" name="address" className="form-control"
              defaultValue={customer?.address || ''} required placeholder="123 Main St, Village Name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="tel" id="phone_number" name="phone_number" className="form-control"
                defaultValue={customer?.phone_number || ''} required placeholder="+1 555-0199"
              />
            </div>
            <div className="form-group">
              <label htmlFor="citizenship_id">Citizenship / ID Card No.</label>
              <input
                type="text" id="citizenship_id" name="citizenship_id" className="form-control"
                defaultValue={customer?.citizenship_id || ''} required placeholder="ID-892749-X"
              />
            </div>
          </div>

          {isCreate && (
            <>
              <hr style={{ borderColor: 'var(--border-color)', margin: '30px 0 20px 0' }} />
              <h3 style={{ marginBottom: '20px', color: '#fff' }}>Primary Account Setup</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="account_type">Account Class</label>
                  <select id="account_type" name="account_type" className="form-control" required>
                    <option value="savings" selected>Savings Account</option>
                    <option value="current">Current Account</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="initial_balance">Initial Deposit ($)</label>
                  <input
                    type="number" id="initial_balance" name="initial_balance" className="form-control"
                    step="0.01" min="0.00" defaultValue="0.00" required
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
            <span className="material-symbols-rounded">save</span>
            Save Customer Profile
          </button>
        </form>
      </div>
    </div>
  )
}
