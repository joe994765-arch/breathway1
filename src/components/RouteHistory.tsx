import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Navigation2, Wind, Thermometer, MapPin, Calendar } from "lucide-react";
import { apiService, HistoryResponse } from "@/lib/api";

interface RouteHistoryProps {
    userEmail: string;
}

const RouteHistory = ({ userEmail }: RouteHistoryProps) => {
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <Card className="p-6 glass-card shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Route History ({history.count})</h3>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.routes.map((route, index) => (
                    <div key={route._id || index} className="p-4 border rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-medium text-sm">
                                    {route.source.city} → {route.destination.city}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(route.created_at).toLocaleDateString()} at {new Date(route.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                            <Badge variant={route.averages.aqi <= 50 ? "default" : route.averages.aqi <= 100 ? "secondary" : "destructive"}>
                                AQI {route.averages.aqi}
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
                                <span>{route.averages.temperature}°C</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wind className="h-4 w-4 text-primary" />
                                <span>{route.averages.wind_speed} m/s</span>
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
