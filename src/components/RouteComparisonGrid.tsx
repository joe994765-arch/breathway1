import { RouteInfo } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Leaf, Scale, MapPin, Clock, Wind, Car, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteComparisonGridProps {
    routes: RouteInfo[];
    recommendedIndex: number;
    onRouteSelect?: (route: RouteInfo, index: number) => void;
    selectedIndex?: number;
}

const RouteComparisonGrid = ({ routes, recommendedIndex, onRouteSelect, selectedIndex }: RouteComparisonGridProps) => {
    const getRouteIcon = (type: string) => {
        switch (type) {
            case "fastest":
                return <Zap className="h-5 w-5" />;
            case "cleanest":
                return <Leaf className="h-5 w-5" />;
            case "balanced":
                return <Scale className="h-5 w-5" />;
            default:
                return <MapPin className="h-5 w-5" />;
        }
    };

    const getRouteLabel = (type: string) => {
        switch (type) {
            case "fastest":
                return "Fastest";
            case "cleanest":
                return "Cleanest";
            case "balanced":
                return "Balanced";
            default:
                return type;
        }
    };

    const getAQIColor = (aqi: number) => {
        if (aqi <= 50) return "text-green-600 bg-green-50";
        if (aqi <= 100) return "text-yellow-600 bg-yellow-50";
        if (aqi <= 150) return "text-orange-600 bg-orange-50";
        if (aqi <= 200) return "text-red-600 bg-red-50";
        return "text-purple-600 bg-purple-50";
    };

    const getAQILabel = (aqi: number) => {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Moderate";
        if (aqi <= 150) return "Unhealthy for Sensitive";
        if (aqi <= 200) return "Unhealthy";
        return "Very Unhealthy";
    };

    const getTrafficColor = (status?: string) => {
        switch (status) {
            case "light":
                return "text-green-600 bg-green-50 border-green-200";
            case "moderate":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "heavy":
                return "text-red-600 bg-red-50 border-red-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    const getTrafficLabel = (status?: string) => {
        switch (status) {
            case "light":
                return "Light Traffic";
            case "moderate":
                return "Moderate Traffic";
            case "heavy":
                return "Heavy Traffic";
            default:
                return "No Traffic Data";
        }
    };

    return (
        <div className="grid md:grid-cols-3 gap-4">
            {routes.map((route, index) => {
                const isRecommended = index === recommendedIndex;
                const isSelected = selectedIndex !== undefined ? index === selectedIndex : isRecommended;

                return (
                    <Card
                        key={index}
                        className={cn(
                            "p-6 cursor-pointer transition-all duration-200 hover:shadow-elevated",
                            isSelected && "ring-2 ring-primary shadow-elevated",
                            isRecommended && "border-primary"
                        )}
                        onClick={() => onRouteSelect?.(route, index)}
                    >
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getRouteIcon(route.type)}
                                    <h3 className="font-semibold text-lg">{getRouteLabel(route.type)}</h3>
                                </div>
                                {isRecommended && (
                                    <Badge variant="default" className="bg-primary">
                                        Recommended
                                    </Badge>
                                )}
                            </div>

                            {/* Traffic Badge */}
                            {route.traffic && route.traffic.status !== "unknown" && (
                                <Badge variant="outline" className={cn("w-full justify-center", getTrafficColor(route.traffic.status))}>
                                    <Car className="h-3 w-3 mr-1" />
                                    {getTrafficLabel(route.traffic.status)}
                                </Badge>
                            )}

                            {/* ML Confidence Badge */}
                            {route.ml_confidence && route.ml_confidence > 0.7 && isRecommended && (
                                <Badge variant="outline" className="w-full justify-center text-purple-600 bg-purple-50 border-purple-200">
                                    <Brain className="h-3 w-3 mr-1" />
                                    Smart Recommendation ({Math.round(route.ml_confidence * 100)}% confidence)
                                </Badge>
                            )}

                            {/* Metrics */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>Distance</span>
                                    </div>
                                    <span className="font-semibold">{route.distance} km</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>Duration</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-semibold">{route.duration} min</span>
                                        {route.traffic_adjusted_duration && route.traffic_adjusted_duration !== route.duration && (
                                            <div className="text-xs text-orange-600">
                                                +{Math.round(route.traffic_adjusted_duration - route.duration)} min traffic
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Wind className="h-4 w-4" />
                                        <span>Air Quality</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{route.aqi}</span>
                                        <Badge variant="outline" className={cn("text-xs", getAQIColor(route.aqi))}>
                                            {getAQILabel(route.aqi)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Score */}
                            <div className="pt-3 border-t">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Route Score</span>
                                    <span className="font-mono font-semibold">{route.score.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default RouteComparisonGrid;
