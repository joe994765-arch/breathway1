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
import concurrent.futures

# Load environment variables
load_dotenv()

# Global ThreadPoolExecutor for background tasks and parallel API calls
executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)

# Import ML model (will auto-train on first import)
try:
    from ml_model import recommender
    ML_ENABLED = True
    print("ML model loaded successfully")
except Exception as e:
    print(f"ML model not available: {e}")
    ML_ENABLED = False

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Explicitly allow /api/ routes from any origin for deployment

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
weather_forecast_url = "https://api.openweathermap.org/data/2.5/forecast?"
pollution_forecast_url = "https://api.openweathermap.org/data/2.5/air_pollution/forecast?"
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

def calculate_indian_aqi(components):
    """
    Calculate Indian AQI from concentrations.
    Dominant pollutants in India are PM2.5 and PM10.
    """
    if not components:
        return 0
    
    pm25 = components.get('pm2_5', 0)
    pm10 = components.get('pm10', 0)
    no2 = components.get('no2', 0)
    
    def get_subindex(conc, breakpoints, aqi_range):
        if conc <= breakpoints[0]:
            return (aqi_range[0] / breakpoints[0]) * conc
        for i in range(len(breakpoints)-1):
            if breakpoints[i] < conc <= breakpoints[i+1]:
                return ((aqi_range[i+1] - aqi_range[i]) / (breakpoints[i+1] - breakpoints[i])) * (conc - breakpoints[i]) + aqi_range[i]
        return aqi_range[-1]

    # PM2.5 Breakpoints (India)
    aqi_pm25 = get_subindex(pm25, [30, 60, 90, 120, 250, 500], [50, 100, 200, 300, 400, 500])
    
    # PM10 Breakpoints (India)
    aqi_pm10 = get_subindex(pm10, [50, 100, 250, 350, 430, 500], [50, 100, 200, 300, 400, 500])
    
    # NO2 Breakpoints (India)
    aqi_no2 = get_subindex(no2, [40, 80, 180, 280, 400, 500], [50, 100, 200, 300, 400, 500])
    
    return round(max(aqi_pm25, aqi_pm10, aqi_no2))

def convert_aqi_to_raw(aqi_index, components=None):
    """Fallback to simple mapping if components not available, else use real calculation"""
    if components:
        return calculate_indian_aqi(components)
    
    if not aqi_index: return 0
    # Mapping: 1=Good(0-50), 2=Fair(50-100), 3=Moderate(100-200), 4=Poor(201-300), 5=Very Poor(301-500)
    base_map = {1: 35, 2: 75, 3: 150, 4: 250, 5: 350}
    return base_map.get(aqi_index, 25)

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
        
        raw_aqi_index = p_data["list"][0]["main"]["aqi"]
        components = p_data["list"][0].get("components")
        aqi = convert_aqi_to_raw(raw_aqi_index, components)

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

def get_weather_forecast(lat, lon):
    """Get 5-day weather forecast"""
    try:
        url = f"{weather_forecast_url}lat={lat}&lon={lon}&units=metric&appid={weather_api_key}"
        res = requests.get(url)
        data = res.json()
        # OWM returns string "200" for success in forecast api, unlike int 200 in weather
        if str(data.get("cod")) != "200":
            return None
        return data["list"]
    except Exception as e:
        print("Weather forecast error:", e)
        return None

def get_aqi_forecast(lat, lon):
    """Get AQI forecast"""
    try:
        url = f"{pollution_forecast_url}lat={lat}&lon={lon}&appid={weather_api_key}"
        res = requests.get(url)
        return res.json().get("list", [])
    except Exception as e:
        print("AQI forecast error:", e)
        return []

