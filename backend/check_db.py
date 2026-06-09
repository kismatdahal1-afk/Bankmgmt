import sqlite3
conn = sqlite3.connect(r'C:\Users\dell\Desktop\Bankmgmt\backend\instance\village_bank.db')
cur = conn.cursor()
out = []
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
for t in cur.fetchall():
    tn = t[0]
    cur.execute(f"PRAGMA table_info({tn})")
    cols = [c[1] for c in cur.fetchall()]
    cur.execute(f"SELECT * FROM {tn}")
    out.append({'table': tn, 'columns': cols, 'rows': cur.fetchall()})
conn.close()
import json
print(json.dumps(out, indent=2, default=str))

