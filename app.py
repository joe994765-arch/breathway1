# pip install flask requests geopy folium flask-cors bcryptjs pymongo

from flask import Flask, render_template, request, url_for, jsonify
from flask_cors import CORS
import requests
from geopy.distance import geodesic
import folium
import os
import uuid
import bcrypt
import json
from datetime import datetime
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB connection
MONGODB_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGODB_URI)
db = client.breathway
users_collection = db.users
routes_collection = db.routes

# Simple in-memory user storage (fallback)
users_db = {}

# ----------------- API KEYS -----------------
weather_api_key = "3e048c850e7bcecc34437519ce82156a"
ors_api_key = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxODU4NGMyMGE1NzRkOWJiOTg4MGNhMTU4OWY5NTgzIiwiaCI6Im11cm11cjY0In0="

# Base URLs
weather_url = "https://api.openweathermap.org/data/2.5/weather?"
geocode_url = "https://api.openweathermap.org/geo/1.0/direct?"
pollution_url = "https://api.openweathermap.org/data/2.5/air_pollution?"
ors_url = "https://api.openrouteservice.org/v2/directions/"

# ----------------- FUNCTIONS -----------------
def find_city(city_name):
    try:
        url = f"{geocode_url}q={city_name}&limit=1&appid={weather_api_key}"
        res = requests.get(url)
        data = res.json()
        if len(data) == 0:
            return None
        return {
            "name": data[0]["name"],
            "lat": data[0]["lat"],
            "lon": data[0]["lon"],
            "country": data[0]["country"]
        }
    except requests.RequestException as e:
        print("Geocoding error:", e)
        return None

def get_weather(city):
    city_info = find_city(city)
    if not city_info:
        return None
    lat, lon = city_info["lat"], city_info["lon"]

    # Get weather in Celsius
    try:
        w_res = requests.get(f"{weather_url}lat={lat}&lon={lon}&units=metric&appid={weather_api_key}")
        w_data = w_res.json()
        if w_data.get("cod") != 200:
            return None

        p_res = requests.get(f"{pollution_url}lat={lat}&lon={lon}&appid={weather_api_key}")
        p_data = p_res.json()
        aqi = p_data["list"][0]["main"]["aqi"]

        return {
            "city": city_info["name"],
            "country": city_info["country"],
            "lat": lat,
            "lon": lon,
            "temp": round(w_data["main"]["temp"], 1),
            "feels": round(w_data["main"]["feels_like"], 1),
            "condition": w_data["weather"][0]["main"],
            "desc": w_data["weather"][0]["description"].capitalize(),
            "aqi": aqi,
            "wind_speed": round(w_data["wind"]["speed"], 1),
            "wind_direction": w_data["wind"].get("deg", 0),
            "humidity": w_data["main"]["humidity"],
            "pressure": w_data["main"]["pressure"],
            "visibility": w_data.get("visibility", 0) / 1000  # Convert to km
        }
    except requests.RequestException as e:
        print("Weather/Pollution error:", e)
        return None

def get_route(src, dest, mode="driving-car"):
    headers = {"Authorization": ors_api_key, "Content-Type": "application/json"}
    body = {"coordinates": [[src["lon"], src["lat"]], [dest["lon"], dest["lat"]]]}
    try:
        res = requests.post(ors_url + mode + "/geojson", json=body, headers=headers)
        data = res.json()
        if "features" not in data:
            return None
        summary = data["features"][0]["properties"]["summary"]
        geometry = data["features"][0]["geometry"]["coordinates"]
        return {
            "distance": round(summary["distance"] / 1000, 2),
            "duration": round(summary["duration"] / 60, 1),
            "geometry": geometry
        }
    except Exception as e:
        print("Route Error:", e)
        return None

def aqi_color(aqi):
    if aqi == 1: return "green"
    elif aqi == 2: return "lightgreen"
    elif aqi == 3: return "orange"
    elif aqi == 4: return "red"
    else: return "purple"

