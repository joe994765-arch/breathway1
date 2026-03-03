import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface StateAQI {
    state: string;
    aqi: number;
    status: string;
    color: string;
}

const NationalAQI = () => {
    const [stateAQIData, setStateAQIData] = useState<StateAQI[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const aqiResponse = await fetch("/api/states/aqi");
                const aqiData = await aqiResponse.json();
                if (aqiData.success) {
                    // Sort states alphabetically
                    const sortedStates = aqiData.states.sort((a: StateAQI, b: StateAQI) =>
                        a.state.localeCompare(b.state)
                    );
                    setStateAQIData(sortedStates);
                }
            } catch (error) {
                console.error("Error loading AQI data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Get color with alpha channel for background
    const getBgColor = (color: string) => {
        // color comes as hex strings like "#00e400", etc.
        return `${color}20`; // append 20 for ~12% opacity
    };

    if (loading) {
        return (
            <Card className="p-6 glass-card shadow-soft h-[300px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading National Air Quality Index...</div>
            </Card>
        );
    }

    return (
        <Card className="p-6 glass-card shadow-soft">
            <h2 className="text-xl font-bold mb-4">National Air Quality Index</h2>
            <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stateAQIData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-card/50 hover:bg-card transition-colors border">
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">{item.state}</p>
                                <Badge variant="outline" style={{ backgroundColor: getBgColor(item.color), color: item.color, borderColor: item.color }}>
                                    {item.status}
                                </Badge>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold" style={{ color: item.color }}>{item.aqi}</span>
                                <p className="text-xs text-muted-foreground">AQI</p>
                            </div>
                        </div>
                    ))}
                    {stateAQIData.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-8">
                            No state data available.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Card>
    );
};

export default NationalAQI;
