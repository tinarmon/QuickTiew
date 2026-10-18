# -*- coding: utf-8 -*-
"""
QuickTiew - Lightweight NoSQL JSON Backend Server
Standard library only: http.server, json, hashlib, threading
Database: database.json
"""
import os
import sys
import json
import time
import hashlib
import threading
from urllib.parse import urlparse, parse_qs
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000
HOST = "127.0.0.1"
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.json")
DB_LOCK = threading.Lock()

def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = "quicktiew_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def read_db():
    with DB_LOCK:
        if not os.path.exists(DB_FILE):
            default_db = {
                "users": [
                    {
                        "id": "u_student",
                        "username": "นักศึกษา (Guest)",
                        "passwordHash": "",
                        "avatar": "🎓",
                        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "lastLogin": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    }
                ],
                "progress": {
                    "นักศึกษา (Guest)": {
                        "mastered": [],
                        "weakSpots": [],
                        "matchingScores": {},
                        "quizStats": {"correct": 0, "wrong": 0},
                        "lastActive": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    }
                },
                "exam_history": []
            }
            write_db(default_db)
            return default_db
        with open(DB_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except Exception:
                return {"users": [], "progress": {}, "exam_history": []}

def write_db(data):
    with DB_LOCK:
        temp_file = DB_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, DB_FILE)

class QuickTiewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS and no-cache headers for API
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.handle_api_get(path, parse_qs(parsed.query))
            return

        # Default: serve static files
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            try:
                body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except Exception:
                body = {}
            self.handle_api_post(path, body)
            return

        self.send_error(404, "Endpoint not found")

    def send_json(self, data, status=200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    # ---------------- API GET Routes ----------------
    def handle_api_get(self, path, params):
        db = read_db()

        if path == "/api/status":
            self.send_json({
                "status": "online",
                "totalUsers": len(db.get("users", [])),
                "totalExams": len(db.get("exam_history", []))
            })
            return

        if path == "/api/user/progress":
            username = params.get("username", [""])[0]
            if not username:
                self.send_json({"error": "Missing username"}, 400)
                return

            prog = db.get("progress", {}).get(username, {
                "mastered": [],
                "weakSpots": [],
                "matchingScores": {},
                "quizStats": {"correct": 0, "wrong": 0}
            })
            # user's exam history
            user_exams = [e for e in db.get("exam_history", []) if e.get("username") == username]

            self.send_json({
                "username": username,
                "progress": prog,
                "examHistory": user_exams
            })
            return

        if path == "/api/database/export":
            self.send_json(db)
            return

        self.send_json({"error": "API route not found"}, 404)

    # ---------------- API POST Routes ----------------
    def handle_api_post(self, path, body):
        db = read_db()

        # 1. Register
        if path == "/api/register":
            username = body.get("username", "").strip()
            password = body.get("password", "")
            avatar = body.get("avatar", "🎓")

            if not username:
                self.send_json({"success": False, "message": "กรุณาระบุชื่อผู้ใช้"}, 400)
                return

            # Check if user exists
            existing = [u for u in db.get("users", []) if u["username"].lower() == username.lower()]
            if existing:
                self.send_json({"success": False, "message": "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ"}, 400)
                return

            new_user = {
                "id": f"u_{int(time.time()*1000)}",
                "username": username,
                "passwordHash": hash_password(password),
                "avatar": avatar,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "lastLogin": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            db.setdefault("users", []).append(new_user)
            db.setdefault("progress", {})[username] = {
                "mastered": [],
                "weakSpots": [],
                "matchingScores": {},
                "quizStats": {"correct": 0, "wrong": 0},
                "lastActive": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            write_db(db)

            self.send_json({
                "success": True,
                "message": "สมัครสมาชิกสำเร็จ",
                "user": {"username": username, "avatar": avatar},
                "progress": db["progress"][username]
            })
            return

        # 2. Login
        if path == "/api/login":
            username = body.get("username", "").strip()
            password = body.get("password", "")

            if not username:
                self.send_json({"success": False, "message": "กรุณาระบุชื่อผู้ใช้"}, 400)
                return

            # Find user
            user = next((u for u in db.get("users", []) if u["username"].lower() == username.lower()), None)
            if not user:
                # Auto-create if guest or direct quick login
                avatar = body.get("avatar", "🎓")
                new_user = {
                    "id": f"u_{int(time.time()*1000)}",
                    "username": username,
                    "passwordHash": hash_password(password),
                    "avatar": avatar,
                    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "lastLogin": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                db.setdefault("users", []).append(new_user)
                db.setdefault("progress", {})[username] = {
                    "mastered": [],
                    "weakSpots": [],
                    "matchingScores": {},
                    "quizStats": {"correct": 0, "wrong": 0},
                    "lastActive": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                write_db(db)
                self.send_json({
                    "success": True,
                    "message": "สร้างบัญชีผู้ใช้ใหม่และเข้าสู่ระบบเรียบร้อย",
                    "user": {"username": username, "avatar": avatar},
                    "progress": db["progress"][username]
                })
                return

            # If user has a password set, verify it
            if user.get("passwordHash"):
                if hash_password(password) != user["passwordHash"]:
                    self.send_json({"success": False, "message": "รหัสผ่านไม่ถูกต้อง"}, 401)
                    return

            user["lastLogin"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            write_db(db)

            prog = db.get("progress", {}).get(user["username"], {
                "mastered": [],
                "weakSpots": [],
                "matchingScores": {},
                "quizStats": {"correct": 0, "wrong": 0}
            })
            user_exams = [e for e in db.get("exam_history", []) if e.get("username") == user["username"]]

            self.send_json({
                "success": True,
                "message": "เข้าสู่ระบบสำเร็จ",
                "user": {"username": user["username"], "avatar": user.get("avatar", "🎓")},
                "progress": prog,
                "examHistory": user_exams
            })
            return

        # 3. Update Progress
        if path == "/api/user/progress":
            username = body.get("username", "").strip()
            progress_data = body.get("progress", {})

            if not username:
                self.send_json({"error": "Missing username"}, 400)
                return

            db.setdefault("progress", {})[username] = {
                "mastered": progress_data.get("mastered", []),
                "weakSpots": progress_data.get("weakSpots", []),
                "matchingScores": progress_data.get("matchingScores", {}),
                "quizStats": progress_data.get("quizStats", {"correct": 0, "wrong": 0}),
                "lastActive": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            write_db(db)

            self.send_json({"success": True, "saved": True})
            return

        # 4. Save Exam Attempt
        if path == "/api/user/exam":
            username = body.get("username", "นักศึกษา (Guest)").strip()
            exam_record = {
                "id": f"exam_{int(time.time()*1000)}",
                "username": username,
                "score": body.get("score", 0),
                "total": body.get("total", 30),
                "percentage": body.get("percentage", 0),
                "passed": body.get("passed", False),
                "duration": body.get("duration", "30:00"),
                "wrongCount": body.get("wrongCount", 0),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            db.setdefault("exam_history", []).append(exam_record)
            write_db(db)

            self.send_json({"success": True, "examRecord": exam_record})
            return

        self.send_json({"error": "API route not found"}, 404)

def run_server():
    server_address = (HOST, PORT)
    httpd = ThreadingHTTPServer(server_address, QuickTiewHandler)
    print(f"⚡ QuickTiew NoSQL Backend Server running at http://{HOST}:{PORT}/")
    print(f"📁 JSON Database location: {DB_FILE}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
