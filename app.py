# pip install flask requests geopy folium flask-cors bcryptjs pymongo python-dotenv

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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import ML model (will auto-train on first import)
try:
    from ml_model import recommender
    ML_ENABLED = True
    print("ML model loaded successfully")
except Exception as e:
    print(f"ML model not available: {e}")
    ML_ENABLED = False

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGODB_URI)
db = client.breathway
users_collection = db.users
routes_collection = db.routes

# Simple in-memory user storage (fallback)
users_db = {}

# ----------------- API KEYS -----------------
weather_api_key = os.getenv("WEATHER_API_KEY")
ors_api_key = os.getenv("ORS_API_KEY")
tomtom_api_key = os.getenv("TOMTOM_API_KEY")

# Base URLs
weather_url = "https://api.openweathermap.org/data/2.5/weather?"
geocode_url = "https://api.openweathermap.org/geo/1.0/direct?"
pollution_url = "https://api.openweathermap.org/data/2.5/air_pollution?"
ors_url = "https://api.openrouteservice.org/v2/directions/"
tomtom_traffic_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

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

def get_route(src, dest, mode="driving-car", alternatives=True):
    """
    Get route(s) from ORS API
    If alternatives=True, requests up to 3 alternative routes
    """
    headers = {"Authorization": ors_api_key, "Content-Type": "application/json"}
    body = {
        "coordinates": [[src["lon"], src["lat"]], [dest["lon"], dest["lat"]]]
    }
    
    # Request alternative routes if enabled
    # ORS uses 'alternative_routes' in options
    if alternatives:
        body["options"] = {
            "avoid_features": []  # Can add features to avoid
        }
        body["alternative_routes"] = {
            "share_factor": 0.6,
            "target_count": 2,
            "weight_factor": 1.4
        }
    
    try:
        res = requests.post(ors_url + mode + "/geojson", json=body, headers=headers)
        data = res.json()
        
        # Check for errors
        if "error" in data:
            print(f"ORS API Error: {data['error']}")
            return None
        
        if "features" not in data or len(data["features"]) == 0:
            return None
        
        # If alternatives requested, return all routes
        if alternatives:
            routes = []
            for feature in data["features"]:
                summary = feature["properties"]["summary"]
                geometry = feature["geometry"]["coordinates"]
                routes.append({
                    "distance": round(summary["distance"] / 1000, 2),
                    "duration": round(summary["duration"] / 60, 1),
                    "geometry": geometry
                })
            return routes if len(routes) > 0 else None
        else:
            # Return single route
            summary = data["features"][0]["properties"]["summary"]
            geometry = data["features"][0]["geometry"]["coordinates"]
            return {
                "distance": round(summary["distance"] / 1000, 2),
                "duration": round(summary["duration"] / 60, 1),
                "geometry": geometry
            }
    except Exception as e:
        print("Route Error:", e)
        import traceback
        traceback.print_exc()
        return None

def sample_route_points(geometry, interval_km=5):
    """Sample points along route at specified intervals (in km)"""
    from geopy.distance import geodesic
    
    if not geometry or len(geometry) < 2:
        return []
    
    sampled_points = []
    total_distance = 0
    last_sampled_distance = 0
    
    # Always include first point
    sampled_points.append({
        "lat": geometry[0][1],
        "lon": geometry[0][0],
        "distance": 0
    })
    
    for i in range(1, len(geometry)):
        prev_point = (geometry[i-1][1], geometry[i-1][0])  # (lat, lon)
        curr_point = (geometry[i][1], geometry[i][0])
        
        segment_distance = geodesic(prev_point, curr_point).km
        total_distance += segment_distance
        
        # Sample if we've traveled enough distance
        if total_distance - last_sampled_distance >= interval_km:
            sampled_points.append({
                "lat": geometry[i][1],
                "lon": geometry[i][0],
                "distance": round(total_distance, 2)
            })
            last_sampled_distance = total_distance
    
    # Always include last point
    if len(geometry) > 1:
        sampled_points.append({
            "lat": geometry[-1][1],
            "lon": geometry[-1][0],
            "distance": round(total_distance, 2)
        })
    
    return sampled_points

