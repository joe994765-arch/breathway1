import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteInputPanel from "@/components/RouteInputPanel";
import MapView from "@/components/MapView";
import RouteInfoCard from "@/components/RouteInfoCard";
import RouteComparisonCard from "@/components/RouteComparisonCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { RouteResponse } from "@/lib/api";

const Dashboard = () => {
  const [showResults, setShowResults] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState<"cleanest" | "fastest">("cleanest");
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);

  const handleSearch = (source: string, destination: string) => {
    toast.success(`Searching routes from ${source} to ${destination}`);
    setShowResults(true);
  };

  const handleRouteData = (data: RouteResponse) => {
    setRouteData(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 glass-card shadow-elevated">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-eco text-white text-xl">H</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">Hemant Kumar</h3>
                  <p className="text-sm text-muted-foreground">hemant@example.com</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm">Routes Planned</span>
                  </div>
                  <span className="font-bold text-lg">24</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm">Last Login</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Today 9:45 AM</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm">Best AQI Route</span>
                  </div>
                  <span className="font-bold text-sm text-green-600">38 (Good)</span>
                </div>
              </div>
            </Card>

            <RouteInputPanel onSearch={handleSearch} onRouteData={handleRouteData} />

            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <Label htmlFor="optimize-mode" className="text-sm font-medium">
                  Optimize for {optimizeMode === "cleanest" ? "Cleanest" : "Fastest"}
                </Label>
                <Switch
                  id="optimize-mode"
                  checked={optimizeMode === "fastest"}
                  onCheckedChange={(checked) => setOptimizeMode(checked ? "fastest" : "cleanest")}
                />
              </div>
            </Card>

            {showResults && <RouteInfoCard routeData={routeData} />}
          </div>

          {/* Map Area */}
          <div className="lg:col-span-2">
            <MapView className="h-full" routeData={routeData} />
          </div>
        </div>

        {/* Single Route Display */}
        {showResults && routeData && (
          <div className="mt-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Route</h2>
              <p className="text-muted-foreground">
                {routeData.route.name}
              </p>
            </div>

            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-4">
              <RouteComparisonCard
                routeName={routeData.route.name}
                distance={`${routeData.route.distance} km`}
                time={`${routeData.route.duration} min`}
                aqi={routeData.route.aqi}
                isBest
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
