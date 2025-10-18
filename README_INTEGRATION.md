# Backend-Frontend Integration Guide

This guide explains how to run your Clean Route Radar application with the Flask backend connected to the React frontend.

## 🚀 Quick Start

### 1. Start the Flask Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python app.py
```

Or use the helper script:
```bash
python start_backend.py
```

The backend will be available at `http://localhost:5000`

### 2. Start the React Frontend

In a separate terminal:
```bash
# Install Node.js dependencies (if not already done)
npm install

# Start the React development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔗 API Endpoints

Your Flask backend now provides these JSON API endpoints:

- `GET /api/weather/<city>` - Get weather data for a city
- `POST /api/route` - Calculate route between two cities
- `GET /api/city/<city>` - Find city information

### Example API Usage

```javascript
// Get weather for a city
const weather = await fetch('http://localhost:5000/api/weather/New York')
  .then(res => res.json());

// Calculate route
const route = await fetch('http://localhost:5000/api/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'New York',
    destination: 'Boston',
    mode: 'driving-car'
  })
}).then(res => res.json());
```

## 🎯 How It Works

1. **User Input**: User enters source and destination in the React UI
2. **API Call**: React frontend calls Flask backend API
3. **Data Processing**: Flask backend:
   - Gets weather data for both cities
   - Calculates route using OpenRouteService
   - Returns comprehensive data including AQI, distance, duration
4. **UI Update**: React frontend displays real route data

## 🔧 Configuration

### API Keys
Make sure your API keys are configured in `app.py`:
- OpenWeatherMap API key for weather data
- OpenRouteService API key for routing

### CORS
CORS is enabled to allow React frontend to communicate with Flask backend.

## 🐛 Troubleshooting

### Backend Issues
- Check if Flask server is running on port 5000
- Verify API keys are valid
- Check console for error messages

### Frontend Issues
- Ensure backend is running before starting frontend
- Check browser console for network errors
- Verify API_BASE_URL in `src/lib/api.ts`

### Common Errors
- **CORS errors**: Make sure Flask-CORS is installed and enabled
- **Network errors**: Check if backend is running on correct port
- **API errors**: Verify API keys and internet connection

## 📁 File Structure

```
clean-route-radar/
├── app.py                 # Flask backend server
├── requirements.txt       # Python dependencies
├── start_backend.py       # Helper script to start backend
├── src/
│   ├── lib/
│   │   └── api.ts        # API service for React frontend
│   ├── components/
│   │   ├── RouteInputPanel.tsx
│   │   └── RouteInfoCard.tsx
│   └── pages/
│       └── Dashboard.tsx
└── static/               # Generated map files
```

## 🎉 Success!

Your React frontend is now connected to your Flask backend! Users can:

1. Enter source and destination cities
2. Get real-time weather and AQI data
3. Calculate optimal routes
4. View route information with air quality metrics
5. See generated maps (stored in `/static` folder)

The integration maintains your existing UI while adding real backend functionality.
