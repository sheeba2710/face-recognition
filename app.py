import os
import sys
# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, jsonify, redirect, url_for, Response

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import init_db
from database.models import (
    create_employee, get_employee, get_all_employees,
    update_employee, delete_employee, add_face_encoding,
    get_face_encodings, get_recent_registrations, get_dashboard_stats
)
from attendance.attendance import mark_attendance, get_attendance_logs, export_attendance_csv
from face_recognition.register_face import process_and_register_face, base64_to_cv2, detect_face_locations
from face_recognition.recognize_face import recognize_faces_in_frame

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
app.secret_key = 'secret_face_recognition_management_key'

# In-memory face encodings cache to speed up real-time recognition frame analysis
KNOWN_ENCODINGS_CACHE = []

def reload_face_encodings_cache():
    """Reload all face encodings from the database into memory."""
    global KNOWN_ENCODINGS_CACHE
    try:
        KNOWN_ENCODINGS_CACHE = get_face_encodings()
        print(f"Loaded {len(KNOWN_ENCODINGS_CACHE)} face encodings into cache.")
    except Exception as e:
        print(f"Error loading face encodings cache: {e}")

# Create directories and initialize database tables on startup
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
init_db()
reload_face_encodings_cache()

# --- Page Render Routes ---

@app.route('/')
def index():
    """Redirect home to dashboard."""
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    """Render Admin Employee Portal Dashboard."""
    search_query = request.args.get('search', '').strip()
    
    stats = get_dashboard_stats()
    recent_registrations = get_recent_registrations(5)
    recent_attendance = get_attendance_logs(10)
    employees = get_all_employees(search_query)
    
    return render_template(
        'dashboard.html',
        stats=stats,
        recent_registrations=recent_registrations,
        recent_attendance=recent_attendance,
        employees=employees,
        search_query=search_query
    )

@app.route('/register')
def register():
    """Render Employee Registration page."""
    return render_template('register.html')

@app.route('/success/<employee_id>')
def success(employee_id):
    """Render Registration Success confirmation page."""
    employee = get_employee(employee_id)
    if not employee:
        return redirect(url_for('dashboard'))
    return render_template('success.html', employee=employee)

@app.route('/recognize')
def recognize():
    """Render Attendance & Recognition page."""
    return render_template('recognize.html')


# --- REST API Endpoints ---