def get_aqi_for_point(lat, lon):
    """Get AQI data for a specific coordinate"""
    try:
        res = requests.get(f"{pollution_url}lat={lat}&lon={lon}&appid={weather_api_key}")
        data = res.json()
        if "list" in data and len(data["list"]) > 0:
            return data["list"][0]["main"]["aqi"]
        return None
    except Exception as e:
        print(f"AQI fetch error for ({lat}, {lon}):", e)
        return None

def calculate_route_aqi(geometry, src_aqi, dest_aqi):
    """Calculate weighted average AQI along entire route"""
    sampled_points = sample_route_points(geometry, interval_km=10)
    
    if len(sampled_points) <= 2:
        # For short routes, just average source and destination
        return round((src_aqi + dest_aqi) / 2)
    
    aqi_values = [src_aqi]  # Start with source AQI
    
    # Get AQI for middle points (skip first and last as we have those)
    for point in sampled_points[1:-1]:
        aqi = get_aqi_for_point(point["lat"], point["lon"])
        if aqi:
            aqi_values.append(aqi)
    
    aqi_values.append(dest_aqi)  # End with destination AQI
    
    # Calculate weighted average
    if aqi_values:
        return round(sum(aqi_values) / len(aqi_values))
    return round((src_aqi + dest_aqi) / 2)

def calculate_route_score(distance, duration, aqi, optimization="balanced"):
    """
    Calculate route score based on optimization preference
    Lower score is better
    """
    if optimization == "fastest":
        # Prioritize time (70%), distance (20%), AQI (10%)
        return (duration * 0.7) + (distance * 0.2) + (aqi * 0.1)
    elif optimization == "cleanest":
        # Prioritize AQI (70%), distance (20%), time (10%)
        return (aqi * 0.7) + (distance * 0.2) + (duration * 0.1)
    else:  # balanced
        # Equal weights
        return (duration * 0.33) + (distance * 0.33) + (aqi * 0.34)