def process_forecast_data(weather_list, aqi_list):
    """Process forecast data into daily summaries"""
    daily_data = {}
    
    # Process Weather
    for item in weather_list:
        dt = datetime.fromtimestamp(item["dt"])
        date_str = dt.strftime("%Y-%m-%d")
        
        if date_str not in daily_data:
            daily_data[date_str] = {
                "temps": [],
                "weather": {},
                "wind": [],
                "aqi": []
            }
        
        daily_data[date_str]["temps"].append(item["main"]["temp"])
        daily_data[date_str]["wind"].append(item["wind"]["speed"])
        
        condition = item["weather"][0]["main"]
        daily_data[date_str]["weather"][condition] = daily_data[date_str]["weather"].get(condition, 0) + 1

    # Process AQI
    for item in aqi_list:
        dt = datetime.fromtimestamp(item["dt"])
        date_str = dt.strftime("%Y-%m-%d")
        
        if date_str in daily_data:
            raw_aqi_index = item["main"]["aqi"]
            components = item.get("components")
            daily_data[date_str]["aqi"].append(convert_aqi_to_raw(raw_aqi_index, components))
            
    # Summarize
    forecast = []
    today = datetime.now().strftime("%Y-%m-%d")
    
    for date, data in daily_data.items():
        if date == today: continue # Skip partial today data if desired, or keep
        
        if not data["temps"]: continue
        
        # Most frequent weather condition
        main_condition = max(data["weather"].items(), key=lambda x: x[1])[0]
        
        avg_aqi = 0
        if data["aqi"]:
            avg_aqi = round(sum(data["aqi"]) / len(data["aqi"]))
            
        forecast.append({
            "date": date,
            "day_name": datetime.strptime(date, "%Y-%m-%d").strftime("%A"),
            "min_temp": round(min(data["temps"]), 1),
            "max_temp": round(max(data["temps"]), 1),
            "avg_temp": round(sum(data["temps"]) / len(data["temps"]), 1),
            "wind_speed": round(sum(data["wind"]) / len(data["wind"]), 1),
            "condition": main_condition,
            "aqi": avg_aqi
        })
        
    return sorted(forecast, key=lambda x: x["date"])[:5]

