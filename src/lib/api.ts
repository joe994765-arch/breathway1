// API service for connecting to Flask backend
const API_BASE_URL = 'http://localhost:5000/api';

export interface WeatherData {
    city: string;
    country: string;
    lat: number;
    lon: number;
    temp: number;
    feels: number;
    condition: string;
    desc: string;
    aqi: number;
    wind_speed: number;
    wind_direction: number;
    humidity: number;
    pressure: number;
    visibility: number;
}

export interface RouteData {
    distance: number;
    duration: number;
    geometry: number[][];
}

export interface RouteResponse {
    success: boolean;
    route: {
        name: string;
        distance: number;
        duration: number;
        aqi: number;
        source: WeatherData;
        destination: WeatherData;
        averages: {
            aqi: number;
            temperature: number;
            wind_speed: number;
        };
        geometry: number[][];
        map_file: string;
        distance_geo: number;
        temperature_difference: number;
    };
}

export interface HistoryResponse {
    success: boolean;
    routes: any[];
    count: number;
}

export interface CityInfo {
    name: string;
    lat: number;
    lon: number;
    country: string;
}

class ApiService {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async getWeather(city: string): Promise<WeatherData> {
        return this.request<WeatherData>(`/weather/${encodeURIComponent(city)}`);
    }

    async getRoute(source: string, destination: string, mode: string = 'driving-car', userEmail?: string): Promise<RouteResponse> {
        return this.request<RouteResponse>('/route', {
            method: 'POST',
            body: JSON.stringify({
                source,
                destination,
                mode,
                user_email: userEmail,
            }),
        });
    }

    async findCity(city: string): Promise<CityInfo> {
        return this.request<CityInfo>(`/city/${encodeURIComponent(city)}`);
    }

    async getHistory(userEmail: string): Promise<HistoryResponse> {
        return this.request<HistoryResponse>(`/history/${encodeURIComponent(userEmail)}`);
    }
}

export const apiService = new ApiService();
