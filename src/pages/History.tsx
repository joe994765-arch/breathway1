import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteHistory from "@/components/RouteHistory";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Navigation } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const mockHistory = [
  {
    id: 1,
    date: "2025-01-15",
    time: "09:30 AM",
    source: "Connaught Place",
    destination: "Gurugram",
    distance: "12.5 km",
    aqi: 45,
    score: 92,
  },
  {
    id: 2,
    date: "2025-01-14",
    time: "02:15 PM",
    source: "Noida Sector 18",
    destination: "Delhi Airport",
    distance: "18.2 km",
    aqi: 78,
    score: 76,
  },
  {
    id: 3,
    date: "2025-01-13",
    time: "11:00 AM",
    source: "Dwarka",
    destination: "Rajouri Garden",
    distance: "8.3 km",
    aqi: 125,
    score: 54,
  },
  {
    id: 4,
    date: "2025-01-12",
    time: "06:45 PM",
    source: "Lajpat Nagar",
    destination: "Saket",
    distance: "5.1 km",
    aqi: 62,
    score: 84,
  },
  {
    id: 5,
    date: "2025-01-11",
    time: "08:20 AM",
    source: "Rohini",
    destination: "Pitampura",
    distance: "6.8 km",
    aqi: 95,
    score: 68,
  },
];

const History = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("hemant@example.com"); // This should come from auth context

  const filteredHistory = mockHistory.filter(
    (route) =>
      route.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAQIBadge = (aqi: number) => {
    if (aqi <= 50) return { variant: "default" as const, label: "Good", color: "text-green-600" };
    if (aqi <= 100) return { variant: "secondary" as const, label: "Moderate", color: "text-yellow-600" };
    return { variant: "destructive" as const, label: "Unhealthy", color: "text-red-600" };
  };

  const chartData = {
    labels: mockHistory.map((r) => r.date).reverse(),
    datasets: [
      {
        label: "Average AQI",
        data: mockHistory.map((r) => r.aqi).reverse(),
        borderColor: "hsl(158, 64%, 35%)",
        backgroundColor: "hsla(158, 64%, 35%, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Your Pollution Exposure Over Time",
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "AQI Level",
        },
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">My Route History</h1>
            <p className="text-muted-foreground">
              View all your past routes and pollution exposure data
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by source or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card className="p-6 glass-card shadow-elevated">
            <Line data={chartData} options={chartOptions} />
          </Card>

          {/* Real Route History from MongoDB */}
          <RouteHistory userEmail={userEmail} />

          <div className="space-y-4">
            {filteredHistory.map((route) => {
              const badge = getAQIBadge(route.aqi);
              return (
                <Card
                  key={route.id}
                  className="p-6 glass-card shadow-soft hover:shadow-elevated transition-all duration-300"
                >
                  <div className="grid md:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{route.date}</span>
                        <span>•</span>
                        <span>{route.time}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{route.source}</span>
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{route.destination}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Distance:</span>
                          <span className="font-medium">{route.distance}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">AQI:</span>
                          <span className={`font-bold ${badge.color}`}>{route.aqi}</span>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-medium">{route.score}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Button variant="outline">Reopen on Map</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredHistory.length === 0 && (
            <Card className="p-12 text-center glass-card">
              <p className="text-muted-foreground">No routes found matching your search.</p>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default History;
