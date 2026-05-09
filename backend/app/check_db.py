import sqlite3, json, os
DB_PATH = os.path.join(os.path.dirname(__file__), "companies.db")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT id, company_name, username, industry, branch_locations FROM companies ORDER BY id LIMIT 20")
rows = c.fetchall()
for r in rows:
    locs = json.loads(r["branch_locations"])
    print(f"[{r['id']:3}] {r['username']:15} | {r['company_name']:35} | {r['industry']:20} | {locs}")
c.execute("SELECT COUNT(*) as total FROM companies")
print(f"\nTotal companies: {c.fetchone()['total']}")
conn.close()