def create_map(src, dest, geometry):
    m = folium.Map(location=[(src["lat"] + dest["lat"]) / 2, (src["lon"] + dest["lon"]) / 2], zoom_start=6)
    folium.Marker([src["lat"], src["lon"]],
                  popup=f"{src['city']}, AQI: {src['aqi']}",
                  icon=folium.Icon(color=aqi_color(src["aqi"]), icon="home")).add_to(m)
    folium.Marker([dest["lat"], dest["lon"]],
                  popup=f"{dest['city']}, AQI: {dest['aqi']}",
                  icon=folium.Icon(color=aqi_color(dest["aqi"]), icon="flag")).add_to(m)
    points = [(lat, lon) for lon, lat in geometry]
    folium.PolyLine(points, color="blue", weight=4, opacity=0.7).add_to(m)
    os.makedirs("static", exist_ok=True)
    map_file = f"route_map_{uuid.uuid4().hex}.html"
    map_path = os.path.join("static", map_file)
    m.save(map_path)
    return map_file

# ----------------- ROUTES -----------------
@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        src_city = request.form.get("src_city")
        dest_city = request.form.get("dest_city")
        mode = request.form.get("mode", "driving-car")

        if not src_city or not dest_city:
            return render_template("index.html", error="❌ Please enter both source and destination cities.")

        src_data = get_weather(src_city)
        dest_data = get_weather(dest_city)

        if not src_data or not dest_data:
            return render_template("index.html", error="❌ Invalid city name or data unavailable.")

        dist_geo = round(geodesic((src_data["lat"], src_data["lon"]),
                                  (dest_data["lat"], dest_data["lon"])).km, 2)

        route_data = get_route(src_data, dest_data, mode)
        if not route_data:
            return render_template("index.html", error="⚠️ Route info not available.")

        map_file = create_map(src_data, dest_data, route_data["geometry"])
        diff_temp = round(dest_data["temp"] - src_data["temp"], 1)

        return render_template("result.html",
                               src=src_data,
                               dest=dest_data,
                               route=route_data,
                               diff_temp=diff_temp,
                               dist_geo=dist_geo,
                               map_file=map_file)

    return render_template("index.html")

# ----------------- API ROUTES -----------------
@app.route("/api/weather/<city>", methods=["GET"])
def api_get_weather(city):
    """Get weather data for a specific city"""
    weather_data = get_weather(city)
    if not weather_data:
        return jsonify({"error": "City not found or data unavailable"}), 404
    return jsonify(weather_data)

