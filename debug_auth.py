#!/usr/bin/env python3
"""
Debug authentication issues
"""
import requests
import json

def test_step_by_step():
    base_url = "http://localhost:5000"
    
    print("🔍 Debugging Authentication Step by Step")
    print("=" * 50)
    
    # Step 1: Test signup
    print("\n1️⃣ Testing Signup...")
    signup_data = {
        "name": "Debug User",
        "email": "debug@test.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/signup", json=signup_data)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 201:
            print("   ✅ Signup successful")
        elif response.status_code == 409:
            print("   ⚠️ User already exists, proceeding to login...")
        else:
            print("   ❌ Signup failed")
            return
    except Exception as e:
        print(f"   ❌ Signup error: {e}")
        return
    
    # Step 2: Test login with same credentials
    print("\n2️⃣ Testing Login...")
    login_data = {
        "email": "debug@test.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 200:
            print("   ✅ Login successful")
        else:
            print("   ❌ Login failed")
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    # Step 3: Test login with wrong password
    print("\n3️⃣ Testing Wrong Password...")
    wrong_login = {
        "email": "debug@test.com",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=wrong_login)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 401:
            print("   ✅ Correctly rejected wrong password")
        else:
            print("   ❌ Should have rejected wrong password")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_step_by_step()
