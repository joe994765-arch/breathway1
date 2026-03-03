import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ForecastAnalysis from "@/components/ForecastAnalysis";
import StateMap from "@/components/StateMap";
import NationalAQI from "@/components/NationalAQI";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Line, Bar } from "react-chartjs-2";
import { Download, TrendingUp, Wind, MapPin } from "lucide-react";
import { apiService } from "@/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const AnalyticsView = () => {
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || "hemant@example.com");
  const lineChartData = {
    labels: ["Jan 1", "Jan 5", "Jan 10", "Jan 15", "Jan 20", "Jan 25"],
    datasets: [
      {
        label: "Average AQI",
        data: [78, 62, 45, 89, 56, 67],
        borderColor: "hsl(158, 64%, 35%)",
        backgroundColor: "hsla(158, 64%, 35%, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: ["Connaught Place", "Dwarka", "Noida", "Gurugram", "Rohini"],
    datasets: [
      {
        label: "Pollution Level (AQI)",
        data: [125, 78, 95, 110, 82],
        backgroundColor: [
          "hsla(0, 84%, 60%, 0.7)",
          "hsla(48, 96%, 60%, 0.7)",
          "hsla(48, 96%, 60%, 0.7)",
          "hsla(0, 84%, 60%, 0.7)",
          "hsla(48, 96%, 60%, 0.7)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
    },
  };

  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiService.getHistory(userEmail);
        if (response.success && response.routes) {
          // Map API response to UI format
          const mappedRoutes = response.routes.map((route: any) => ({
            id: route._id,
            source: route.source?.city || "Unknown",
            destination: route.destination?.city || "Unknown",
            aqi: route.averages?.aqi || 0,
            distance: `${route.route?.distance || 0} km`,
            date: new Date(route.created_at).toLocaleDateString()
          }));
          setRecentRoutes(mappedRoutes);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    if (userEmail) {
      fetchHistory();
    }
  }, [userEmail]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track pollution trends and route statistics</p>
        </div>

        {/* Real Analytics Dashboard */}
        <AnalyticsDashboard userEmail={userEmail} />

        {/* State-wise Map */}
        <StateMap />

        {/* National Air Quality Index */}
        <NationalAQI />

        {/* Forecast Analysis Section */}
        <ForecastAnalysis defaultCity="New Delhi" />

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6 glass-card shadow-elevated">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-3xl font-bold">247</p>
                <p className="text-xs text-primary">+12% this month</p>
              </div>
              <MapPin className="h-10 w-10 text-primary/20" />
            </div>
          </Card>

          <Card className="p-6 glass-card shadow-elevated">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average AQI</p>
                <p className="text-3xl font-bold">67</p>
                <p className="text-xs text-green-600">-8% cleaner</p>
              </div>
              <Wind className="h-10 w-10 text-primary/20" />
            </div>
          </Card>

          <Card className="p-6 glass-card shadow-elevated">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clean Routes</p>
                <p className="text-3xl font-bold">183</p>
                <p className="text-xs text-primary">74% success</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary/20" />
            </div>
          </Card>

          <Card className="p-6 glass-card shadow-elevated">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Best Score</p>
                <p className="text-3xl font-bold">96</p>
                <p className="text-xs text-green-600">Excellent!</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600/20" />
            </div>
          </Card>
        </div>

        <Card className="p-6 glass-card shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">AQI Trends Over Time</h2>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          <Line data={lineChartData} options={chartOptions} />
        </Card>

        <Card className="p-6 glass-card shadow-elevated">
          <h2 className="text-xl font-semibold mb-4">Pollution Intensity by Location</h2>
          <Bar data={barChartData} options={chartOptions} />
        </Card>

        <Card className="p-6 glass-card shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Route History</h2>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="space-y-3">
            {recentRoutes.length > 0 ? (
              recentRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {route.source} → {route.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">{route.date}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`font-semibold ${route.aqi <= 50 ? "text-green-600" : route.aqi <= 100 ? "text-yellow-600" : "text-red-600"
                      }`}>
                      AQI: {route.aqi}
                    </span>
                    <span className="text-muted-foreground">{route.distance}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent routes found.
              </div>
            )}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AnalyticsView;
