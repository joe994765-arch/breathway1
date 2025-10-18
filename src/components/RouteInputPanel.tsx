import { useState } from "react";
import { MapPin, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiService, RouteResponse } from "@/lib/api";
import { toast } from "sonner";

interface RouteInputPanelProps {
  onSearch: (source: string, destination: string) => void;
  onRouteData?: (data: RouteResponse) => void;
  userEmail?: string;
}

const RouteInputPanel = ({ onSearch, onRouteData, userEmail }: RouteInputPanelProps) => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!source || !destination) {
      toast.error("Please enter both source and destination");
      return;
    }

    setIsLoading(true);
    try {
      const routeData = await apiService.getRoute(source, destination, "driving-car", userEmail);
      onSearch(source, destination);
      if (onRouteData) {
        onRouteData(routeData);
      }
      toast.success(`Route found: ${routeData.route.distance}km, ${routeData.route.duration}min`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to find route");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 glass-card shadow-elevated animate-fade-in">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Plan Smarter. Breathe Cleaner.
          </h1>
          <p className="text-muted-foreground">
            Find the healthiest route based on real-time air quality data
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              type="text"
              placeholder="Source Location"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="pl-11 h-12 shadow-soft focus:shadow-elevated transition-shadow"
            />
          </div>

          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary" />
            <Input
              type="text"
              placeholder="Destination Location"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-11 h-12 shadow-soft focus:shadow-elevated transition-shadow"
            />
          </div>

          <Button
            onClick={handleSearch}
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            <Sparkles className="h-5 w-5" />
            {isLoading ? "Finding Routes..." : "Find Routes"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default RouteInputPanel;
