# How to Run Breathway

The project has been separated into `frontend` and `backend` for easier deployment. 

## Local Setup

1.  **Install Dependencies**:
    - **Frontend**: `cd frontend && npm install`
    - **Backend**: `pip install -r backend/requirements.txt`

2.  **Run the Project**:
    - You can use the `start.bat` file in the root directory.
    - **Or manually**:
        - **Backend**: `cd backend && python app.py` (Runs on http://localhost:5000)
        - **Frontend**: `cd frontend && npm run dev` (Runs on http://localhost:8080)

## Environment Variables

Make sure to set your API keys in `backend/.env`:
- `MONGODB_URI`
- `WEATHER_API_KEY`
- `ORS_API_KEY`
- `TOMTOM_API_KEY`

In `frontend/.env`, set:
- `VITE_API_URL=http://localhost:5000` (for local development)
