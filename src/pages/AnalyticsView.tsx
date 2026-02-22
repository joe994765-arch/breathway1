import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ForecastAnalysis from "@/components/ForecastAnalysis";
import StateMap from "@/components/StateMap";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Line } from "react-chartjs-2";
import { Download, History, BarChart3, Map as MapIcon, ChevronRight, Activity, TrendingUp, Wind, MapPin, Clock, Shield } from "lucide-react";
import { apiService } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  const storedEmail = localStorage.getItem("userEmail");
  const userEmail = (storedEmail && storedEmail !== "null") ? storedEmail : "hemant@example.com";
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiService.getHistory(userEmail);
        if (response.success && response.routes) {
          setHistoryData(response.routes);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userEmail]);

  // Exposure Timeline Chart Data
  const chartLabels = historyData.length > 0
    ? historyData.slice(-10).map(r => {
      try {
        const d = new Date(r.created_at);
        return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      } catch (e) {
        return "N/A";
      }
    })
    : ["Feb 18", "Feb 19", "Feb 20", "Feb 21", "Feb 22"];

  const chartValues = historyData.length > 0
    ? historyData.slice(-10).map(r => r.averages?.aqi || 0)
    : [85, 120, 95, 150, 250];

  const lineChartData = {
    labels: chartLabels,
    datasets: [{
      label: "AQI Exposure",
      data: chartValues,
      borderColor: "hsla(158, 64%, 35%, 1)",
      backgroundColor: "hsla(158, 64%, 35%, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: "#fff",
      pointBorderColor: "hsla(158, 64%, 35%, 1)",
      pointBorderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 14, weight: 'bold' as const },
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `AQI: ${context.raw}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { weight: 'bold' as const, size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { weight: 'bold' as const, size: 10 } }
      }
    }
  };

  const totalDistance = Math.round(historyData.reduce((sum, r) => sum + (r.route?.distance || 0), 0)) || 0;
  const avgAqi = historyData.length > 0
    ? Math.round(historyData.reduce((sum, r) => sum + (r.averages?.aqi || 0), 0) / historyData.length)
    : 0;

  const cleanJourneysCount = historyData.filter(r => (r.averages?.aqi || 0) <= 100).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">
              Analytics <span className="text-primary">&</span> Intelligence
            </h1>
            <p className="text-slate-500 font-medium">Tracking exposure for {userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl font-bold border-slate-200">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* 1. Executive Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 glass-card border-none shadow-soft flex items-center gap-5 animate-fade-in stagger-1 hover:scale-[1.02] transition-transform">
            <div className="p-3.5 bg-emerald-100 rounded-2xl animate-scale-in">
              <History className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 leading-tight">{historyData.length || 0}</div>
              <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Total Routes</div>
            </div>
          </Card>

          <Card className="p-6 glass-card border-none shadow-soft flex items-center gap-5 animate-fade-in stagger-2 hover:scale-[1.02] transition-transform">
            <div className="p-3.5 bg-orange-100 rounded-2xl animate-scale-in">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 leading-tight">{avgAqi}</div>
              <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Avg Exposure</div>
            </div>
          </Card>

          <Card className="p-6 glass-card border-none shadow-soft flex items-center gap-5 animate-fade-in stagger-3 hover:scale-[1.02] transition-transform">
            <div className="p-3.5 bg-blue-100 rounded-2xl animate-scale-in">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 leading-tight">{cleanJourneysCount}</div>
              <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Clean Journeys</div>
            </div>
          </Card>

          <Card className="p-6 glass-card border-none shadow-soft flex items-center gap-5 animate-fade-in stagger-4 hover:scale-[1.02] transition-transform">
            <div className="p-3.5 bg-purple-100 rounded-2xl animate-scale-in">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 leading-tight">{totalDistance.toLocaleString()} <span className="text-sm font-bold text-slate-400">km</span></div>
              <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Total Travel</div>
            </div>
          </Card>
        </div>

        {/* 2. Main Analytics Grid (12-Column for Neatness) */}
        <div className="grid grid-cols-12 gap-8 pt-4">
          {/* Left: Exposure Timeline (7 Columns) */}
          <section className="col-span-12 lg:col-span-7 space-y-4 animate-slide-up stagger-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Exposure Timeline
              </h2>
            </div>
            <Card className="p-8 glass-card border-none shadow-elevated h-[450px]">
              {loading ? (
                <div className="h-full flex items-center justify-center animate-pulse text-muted-foreground font-bold italic">Syncing with sensor network...</div>
              ) : (
                <Line data={lineChartData} options={chartOptions} />
              )}
            </Card>
          </section>

          {/* Right: Health Advisory (5 Columns) */}
          <section className="col-span-12 lg:col-span-5 space-y-4 animate-slide-up stagger-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Risk Advisory
              </h2>
            </div>
            <div className="h-[450px]">
              <AnalyticsDashboard userEmail={userEmail} />
            </div>
          </section>

          {/* 3. Geographical & Forecast (Full Width sections) */}
          <section className="col-span-12 space-y-6 pt-6 animate-slide-up stagger-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-primary" /> Regional Air Quality Impact
              </h2>
            </div>
            <div className="rounded-[40px] overflow-hidden shadow-elevated border-none bg-white p-2">
              <ErrorBoundary fallback={<div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-2xl p-8 text-center"><p className="text-slate-500 font-medium">Regional map data calculation is taking longer than expected.</p></div>}>
                <StateMap />
              </ErrorBoundary>
            </div>
          </section>

          <section className="col-span-12 space-y-6 pt-6 animate-slide-up stagger-5 pb-12">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" /> Predictive Air Forecast
              </h2>
            </div>
            <div className="rounded-[40px] overflow-hidden shadow-elevated border-none bg-white p-0">
              <ErrorBoundary>
                <ForecastAnalysis defaultCity="New Delhi" showNationalOverview={false} />
              </ErrorBoundary>
            </div>
          </section>
        </div>

        {/* 5. National Snapshot Overlay */}
        <div className="pt-8 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-4 py-2 rounded-full mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live National Feed
          </div>
          <ForecastAnalysis showNationalOverview={true} hideForecast={true} />
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default AnalyticsView;
