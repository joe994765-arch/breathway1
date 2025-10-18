#!/usr/bin/env python3
"""
Test script to verify the Flask backend integration
"""
import requests
import json

def test_auth_endpoints():
    """Test authentication endpoints"""
    base_url = "http://localhost:5000"
    
    print("🔐 Testing Authentication Endpoints...")
    
    # Test signup
    signup_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/signup", json=signup_data)
        print(f"✅ Signup: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Signup failed: {e}")
    
    # Test login
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"✅ Login: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Login failed: {e}")

def test_route_endpoint():
    """Test route calculation endpoint"""
    base_url = "http://localhost:5000"
    
    print("\n🗺️ Testing Route Endpoint...")
    
    route_data = {
        "source": "New York",
        "destination": "Boston",
        "mode": "driving-car"
    }
    
    try:
        response = requests.post(f"{base_url}/api/route", json=route_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Route calculation successful!")
            print(f"   Route: {data['route']['name']}")
            print(f"   Distance: {data['route']['distance']} km")
            print(f"   Duration: {data['route']['duration']} min")
            print(f"   AQI: {data['route']['aqi']}")
        else:
            print(f"❌ Route calculation failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Route test failed: {e}")

def test_weather_endpoint():
    """Test weather endpoint"""
    base_url = "http://localhost:5000"
    
    print("\n🌤️ Testing Weather Endpoint...")
    
    try:
        response = requests.get(f"{base_url}/api/weather/New York")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Weather data retrieved!")
            print(f"   City: {data['city']}")
            print(f"   Temperature: {data['temp']}°C")
            print(f"   AQI: {data['aqi']}")
        else:
            print(f"❌ Weather test failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Weather test failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing Flask Backend Integration")
    print("=" * 50)
    
    try:
        test_auth_endpoints()
        test_weather_endpoint()
        test_route_endpoint()
        
        print("\n🎉 Integration test completed!")
        print("\n💡 Make sure your Flask server is running:")
        print("   python app.py")
        print("\n💡 And your React frontend:")
        print("   npm run dev")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server.")
        print("   Make sure to start the server first:")
        print("   python app.py")
    except Exception as e:
        print(f"❌ Test failed: {e}")
