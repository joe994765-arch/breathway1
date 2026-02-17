import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteInputPanel from "@/components/RouteInputPanel";
import MapView from "@/components/MapView";
import RouteComparisonGrid from "@/components/RouteComparisonGrid";
import UserProfile from "@/components/UserProfile";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { RouteResponse, RouteInfo } from "@/lib/api";

const Dashboard = () => {
  const [showResults, setShowResults] = useState(false);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [userEmail, setUserEmail] = useState("hemant@example.com"); // This should come from auth context

  const handleSearch = (source: string, destination: string) => {
    toast.success(`Searching routes from ${source} to ${destination}`);
    setShowResults(true);
  };

  const handleRouteData = (data: RouteResponse) => {
    setRouteData(data);
    setSelectedRouteIndex(data.recommended); // Select recommended route by default
  };

  const handleRouteSelect = (route: RouteInfo, index: number) => {
    setSelectedRouteIndex(index);
    toast.info(`Selected ${route.type} route`);
  };

  const selectedRoute = routeData?.routes[selectedRouteIndex];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-6">
            <RouteInputPanel onSearch={handleSearch} onRouteData={handleRouteData} userEmail={userEmail} />

            {/* User Profile */}
            <UserProfile userEmail={userEmail} />
          </div>

          {/* Map Area */}
          <div className="lg:col-span-2">
            {selectedRoute ? (
              <MapView className="h-full" routeData={selectedRoute} />
            ) : (
              <Card className="h-full min-h-[500px] flex items-center justify-center glass-card shadow-elevated">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-eco rounded-full flex items-center justify-center">
                    <MapPin className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Plan Your Clean Route</h2>
                  <p className="text-muted-foreground max-w-md">
                    Enter your source and destination to find the cleanest, fastest, and most balanced routes with real-time AQI and traffic data.
                  </p>
                  <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">3</div>
                      <div className="text-xs text-muted-foreground">Route Options</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">🚦</div>
                      <div className="text-xs text-muted-foreground">Live Traffic</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">🤖</div>
                      <div className="text-xs text-muted-foreground">AI Powered</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Route Comparison Grid */}
        {showResults && routeData && (
          <div className="mt-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Route Options</h2>
              <p className="text-muted-foreground">
                Compare {routeData.routes.length} routes from {selectedRoute?.source.city} to {selectedRoute?.destination.city}
              </p>
            </div>

            <RouteComparisonGrid
              routes={routeData.routes}
              recommendedIndex={routeData.recommended}
              selectedIndex={selectedRouteIndex}
              onRouteSelect={handleRouteSelect}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
