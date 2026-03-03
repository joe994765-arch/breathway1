import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    Wind,
    Thermometer,
    MapPin,
    Calendar,
    Activity,
    Clock
} from "lucide-react";
import { apiService, HistoryResponse } from "@/lib/api";

interface AnalyticsDashboardProps {
    userEmail: string;
}

interface AnalyticsData {
    totalRoutes: number;
    avgAQI: number;
    bestAQI: number;
    worstAQI: number;
    totalDistance: number;
    totalTime: number;
    avgTemperature: number;
    avgWindSpeed: number;
    pollutionTrend: 'improving' | 'worsening' | 'stable';
    highPollutionDays: number;
    recommendations: string[];
    citiesVisited: number;
}

const AnalyticsDashboard = ({ userEmail }: AnalyticsDashboardProps) => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const historyResponse = await apiService.getHistory(userEmail);
                if (historyResponse.success && historyResponse.routes.length > 0) {
                    const routes = historyResponse.routes;

                    // Calculate analytics
                    const aqiValues = routes.map(route => route.averages.aqi);
                    const tempValues = routes.map(route => route.averages.temperature);
                    const windValues = routes.map(route => route.averages.wind_speed);

                    const totalDistance = routes.reduce((sum, route) => sum + route.route.distance, 0);
                    const totalTime = routes.reduce((sum, route) => sum + route.route.duration, 0);

                    // Calculate Cities Visited
                    const cities = new Set<string>();
                    routes.forEach(route => {
                        if (route.source?.city) cities.add(route.source.city);
                        if (route.destination?.city) cities.add(route.destination.city);
                    });
                    const citiesVisited = cities.size;

                    // Calculate trend (compare first half vs second half)
                    const midPoint = Math.floor(aqiValues.length / 2);
                    const firstHalf = aqiValues.slice(0, midPoint);
                    const secondHalf = aqiValues.slice(midPoint);

                    let firstHalfAvg = 0;
                    let secondHalfAvg = 0;

                    if (firstHalf.length > 0) {
                        firstHalfAvg = firstHalf.reduce((sum, aqi) => sum + aqi, 0) / firstHalf.length;
                    }
                    if (secondHalf.length > 0) {
                        secondHalfAvg = secondHalf.reduce((sum, aqi) => sum + aqi, 0) / secondHalf.length;
                    }

                    let pollutionTrend: 'improving' | 'worsening' | 'stable' = 'stable';
                    if (secondHalfAvg < firstHalfAvg - 5) pollutionTrend = 'improving';
                    else if (secondHalfAvg > firstHalfAvg + 5) pollutionTrend = 'worsening';

                    const highPollutionDays = aqiValues.filter(aqi => aqi > 100).length;

                    // Generate recommendations based on data
                    const recommendations = generateRecommendations(aqiValues, tempValues, windValues);

                    setAnalytics({
                        totalRoutes: routes.length,
                        avgAQI: Math.round(aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length),
                        bestAQI: Math.min(...aqiValues),
                        worstAQI: Math.max(...aqiValues),
                        totalDistance: Math.round(totalDistance),
                        totalTime: Math.round(totalTime),
                        avgTemperature: Math.round(tempValues.reduce((sum, temp) => sum + temp, 0) / tempValues.length),
                        avgWindSpeed: Math.round(windValues.reduce((sum, wind) => sum + wind, 0) / windValues.length * 10) / 10,
                        pollutionTrend,
                        highPollutionDays,
                        recommendations,
                        citiesVisited
                    });
                } else {
                    // Set default analytics if no routes
                    setDefaultAnalytics();
                }
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
                // Set default analytics on error (suppress UI error)
                setDefaultAnalytics();
            } finally {
                setLoading(false);
            }
        };

        const setDefaultAnalytics = () => {
            setAnalytics({
                totalRoutes: 0,
                avgAQI: 0,
                bestAQI: 0,
                worstAQI: 0,
                totalDistance: 0,
                totalTime: 0,
                avgTemperature: 0,
                avgWindSpeed: 0,
                pollutionTrend: 'stable',
                highPollutionDays: 0,
                recommendations: [],
                citiesVisited: 0
            });
        };

        if (userEmail) {
            fetchAnalytics();
        }
    }, [userEmail]);

    const generateRecommendations = (aqiValues: number[], tempValues: number[], windValues: number[]) => {
        const recommendations: string[] = [];
        const avgAQI = aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length;
        const highPollutionDays = aqiValues.filter(aqi => aqi > 100).length;

        if (avgAQI > 100) {
            recommendations.push("Consider using N95 masks during outdoor activities");
            recommendations.push("Plan routes during early morning hours when pollution is lower");
        }

        if (highPollutionDays > aqiValues.length * 0.3) {
            recommendations.push("Install air purifiers in your home and office");
            recommendations.push("Consider using public transport or carpooling to reduce emissions");
        }

        if (avgAQI > 150) {
            recommendations.push("Avoid outdoor exercise and keep windows closed");
            recommendations.push("Use air quality apps to monitor real-time pollution levels");
        }

        if (aqiValues.some(aqi => aqi > 200)) {
            recommendations.push("Consider relocating routes away from industrial areas");
            recommendations.push("Use indoor air quality monitoring devices");
        }

        return recommendations;
    };

    const getAQIColor = (aqi: number) => {
        if (aqi <= 50) return "text-green-600";
        if (aqi <= 100) return "text-yellow-600";
        if (aqi <= 150) return "text-orange-600";
        if (aqi <= 200) return "text-red-600";
        if (aqi <= 300) return "text-purple-600";
        return "text-red-900";
    };

    const getAQIBadge = (aqi: number) => {
        if (aqi === 0) return { variant: "outline" as const, label: "No Data", color: "text-muted-foreground" };
        if (aqi <= 50) return { variant: "default" as const, label: "Good", color: "bg-green-100 text-green-800" };
        if (aqi <= 100) return { variant: "secondary" as const, label: "Moderate", color: "bg-yellow-100 text-yellow-800" };
        if (aqi <= 150) return { variant: "outline" as const, label: "Unhealthy for Sensitive", color: "bg-orange-100 text-orange-800" };
        if (aqi <= 200) return { variant: "destructive" as const, label: "Unhealthy", color: "bg-red-100 text-red-800" };
        if (aqi <= 300) return { variant: "destructive" as const, label: "Severe", color: "bg-purple-100 text-purple-800" };
        return { variant: "destructive" as const, label: "Hazardous", color: "bg-red-900 text-white" };
    };

    if (loading) {
        return (
            <Card className="p-6 glass-card shadow-soft">
                <div className="text-center text-muted-foreground">Loading analytics...</div>
            </Card>
        );
    }

    // Always render dashboard, even with 0 values
    const data = analytics || {
        totalRoutes: 0,
        avgAQI: 0,
        bestAQI: 0,
        worstAQI: 0,
        totalDistance: 0,
        totalTime: 0,
        avgTemperature: 0,
        avgWindSpeed: 0,
        pollutionTrend: 'stable' as const,
        highPollutionDays: 0,
        recommendations: [],
        citiesVisited: 0
    };

    const badge = getAQIBadge(data.avgAQI);

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 glass-card shadow-soft">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data.totalRoutes}</div>
                            <div className="text-sm text-muted-foreground">Total Routes</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 glass-card shadow-soft">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data.totalDistance} km</div>
                            <div className="text-sm text-muted-foreground">Total Distance</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 glass-card shadow-soft">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{Math.round(data.totalTime / 60)}h</div>
                            <div className="text-sm text-muted-foreground">Total Time</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 glass-card shadow-soft">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data.highPollutionDays}</div>
                            <div className="text-sm text-muted-foreground">High Pollution Days</div>
                        </div>
                    </div>
                </Card>

                {/* Cities Visited Card */}
                <Card className="p-4 glass-card shadow-soft">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{data.citiesVisited}</div>
                            <div className="text-sm text-muted-foreground">Cities Visited</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* AQI Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 glass-card shadow-soft">
                    <h3 className="text-lg font-semibold mb-4">Air Quality Analysis</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average AQI</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${getAQIColor(data.avgAQI)}`}>
                                    {data.avgAQI}
                                </span>
                                <Badge className={badge.color}>{badge.label}</Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                <div className="text-sm text-green-700 font-medium">Best AQI</div>
                                <div className="text-xl font-bold text-green-800">{data.bestAQI}</div>
                            </div>

                            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                <div className="text-sm text-red-700 font-medium">Worst AQI</div>
                                <div className="text-xl font-bold text-red-800">{data.worstAQI}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Pollution Trend:</span>
                            {data.pollutionTrend === 'improving' && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <TrendingDown className="h-4 w-4" />
                                    <span className="text-sm font-medium">Improving</span>
                                </div>
                            )}
                            {data.pollutionTrend === 'worsening' && (
                                <div className="flex items-center gap-1 text-red-600">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm font-medium">Worsening</span>
                                </div>
                            )}
                            {data.pollutionTrend === 'stable' && (
                                <div className="flex items-center gap-1 text-blue-600">
                                    <Activity className="h-4 w-4" />
                                    <span className="text-sm font-medium">Stable</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 glass-card shadow-soft">
                    <h3 className="text-lg font-semibold mb-4">Environmental Data</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-primary" />
                                <span className="text-sm">Avg Temperature</span>
                            </div>
                            <span className="font-semibold">{data.avgTemperature}°C</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wind className="h-4 w-4 text-primary" />
                                <span className="text-sm">Avg Wind Speed</span>
                            </div>
                            <span className="font-semibold">{data.avgWindSpeed} m/s</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Pollution Precautions */}
            {data.avgAQI > 100 && (
                <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        <div className="font-semibold mb-2">High Pollution Alert!</div>
                        <div className="text-sm">
                            Your average AQI is {data.avgAQI}, which is above the healthy range.
                            Consider the following precautions:
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
                <Card className="p-6 glass-card shadow-soft">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Health Recommendations
                    </h3>
                    <div className="space-y-2">
                        {data.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm">{recommendation}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
