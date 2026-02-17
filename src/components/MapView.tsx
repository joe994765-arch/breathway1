import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { RouteInfo } from "@/lib/api";

// Fix for default marker icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  className?: string;
  routeData?: RouteInfo | null;
}

const MapView = ({ className, routeData }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map with India view by default, or route data if available
    const indiaCenter: [number, number] = [20.5937, 78.9629]; // Center of India
    const indiaZoom = 5; // Show full India

    let center = indiaCenter;
    let zoom = indiaZoom;

    if (routeData) {
      const source = routeData.source;
      const dest = routeData.destination;
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
      const sourceMarker = L.marker([routeData.source.lat, routeData.source.lon]).addTo(map);
      sourceMarker.bindPopup(`
        <b>${routeData.source.city}</b><br>
        AQI: ${routeData.source.aqi}<br>
        Temp: ${routeData.source.temp}°C
      `);

      // Add destination marker
      const destMarker = L.marker([routeData.destination.lat, routeData.destination.lon]).addTo(map);
      destMarker.bindPopup(`
        <b>${routeData.destination.city}</b><br>
        AQI: ${routeData.destination.aqi}<br>
        Temp: ${routeData.destination.temp}°C
      `);

      // Add route polyline
      const routePoints = routeData.geometry.map(coord => [coord[1], coord[0]] as [number, number]);
      const routeColor = routeData.aqi <= 50 ? "green" : routeData.aqi <= 100 ? "orange" : "red";

      const routePolyline = L.polyline(routePoints, {
        color: routeColor,
        weight: 5,
        opacity: 0.7,
      }).addTo(map);

      routePolyline.bindPopup(`
        <b>${routeData.name}</b><br>
        Distance: ${routeData.distance} km<br>
        Duration: ${routeData.duration} min<br>
        Avg AQI: ${routeData.aqi}
      `);
    } else {
      // Show India with major cities
      const majorCities = [
        { name: "Delhi", lat: 28.6139, lon: 77.2090 },
        { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
        { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
        { name: "Chennai", lat: 13.0827, lon: 80.2707 },
        { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
        { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
        { name: "Pune", lat: 18.5204, lon: 73.8567 },
        { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 }
      ];

      majorCities.forEach(city => {
        const marker = L.marker([city.lat, city.lon]).addTo(map);
        marker.bindPopup(`<b>${city.name}</b><br>Click to plan route from/to this city`);
      });
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
