import { useEffect, useRef, useState } from "react";
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
  routes?: RouteInfo[];
  selectedIndex?: number;
  onSelectRoute?: (index: number) => void;
}

interface StateAQI {
  state: string;
  aqi: number;
  status: string;
  color: string;
}

interface CityAQI {
  name: string;
  lat: number;
  lon: number;
  aqi: number;
  status: string;
  color: string;
  pollutant: string;
}

const MapView = ({ className, routes = [], selectedIndex = 0, onSelectRoute }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const stateLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cityLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [stateAQIData, setStateAQIData] = useState<StateAQI[]>([]);
  const [cityAQIData, setCityAQIData] = useState<CityAQI[]>([]);

  // Function to get color based on AQI (Legacy helper for routes, though we accept backend colors now)
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "#22c55e"; // Green
    if (aqi <= 100) return "#eab308"; // Yellow
    if (aqi <= 200) return "#f97316"; // Orange - Adjusted to match new scale logic for routes
    if (aqi <= 300) return "#ef4444"; // Red
    if (aqi <= 400) return "#a855f7"; // Purple
    return "#7f1d1d"; // Maroon
  };

  const normalizeStateName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase()
      .replace(/&/g, "and")
      .replace(/state/g, "")
      .replace(/pradesh/g, "")
      .trim();
  };

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [geoRes, stateRes, cityRes] = await Promise.all([
          fetch("/india_states.geojson"),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/states/aqi`),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cities/aqi`)
        ]);

        if (geoRes.ok) setGeoJsonData(await geoRes.json());

        const stateData = await stateRes.json();
        if (stateData.success) setStateAQIData(stateData.states);

        const cityData = await cityRes.json();
        if (cityData.success) setCityAQIData(cityData.cities);

      } catch (error) {
        console.error("Error loading map data:", error);
      }
    };
    loadData();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Initialize map
      const indiaCenter: [number, number] = [22.3511, 78.6677];
      const indiaZoom = 5;

      const map = L.map(mapContainerRef.current, {
        center: indiaCenter,
        zoom: indiaZoom,
        minZoom: 4,
        maxBounds: [[6.0, 68.0], [38.0, 98.0]],
        maxBoundsViscosity: 1.0
      });

      // Add cleaner tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Create layer groups
      stateLayerGroupRef.current = L.layerGroup().addTo(map);
      cityLayerGroupRef.current = L.layerGroup().addTo(map); // Initially added, visibility toggled by logic
      routeLayerGroupRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;

      // Zoom Handler
      map.on('zoomend', () => {
        updateLayerVisibility(map);
      });

      // Legend
      updateLegend(map);
    }
  }, []);

  const updateLegend = (map: L.Map) => {
    // Remove existing legend if any (leaflet controls are tricky to remove by class, but we init once)
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      const grades = [0, 51, 101, 201, 301, 401];
      const labels = ["Good", "Moderate", "Poor", "Unhealthy", "Severe", "Hazardous"];
      const colors = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#7f1d1d"];

      div.style.backgroundColor = "white";
      div.style.padding = "10px";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
      div.style.fontSize = "12px";
      div.style.lineHeight = "1.5";
      div.style.zIndex = "1000";

      div.innerHTML = '<h4 style="margin:0 0 5px; font-weight:bold;">AQI Index</h4>';

      for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;">' +
          '<i style="background:' + colors[i] + '; width: 12px; height: 12px; display:inline-block; border-radius:2px;"></i> ' +
          '<span>' + labels[i] + ' (' + grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 1) : '+') + ')</span>' +
          '</div>';
      }

      return div;
    };

    legend.addTo(map);
  };

  const updateLayerVisibility = (map: L.Map) => {
    const zoom = map.getZoom();
    if (stateLayerGroupRef.current && cityLayerGroupRef.current) {
      if (zoom < 6) {
        if (!map.hasLayer(stateLayerGroupRef.current)) map.addLayer(stateLayerGroupRef.current);
        if (map.hasLayer(cityLayerGroupRef.current)) map.removeLayer(cityLayerGroupRef.current);
      } else {
        if (map.hasLayer(stateLayerGroupRef.current)) map.removeLayer(stateLayerGroupRef.current);
        if (!map.hasLayer(cityLayerGroupRef.current)) map.addLayer(cityLayerGroupRef.current);
      }
    }
  };

  // Render State/City Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoJsonData || stateAQIData.length === 0) return;

    // Update State Layer
    if (stateLayerGroupRef.current) {
      stateLayerGroupRef.current.clearLayers();

      L.geoJSON(geoJsonData, {
        style: (feature: any) => {
          const stateName = feature.properties.NAME_1 || feature.properties.name || feature.properties.st_nm;
          const stateData = stateAQIData.find(
            s => normalizeStateName(s.state) === normalizeStateName(stateName)
          );
          return {
            fillColor: stateData ? stateData.color : "#cbd5e1",
            weight: 1,
            opacity: 1,
            color: "white",
            dashArray: "3",
            fillOpacity: 0.6,
          };
        },
        onEachFeature: (feature, layer) => {
          const stateName = feature.properties.NAME_1 || feature.properties.name || feature.properties.st_nm;
          const stateData = stateAQIData.find(
            s => normalizeStateName(s.state) === normalizeStateName(stateName)
          );

          if (stateData) {
            layer.bindTooltip(`
                           <div style="text-align: center;">
                             <b>${stateName}</b><br/>
                             AQI: ${stateData.aqi}<br/>
                             Status: ${stateData.status}
                           </div>
                       `, { sticky: true });

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 2, color: '#666', fillOpacity: 0.8 });
                l.bringToFront();
              },
              mouseout: (e) => {
                const l = e.target;
                l.setStyle({ weight: 1, color: 'white', fillOpacity: 0.6 });
              }
            });
          }
        }
      }).addTo(stateLayerGroupRef.current);
    }

    // Update City Layer
    if (cityLayerGroupRef.current && cityAQIData.length > 0) {
      cityLayerGroupRef.current.clearLayers();

      cityAQIData.forEach(city => {
        const marker = L.circleMarker([city.lat, city.lon], {
          radius: 8,
          fillColor: city.color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        marker.bindPopup(`
                  <div class="p-2 min-w-[150px]">
                      <h3 class="font-bold text-base mb-1">${city.name}</h3>
                      <div class="space-y-1 text-sm">
                          <div class="flex justify-between">
                              <span class="text-muted-foreground">AQI:</span>
                              <span class="font-bold" style="color: ${city.color}">${city.aqi}</span>
                          </div>
                           <div class="flex justify-between">
                              <span class="text-muted-foreground">Status:</span>
                              <span class="font-medium">${city.status}</span>
                          </div>
                          <div class="flex justify-between">
                              <span class="text-muted-foreground">Pollutant:</span>
                              <span class="font-medium">${city.pollutant}</span>
                          </div>
                      </div>
                  </div>
              `);

        cityLayerGroupRef.current?.addLayer(marker);
      });
    }

    // Initial visibility check
    updateLayerVisibility(map);

  }, [geoJsonData, stateAQIData, cityAQIData]);


  // Render Routes (Existing Logic preserved but moved to routeLayerGroup)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerGroupRef.current) return;

    // Clear existing routes
    routeLayerGroupRef.current.clearLayers();

    if (routes && routes.length > 0) {
      const bounds = L.latLngBounds([]);

      // Process all routes
      routes.forEach((route, index) => {
        const isSelected = index === selectedIndex;
        const routePoints = route.geometry.map(coord => [coord[1], coord[0]] as [number, number]);

        // Add route to bounds
        routePoints.forEach(pt => bounds.extend(pt));

        // Style based on selection
        const color = isSelected ? getAQIColor(route.aqi) : "#9ca3af"; // Gray if not selected
        const weight = isSelected ? 6 : 4;
        const opacity = isSelected ? 0.9 : 0.5;

        const polyline = L.polyline(routePoints, {
          color: color,
          weight: weight,
          opacity: opacity
        });

        // Add click handler
        polyline.on('click', (e) => {
          L.DomEvent.stopPropagation(e); // Prevent map click
          if (onSelectRoute) onSelectRoute(index);
        });

        // Bind popup
        polyline.bindPopup(`
                <b>${route.name}</b><br>
                Type: ${route.type}<br>
                Distance: ${route.distance} km<br>
                Duration: ${route.duration} min<br>
                Avg AQI: ${route.aqi}<br>
                Traffic: ${route.traffic ? route.traffic.status : 'N/A'}
            `);

        // Add to layer group
        routeLayerGroupRef.current?.addLayer(polyline);

        // Bring selected route to front
        if (isSelected) {
          polyline.bringToFront();
        }
      });

      // Add markers for Start/End
      const displayRoute = routes[selectedIndex] || routes[0];
      const sourceMarker = L.marker([displayRoute.source.lat, displayRoute.source.lon]);
      sourceMarker.bindPopup(`
            <b>${displayRoute.source.city}</b><br>
            AQI: ${displayRoute.source.aqi}<br>
            Temp: ${displayRoute.source.temp}°C
        `);
      routeLayerGroupRef.current.addLayer(sourceMarker);

      const destMarker = L.marker([displayRoute.destination.lat, displayRoute.destination.lon]);
      destMarker.bindPopup(`
            <b>${displayRoute.destination.city}</b><br>
            AQI: ${displayRoute.destination.aqi}<br>
            Temp: ${displayRoute.destination.temp}°C
        `);
      routeLayerGroupRef.current.addLayer(destMarker);

      // Fit bounds to show all routes
      map.fitBounds(bounds, { padding: [50, 50] });

    }
    // Note: I removed the "Default majorCities view" from the route logic because we now have the City AQI layer which serves a better purpose.
    // If no routes are present, the map shows the State/City AQI layers naturally.

  }, [routes, selectedIndex, onSelectRoute]);

  return (
    <Card className={`overflow-hidden shadow-elevated ${className}`}>
      <div ref={mapContainerRef} className="h-full min-h-[400px] md:min-h-[500px] rounded-lg" />
    </Card>
  );
};

export default MapView;