def get_route(src, dest, mode="driving-car", alternatives=True, preference="recommended"):
    """
    Get route(s) from ORS API
    If alternatives=True, requests up to 3 alternative routes
    preference: "fastest" | "shortest" | "recommended"
    """
    headers = {"Authorization": ors_api_key, "Content-Type": "application/json"}
    body = {
        "coordinates": [[src["lon"], src["lat"]], [dest["lon"], dest["lat"]]],
        "preference": preference
    }
    
    # Request alternative routes if enabled
    # ORS uses 'alternative_routes' in options
    if alternatives:
        body["options"] = {
            "avoid_features": []  # Can add features to avoid
        }
        body["alternative_routes"] = {
            "share_factor": 0.6,
            "target_count": 2, # Request 2 alternatives in this batch
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
            raw_index = data["list"][0]["main"]["aqi"]
            components = data["list"][0].get("components")
            return convert_aqi_to_raw(raw_index, components)
        return None
    except Exception as e:
        print(f"AQI fetch error for ({lat}, {lon}):", e)
        return None

def calculate_route_aqi(geometry, src_aqi, dest_aqi):
    """Calculate weighted average AQI along entire route using parallel point sampling"""
    sampled_points = sample_route_points(geometry, interval_km=10)
    
    if len(sampled_points) <= 2:
        return round((src_aqi + dest_aqi) / 2)
    
    # We already have start and end AQIs
    middle_points = sampled_points[1:-1]
    
    # Use global executor
    future_to_point = {executor.submit(get_aqi_for_point, p["lat"], p["lon"]): p for p in middle_points}
    
    aqi_values = [src_aqi]
    for future in concurrent.futures.as_completed(future_to_point):
        try:
            aqi = future.result()
            if aqi is not None:
                aqi_values.append(aqi)
        except Exception as e:
            print(f"Error in parallel AQI fetch: {e}")
                
    aqi_values.append(dest_aqi)
    
    if aqi_values:
        return round(sum(aqi_values) / len(aqi_values))
    return round((src_aqi + dest_aqi) / 2)

def calculate_route_score(distance, duration, aqi, optimization="balanced"):
    """
    Calculate route score based on optimization preference
    Lower score is better.
    AQI is now 0-500, so we normalize it to roughly match duration/distance scales (0-100 approx)
    """
    # Normalize AQI to be roughly 0-100 scale for scoring
    norm_aqi = aqi / 5.0 
    
    if optimization == "fastest":
        # Prioritize time (70%), distance (20%), AQI (10%)
        return (duration * 0.7) + (distance * 0.2) + (norm_aqi * 0.1)
    elif optimization == "cleanest":
        # Prioritize AQI (70%), distance (20%), time (10%)
        return (norm_aqi * 0.7) + (distance * 0.2) + (duration * 0.1)
    else:  # balanced
        # Equal weights
        return (duration * 0.33) + (distance * 0.33) + (norm_aqi * 0.34)

def get_multiple_routes(src, dest, mode="driving-car", include_traffic=True):
    """
    Get multiple different route paths using ORS alternative routes API AND varying preferences.
    Simulates A* with different cost functions (Fastest weighting vs Shortest weighting).
    """
    # Strategy 1: "Fastest" preference (Standard A* with time heuristic)
    print(f"Strategy 1: Requesting 'Fastest' routes from {src['city']} to {dest['city']}...")
    fastest_routes = get_route(src, dest, mode, alternatives=True, preference="fastest") or []
    
    # Strategy 2: "Shortest" preference (A* with distance heuristic) - often completely different path
    print(f"Strategy 2: Requesting 'Shortest' route...")
    shortest_route = get_route(src, dest, mode, alternatives=False, preference="shortest")
    
    raw_routes = []
    
    # Add fastest routes (up to 2)
    if isinstance(fastest_routes, list):
        raw_routes.extend(fastest_routes[:2])
    elif isinstance(fastest_routes, dict):
        raw_routes.append(fastest_routes)
        
    # Add shortest route if distinct
    if shortest_route:
        # Check uniqueness based on geometry length or distance comparison (simple heuristic)
        is_distinct = True
        for r in raw_routes:
            # If distance is very close (< 100m difference), consider same
            if abs(r["distance"] - shortest_route["distance"]) < 0.1: 
                is_distinct = False
                break
        
        if is_distinct:
            print("Shortest route is distinct, adding to set.")
            raw_routes.append(shortest_route)
        else:
            print("Shortest route is duplicate, skipping.")

    # Strategy 3: Forced Detour (if we still don't have enough distinct routes)
    # This ensures "Real Data" difference by forcing a path through a different coordinate
    if len(raw_routes) < 2:
        print("Strategy 3: Routes are identical. Generating a forced detour to ensure variety...")
        
        # Calculate a detour point (midpoint + offset)
        mid_lat = (src["lat"] + dest["lat"]) / 2
        mid_lon = (src["lon"] + dest["lon"]) / 2
        
        # Offset by ~20km (approx 0.2 deg) to force a different path
        # Try two different offsets to find a valid route
        offsets = [(0.15, 0.15), (-0.15, -0.15), (0.15, -0.15)]
        
        for lat_offset, lon_offset in offsets:
            detour_point = {
                "lat": mid_lat + lat_offset, 
                "lon": mid_lon + lon_offset
            }
            
            # Construct body manually for waypoint request
            headers = {"Authorization": ors_api_key, "Content-Type": "application/json"}
            body = {
                "coordinates": [
                    [src["lon"], src["lat"]],
                    [detour_point["lon"], detour_point["lat"]],
                    [dest["lon"], dest["lat"]]
                ],
                "preference": "fastest" # Use fastest to get good roads even on detour
            }
            
            try:
                res = requests.post(ors_url + mode + "/geojson", json=body, headers=headers)
                data = res.json()
                
                if "features" in data and len(data["features"]) > 0:
                    summary = data["features"][0]["properties"]["summary"]
                    geometry = data["features"][0]["geometry"]["coordinates"]
                    
                    detour_route = {
                        "distance": round(summary["distance"] / 1000, 2),
                        "duration": round(summary["duration"] / 60, 1),
                        "geometry": geometry
                    }
                    
                    # Verify it's not absurdly long (e.g. > 2x original) to be a valid alternative
                    base_dist = raw_routes[0]["distance"]
                    if detour_route["distance"] < base_dist * 2.0:
                        print(f"Detour route found via offset ({lat_offset}, {lon_offset})")
                        raw_routes.append(detour_route)
                        break 
            except Exception as e:
                print(f"Detour generation failed: {e}")
                continue

    # Fallback if no routes found
    if not raw_routes:
        print("No routes found from any strategy.")
        return None
    
    print(f"Total distinct routes found: {len(raw_routes)}")
    
    # Process routes
    processed_routes = []
    
    for idx, route_data in enumerate(raw_routes[:3]):  # Limit to 3 max
        # Calculate comprehensive AQI for this route
        route_aqi = calculate_route_aqi(route_data["geometry"], src["aqi"], dest["aqi"])
        
        # Get traffic data for this route (only for first few to save API calls)
        traffic_data = None
        traffic_adjusted_duration = route_data["duration"]
        
        if include_traffic and tomtom_api_key and idx < 2: 
            print(f"Fetching traffic data for route {idx + 1}...")
            traffic_data = get_traffic_data(route_data["geometry"])
            if traffic_data and traffic_data["status"] != "unknown":
                traffic_adjusted_duration = calculate_traffic_adjusted_eta(
                    route_data["duration"], 
                    traffic_data
                )
        
        # Initial type assignment (refined later)
        if idx == 0:
            initial_type = "fastest"
        elif idx == len(raw_routes) - 1:
            initial_type = "balanced" 
        else:
            initial_type = "balanced"

        route = {
            "name": f"Route {idx + 1} from {src['city']} to {dest['city']}",
            "type": initial_type,
            "distance": route_data["distance"],
            "duration": route_data["duration"],
            "traffic_adjusted_duration": traffic_adjusted_duration if traffic_data else None,
            "aqi": route_aqi,
            "geometry": route_data["geometry"],
            "traffic": traffic_data,
            "score": 0 # Calculated below
        }
        processed_routes.append(route)
    
    # Sort/Pad logic - REMOVED PADDING to strictly strictly follow "real data" request
    # If we only have 1 route after all strategies, we just show 1. 2 lines with same data is bad UX.
    
    # Re-calculate indices based on actual data
    if processed_routes:
        fastest_idx = min(range(len(processed_routes)), key=lambda i: processed_routes[i]["traffic_adjusted_duration"] or processed_routes[i]["duration"])
        cleanest_idx = min(range(len(processed_routes)), key=lambda i: processed_routes[i]["aqi"])
        
        # Reset types
        for r in processed_routes: r["type"] = "balanced"
        
        processed_routes[fastest_idx]["type"] = "fastest"
        processed_routes[cleanest_idx]["type"] = "cleanest"
        
        # If same route is both, usually it's just 'fastest' or 'recommended'. 
        if fastest_idx == cleanest_idx:
             processed_routes[fastest_idx]["type"] = "fastest"

    # Calculate final scores
    for route in processed_routes:
        route["score"] = calculate_route_score(
            route["distance"], 
            route["traffic_adjusted_duration"] if route.get("traffic_adjusted_duration") else route["duration"], 
            route["aqi"], 
            route["type"]
        )

    # Determine recommended
    recommended_idx = 0
    if processed_routes:
        cleanest_idx = min(range(len(processed_routes)), key=lambda i: processed_routes[i]["aqi"])
        recommended_idx = cleanest_idx # Default to clean choice
    
    # Apply ML scoring if enabled
    if ML_ENABLED and processed_routes:
        try:
            print("Applying ML scoring...")
            scored_routes, ml_recommended_idx = recommender.get_route_scores(processed_routes)
            recommended_idx = ml_recommended_idx
            processed_routes = scored_routes
        except Exception as e:
            print(f"ML scoring error: {e}")
            recommended_idx = cleanest_idx
    
    return {
        "routes": processed_routes,
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
    # Folium map generation is disabled for Vercel deployment as the React 
    # frontend uses its own Leaflet implementation.
    return None

# ----------------- ROUTES -----------------
@app.route("/")
def home():
    return "Backend is running!"

# ----------------- API ROUTES -----------------
@app.route("/api/weather/<city>", methods=["GET"])
def api_get_weather(city):
    """Get weather data for a specific city"""
    weather_data = get_weather(city)
    if not weather_data:
        return jsonify({"error": "City not found or data unavailable"}), 404
    return jsonify(weather_data)

@app.route("/api/forecast/<city>", methods=["GET"])
def api_get_forecast(city):
    """Get 5-day weather and AQI forecast for a specific city"""
    city_info = find_city(city)
    if not city_info:
        return jsonify({"error": "City not found"}), 404
    
    lat, lon = city_info["lat"], city_info["lon"]
    
    # Get forecasts
    weather_list = get_weather_forecast(lat, lon)
    aqi_list = get_aqi_forecast(lat, lon)
    
    if not weather_list:
        return jsonify({"error": "Forecast data unavailable"}), 500
        
    # Process and combine
    forecast_data = process_forecast_data(weather_list, aqi_list)
    
    return jsonify({
        "city": city_info["name"],
        "country": city_info["country"],
        "forecast": forecast_data
    })

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
            "temperature_difference": diff_temp,
            "traffic": route.get("traffic"),
            "traffic_adjusted_duration": route.get("traffic_adjusted_duration")
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


# State Capitals for AQI estimation
STATE_CAPITALS = {
    "Maharashtra": {"lat": 19.0760, "lon": 72.8777, "capital": "Mumbai"},
    "Delhi": {"lat": 28.6139, "lon": 77.2090, "capital": "New Delhi"},
    "Karnataka": {"lat": 12.9716, "lon": 77.5946, "capital": "Bengaluru"},
    "Tamil Nadu": {"lat": 13.0827, "lon": 80.2707, "capital": "Chennai"},
    "West Bengal": {"lat": 22.5726, "lon": 88.3639, "capital": "Kolkata"},
    "Telangana": {"lat": 17.3850, "lon": 78.4867, "capital": "Hyderabad"},
    "Gujarat": {"lat": 23.0225, "lon": 72.5714, "capital": "Gandhinagar"},
    "Rajasthan": {"lat": 26.9124, "lon": 75.7873, "capital": "Jaipur"},
    "Uttar Pradesh": {"lat": 26.8467, "lon": 80.9462, "capital": "Lucknow"},
    "Punjab": {"lat": 30.7333, "lon": 76.7794, "capital": "Chandigarh"},
    "Kerala": {"lat": 8.5241, "lon": 76.9366, "capital": "Thiruvananthapuram"},
    "Bihar": {"lat": 25.5941, "lon": 85.1376, "capital": "Patna"},
    "Madhya Pradesh": {"lat": 23.2599, "lon": 77.4126, "capital": "Bhopal"},
    "Odisha": {"lat": 20.2961, "lon": 85.8245, "capital": "Bhubaneswar"},
    "Orissa": {"lat": 20.2961, "lon": 85.8245, "capital": "Bhubaneswar"},
    "Assam": {"lat": 26.1445, "lon": 91.7362, "capital": "Dispur"},
    "Andhra Pradesh": {"lat": 15.9129, "lon": 79.7400, "capital": "Amaravati"},
    "Haryana": {"lat": 30.7333, "lon": 76.7794, "capital": "Chandigarh"},
    "Himachal Pradesh": {"lat": 31.1048, "lon": 77.1734, "capital": "Shimla"},
    "Uttarakhand": {"lat": 30.3165, "lon": 78.0322, "capital": "Dehradun"},
    "Uttaranchal": {"lat": 30.3165, "lon": 78.0322, "capital": "Dehradun"},
    "Chhattisgarh": {"lat": 21.2514, "lon": 81.6296, "capital": "Raipur"},
    "Jharkhand": {"lat": 23.3441, "lon": 85.3096, "capital": "Ranchi"},
    "Goa": {"lat": 15.4909, "lon": 73.8278, "capital": "Panaji"},
    "Sikkim": {"lat": 27.3314, "lon": 88.6138, "capital": "Gangtok"},
    "Arunachal Pradesh": {"lat": 27.0844, "lon": 93.6053, "capital": "Itanagar"},
    "Nagaland": {"lat": 25.6751, "lon": 94.1086, "capital": "Kohima"},
    "Manipur": {"lat": 24.8170, "lon": 93.9368, "capital": "Imphal"},
    "Mizoram": {"lat": 23.7271, "lon": 92.7176, "capital": "Aizawl"},
    "Tripura": {"lat": 23.8315, "lon": 91.2868, "capital": "Agartala"},
    "Meghalaya": {"lat": 25.5788, "lon": 91.8933, "capital": "Shillong"},
    "Jammu and Kashmir": {"lat": 34.0837, "lon": 74.7973, "capital": "Srinagar"},
    "Ladakh": {"lat": 34.1526, "lon": 77.5770, "capital": "Leh"},
    "Andaman and Nicobar Islands": {"lat": 11.6234, "lon": 92.7265, "capital": "Port Blair"},
    "Andaman and Nicobar": {"lat": 11.6234, "lon": 92.7265, "capital": "Port Blair"},
    "Puducherry": {"lat": 11.9416, "lon": 79.8083, "capital": "Puducherry"},
    "Dadra and Nagar Haveli and Daman and Diu": {"lat": 20.4283, "lon": 72.8397, "capital": "Daman"},
    "Dadra and Nagar Haveli": {"lat": 20.2666, "lon": 73.0169, "capital": "Silvassa"},
    "Daman and Diu": {"lat": 20.4283, "lon": 72.8397, "capital": "Daman"},
    "Lakshadweep": {"lat": 10.5667, "lon": 72.6417, "capital": "Kavaratti"}
}


# Major Cities for City-level AQI visualization
MAJOR_CITIES = {
    # Metros
    "Delhi": {"lat": 28.6139, "lon": 77.2090},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Pune": {"lat": 18.5204, "lon": 73.8567},
    
    # North
    "Lucknow": {"lat": 26.8467, "lon": 80.9462},
    "Kanpur": {"lat": 26.4499, "lon": 80.3319},
    "Jaipur": {"lat": 26.9124, "lon": 75.7873},
    "Chandigarh": {"lat": 30.7333, "lon": 76.7794},
    "Srinagar": {"lat": 34.0837, "lon": 74.7973},
    
    # South
    "Thiruvananthapuram": {"lat": 8.5241, "lon": 76.9366},
    "Kochi": {"lat": 9.9312, "lon": 76.2673},
    "Visakhapatnam": {"lat": 17.6868, "lon": 83.2185},
    
    # East
    "Bhubaneswar": {"lat": 20.2961, "lon": 85.8245},
    "Patna": {"lat": 25.5941, "lon": 85.1376},
    "Guwahati": {"lat": 26.1158, "lon": 91.7086},
    
    # West/Central
    "Indore": {"lat": 22.7196, "lon": 75.8577},
    "Bhopal": {"lat": 23.2599, "lon": 77.4126},
    "Nagpur": {"lat": 21.1458, "lon": 79.0882},
}

def get_aqi_color_status(aqi_val):
    if aqi_val <= 50:
        return "Good", "#22c55e" # Green
    elif aqi_val <= 100:
        return "Moderate", "#eab308" # Yellow
    elif aqi_val <= 200:
        return "Poor", "#f97316" # Orange
    elif aqi_val <= 300:
        return "Unhealthy", "#ef4444" # Red
    elif aqi_val <= 400:
        return "Severe", "#a855f7" # Purple
    else:
        return "Hazardous", "#7f1d1d" # Maroon

@app.route('/api/states/aqi', methods=['GET'])
def get_states_aqi():
    states_data = []
    
    def fetch_state_aqi(state_info):
        state, info = state_info
        aqi_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={info['lat']}&lon={info['lon']}&appid={weather_api_key}"
        try:
            res = requests.get(aqi_url, timeout=5).json()
            if "list" in res and len(res["list"]) > 0:
                raw_aqi = res["list"][0]["main"]["aqi"]
                components = res["list"][0].get("components")
                aqi_val = convert_aqi_to_raw(raw_aqi, components)
                status, color = get_aqi_color_status(aqi_val)
                return {
                    "state": state,
                    "aqi": aqi_val,
                    "status": status,
                    "color": color
                }
        except Exception as e:
            print(f"Error fetching AQI for {state}: {e}")
        return None

    results = list(executor.map(fetch_state_aqi, STATE_CAPITALS.items()))
    
    states_data = [r for r in results if r]
    return jsonify({"success": True, "states": states_data})

@app.route('/api/cities/aqi', methods=['GET'])
def get_cities_aqi():
    cities_data = []
    
    def fetch_city_aqi(city_info):
        name, info = city_info
        aqi_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={info['lat']}&lon={info['lon']}&appid={weather_api_key}"
        try:
            res = requests.get(aqi_url, timeout=3).json()
            if "list" in res and len(res["list"]) > 0:
                raw_aqi = res["list"][0]["main"]["aqi"]
                components = res["list"][0].get("components")
                aqi_val = convert_aqi_to_raw(raw_aqi, components)
                
                main_pollutant = "PM2.5"
                if components:
                    main_pollutant = max(components, key=components.get).upper()

                status, color = get_aqi_color_status(aqi_val)

                return {
                    "name": name,
                    "lat": info["lat"],
                    "lon": info["lon"],
                    "aqi": aqi_val,
                    "status": status,
                    "color": color,
                    "pollutant": main_pollutant
                }
        except Exception as e:
            print(f"Error fetching AQI for {name}: {e}")
        return None

    results = list(executor.map(fetch_city_aqi, MAJOR_CITIES.items()))
        
    cities_data = [r for r in results if r]
    return jsonify({"success": True, "cities": cities_data})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Use Render's PORT
    app.run(host="0.0.0.0", port=port)       # Bind to 0.0.0.0
