import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Navigation2, Wind, Thermometer, MapPin, Calendar, Download } from "lucide-react";
import { apiService, HistoryResponse, RouteInfo, RouteResponse } from "@/lib/api";

interface RouteHistoryProps {
    userEmail: string;
}

const RouteHistory = ({ userEmail }: RouteHistoryProps) => {
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await apiService.getHistory(userEmail);
                setHistory(data);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userEmail) {
            fetchHistory();
        }
    }, [userEmail]);

    const handleRouteClick = (historyItem: any) => {
        // Map history item to RouteInfo structure
        // Note: History items from DB might need some adjustment to match RouteInfo exactly if fields are missing
        // Based on app.py, the structure seems largely compatible but let's ensure safety

        try {
            const routeInfo: RouteInfo = {
                name: historyItem.name || `Route to ${historyItem.destination.city}`,
                type: 'balanced', // Default fallback
                distance: historyItem.route.distance,
                duration: historyItem.route.duration,
                aqi: historyItem.averages?.aqi || 0,
                score: historyItem.score || 0,
                source: historyItem.source,
                destination: historyItem.destination,
                averages: historyItem.averages || { aqi: 0, temperature: 0, wind_speed: 0 },
                geometry: historyItem.route.geometry,
                map_file: historyItem.map_file,
                distance_geo: historyItem.distance_geo,
                temperature_difference: historyItem.temperature_difference,
                traffic: historyItem.traffic || null,
                // Add any other required fields for RouteInfo with defaults if missing
                traffic_adjusted_duration: historyItem.traffic_adjusted_duration || null,
                ml_preference: historyItem.ml_preference,
                ml_confidence: historyItem.ml_confidence,
                ml_probabilities: historyItem.ml_probabilities
            };

            const response: RouteResponse = {
                success: true,
                routes: [routeInfo],
                recommended: 0,
                mode: historyItem.mode || 'driving-car'
            };

            navigate("/dashboard", { state: { routeData: response } });
        } catch (error) {
            console.error("Error navigating to route:", error);
        }
    };

    if (loading) {
        return (
            <Card className="p-6 glass-card shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Route History</h3>
                <div className="text-center text-muted-foreground">Loading...</div>
            </Card>
        );
    }

    if (!history || history.count === 0) {
        return (
            <Card className="p-6 glass-card shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Route History</h3>
                <div className="text-center text-muted-foreground">
                    No routes found. Start planning your first route!
                </div>
            </Card>
        );
    }

    const handleDownload = async (format: 'csv' | 'pdf') => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/history/${encodeURIComponent(userEmail)}/download/${format}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `route_history_${userEmail}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                console.error('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    return (
        <Card className="p-6 glass-card shadow-soft">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Route History ({history.count})</h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload('csv')}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload('pdf')}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        PDF
                    </Button>
                </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.routes.map((route, index) => (
                    <div
                        key={route._id || index}
                        className="p-4 border rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleRouteClick(route)}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-medium text-sm">
                                    {route.source.city} → {route.destination.city}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(route.created_at).toLocaleDateString()} at {new Date(route.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                            <Badge variant={(route.averages?.aqi || 0) <= 50 ? "default" : (route.averages?.aqi || 0) <= 100 ? "secondary" : "destructive"}>
                                AQI {route.averages?.aqi || 0}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Navigation2 className="h-4 w-4 text-primary" />
                                <span>{route.route.distance} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span>{route.route.duration} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-primary" />
                                <span>{route.averages?.temperature || 0}°C</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wind className="h-4 w-4 text-primary" />
                                <span>{route.averages?.wind_speed || 0} m/s</span>
                            </div>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <span>Source AQI: {route.source.aqi}</span>
                                <span>Dest AQI: {route.destination.aqi}</span>
                                <span>Temp Diff: {route.temperature_difference > 0 ? '+' : ''}{route.temperature_difference}°C</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RouteHistory;
