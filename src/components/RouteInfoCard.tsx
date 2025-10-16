import { Clock, Navigation2, Wind, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RouteInfoCardProps {
  distance?: string;
  time?: string;
  aqi?: number;
  pollutionScore?: string;
}

const RouteInfoCard = ({
  distance = "12.5 km",
  time = "25 min",
  aqi = 45,
  pollutionScore = "Low",
}: RouteInfoCardProps) => {
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
          <p className="text-2xl font-bold text-foreground">{distance}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span>Est. Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{time}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Wind className="h-4 w-4" />
            <span>Average AQI</span>
          </div>
          <p className={`text-2xl font-bold ${getAQIColor(aqi)}`}>{aqi}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingDown className="h-4 w-4" />
            <span>Pollution</span>
          </div>
          <p className="text-2xl font-bold text-accent">{pollutionScore}</p>
        </div>
      </div>

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
