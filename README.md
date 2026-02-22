# 🌍 Clean Route Radar

**Clean Route Radar** is an intelligent navigation and environmental monitoring platform designed to help users find the healthiest routes between cities. Unlike standard maps that only prioritize speed, this application uses **Machine Learning** to recommend paths with the best air quality and lowest pollution exposure.

---

## 🚀 Key Features

-   **Cleanest Path Routing**: Calculates multiple route options and identifies the "Cleanest" path based on real-time AQI data.
-   **ML Recommendations**: Uses an **XGBoost** model to predict user preferences and suggest the most balanced route.
-   **Real-time Environmental Monitoring**: 
    -   Live Weather & AQI for any city.
    -   Interactive AQI map of India with state-level and city-level heatmaps.
    -   5-day air quality and weather forecasts.
-   **Traffic Integration**: Real-time traffic delay calculations and speed monitoring via TomTom API.
-   **User Dashboard**: Save route history and analyze pollution exposure over time.

---

## 🛠️ Tech Stack

### Frontend
-   **React + TypeScript**: Modern, type-safe UI development.
-   **Vite**: Ultra-fast build tool and development server.
-   **Tailwind CSS + Shadcn/UI**: Premium, responsive design system.
-   **Leaflet**: Interactive map rendering with custom AQI layers.
-   **Lucide React**: Beautiful, consistent iconography.

### Backend
-   **Flask (Python)**: Robust API handling and heavy data processing.
-   **XGBoost**: Gradient boosted decision trees for the route recommendation engine.
-   **MongoDB**: NoSQL database for flexible storage of user history and route logs.
-   **Folium**: Advanced geospatial data processing.

---

## 🔌 API Integrations

This project aggregates data from multiple world-class providers:
1.  **OpenWeatherMap**: Real-time weather, pollution components (PM2.5, PM10), and forecasts.
2.  **OpenRouteService**: Enterprise-grade routing geometry and distance calculations.
3.  **TomTom Traffic**: Real-time traffic flow and congestion data.

---

## 💻 How to Run Locally

### Prerequisites
-   Python 3.9+
-   Node.js 18+
-   MongoDB (Local or Atlas)

### 1. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Create a .env file with your API keys
# Run the server
python app.py
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## ☁️ Deployment

The project is configured for a **Monorepo deployment on Vercel**:
-   **Frontend**: Hosted as a static site.
-   **Backend**: Hosted as Python Serverless Functions.
-   **Database**: Connected to MongoDB Atlas (Free Tier).

**Clean Route Radar** — *Drive faster, breathe better.*
