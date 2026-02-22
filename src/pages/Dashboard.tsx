import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  const storedEmail = localStorage.getItem("userEmail");
  const [userEmail, setUserEmail] = useState((storedEmail && storedEmail !== "null") ? storedEmail : "hemant@example.com");
  const location = useLocation();

  useEffect(() => {
    if (location.state?.routeData) {
      setRouteData(location.state.routeData);
      setShowResults(true);
      // Optional: clear state if needed, but keeping it allows back/forward to work nicely
    }
  }, [location.state]);

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
        {/* Main Layout Area */}
        {!showResults ? (
          /* Centered Initial View */
          <div className="max-w-xl mx-auto py-12 animate-fade-in">
            <RouteInputPanel
              onSearch={handleSearch}
              onRouteData={handleRouteData}
              userEmail={userEmail}
            />
          </div>
        ) : (
          /* Results View (Side Panel + Map) */
          <div className="grid lg:grid-cols-3 gap-6 animate-slide-up">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-6">
              <RouteInputPanel
                onSearch={handleSearch}
                onRouteData={handleRouteData}
                userEmail={userEmail}
                initialSource={selectedRoute?.source.city}
                initialDestination={selectedRoute?.destination.city}
              />

              {/* User Profile */}
              <UserProfile userEmail={userEmail} />
            </div>

            {/* Map Area */}
            <div className="lg:col-span-2 min-h-[500px]">
              {routeData && (
                <MapView
                  className="h-full rounded-xl shadow-elevated"
                  routes={routeData.routes}
                  selectedIndex={selectedRouteIndex}
                  onSelectRoute={(index) => handleRouteSelect(routeData.routes[index], index)}
                />
              )}
            </div>
          </div>
        )}

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
