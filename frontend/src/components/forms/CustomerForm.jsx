import React from 'react'

export default function CustomerForm({ action, customer, onSubmit }) {
  const isCreate = action === 'Create'

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="form-card" style={{ maxWidth: '800px', width: '100%' }}>
        <form onSubmit={onSubmit}>
          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>person</span>
            Personal Demographics
          </h3>

          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input type="text" id="full_name" name="full_name" className="form-control"
              defaultValue={customer?.full_name || ''} required placeholder="John Doe" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="father_name">Father Name</label>
              <input type="text" id="father_name" name="father_name" className="form-control"
                defaultValue={customer?.father_name || ''} placeholder="Father's full name" />
            </div>
            <div className="form-group">
              <label htmlFor="grandfather_name">Grandfather Name</label>
              <input type="text" id="grandfather_name" name="grandfather_name" className="form-control"
                defaultValue={customer?.grandfather_name || ''} placeholder="Grandfather's full name" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dob">Date Of Birth</label>
              <input type="date" id="dob" name="dob" className="form-control"
                defaultValue={customer?.dob ? customer.dob.slice(0, 10) : ''} />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" className="form-control" defaultValue={customer?.gender || ''}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="citizenship_id">Citizenship Number</label>
              <input type="text" id="citizenship_id" name="citizenship_id" className="form-control"
                defaultValue={customer?.citizenship_id || ''} required placeholder="ID-892749-X" />
            </div>
            <div className="form-group">
              <label htmlFor="citizenship_issue_district">Citizenship Issue District</label>
              <input type="text" id="citizenship_issue_district" name="citizenship_issue_district" className="form-control"
                defaultValue={customer?.citizenship_issue_district || ''} placeholder="e.g. Kathmandu" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="marital_status">Marital Status</label>
              <select id="marital_status" name="marital_status" className="form-control" defaultValue={customer?.marital_status || ''}>
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="occupation">Occupation</label>
              <input type="text" id="occupation" name="occupation" className="form-control"
                defaultValue={customer?.occupation || ''} placeholder="e.g. Farmer, Teacher" />
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '30px 0 20px 0' }} />

          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>contact_phone</span>
            Contact Information
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone_number">Mobile Number</label>
              <input type="tel" id="phone_number" name="phone_number" className="form-control"
                defaultValue={customer?.phone_number || ''} required placeholder="+1 555-0199" />
            </div>
            <div className="form-group">
              <label htmlFor="alternate_mobile">Alternate Mobile Number</label>
              <input type="tel" id="alternate_mobile" name="alternate_mobile" className="form-control"
                defaultValue={customer?.alternate_mobile || ''} placeholder="Alternate contact number" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" className="form-control"
              defaultValue={customer?.email || ''} placeholder="john@example.com" />
          </div>

          <div className="form-group">
            <label htmlFor="address">Permanent Address</label>
            <input type="text" id="address" name="address" className="form-control"
              defaultValue={customer?.address || ''} required placeholder="123 Main St, Village Name" />
          </div>

          <div className="form-group">
            <label htmlFor="temporary_address">Temporary Address</label>
            <input type="text" id="temporary_address" name="temporary_address" className="form-control"
              defaultValue={customer?.temporary_address || ''} placeholder="Current address if different" />
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '30px 0 20px 0' }} />

          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>account_balance</span>
            Banking Information
          </h3>

          {isCreate && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="account_type">Account Type</label>
                <select id="account_type" name="account_type" className="form-control" required>
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                  <option value="fixed_deposit">Fixed Deposit</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="initial_balance">Initial Deposit (NPR)</label>
                <input type="number" id="initial_balance" name="initial_balance" className="form-control"
                  step="0.01" min="0.00" defaultValue="0.00" required />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nominee_name">Nominee Name</label>
              <input type="text" id="nominee_name" name="nominee_name" className="form-control"
                defaultValue={customer?.nominee_name || ''} placeholder="Nominee full name" />
            </div>
            <div className="form-group">
              <label htmlFor="nominee_contact">Nominee Contact</label>
              <input type="tel" id="nominee_contact" name="nominee_contact" className="form-control"
                defaultValue={customer?.nominee_contact || ''} placeholder="Nominee phone number" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="nominee_relationship">Nominee Relationship</label>
            <input type="text" id="nominee_relationship" name="nominee_relationship" className="form-control"
              defaultValue={customer?.nominee_relationship || ''} placeholder="e.g. Spouse, Sibling, Parent" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
            <span className="material-symbols-rounded">save</span>
            Save Customer Profile
          </button>
        </form>
      </div>
    </div>
  )
}