@app.route("/api/route", methods=["POST"])
def api_get_route():
    """Get single route data between two cities"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    src_city = data.get("source")
    dest_city = data.get("destination")
    mode = data.get("mode", "driving-car")
    
    if not src_city or not dest_city:
        return jsonify({"error": "Both source and destination are required"}), 400
    
    # Get weather data for both cities
    src_data = get_weather(src_city)
    dest_data = get_weather(dest_city)
    
    if not src_data:
        return jsonify({"error": f"Source city '{src_city}' not found"}), 404
    if not dest_data:
        return jsonify({"error": f"Destination city '{dest_city}' not found"}), 404
    
    # Calculate single route
    route_data = get_route(src_data, dest_data, mode)
    if not route_data:
        return jsonify({"error": "Route calculation failed"}), 500
    
    # Calculate additional metrics
    dist_geo = round(geodesic((src_data["lat"], src_data["lon"]),
                              (dest_data["lat"], dest_data["lon"])).km, 2)
    diff_temp = round(dest_data["temp"] - src_data["temp"], 1)
    
    # Calculate averages
    avg_aqi = round((src_data["aqi"] + dest_data["aqi"]) / 2)
    avg_temp = round((src_data["temp"] + dest_data["temp"]) / 2, 1)
    avg_wind_speed = round((src_data["wind_speed"] + dest_data["wind_speed"]) / 2, 1)
    
    # Create map
    map_file = create_map(src_data, dest_data, route_data["geometry"])
    
    # Prepare route data for storage
    route_record = {
        "user_email": data.get("user_email"),  # Will be added from frontend
        "source": src_data,
        "destination": dest_data,
        "route": route_data,
        "averages": {
            "aqi": avg_aqi,
            "temperature": avg_temp,
            "wind_speed": avg_wind_speed
        },
        "distance_geo": dist_geo,
        "temperature_difference": diff_temp,
        "map_file": map_file,
        "created_at": datetime.now().isoformat()
    }
    
    # Store route in MongoDB (if user_email provided)
    if data.get("user_email"):
        try:
            routes_collection.insert_one(route_record)
            print(f"Route stored for user: {data.get('user_email')}")
        except Exception as e:
            print(f"Error storing route: {e}")
    
    # Return single route with comprehensive data
    return jsonify({
        "success": True,
        "route": {
            "name": f"Route from {src_data['city']} to {dest_data['city']}",
            "distance": route_data["distance"],
            "duration": route_data["duration"],
            "aqi": avg_aqi,
            "source": src_data,
            "destination": dest_data,
            "averages": {
                "aqi": avg_aqi,
                "temperature": avg_temp,
                "wind_speed": avg_wind_speed
            },
            "geometry": route_data["geometry"],
            "map_file": map_file,
            "distance_geo": dist_geo,
            "temperature_difference": diff_temp
        }
    })

@app.route("/api/city/<city>", methods=["GET"])
def api_find_city(city):
    """Find city information"""
    city_info = find_city(city)
    if not city_info:
        return jsonify({"error": "City not found"}), 404
    return jsonify(city_info)

@app.route("/api/history/<user_email>", methods=["GET"])
def api_get_history(user_email):
    """Get user's route history"""
    try:
        # Get routes for the user, sorted by creation date (newest first)
        routes = list(routes_collection.find(
            {"user_email": user_email}
        ).sort("created_at", -1).limit(20))  # Limit to last 20 routes
        
        # Convert ObjectId to string for JSON serialization
        for route in routes:
            route["_id"] = str(route["_id"])
        
        return jsonify({
            "success": True,
            "routes": routes,
            "count": len(routes)
        })
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({"error": "Failed to fetch history"}), 500

@app.route("/api/user/<user_email>", methods=["GET"])
def api_get_user(user_email):
    """Get user profile data"""
    try:
        user = users_collection.find_one({"email": user_email})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Convert ObjectId to string
        user["_id"] = str(user["_id"])
        
        return jsonify({
            "success": True,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "created_at": user["created_at"],
                "total_routes": user.get("total_routes", 0),
                "preferences": user.get("preferences", {
                    "default_mode": "driving-car",
                    "optimize_for": "cleanest"
                })
            }
        })
    except Exception as e:
        print(f"User fetch error: {e}")
        return jsonify({"error": "Failed to fetch user data"}), 500

