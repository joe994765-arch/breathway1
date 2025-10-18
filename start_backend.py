#!/usr/bin/env python3
"""
Script to start the Flask backend server
"""
import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def start_server():
    """Start the Flask server"""
    try:
        print("🚀 Starting Flask backend server...")
        print("📍 Backend will be available at: http://localhost:5000")
        print("🔗 API endpoints:")
        print("   - GET  /api/weather/<city>")
        print("   - POST /api/route")
        print("   - GET  /api/city/<city>")
        print("\n💡 Make sure to start your React frontend separately with: npm run dev")
        print("\n🛑 Press Ctrl+C to stop the server")
        
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    print("🔧 Setting up Flask backend...")
    if install_requirements():
        start_server()
    else:
        print("❌ Setup failed. Please install dependencies manually:")
        print("   pip install -r requirements.txt")
