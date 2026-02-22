import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Thermometer, Wind, CloudRain, Calendar, ThumbsUp, MapPin, Activity, AlertTriangle } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { apiService, ForecastData, CityAqi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ForecastAnalysisProps {
    defaultCity?: string;
    showNationalOverview?: boolean;
    hideForecast?: boolean;
}

const ForecastAnalysis = ({
    defaultCity = "Delhi",
    showNationalOverview = true,
    hideForecast = false
}: ForecastAnalysisProps) => {
    const [city, setCity] = useState(defaultCity);
    const [searchTerm, setSearchTerm] = useState(defaultCity);
    const [forecast, setForecast] = useState<ForecastData[]>([]);
    const [indiaCities, setIndiaCities] = useState<CityAqi[]>([]);
    const [loading, setLoading] = useState(false);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchForecast(city);
        fetchIndiaCities();
    }, []);

    const fetchForecast = async (cityName: string) => {
        setLoading(true);
        setError("");
        try {
            const data = await apiService.getForecast(cityName);
            if (data && data.forecast) {
                setForecast(data.forecast);
                setCity(data.city); // Update displayed city name from API
                setSearchTerm(data.city);
            }
        } catch (err) {
            setError("Failed to fetch forecast. Please try another city.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchIndiaCities = async () => {
        setCitiesLoading(true);
        try {
            const response = await apiService.getCitiesAqi();
            if (response.success) {
                setIndiaCities(response.cities);
            }
        } catch (err) {
            console.error("Failed to fetch India cities:", err);
        } finally {
            setCitiesLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            fetchForecast(searchTerm);
        }
    };

    const onCitySelect = (cityName: string) => {
        fetchForecast(cityName);
        // Scroll to charts or main view
        const element = document.getElementById("main-forecast-view");
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Prepare Chart Data
    const labels = forecast.map(f => (f.day_name || "Day").slice(0, 3));

    const tempChartData = {
        labels,
        datasets: [
            {
                label: "Avg Temp (°C)",
                data: forecast.map(f => f.avg_temp),
                borderColor: "hsl(24, 96%, 53%)", // Orange
                backgroundColor: "hsla(24, 96%, 53%, 0.1)",
                tension: 0.4,
                fill: true,
            },
            {
                label: "Max Temp (°C)",
                data: forecast.map(f => f.max_temp),
                borderColor: "hsl(0, 84%, 60%)", // Red
                borderDash: [5, 5],
                tension: 0.4,
                fill: false,
            }
        ]
    };

    const aqiChartData = {
        labels,
        datasets: [
            {
                label: "Predicted AQI",
                data: forecast.map(f => f.aqi),
                backgroundColor: forecast.map(f => {
                    if (f.aqi <= 50) return "hsla(142, 76%, 36%, 0.7)"; // Green
                    if (f.aqi <= 100) return "hsla(48, 96%, 53%, 0.7)"; // Yellow
                    if (f.aqi <= 200) return "hsla(24, 96%, 53%, 0.7)"; // Orange
                    if (f.aqi <= 300) return "hsla(0, 84%, 60%, 0.7)"; // Red
                    return "hsla(271, 91%, 65%, 0.7)"; // Purple
                }),
                borderRadius: 4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
        },
        scales: {
            y: { beginAtZero: false }
        }
    };

    // Calculate Best Day
    const bestDay = forecast.length > 0 ? forecast.reduce((best, current) => {
        return (current.aqi < best.aqi) ? current : best;
    }, forecast[0]) : null;

    const getAqiStatus = (aqi: number) => {
        const val = aqi || 0;
        if (val <= 50) return { label: "Good", color: "text-green-600", bg: "bg-green-100" };
        if (val <= 100) return { label: "Moderate", color: "text-yellow-600", bg: "bg-yellow-100" };
        if (val <= 200) return { label: "Poor", color: "text-orange-600", bg: "bg-orange-100" };
        if (val <= 300) return { label: "Unhealthy", color: "text-red-600", bg: "bg-red-100" };
        return { label: "Severe", color: "text-purple-600", bg: "bg-purple-100" };
    };

    return (
        <div className="space-y-8">
            {/* India Cities Overview */}
            {showNationalOverview && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                National Air Quality Index
                            </h2>
                            <p className="text-sm text-muted-foreground">Live pollution levels across major Indian cities</p>
                        </div>
                        <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20">
                            Live Data
                        </Badge>
                    </div>

                    <ScrollArea className="w-full whitespace-nowrap rounded-md">
                        <div className="flex w-max space-x-4 p-4">
                            {indiaCities.map((cityData, index) => (
                                <Card
                                    key={cityData.name || index}
                                    className={`flex-shrink-0 w-64 p-4 glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 ${cityData.aqi <= 50 ? 'border-l-green-500' : cityData.aqi <= 100 ? 'border-l-yellow-500' : 'border-l-red-500'}`}
                                    onClick={() => onCitySelect(cityData.name)}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-lg">{cityData.name}</span>
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black">{cityData.aqi}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getAqiStatus(cityData.aqi).bg} ${getAqiStatus(cityData.aqi).color}`}>
                                                {getAqiStatus(cityData.aqi).label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                            <span>Pollutant: {cityData.pollutant}</span>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                Real-time
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </section>
            )}

            {/* Main Forecast View */}
            {!hideForecast && (
                <Card id="main-forecast-view" className="p-6 glass-card shadow-soft space-y-6 border-t-4 border-t-primary">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                                <CloudRain className="h-6 w-6 text-primary" />
                                5-Day Forecast Analysis
                            </h2>
                            <p className="text-sm text-muted-foreground">Detailed weather and air quality projections for {city}</p>
                        </div>

                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="Enter city name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-[200px] bg-background/50"
                            />
                            <Button type="submit" size="icon" disabled={loading} className="shadow-soft hover:scale-105 transition-transform">
                                <Search className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium animate-pulse">Analyzing meteorological data...</span>
                        </div>
                    ) : forecast.length > 0 ? (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Charts Section */}
                            <div className="space-y-8 bg-black/5 p-4 rounded-xl">
                                <div className="h-[250px] w-full bg-background/50 rounded-lg p-2 shadow-inner">
                                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                        <Thermometer className="h-4 w-4 text-orange-500" />
                                        Temperature Trend
                                    </h3>
                                    <Line data={tempChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                                </div>
                                <div className="h-[250px] w-full bg-background/50 rounded-lg p-2 shadow-inner">
                                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                        <Wind className="h-4 w-4 text-blue-500" />
                                        Air Quality Forecast (AQI)
                                    </h3>
                                    <Bar
                                        data={aqiChartData}
                                        options={{
                                            ...chartOptions,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                ...chartOptions.plugins,
                                                legend: { display: false }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Cards & Summary Section */}
                            <div className="space-y-6">
                                {bestDay && (
                                    <Card className="p-5 bg-primary/10 border-primary/20 shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                            <ThumbsUp className="h-20 w-20" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-primary rounded-lg shadow-soft text-primary-foreground">
                                                <ThumbsUp className="h-5 w-5" />
                                            </div>
                                            <h3 className="font-black text-lg tracking-tight">Best Day to Travel</h3>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <span className="text-4xl font-black text-primary">{bestDay.day_name}</span>
                                            <span className="text-sm font-bold text-muted-foreground mb-1.5">{bestDay.date}</span>
                                        </div>
                                        <div className="mt-6 grid grid-cols-2 gap-4">
                                            <div className="bg-background/80 p-3 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Wind className="h-4 w-4 text-green-600" />
                                                    <span className="text-xs font-bold text-muted-foreground">AQI</span>
                                                </div>
                                                <div className="text-xl font-black">{bestDay.aqi}</div>
                                                <div className={`text-[10px] font-bold uppercase ${getAqiStatus(bestDay.aqi).color}`}>
                                                    {getAqiStatus(bestDay.aqi).label}
                                                </div>
                                            </div>
                                            <div className="bg-background/80 p-3 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Thermometer className="h-4 w-4 text-orange-600" />
                                                    <span className="text-xs font-bold text-muted-foreground">AVG TEMP</span>
                                                </div>
                                                <div className="text-xl font-black">{bestDay.avg_temp}°C</div>
                                                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                                                    {bestDay.condition}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-3">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Daily Breakdown
                                    </h3>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {forecast.map((day) => (
                                            <div
                                                key={day.date}
                                                className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-primary/50 hover:shadow-soft transition-all duration-300 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-center justify-center bg-primary/5 rounded-lg w-12 h-12 group-hover:bg-primary transition-colors">
                                                        <span className="text-[10px] font-black uppercase group-hover:text-primary-foreground">{(day.day_name || "Day").slice(0, 3)}</span>
                                                        <span className="text-xs font-bold group-hover:text-primary-foreground opacity-70">{(day.date || "").split('-')[2] || "--"}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{day.condition}</span>
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            <span className="text-blue-500">{day.min_temp}°</span> / <span className="text-orange-500">{day.max_temp}°</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right flex flex-col items-end">
                                                        <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase italic">Wind Speed</span>
                                                        <span className="text-xs font-bold">{day.wind_speed} m/s</span>
                                                    </div>
                                                    <div className={`w-16 text-center py-1.5 rounded-lg text-xs font-black shadow-sm ${getAqiStatus(day.aqi).bg} ${getAqiStatus(day.aqi).color}`}>
                                                        {day.aqi}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                            <div className="max-w-xs mx-auto space-y-4">
                                <div className="p-4 bg-background rounded-full w-16 h-16 mx-auto flex items-center justify-center shadow-soft">
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-bold text-lg">Region Not Analyzed</h3>
                                <p className="text-sm text-muted-foreground">Select a city from the list above or use the search bar to generate a detailed air quality and weather forecast.</p>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ForecastAnalysis;
