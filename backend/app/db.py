import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "companies.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            industry TEXT NOT NULL,
            country_code TEXT NOT NULL,
            branch_locations TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()
