import { ArrowRight, Clock, Navigation2, Wind, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RouteComparisonCardProps {
  routeName: string;
  distance: string;
  time: string;
  aqi: number;
  isBest?: boolean;
  isFastest?: boolean;
}

const RouteComparisonCard = ({
  routeName,
  distance,
  time,
  aqi,
  isBest = false,
  isFastest = false,
}: RouteComparisonCardProps) => {
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-accent";
    if (aqi <= 100) return "text-warning";
    return "text-destructive";
  };

  const getAQIBadge = (aqi: number) => {
    if (aqi <= 50) return { label: "Clean", variant: "default" as const, className: "bg-accent/10 text-accent border-accent/20" };
    if (aqi <= 100) return { label: "Moderate", variant: "secondary" as const, className: "bg-warning/10 text-warning border-warning/20" };
    return { label: "Polluted", variant: "destructive" as const };
  };

  const badge = getAQIBadge(aqi);

  return (
    <Card className="p-5 glass-card shadow-soft hover:shadow-elevated transition-all duration-200 group">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {routeName}
              {isBest && (
                <Badge className="bg-accent/10 text-accent border-accent/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cleanest
                </Badge>
              )}
              {isFastest && (
                <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Fastest
                </Badge>
              )}
            </h3>
          </div>
          <Badge className={badge.className}>{badge.label}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Navigation2 className="h-3 w-3" />
              <span>Distance</span>
            </div>
            <p className="font-semibold">{distance}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              <span>Time</span>
            </div>
            <p className="font-semibold">{time}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Wind className="h-3 w-3" />
              <span>AQI</span>
            </div>
            <p className={`font-semibold ${getAQIColor(aqi)}`}>{aqi}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
        >
          Select Route
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
};

export default RouteComparisonCard;
