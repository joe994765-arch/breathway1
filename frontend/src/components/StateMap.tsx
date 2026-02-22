
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface StateAQI {
    state: string;
    aqi: number;
    status: string;
    color: string;
}

const StateMap = () => {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [stateAQIData, setStateAQIData] = useState<StateAQI[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch GeoJSON for Indian States from local file
                const geoResponse = await fetch("/india_states.geojson");
                if (!geoResponse.ok) throw new Error("Failed to load GeoJSON");
                const geoData = await geoResponse.json();
                console.log("GeoJSON loaded:", geoData); // Debug log
                setGeoJsonData(geoData);

                // Fetch AQI Data from our backend
                const aqiResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/states/aqi`);
                const aqiData = await aqiResponse.json();
                if (aqiData.success) {
                    console.log("AQI Data loaded:", aqiData.states); // Debug log
                    setStateAQIData(aqiData.states);
                }
            } catch (error) {
                console.error("Error loading map data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const normalizeStateName = (name: string) => {
        if (!name) return "";
        return name.toLowerCase()
            .replace(/&/g, "and")
            .replace(/state/g, "")
            .replace(/pradesh/g, "") // Optional: aggressive matching
            .trim();
    };

    const style = (feature: any) => {
        if (!feature || !feature.properties) {
            return { fillColor: "#cbd5e1", weight: 1, opacity: 1, color: "white", fillOpacity: 0.7 };
        }
        const stateName = feature.properties.NAME_1 || feature.properties.name || feature.properties.st_nm;

        const stateData = stateAQIData?.find(
            s => (s.state?.toLowerCase() === stateName?.toLowerCase()) ||
                (normalizeStateName(stateName) === normalizeStateName(s.state || ""))
        );

        return {
            fillColor: stateData ? stateData.color : "#cbd5e1",
            weight: 1,
            opacity: 1,
            color: "white",
            dashArray: "3",
            fillOpacity: 0.7,
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        if (!feature || !feature.properties) return;
        const stateName = feature.properties.NAME_1 || feature.properties.name || feature.properties.st_nm;
        const stateData = stateAQIData?.find(
            s => (s.state?.toLowerCase() === stateName?.toLowerCase()) ||
                (normalizeStateName(stateName) === normalizeStateName(s.state || ""))
        );

        if (stateData) {
            layer.bindTooltip(`
        <div style="text-align: center; padding: 4px;">
          <b style="font-size: 14px;">${stateName}</b><br/>
          AQI: ${stateData.aqi}<br/>
          Status: ${stateData.status}
        </div>
      `, { sticky: true });

            layer.on({
                mouseover: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 2,
                        color: '#666',
                        dashArray: '',
                        fillOpacity: 0.9
                    });
                    layer.bringToFront();
                },
                mouseout: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    });
                }
            });
        }
    };

    if (loading) {
        return (
            <Card className="p-6 glass-card shadow-soft h-[500px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading State Map...</div>
            </Card>
        );
    }

    return (
        <Card className="p-4 glass-card shadow-soft overflow-hidden">
            <h2 className="text-xl font-bold mb-4">State-wise Air Quality</h2>
            <div className="h-[500px] rounded-lg overflow-hidden bg-slate-50">
                <MapContainer
                    center={[22.5937, 78.9629]}
                    zoom={4}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    {geoJsonData && (
                        <GeoJSON
                            data={geoJsonData}
                            style={style}
                            onEachFeature={onEachFeature}
                        />
                    )}
                </MapContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Good (0-50)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Moderate (51-100)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Unhealthy (101-150)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Severe (150+)</div>
            </div>
        </Card>
    );
};

export default StateMap;
