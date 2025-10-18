#!/usr/bin/env python3
"""
Quick test script to verify authentication endpoints
"""
import requests
import json

def test_auth():
    base_url = "http://localhost:5000"
    
    print("🔐 Testing Authentication...")
    
    # Test signup first
    print("\n1. Testing Signup...")
    signup_data = {
        "name": "Test User",
        "email": "test@example.com", 
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/signup", json=signup_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test login
    print("\n2. Testing Login...")
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test wrong password
    print("\n3. Testing Wrong Password...")
    wrong_login = {
        "email": "test@example.com",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=wrong_login)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_auth()