@app.route("/api/history/<user_email>/download/<format>", methods=["GET"])
def api_download_history(user_email, format):
    """Download user's route history in CSV or PDF format"""
    try:
        # Get all routes for the user
        routes = list(routes_collection.find(
            {"user_email": user_email}
        ).sort("created_at", -1))
        
        if format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                "Date", "Source", "Destination", "Distance (km)", "Duration (min)",
                "Source AQI", "Dest AQI", "Avg AQI", "Avg Temp (°C)", "Avg Wind (m/s)"
            ])
            
            # Write data
            for route in routes:
                writer.writerow([
                    route["created_at"][:10],  # Date only
                    route["source"]["city"],
                    route["destination"]["city"],
                    route["route"]["distance"],
                    route["route"]["duration"],
                    route["source"]["aqi"],
                    route["destination"]["aqi"],
                    route["averages"]["aqi"],
                    route["averages"]["temperature"],
                    route["averages"]["wind_speed"]
                ])
            
            from flask import Response
            output.seek(0)
            return Response(
                output.getvalue(),
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment; filename=route_history_{user_email}.csv"}
            )
        
        elif format == "pdf":
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib import colors
            import io
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title = Paragraph(f"Route History for {user_email}", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 20))
            
            # Create table
            data = [["Date", "Source", "Destination", "Distance", "Duration", "Avg AQI"]]
            for route in routes:
                data.append([
                    route["created_at"][:10],
                    route["source"]["city"],
                    route["destination"]["city"],
                    f"{route['route']['distance']} km",
                    f"{route['route']['duration']} min",
                    str(route["averages"]["aqi"])
                ])
            
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
            doc.build(story)
            
            buffer.seek(0)
            return Response(
                buffer.getvalue(),
                mimetype="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=route_history_{user_email}.pdf"}
            )
        
        else:
            return jsonify({"error": "Invalid format. Use 'csv' or 'pdf'"}), 400
            
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({"error": "Failed to generate download"}), 500

# ----------------- AUTHENTICATION ROUTES -----------------
@app.route("/api/auth/signup", methods=["POST"])
def api_signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        print(f"Signup attempt - Data: {data}")  # Debug log
        
        if not data:
            print("No JSON data provided")
            return jsonify({"error": "No JSON data provided"}), 400
        
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        print(f"Signup attempt for: {name} ({email})")  # Debug log
        
        # Validation
        if not name or not email or not password:
            print("Missing required fields")
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        if len(password) < 6:
            print("Password too short")
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Check if user already exists in MongoDB
        existing_user = users_collection.find_one({"email": email})
        if existing_user:
            print(f"User already exists: {email}")
            return jsonify({"error": "User already exists"}), 409
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        print(f"Password hashed successfully")  # Debug log
        
        # Store user in MongoDB
        user_data = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "created_at": datetime.now().isoformat(),
            "total_routes": 0,
            "preferences": {
                "default_mode": "driving-car",
                "optimize_for": "cleanest"
            }
        }
        
        try:
            users_collection.insert_one(user_data)
            print(f"User stored in MongoDB: {email}")
        except Exception as e:
            print(f"MongoDB error: {e}")
            # Fallback to in-memory storage
            users_db[email] = user_data
            print(f"User stored in memory: {email}")
        
        return jsonify({
            "message": "User created successfully",
            "user": {
                "name": name,
                "email": email
            }
        }), 201
        
    except Exception as e:
        print(f"Signup error: {e}")  # Debug log
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    """User login endpoint"""
    try:
        data = request.get_json()
        print(f"Login attempt - Data: {data}")  # Debug log
        print(f"Request headers: {dict(request.headers)}")  # Debug log
        print(f"Request method: {request.method}")  # Debug log
        
        if not data:
            print("No JSON data provided")
            return jsonify({"error": "No JSON data provided"}), 400
        
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        print(f"Login attempt for email: {email}")  # Debug log
        
        # Validation
        if not email or not password:
            print("Missing email or password")
            return jsonify({"error": "Email and password are required"}), 400
        
        # Check if user exists in MongoDB
        user = users_collection.find_one({"email": email})
        if not user:
            # Fallback to in-memory storage
            if email not in users_db:
                print(f"User not found: {email}")
                return jsonify({"error": "Invalid credentials"}), 401
            user = users_db[email]
        
        print(f"User found: {user['name']}")  # Debug log
        
        # Verify password
        password_check = bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8'))
        print(f"Password check result: {password_check}")  # Debug log
        
        if not password_check:
            print("Password verification failed")
            return jsonify({"error": "Invalid credentials"}), 401
        
        print("Login successful")  # Debug log
        return jsonify({
            "message": "Login successful",
            "user": {
                "name": user["name"],
                "email": user["email"]
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")  # Debug log
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True)
