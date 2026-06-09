import json, urllib.request, http.cookiejar, ssl

ssl._create_default_https_context = ssl._create_unverified_context
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api(method, path, data=None):
    url = f'http://127.0.0.1:5000{path}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    if body:
        req.add_header('Content-Type', 'application/json')
    try:
        resp = opener.open(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# Login as admin
code, r = api('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin123'})
print('Login:', code, r)

# Get customers
code, r = api('GET', '/api/customers/')
print('Customers:', code)
for c in r.get('customers', []):
    print(f'  ID:{c["id"]} Name:{c["full_name"]} Phone:{c["phone_number"]} User:{c.get("username","?")} Status:{c["status"]}')

# Get accounts
code, r = api('GET', '/api/accounts/')
print('Accounts:', code)
for a in r.get('accounts', []):
    cn = a.get('customer',{}).get('full_name','?') if a.get('customer') else '?'
    print(f'  ID:{a["id"]} Num:{a["account_number"]} Type:{a["account_type"]} Bal:{a["balance"]} Status:{a["status"]} Cust:{cn}')

# Get loans
code, r = api('GET', '/api/loans/')
print('Loans:', code)
for l in r.get('loans', []):
    cn = l.get('customer',{}).get('full_name','?') if l.get('customer') else '?'
    print(f'  ID:{l["id"]} Loan#:{l["loan_number"]} Amt:{l["amount"]} Status:{l["status"]} Cust:{cn}')

# Check customer login for Ratan
code, r = api('POST', '/api/customer/login', {'username': '+9779764250273', 'password': '@RA273'})
print('Ratan Login:', code, r)

# Customer dashboard
code, r = api('GET', '/api/customer/dashboard')
print('Customer Dashboard:', code)
if code == 200:
    print(f'  Balance: {r.get("total_balance")}, Accounts: {r.get("active_accounts")}, Loans: {r.get("active_loans")}')
