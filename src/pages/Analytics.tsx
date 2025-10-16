import { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, MapPin, Calendar } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [aqiTrendData, setAqiTrendData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Average AQI",
        data: [45, 52, 38, 65, 48, 42, 55],
        borderColor: "hsl(158, 64%, 35%)",
        backgroundColor: "hsl(158, 64%, 35%, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  });

  const [locationData, setLocationData] = useState({
    labels: ["Ring Road", "Highway", "City Center", "Bypass", "Main Street"],
    datasets: [
      {
        label: "Pollution Intensity",
        data: [45, 78, 125, 62, 95],
        backgroundColor: [
          "hsl(158, 64%, 35%, 0.8)",
          "hsl(38, 92%, 50%, 0.8)",
          "hsl(0, 75%, 55%, 0.8)",
          "hsl(38, 92%, 50%, 0.8)",
          "hsl(0, 75%, 55%, 0.8)",
        ],
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleExport = () => {
    // Mock export functionality
    const csvContent = "data:text/csv;charset=utf-8,Route,Distance,Time,AQI\nRoute A,12.5km,25min,45\nRoute B,10.2km,18min,78\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "route_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Track pollution trends and route history
              </p>
            </div>
            <Button onClick={handleExport} variant="clean" size="lg">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 glass-card shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Routes</p>
                  <p className="text-3xl font-bold text-primary mt-2">24</p>
                  <p className="text-xs text-accent mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% this week
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg AQI</p>
                  <p className="text-3xl font-bold text-accent mt-2">52</p>
                  <p className="text-xs text-accent mt-1">Clean air quality</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </Card>

            <Card className="p-6 glass-card shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold text-secondary mt-2">156</p>
                  <p className="text-xs text-secondary mt-1">Searches made</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/10">
                  <Calendar className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 glass-card shadow-soft">
              <h2 className="text-xl font-semibold mb-4">AQI Trends Over Time</h2>
              <div className="h-[300px]">
                <Line data={aqiTrendData} options={chartOptions} />
              </div>
            </Card>

            <Card className="p-6 glass-card shadow-soft">
              <h2 className="text-xl font-semibold mb-4">Pollution by Location</h2>
              <div className="h-[300px]">
                <Bar data={locationData} options={chartOptions} />
              </div>
            </Card>
          </div>

          {/* Recent Routes */}
          <Card className="p-6 glass-card shadow-soft">
            <h2 className="text-xl font-semibold mb-4">Recent Routes</h2>
            <div className="space-y-3">
              {[
                { from: "Connaught Place", to: "Cyber City", date: "2025-10-15", aqi: 45 },
                { from: "Nehru Place", to: "Gurgaon", date: "2025-10-14", aqi: 78 },
                { from: "Dwarka", to: "Noida", date: "2025-10-13", aqi: 52 },
              ].map((route, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {route.from} → {route.to}
                      </p>
                      <p className="text-sm text-muted-foreground">{route.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">AQI</p>
                    <p className={`font-semibold ${route.aqi <= 50 ? "text-accent" : "text-warning"}`}>
                      {route.aqi}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Analytics;
