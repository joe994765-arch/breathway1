import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { RouteResponse } from "@/lib/api";

// Fix for default marker icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  className?: string;
  routeData?: RouteResponse | null;
}

const MapView = ({ className, routeData }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map with default view or route data
    const defaultCenter: [number, number] = [28.6139, 77.2090];
    const defaultZoom = 12;

    let center = defaultCenter;
    let zoom = defaultZoom;

    if (routeData) {
      const source = routeData.route.source;
      const dest = routeData.route.destination;
      center = [(source.lat + dest.lat) / 2, (source.lon + dest.lon) / 2];
      zoom = 8;
    }

    const map = L.map(mapContainerRef.current).setView(center, zoom);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    if (routeData) {
      // Add source marker
      const sourceMarker = L.marker([routeData.route.source.lat, routeData.route.source.lon]).addTo(map);
      sourceMarker.bindPopup(`
        <b>${routeData.route.source.city}</b><br>
        AQI: ${routeData.route.source.aqi}<br>
        Temp: ${routeData.route.source.temp}°C
      `);

      // Add destination marker
      const destMarker = L.marker([routeData.route.destination.lat, routeData.route.destination.lon]).addTo(map);
      destMarker.bindPopup(`
        <b>${routeData.route.destination.city}</b><br>
        AQI: ${routeData.route.destination.aqi}<br>
        Temp: ${routeData.route.destination.temp}°C
      `);

      // Add route polyline
      const routePoints = routeData.route.geometry.map(coord => [coord[1], coord[0]] as [number, number]);
      const routeColor = routeData.route.aqi <= 50 ? "green" : routeData.route.aqi <= 100 ? "orange" : "red";

      const routePolyline = L.polyline(routePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.7,
      }).addTo(map);

      routePolyline.bindPopup(`
        <b>${routeData.route.name}</b><br>
        Distance: ${routeData.route.distance} km<br>
        Duration: ${routeData.route.duration} min<br>
        Avg AQI: ${routeData.route.aqi}
      `);
    } else {
      // Default demo markers
      const sourceMarker = L.marker([28.6139, 77.2090]).addTo(map);
      sourceMarker.bindPopup("<b>Source</b><br>Enter your route to see details");

      const destMarker = L.marker([28.5355, 77.3910]).addTo(map);
      destMarker.bindPopup("<b>Destination</b><br>Enter your route to see details");
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [routeData]);

  return (
    <Card className={`overflow-hidden shadow-elevated ${className}`}>
      <div ref={mapContainerRef} className="h-full min-h-[400px] md:min-h-[500px] rounded-lg" />
    </Card>
  );
};

export default MapView;
