import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";

// Fix for default marker icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  className?: string;
}

const MapView = ({ className }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 12);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Example markers and routes (demo data)
    const sourceMarker = L.marker([28.6139, 77.2090]).addTo(map);
    sourceMarker.bindPopup("<b>Source</b><br>Starting point");

    const destMarker = L.marker([28.5355, 77.3910]).addTo(map);
    destMarker.bindPopup("<b>Destination</b><br>End point");

    // Example polyline with color coding (green = clean route)
    const cleanRoute = L.polyline(
      [
        [28.6139, 77.2090],
        [28.5800, 77.3000],
        [28.5355, 77.3910],
      ],
      {
        color: "hsl(158, 64%, 35%)",
        weight: 5,
        opacity: 0.7,
      }
    ).addTo(map);

    cleanRoute.bindPopup("<b>Clean Route</b><br>AQI: 45 (Good)");

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <Card className={`overflow-hidden shadow-elevated ${className}`}>
      <div ref={mapContainerRef} className="h-full min-h-[400px] md:min-h-[500px] rounded-lg" />
    </Card>
  );
};

export default MapView;
