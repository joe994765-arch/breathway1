import { Clock, Navigation2, Wind, TrendingDown, Thermometer, Eye, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RouteResponse } from "@/lib/api";

interface RouteInfoCardProps {
  routeData?: RouteResponse;
  distance?: string;
  time?: string;
  aqi?: number;
  pollutionScore?: string;
}

const RouteInfoCard = ({
  routeData,
  distance = "12.5 km",
  time = "25 min",
  aqi = 45,
  pollutionScore = "Low",
}: RouteInfoCardProps) => {
  // Use real data if available, otherwise fallback to props
  const displayDistance = routeData ? `${routeData.route.distance} km` : distance;
  const displayTime = routeData ? `${routeData.route.duration} min` : time;
  const displayAqi = routeData ? routeData.route.aqi : aqi;
  const displayPollution = routeData ?
    (displayAqi <= 50 ? "Low" : displayAqi <= 100 ? "Moderate" : "High") :
    pollutionScore;
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-accent";
    if (aqi <= 100) return "text-warning";
    return "text-destructive";
  };

  const getAQIBg = (aqi: number) => {
    if (aqi <= 50) return "bg-accent/10 border-accent/20";
    if (aqi <= 100) return "bg-warning/10 border-warning/20";
    return "bg-destructive/10 border-destructive/20";
  };

  return (
    <Card className="p-6 glass-card shadow-soft animate-slide-up">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Wind className="h-5 w-5 text-primary" />
        Route Information
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Navigation2 className="h-4 w-4" />
            <span>Distance</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{displayDistance}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span>Est. Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{displayTime}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Wind className="h-4 w-4" />
            <span>Average AQI</span>
          </div>
          <p className={`text-2xl font-bold ${getAQIColor(displayAqi)}`}>{displayAqi}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingDown className="h-4 w-4" />
            <span>Pollution</span>
          </div>
          <p className="text-2xl font-bold text-accent">{displayPollution}</p>
        </div>
      </div>

      {/* Detailed Weather Information */}
      {routeData && (
        <div className="mt-6 space-y-4">
          <h4 className="text-md font-semibold text-primary">Detailed Weather Data</h4>

          {/* Source Weather */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg">
            <div>
              <h5 className="font-medium text-sm text-primary mb-2">Source: {routeData.route.source.city}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  <span>Temp: {routeData.route.source.temp}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  <span>Wind: {routeData.route.source.wind_speed} m/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span>Humidity: {routeData.route.source.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Visibility: {routeData.route.source.visibility} km</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm text-primary mb-2">Destination: {routeData.route.destination.city}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  <span>Temp: {routeData.route.destination.temp}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  <span>Wind: {routeData.route.destination.wind_speed} m/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span>Humidity: {routeData.route.destination.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Visibility: {routeData.route.destination.visibility} km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/5 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.route.averages.aqi}</div>
              <div className="text-sm text-muted-foreground">Avg AQI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.route.averages.temperature}°C</div>
              <div className="text-sm text-muted-foreground">Avg Temp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.route.averages.wind_speed} m/s</div>
              <div className="text-sm text-muted-foreground">Avg Wind</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Air Quality Legend</p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-xs font-medium">Clean (0-50)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/20">
            <div className="h-3 w-3 rounded-full bg-warning" />
            <span className="text-xs font-medium">Moderate (51-100)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-xs font-medium">Polluted (100+)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RouteInfoCard;