@app.route('/api/register', methods=['POST'])
def api_register():
    """Register a new employee: saves details, webcam photo, generates encoding and saves both."""
    data = request.json or {}
    employee_id = data.get('employee_id', '').strip()
    name = data.get('name', '').strip()
    department = data.get('department', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    image_data = data.get('image_data', '')
    
    # 1. Validation
    if not all([employee_id, name, department, email, phone, image_data]):
        return jsonify({"success": False, "error": "All fields are required, and face capture is mandatory."}), 400
        
    # Check if Employee ID already exists
    if get_employee(employee_id):
        return jsonify({"success": False, "error": f"Employee ID '{employee_id}' is already registered."}), 400
        
    # 2. Process image and face detection backend-side
    try:
        web_image_path, face_encoding = process_and_register_face(
            image_data, employee_id, app.config['UPLOAD_FOLDER']
        )
    except ValueError as val_err:
        # Graceful face count/validation error (e.g. 0 faces, multiple faces, etc.)
        return jsonify({"success": False, "error": str(val_err)}), 400
    except Exception as e:
        print(f"Server error during face registration: {e}")
        return jsonify({"success": False, "error": "Failed to process face image due to internal error."}), 500
        
    # 3. Write details to Database
    db_success = create_employee(
        employee_id=employee_id,
        name=name,
        department=department,
        email=email,
        phone=phone,
        image_path=web_image_path
    )
    
    if not db_success:
        # Cleanup saved file if database save fails
        local_path = os.path.join(app.root_path, web_image_path)
        if os.path.exists(local_path):
            os.remove(local_path)
        return jsonify({"success": False, "error": "Database error registering employee details."}), 500
        
    # Store face encoding
    encoding_success = add_face_encoding(employee_id, face_encoding)
    if not encoding_success:
        # Cascade will handle employee removal or delete manually
        delete_employee(employee_id)
        local_path = os.path.join(app.root_path, web_image_path)
        if os.path.exists(local_path):
            os.remove(local_path)
        return jsonify({"success": False, "error": "Database error saving face encoding."}), 500
        
    # Refresh cache for recognition terminal
    reload_face_encodings_cache()
    
    return jsonify({
        "success": True,
        "message": "Employee registered successfully!",
        "employee_id": employee_id
    })

@app.route('/api/detect_face_live', methods=['POST'])
def api_detect_face_live():
    """Quick face detection endpoint to draw overlays on the client-side webcam feed during preview."""
    data = request.json or {}
    image_data = data.get('image_data', '')
    if not image_data:
        return jsonify({"success": False, "error": "No image data"}), 400
        
    try:
        img = base64_to_cv2(image_data)
        if img is None:
            return jsonify({"success": False, "error": "Could not decode frame"}), 400
            
        face_locations = detect_face_locations(img)
        faces_coords = []
        for top, right, bottom, left in face_locations:
            faces_coords.append({
                "top": top,
                "right": right,
                "bottom": bottom,
                "left": left
            })
        return jsonify({"success": True, "faces": faces_coords})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/recognize_frame', methods=['POST'])
def api_recognize_frame():
    """Perform face matching on a single video frame. Logs attendance if high-confidence match is found."""
    data = request.json or {}
    image_data = data.get('image_data', '')
    if not image_data:
        return jsonify({"success": False, "error": "No image data"}), 400
        
    try:
        # Run recognition
        matches = recognize_faces_in_frame(image_data, KNOWN_ENCODINGS_CACHE)
        
        # Hydrate matching entries with employee details and log attendance
        hydrated_matches = []
        for match in matches:
            employee_id = match["employee_id"]
            confidence = match["confidence"]
            box = match["box"]
            
            emp_info = None
            attendance_marked = False
            
            # Match is successful if employee_id is resolved (tolerance checks passed in recognition module)
            if employee_id:
                emp_info = get_employee(employee_id)
                if emp_info:
                    # Clean up file path format if needed for absolute references
                    emp_info["image_url"] = "/" + emp_info["image_path"]
                    
                    # Mark attendance (auto-logs status 'Present' if not already logged today)
                    attendance_marked = mark_attendance(employee_id)
                    
            hydrated_matches.append({
                "box": box,
                "employee_id": employee_id,
                "name": emp_info["name"] if emp_info else "Unknown",
                "confidence": confidence,
                "employee_info": emp_info,
                "attendance_marked": attendance_marked
            })
            
        return jsonify({"success": True, "matches": hydrated_matches})
    except Exception as e:
        print(f"Error during frame recognition: {e}")
        return jsonify({"success": False, "error": "Frame recognition failed."}), 500

@app.route('/api/employee/update', methods=['POST'])
def api_employee_update():
    """Update employee details via AJAX."""
    data = request.json or {}
    employee_id = data.get('employee_id', '').strip()
    name = data.get('name', '').strip()
    department = data.get('department', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    
    if not all([employee_id, name, department, email, phone]):
        return jsonify({"success": False, "error": "All fields are required."}), 400
        
    success = update_employee(employee_id, name, department, email, phone)
    if success:
        return jsonify({"success": True, "message": "Employee updated successfully!"})
    else:
        return jsonify({"success": False, "error": "Failed to update employee details."}), 500

@app.route('/api/employee/delete/<employee_id>', methods=['POST'])
def api_employee_delete(employee_id):
    """Delete an employee and their files/data."""
    employee = get_employee(employee_id)
    if not employee:
        return jsonify({"success": False, "error": "Employee not found."}), 404
        
    # Delete image file from system
    image_path = employee["image_path"]
    local_path = os.path.join(app.root_path, image_path)
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception as file_err:
            print(f"Warning: Could not remove employee photo file: {file_err}")
            
    # Delete database record (cascades face_encoding and attendance)
    success = delete_employee(employee_id)
    if success:
        reload_face_encodings_cache()
        return jsonify({"success": True, "message": "Employee deleted successfully."})
    else:
        return jsonify({"success": False, "error": "Failed to delete employee from database."}), 500

@app.route('/api/export_attendance')
def api_export_attendance():
    """Export all attendance logs to a CSV download."""
    try:
        csv_data = export_attendance_csv()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": f"attachment; filename=attendance_log_{os.getpid()}.csv"}
        )
    except Exception as e:
        print(f"Error exporting attendance: {e}")
        return redirect(url_for('dashboard'))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