def get_multiple_routes(src, dest, mode="driving-car", include_traffic=True):
    """
    Get multiple different route paths using ORS alternative routes API.
    Returns up to 3 distinct route paths with different characteristics.
    Falls back to single route if alternatives not available.
    """
    # Get alternative routes from ORS API
    print(f"Requesting alternative routes from {src['city']} to {dest['city']}...")
    alternative_routes = get_route(src, dest, mode, alternatives=True)
    
    # Fallback: if alternatives failed, get single route
    if not alternative_routes or len(alternative_routes) == 0:
        print("Alternative routes not available, fetching single route...")
        single_route = get_route(src, dest, mode, alternatives=False)
        if not single_route:
            print("No routes found")
            return None
        alternative_routes = [single_route]
    
    print(f"Found {len(alternative_routes)} route(s)")
    
    # Process each alternative route
    routes = []
    route_types = ["fastest", "cleanest", "balanced"]  # Labels for the routes
    
    for idx, route_data in enumerate(alternative_routes[:3]):  # Max 3 routes
        # Calculate comprehensive AQI for this route
        route_aqi = calculate_route_aqi(route_data["geometry"], src["aqi"], dest["aqi"])
        
        # Get traffic data for this route (if enabled)
        traffic_data = None
        traffic_adjusted_duration = route_data["duration"]
        
        if include_traffic and tomtom_api_key and idx == 0:  # Only get traffic for first route to save API calls
            print(f"Fetching traffic data for route {idx + 1}...")
            traffic_data = get_traffic_data(route_data["geometry"])
            if traffic_data and traffic_data["status"] != "unknown":
                traffic_adjusted_duration = calculate_traffic_adjusted_eta(
                    route_data["duration"], 
                    traffic_data
                )
                print(f"Traffic: {traffic_data['status']}, Delay: {traffic_data['delay_minutes']} min")
        
        # Determine route type based on characteristics
        route_type = route_types[min(idx, len(route_types) - 1)]
        
        route = {
            "name": f"Route {idx + 1} from {src['city']} to {dest['city']}",
            "type": route_type,
            "distance": route_data["distance"],
            "duration": route_data["duration"],
            "traffic_adjusted_duration": traffic_adjusted_duration if traffic_data else None,
            "aqi": route_aqi,
            "geometry": route_data["geometry"],
            "traffic": traffic_data,
            "score": calculate_route_score(
                route_data["distance"], 
                traffic_adjusted_duration, 
                route_aqi, 
                route_type
            )
        }
        routes.append(route)
    
    # If we got less than 3 routes, pad with the first route scored differently
    while len(routes) < 3:
        base_route = routes[0]
        idx = len(routes)
        route_type = route_types[idx]
        
        padded_route = {
            "name": f"Route {idx + 1} from {src['city']} to {dest['city']}",
            "type": route_type,
            "distance": base_route["distance"],
            "duration": base_route["duration"],
            "traffic_adjusted_duration": base_route["traffic_adjusted_duration"],
            "aqi": base_route["aqi"],
            "geometry": base_route["geometry"],
            "traffic": base_route["traffic"],
            "score": calculate_route_score(
                base_route["distance"],
                base_route["duration"],
                base_route["aqi"],
                route_type
            )
        }
        routes.append(padded_route)
    
    # Sort routes by their characteristics if we have multiple distinct routes
    if len(alternative_routes) > 1:
        # Find actual fastest (shortest duration)
        fastest_idx = min(range(len(routes)), key=lambda i: routes[i]["duration"])
        # Find actual cleanest (lowest AQI)
        cleanest_idx = min(range(len(routes)), key=lambda i: routes[i]["aqi"])
        
        # Reassign types based on actual characteristics
        routes[fastest_idx]["type"] = "fastest"
        routes[cleanest_idx]["type"] = "cleanest"
        # The remaining one is balanced
        for idx in range(len(routes)):
            if idx != fastest_idx and idx != cleanest_idx:
                routes[idx]["type"] = "balanced"
                break
    
    # Determine recommended index
    cleanest_idx = min(range(len(routes)), key=lambda i: routes[i]["aqi"])
    
    # Apply ML scoring if enabled
    if ML_ENABLED:
        try:
            print("Applying ML scoring...")
            scored_routes, ml_recommended_idx = recommender.get_route_scores(routes)
            recommended_idx = ml_recommended_idx
            routes = scored_routes
            print(f"ML recommended route: {routes[recommended_idx]['type']} (confidence: {routes[recommended_idx].get('ml_confidence', 0):.2%})")
        except Exception as e:
            print(f"ML scoring error: {e}")
            recommended_idx = cleanest_idx  # Fallback to cleanest
    else:
        # Recommend cleanest route by default
        recommended_idx = cleanest_idx
    
    return {
        "routes": routes,
        "recommended": recommended_idx
    }

def get_traffic_for_point(lat, lon):
    """Get traffic data for a specific point using TomTom API"""
    try:
        params = {
            "key": tomtom_api_key,
            "point": f"{lat},{lon}",
            "unit": "KMPH"
        }
        
        url = f"{tomtom_traffic_url}?key={tomtom_api_key}&point={lat},{lon}&unit=KMPH"
        res = requests.get(url, timeout=5)
        
        if res.status_code == 200:
            data = res.json()
            if "flowSegmentData" in data:
                flow = data["flowSegmentData"]
                return {
                    "current_speed": flow.get("currentSpeed", 0),
                    "free_flow_speed": flow.get("freeFlowSpeed", 0),
                    "current_travel_time": flow.get("currentTravelTime", 0),
                    "free_flow_travel_time": flow.get("freeFlowTravelTime", 0),
                    "confidence": flow.get("confidence", 0)
                }
        return None
    except Exception as e:
        print(f"Traffic fetch error for ({lat}, {lon}):", e)
        return None

