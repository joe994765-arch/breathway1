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
    Clock,
    Zap
} from "lucide-react";
import { apiService } from "@/lib/api";

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
                    const aqiValues = routes.map(route => route.averages?.aqi || 0);
                    const tempValues = routes.map(route => route.averages?.temperature || 0);
                    const windValues = routes.map(route => route.averages?.wind_speed || 0);

                    const totalDistance = routes.reduce((sum, route) => sum + route.route.distance, 0);
                    const totalTime = routes.reduce((sum, route) => sum + route.route.duration, 0);

                    const cities = new Set<string>();
                    routes.forEach(route => {
                        if (route.source?.city) cities.add(route.source.city);
                        if (route.destination?.city) cities.add(route.destination.city);
                    });

                    let pollutionTrend: 'improving' | 'worsening' | 'stable' = 'stable';
                    if (aqiValues.length >= 2) {
                        const midPoint = Math.floor(aqiValues.length / 2);
                        const firstHalfAvg = aqiValues.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
                        const secondHalfAvg = aqiValues.slice(midPoint).reduce((a, b) => a + b, 0) / (aqiValues.length - midPoint);

                        if (secondHalfAvg < firstHalfAvg - 2) pollutionTrend = 'improving';
                        else if (secondHalfAvg > firstHalfAvg + 2) pollutionTrend = 'worsening';
                    }

                    setAnalytics({
                        totalRoutes: routes.length,
                        avgAQI: Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length),
                        bestAQI: Math.min(...aqiValues),
                        worstAQI: Math.max(...aqiValues),
                        totalDistance: Math.round(totalDistance),
                        totalTime: Math.round(totalTime),
                        avgTemperature: Math.round(tempValues.reduce((a, b) => a + b, 0) / tempValues.length),
                        avgWindSpeed: Math.round(windValues.reduce((a, b) => a + b, 0) / windValues.length * 10) / 10,
                        pollutionTrend,
                        highPollutionDays: aqiValues.filter(aqi => aqi > 100).length,
                        recommendations: generateRecommendations(aqiValues),
                        citiesVisited: cities.size
                    });
                } else {
                    setDefaultAnalytics();
                }
            } catch (error) {
                console.error("Analytics fetch error:", error);
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

        if (userEmail) fetchAnalytics();
    }, [userEmail]);

    const generateRecommendations = (aqiValues: number[]) => {
        const avg = aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length;
        const recommendations = [];
        if (avg > 100) recommendations.push("N95 filtration recommended for all outdoor transit.");
        if (avg > 150) recommendations.push("Limit outdoor exposure during peak traffic hours.");
        if (aqiValues.some(v => v > 200)) recommendations.push("Consider HEPA grade in-cabin air filters.");
        return recommendations;
    };

    const getAqiConfig = (aqi: number) => {
        if (aqi === 0) return { label: "No Data", color: "text-muted-foreground", bg: "bg-muted/10" };
        if (aqi <= 50) return { label: "Ideal", color: "text-emerald-600", bg: "bg-emerald-50" };
        if (aqi <= 100) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-50" };
        if (aqi <= 200) return { label: "Poor", color: "text-orange-600", bg: "bg-orange-50" };
        return { label: "Critical", color: "text-rose-600", bg: "bg-rose-50" };
    };

    if (loading) return <div className="space-y-4 animate-pulse"><div className="h-32 bg-muted rounded-xl"></div></div>;

    if (!analytics) return null;

    const data = analytics;
    const aqi = getAqiConfig(data.avgAQI || 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 glass-card border-none shadow-soft flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avg Exposure</span>
                        <Wind className="h-4 w-4 text-primary opacity-50" />
                    </div>
                    <div className="mt-4">
                        <div className={`text-4xl font-black ${aqi.color}`}>{data.avgAQI}</div>
                        <Badge className={`${aqi.bg} ${aqi.color} border-none mt-2 font-black text-[10px]`}>{aqi.label}</Badge>
                    </div>
                </Card>

                <Card className="p-6 glass-card border-none shadow-soft">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mileage</span>
                        <Activity className="h-4 w-4 text-emerald-500 opacity-50" />
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-800">{data.totalDistance} <span className="text-sm font-bold text-muted-foreground">km</span></div>
                        <div className="text-[10px] font-bold text-muted-foreground mt-1">Across {data.totalRoutes} journeys</div>
                    </div>
                </Card>

                <Card className="p-6 glass-card border-none shadow-soft">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Variation</span>
                        <Zap className="h-4 w-4 text-amber-500 opacity-50" />
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground">BEST</span>
                            <span className="text-sm font-black text-emerald-600">{data.bestAQI}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground">WORST</span>
                            <span className="text-sm font-black text-rose-600">{data.worstAQI}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 glass-card border-none shadow-soft">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Trend</span>
                        <TrendingUp className="h-4 w-4 text-primary opacity-50" />
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                        {data.pollutionTrend === 'improving' ? (
                            <div className="flex flex-col items-center text-emerald-600">
                                <TrendingDown className="h-8 w-8" />
                                <span className="text-xs font-black uppercase mt-1">Improving</span>
                            </div>
                        ) : data.pollutionTrend === 'worsening' ? (
                            <div className="flex flex-col items-center text-rose-600">
                                <TrendingUp className="h-8 w-8" />
                                <span className="text-xs font-black uppercase mt-1">Worsening</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400">
                                <Activity className="h-8 w-8" />
                                <span className="text-xs font-black uppercase mt-1">Stable</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {data.recommendations.length > 0 && (
                <Alert className="bg-primary/5 border-primary/20 p-4 transition-all hover:bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs font-medium text-slate-700 space-y-1">
                        <span className="font-black uppercase text-[10px] block text-primary mb-1">AI Health Advisory</span>
                        {data.recommendations.map((r, i) => <div key={i}>• {r}</div>)}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
