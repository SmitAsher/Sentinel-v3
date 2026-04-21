import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))

from app.db import get_db, init_db
from passlib.context import CryptContext
import json

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed():
    init_db()
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM companies")
    if c.fetchone()[0] > 0:
        print("Database already seeded with production company accounts.")
        return

    # Top 10 Major Conglomerates
    companies = [
        ("Tata Consultancy Services", "tcs", "Technology", ["Mumbai", "Pune", "Chennai", "Delhi", "Bengaluru"]),
        ("Infosys", "infosys", "Technology", ["Bengaluru", "Pune", "Hyderabad"]),
        ("Reliance Industries", "reliance", "Energy", ["Mumbai", "Jamnagar", "Surat"]),
        ("Wipro", "wipro", "Technology", ["Bengaluru", "Chennai", "Pune"]),
        ("HDFC Bank", "hdfc", "Finance", ["Mumbai", "Delhi", "Kolkata", "Chennai", "Bengaluru"]),
        ("State Bank of India", "sbi", "Finance", ["Mumbai", "Delhi", "Kolkata"]),
        ("ICICI Bank", "icici", "Finance", ["Mumbai", "Hyderabad", "Pune"]),
        ("Bharti Airtel", "airtel", "Telecommunications", ["Delhi", "Mumbai", "Bengaluru"]),
        ("Larsen & Toubro", "lnt", "Infrastructure", ["Mumbai", "Chennai", "Vadodara"]),
        ("Mahindra & Mahindra", "mahindra", "Automotive", ["Mumbai", "Pune", "Nashik"])
    ]
    
    # Pad remainder up to 100 authentic-sounding Indian Enterprises
    sectors = ["Manufacturing", "Healthcare", "Agriculture", "Pharmaceuticals", "Retail", "Logistics"]
    cities = ["Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam"]
    
    for i in range(11, 101):
        sector = sectors[i % len(sectors)]
        city1 = cities[(i * 3) % len(cities)]
        city2 = cities[(i * 7) % len(cities)]
        companies.append((f"IndoCorp Holdings {i}", f"indocorp{i}", sector, [city1, city2]))

    print(f"Seeding {len(companies)} Enterprise Accounts...")
    for comp in companies:
        name, user, ind, locs = comp
        # Production standardized internal login
        hashed_pw = pwd_context.hash("123")
        c.execute("""
            INSERT INTO companies (company_name, username, password_hash, industry, country_code, branch_locations)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, user, hashed_pw, ind, "IN", json.dumps(locs)))

    conn.commit()
    conn.close()
    print("Database successfully configured for internal traffic operations.")

if __name__ == "__main__":
    seed()
