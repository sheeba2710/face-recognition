import csv
import io
from datetime import datetime, timezone, timedelta
from database.db import get_db_connection

def mark_attendance(employee_id):
    """Mark an employee present for the day. Returns True if successfully marked, False if already marked."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current date and time in IST (UTC+5:30)
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist_tz)
    current_date = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M:%S")
    
    # Check if attendance already logged for today
    cursor.execute(
        "SELECT id FROM attendance WHERE employee_id = ? AND date = ?",
        (employee_id, current_date)
    )
    already_marked = cursor.fetchone()
    
    if already_marked:
        conn.close()
        return False
        
    try:
        cursor.execute(
            "INSERT INTO attendance (employee_id, date, time, status) VALUES (?, ?, ?, 'Present')",
            (employee_id, current_date, current_time)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error marking attendance: {e}")
        return False
    finally:
        conn.close()

def get_attendance_logs(limit=50, search_query=None):
    """Fetch attendance logs joined with employee information, optionally filtering by search query."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    base_query = """
        SELECT a.id, a.employee_id, e.name, e.department, e.email, a.date, a.time, a.status 
        FROM attendance a
        JOIN employee e ON a.employee_id = e.employee_id
    """
    
    if search_query:
        query = f"%{search_query}%"
        base_query += " WHERE e.name LIKE ? OR e.employee_id LIKE ? OR e.department LIKE ? ORDER BY a.date DESC, a.time DESC LIMIT ?"
        cursor.execute(base_query, (query, query, query, limit))
    else:
        base_query += " ORDER BY a.date DESC, a.time DESC LIMIT ?"
        cursor.execute(base_query, (limit,))
        
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def export_attendance_csv():
    """Generate attendance logs as a CSV file string for exporting."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.employee_id, e.name, e.department, e.email, a.date, a.time, a.status 
        FROM attendance a
        JOIN employee e ON a.employee_id = e.employee_id
        ORDER BY a.date DESC, a.time DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    # Create CSV in-memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Employee ID", "Name", "Department", "Email", "Date", "Time", "Status"])
    
    # Write rows
    for row in rows:
        writer.writerow([
            row["employee_id"],
            row["name"],
            row["department"],
            row["email"],
            row["date"],
            row["time"],
            row["status"]
        ])
        
    return output.getvalue()
