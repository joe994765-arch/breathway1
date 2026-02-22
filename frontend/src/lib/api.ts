const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

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

export interface TrafficData {
    status: 'light' | 'moderate' | 'heavy' | 'unknown';
    delay_minutes: number;
    average_speed: number;
    samples?: number;
}

export interface RouteInfo {
    name: string;
    type: 'fastest' | 'cleanest' | 'balanced';
    distance: number;
    duration: number;
    traffic_adjusted_duration?: number | null;
    aqi: number;
    score: number;
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
    traffic?: TrafficData | null;
    ml_preference?: number;
    ml_confidence?: number;
    ml_probabilities?: {
        fastest: number;
        cleanest: number;
        balanced: number;
    };
}

export interface RouteResponse {
    success: boolean;
    routes: RouteInfo[];
    recommended: number;
    mode: string;
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

export interface ForecastData {
    date: string;
    day_name: string;
    min_temp: number;
    max_temp: number;
    avg_temp: number;
    wind_speed: number;
    condition: string;
    aqi: number;
}

export interface ForecastResponse {
    city: string;
    country: string;
    forecast: ForecastData[];
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

    async getForecast(city: string): Promise<ForecastResponse> {
        return this.request<ForecastResponse>(`/forecast/${encodeURIComponent(city)}`);
    }

    async getCitiesAqi(): Promise<{ success: boolean; cities: CityAqi[] }> {
        return this.request<{ success: boolean; cities: CityAqi[] }>('/cities/aqi');
    }
}

export interface CityAqi {
    name: string;
    lat: number;
    lon: number;
    aqi: number;
    status: string;
    color: string;
    pollutant: string;
}

export const apiService = new ApiService();