def get_traffic_data(geometry):
    """Sample traffic data along route"""
    if not geometry or len(geometry) < 2:
        return {
            "status": "unknown",
            "delay_minutes": 0,
            "average_speed": 0
        }
    
    # Sample fewer points for traffic (every 20km to reduce API calls)
    sampled_points = sample_route_points(geometry, interval_km=20)
    
    if len(sampled_points) < 2:
        return {
            "status": "unknown",
            "delay_minutes": 0,
            "average_speed": 0
        }
    
    traffic_data = []
    total_delay = 0
    speeds = []
    
    # Get traffic for sampled points
    for point in sampled_points[:5]:  # Limit to 5 points to avoid rate limits
        traffic = get_traffic_for_point(point["lat"], point["lon"])
        if traffic:
            traffic_data.append(traffic)
            speeds.append(traffic["current_speed"])
            
            # Calculate delay
            if traffic["free_flow_travel_time"] > 0:
                delay_seconds = traffic["current_travel_time"] - traffic["free_flow_travel_time"]
                total_delay += delay_seconds
    
    if not speeds:
        return {
            "status": "unknown",
            "delay_minutes": 0,
            "average_speed": 0
        }
    
    avg_speed = sum(speeds) / len(speeds)
    delay_minutes = round(total_delay / 60, 1)
    
    # Determine traffic status
    if delay_minutes < 5:
        status = "light"
    elif delay_minutes < 15:
        status = "moderate"
    else:
        status = "heavy"
    
    return {
        "status": status,
        "delay_minutes": delay_minutes,
        "average_speed": round(avg_speed, 1),
        "samples": len(traffic_data)
    }

def calculate_traffic_adjusted_eta(base_duration, traffic_data):
    """Calculate ETA adjusted for traffic"""
    if not traffic_data or traffic_data["status"] == "unknown":
        return base_duration
    
    # Add traffic delay to base duration
    adjusted_duration = base_duration + traffic_data["delay_minutes"]
    
    return round(adjusted_duration, 1)

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
    """Get multiple route options between two cities"""
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
    
    # Calculate multiple routes
    multi_route_data = get_multiple_routes(src_data, dest_data, mode)
    if not multi_route_data:
        return jsonify({"error": "Route calculation failed"}), 500
    
    # Calculate additional metrics
    dist_geo = round(geodesic((src_data["lat"], src_data["lon"]),
                              (dest_data["lat"], dest_data["lon"])).km, 2)
    diff_temp = round(dest_data["temp"] - src_data["temp"], 1)
    
    # Calculate averages
    avg_temp = round((src_data["temp"] + dest_data["temp"]) / 2, 1)
    avg_wind_speed = round((src_data["wind_speed"] + dest_data["wind_speed"]) / 2, 1)
    
    # Enhance each route with source/destination data
    enhanced_routes = []
    for route in multi_route_data["routes"]:
        # Create map for this route
        map_file = create_map(src_data, dest_data, route["geometry"])
        
        enhanced_route = {
            "name": route["name"],
            "type": route["type"],
            "distance": route["distance"],
            "duration": route["duration"],
            "aqi": route["aqi"],
            "score": route["score"],
            "source": src_data,
            "destination": dest_data,
            "averages": {
                "aqi": route["aqi"],
                "temperature": avg_temp,
                "wind_speed": avg_wind_speed
            },
            "geometry": route["geometry"],
            "map_file": map_file,
            "distance_geo": dist_geo,
            "temperature_difference": diff_temp
        }
        enhanced_routes.append(enhanced_route)
    
    # Prepare route data for storage (store recommended route)
    recommended_route = enhanced_routes[multi_route_data["recommended"]]
    route_record = {
        "user_email": data.get("user_email"),
        "source": src_data,
        "destination": dest_data,
        "route": {
            "distance": recommended_route["distance"],
            "duration": recommended_route["duration"],
            "geometry": recommended_route["geometry"]
        },
        "averages": recommended_route["averages"],
        "distance_geo": dist_geo,
        "temperature_difference": diff_temp,
        "map_file": recommended_route["map_file"],
        "mode": mode,
        "created_at": datetime.now().isoformat()
    }
    
    # Store route in MongoDB (if user_email provided)
    if data.get("user_email"):
        try:
            routes_collection.insert_one(route_record)
            print(f"Route stored for user: {data.get('user_email')}")
        except Exception as e:
            print(f"Error storing route: {e}")
    
    # Return multiple routes
    return jsonify({
        "success": True,
        "routes": enhanced_routes,
        "recommended": multi_route_data["recommended"],
        "mode": mode
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
