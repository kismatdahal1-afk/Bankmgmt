import React from 'react'

export default function TransactionForm({ action, accounts, selectedAccountNum, onSubmit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="form-card">
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="account_number">Select Target Account</label>
            <select id="account_number" name="account_number" className="form-control" required>
              <option value="" disabled selected={!selectedAccountNum}>-- Choose Account --</option>
              {accounts?.map((acc) => (
                <option
                  key={acc.account_number}
                  value={acc.account_number}
                  selected={selectedAccountNum === acc.account_number}
                >
                  {acc.customer?.full_name || 'Unknown'} (Acc: {acc.account_number} - Bal: ${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Transaction Amount ($)</label>
            <input type="number" id="amount" name="amount" className="form-control"
              step="0.01" min="0.01" required placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Memo / Description</label>
            <input type="text" id="description" name="description" className="form-control"
              placeholder={`e.g. Cash ${action === 'Deposit' ? 'deposit' : 'withdrawal'}`} maxLength="200"
            />
          </div>

          <button type="submit" className={`btn ${action === 'Deposit' ? 'btn-success' : 'btn-danger'}`} style={{ width: '100%', marginTop: '20px' }}>
            <span className="material-symbols-rounded">
              {action === 'Deposit' ? 'add_circle' : 'remove_circle'}
            </span>
            Execute {action}
          </button>
        </form>
      </div>
    </div>
  )
}
