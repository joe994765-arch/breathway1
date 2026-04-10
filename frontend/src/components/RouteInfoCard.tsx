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
  const displayDistance = routeData ? `${routeData.routes[0].distance} km` : distance;
  const displayTime = routeData ? `${routeData.routes[0].duration} min` : time;
  const displayAqi = routeData ? routeData.routes[0].aqi : aqi;
  const displayPollution = routeData ?
    (displayAqi <= 50 ? "Low" : displayAqi <= 100 ? "Moderate" : "High") :
    pollutionScore;
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-green-600";
    if (aqi <= 100) return "text-yellow-600";
    if (aqi <= 150) return "text-orange-600";
    if (aqi <= 200) return "text-red-600";
    if (aqi <= 300) return "text-purple-600";
    return "text-red-900";
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
              <h5 className="font-medium text-sm text-primary mb-2">Source: {routeData.routes[0].source.city}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  <span>Temp: {routeData.routes[0].source.temp}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  <span>Wind: {routeData.routes[0].source.wind_speed} m/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span>Humidity: {routeData.routes[0].source.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Visibility: {routeData.routes[0].source.visibility} km</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm text-primary mb-2">Destination: {routeData.routes[0].destination.city}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  <span>Temp: {routeData.routes[0].destination.temp}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  <span>Wind: {routeData.routes[0].destination.wind_speed} m/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span>Humidity: {routeData.routes[0].destination.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Visibility: {routeData.routes[0].destination.visibility} km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/5 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.routes[0].averages.aqi}</div>
              <div className="text-sm text-muted-foreground">Avg AQI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.routes[0].averages.temperature}°C</div>
              <div className="text-sm text-muted-foreground">Avg Temp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routeData.routes[0].averages.wind_speed} m/s</div>
              <div className="text-sm text-muted-foreground">Avg Wind</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Air Quality Legend</p>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 border border-green-200">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-700">Good (0-50)</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-xs font-medium text-yellow-700">Moderate (51-100)</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-orange-50 border border-orange-200">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-xs font-medium text-orange-700">Unhealthy for Sensitive (101-150)</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-red-50 border border-red-200">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-700">Unhealthy (151-200)</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-purple-50 border border-purple-200">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-purple-700">Severe (201-300)</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-red-100 border border-red-950">
            <div className="h-2 w-2 rounded-full bg-red-900" />
            <span className="text-xs font-medium text-red-900">Hazardous (301+)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RouteInfoCard;
