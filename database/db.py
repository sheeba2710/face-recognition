import os
import sqlite3

# Determine database path (use persistent disk path if on Render/production)
DB_PATH = os.environ.get('DATABASE_PATH')
if not DB_PATH:
    if os.environ.get('RENDER') or os.path.exists('/app/data'):
        DB_PATH = '/app/data/database.db'
    else:
        DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.db')

def get_db_connection():
    """Establish a connection to the SQLite database, enabling foreign keys."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database tables if they do not exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Employee Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        image_path TEXT NOT NULL,
        registration_date TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 2. Face Encoding Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_encoding (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        face_encoding TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    );
    """)
    
    # 3. Attendance Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    );
    """)
    
    # 4. Insert or update default 'UNKNOWN' employee
    cursor.execute("SELECT employee_id FROM employee WHERE employee_id = 'UNKNOWN'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO employee (employee_id, name, department, email, phone, image_path) VALUES (?, ?, ?, ?, ?, ?)",
            ('UNKNOWN', 'unknown person', 'N/A', 'N/A', 'N/A', 'static/uploads/UNKNOWN.jpg')
        )
    else:
        cursor.execute(
            "UPDATE employee SET name = 'unknown person' WHERE employee_id = 'UNKNOWN'"
        )
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
