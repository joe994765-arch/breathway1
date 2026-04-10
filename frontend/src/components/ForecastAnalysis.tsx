import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Thermometer, Wind, CloudRain, Calendar, ThumbsUp } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { apiService, ForecastData } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface ForecastAnalysisProps {
    defaultCity?: string;
}

const ForecastAnalysis = ({ defaultCity = "Delhi" }: ForecastAnalysisProps) => {
    const [city, setCity] = useState(defaultCity);
    const [searchTerm, setSearchTerm] = useState(defaultCity);
    const [forecast, setForecast] = useState<ForecastData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [openDay, setOpenDay] = useState<string | null>(null);

    useEffect(() => {
        fetchForecast(city);
    }, []);

    const fetchForecast = async (cityName: string) => {
        setLoading(true);
        setError("");
        try {
            const data = await apiService.getForecast(cityName);
            if (data && data.forecast) {
                setForecast(data.forecast);
                setCity(data.city); // Update displayed city name from API
            }
        } catch (err) {
            setError("Failed to fetch forecast. Please try another city.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            fetchForecast(searchTerm);
        }
    };

    // Prepare Chart Data
    const labels = forecast.map(f => f.day_name.slice(0, 3)); // Mon, Tue...

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
                    if (f.aqi <= 150) return "hsla(24, 96%, 53%, 0.7)"; // Orange
                    return "hsla(0, 84%, 60%, 0.7)"; // Red
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
            y: { beginAtZero: false } // Temp/AQI usually doesn't start at 0 for visualization
        }
    };

    // Calculate Best Day
    const bestDay = forecast.length > 0 ? forecast.reduce((best, current) => {
        // Simple scoring: Lower AQI is better. Moderate temps (20-30) are nice.
        // For now, prioritize AQI.
        return (current.aqi < best.aqi) ? current : best;
    }, forecast[0]) : null;

    if (!bestDay && forecast.length > 0) return null; // Should not happen given logic above


    return (
        <Card className="p-6 glass-card shadow-soft space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CloudRain className="h-5 w-5 text-primary" />
                        5-Day Forecast Analysis
                    </h2>
                    <p className="text-sm text-muted-foreground">Predicted weather and air quality for {city}</p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        placeholder="Search city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-[200px]"
                    />
                    <Button type="submit" size="icon" disabled={loading}>
                        <Search className="h-4 w-4" />
                    </Button>
                </form>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Loading forecast data...
                </div>
            ) : forecast.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Charts */}
                    <div className="space-y-6">
                        <div className="h-[200px] w-full">
                            <h3 className="text-sm font-semibold mb-2 text-center">Temperature Trend</h3>
                            <Line data={tempChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                        </div>
                        <div className="h-[200px] w-full">
                            <h3 className="text-sm font-semibold mb-2 text-center">Air Quality Forecast</h3>
                            <Bar data={aqiChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>

                    {/* Cards & Summary */}
                    <div className="space-y-4">
                        {bestDay && (
                            <Card className="p-4 bg-primary/5 border-primary/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <ThumbsUp className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold">Best Day to Travel</h3>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold">{bestDay.day_name}</span>
                                    <span className="text-sm text-muted-foreground mb-1">({bestDay.date})</span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Wind className="h-4 w-4 text-green-600" />
                                        <span>AQI: <strong>{bestDay.aqi}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Thermometer className="h-4 w-4 text-orange-600" />
                                        <span>Temp: <strong>{bestDay.avg_temp}°C</strong></span>
                                    </div>
                                    <div className="col-span-2 text-muted-foreground italic mt-1">
                                        Condition: {bestDay.condition}
                                    </div>
                                </div>
                            </Card>
                        )}

                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Daily Breakdown</h3>
                            {forecast.map((day) => (
                                <div key={day.date} className="flex flex-col p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-colors">
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpenDay(openDay === day.date ? null : day.date)}>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="w-[45px] justify-center">{day.day_name.slice(0, 3)}</Badge>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{day.condition}</span>
                                                <span className="text-xs text-muted-foreground">{day.min_temp}° - {day.max_temp}°</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-xs font-bold px-2 py-1 rounded ${day.aqi <= 50 ? "bg-green-100 text-green-700" :
                                                day.aqi <= 100 ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-red-100 text-red-700"
                                                }`}>
                                                AQI {day.aqi}
                                            </div>
                                            <span className="text-muted-foreground text-xs">
                                                {openDay === day.date ? "▲" : "▼"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Hourly Breakdown */}
                                    {openDay === day.date && day.hourly_data && day.hourly_data.length > 0 && (
                                        <div className="mt-4 pt-3 border-t">
                                            <div className="text-xs font-semibold mb-2 text-muted-foreground flex justify-between pr-8">
                                                <span className="w-12">Time</span>
                                                <span className="w-16">Temp</span>
                                                <span className="flex-1 text-center">Condition</span>
                                                <span className="w-16 text-right">AQI</span>
                                            </div>
                                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                                {day.hourly_data.map((hour, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded hover:bg-muted/50">
                                                        <span className="w-12 font-medium">{hour.time}</span>
                                                        <span className="w-16 text-muted-foreground">{hour.temp}°C</span>
                                                        <span className="flex-1 text-center text-muted-foreground truncate">{hour.condition}</span>
                                                        <span className={`w-16 text-right font-semibold ${hour.aqi <= 50 ? "text-green-600" :
                                                            hour.aqi <= 100 ? "text-yellow-600" :
                                                                "text-red-500"
                                                            }`}>
                                                            {hour.aqi}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    No forecast data available. Try searching for a city.
                </div>
            )}
        </Card>
    );
};

export default ForecastAnalysis;
