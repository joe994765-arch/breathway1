import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, TrendingUp, Calendar, Mail, User } from "lucide-react";
import { apiService, RouteResponse } from "@/lib/api";

interface UserProfileProps {
    userEmail: string;
    routeData?: RouteResponse | null;
}

interface UserData {
    name: string;
    email: string;
    created_at: string;
    total_routes: number;
    preferences: {
        default_mode: string;
        optimize_for: string;
    };
}

const UserProfile = ({ userEmail, routeData }: UserProfileProps) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRoutes: 0,
        avgAQI: 0,
        bestAQI: 0,
        worstAQI: 0
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch user data from MongoDB
                const response = await fetch(`/api/user/${encodeURIComponent(userEmail)}`);
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data.user);
                }

                // Fetch user statistics
                const historyResponse = await apiService.getHistory(userEmail);
                if (historyResponse.success && historyResponse.routes.length > 0) {
                    const routes = historyResponse.routes;
                    const aqiValues = routes.map(route => route.averages.aqi);

                    setStats({
                        totalRoutes: routes.length,
                        avgAQI: Math.round(aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length),
                        bestAQI: Math.min(...aqiValues),
                        worstAQI: Math.max(...aqiValues)
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userEmail) {
            fetchUserData();
        }
    }, [userEmail]);

    if (loading) {
        return (
            <Card className="p-6 glass-card shadow-elevated">
                <div className="text-center text-muted-foreground">Loading profile...</div>
            </Card>
        );
    }

    if (!userData) {
        return (
            <Card className="p-6 glass-card shadow-elevated">
                <div className="text-center text-muted-foreground">Profile not found</div>
            </Card>
        );
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const displayStats = {
        totalRoutes: routeData ? routeData.routes.length : stats.totalRoutes,
        bestAQI: routeData && routeData.routes.length > 0
            ? Math.min(...routeData.routes.map(r => r.aqi))
            : stats.bestAQI
    };

    const firstRoute = routeData?.routes?.[0];
    const sourceData = firstRoute ? { city: firstRoute.source.city, aqi: firstRoute.source.aqi } : null;
    const destData = firstRoute ? { city: firstRoute.destination.city, aqi: firstRoute.destination.aqi } : null;

    const getAQIStatus = (aqi: number) => {
        if (aqi <= 50) return { text: "Good", color: "text-green-600" };
        if (aqi <= 100) return { text: "Moderate", color: "text-yellow-600" };
        if (aqi <= 150) return { text: "Unhealthy for Sensitive", color: "text-orange-600" };
        if (aqi <= 200) return { text: "Unhealthy", color: "text-red-500" };
        if (aqi <= 300) return { text: "Severe", color: "text-purple-600" };
        return { text: "Hazardous", color: "text-red-900" };
    };

    const getOptimizeBadge = (optimize: string) => {
        if (optimize === "cleanest") {
            return <Badge variant="default" className="bg-green-100 text-green-800">Cleanest Route</Badge>;
        }
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Fastest Route</Badge>;
    };

    return (
        <Card className="p-6 glass-card shadow-elevated">
            <div className="space-y-6">
                {/* Profile Header - Match Screenshot Design */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-eco text-white text-xl">
                            {getInitials(userData.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg text-primary">{userData.name}</h3>
                        <p className="text-sm text-muted-foreground">{userData.email}</p>
                    </div>
                </div>

                {/* Statistics - Match Screenshot Design */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-sm">Routes Planned</span>
                        </div>
                        <span className="font-bold text-lg">{displayStats.totalRoutes}</span>
                    </div>

                    {sourceData && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="text-sm">{sourceData.city} (Source)</span>
                            </div>
                            <span className={`font-bold text-sm ${getAQIStatus(sourceData.aqi).color}`}>
                                {sourceData.aqi} ({getAQIStatus(sourceData.aqi).text})
                            </span>
                        </div>
                    )}

                    {destData && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="text-sm">{destData.city} (Dest)</span>
                            </div>
                            <span className={`font-bold text-sm ${getAQIStatus(destData.aqi).color}`}>
                                {destData.aqi} ({getAQIStatus(destData.aqi).text})
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm">Best AQI Route</span>
                        </div>
                        <span className={`font-bold text-sm ${getAQIStatus(displayStats.bestAQI).color}`}>
                            {displayStats.bestAQI} ({getAQIStatus(displayStats.bestAQI).text})
                        </span>
                    </div>
                </div>

            </div>
        </Card>
    );
};

export default UserProfile;
