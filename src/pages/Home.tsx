import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteInputPanel from "@/components/RouteInputPanel";
import MapView from "@/components/MapView";
import RouteInfoCard from "@/components/RouteInfoCard";
import RouteComparisonCard from "@/components/RouteComparisonCard";
import { toast } from "sonner";

const Home = () => {
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (source: string, destination: string) => {
    toast.success(`Searching routes from ${source} to ${destination}`);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Input and Info */}
          <div className="lg:col-span-1 space-y-6">
            <RouteInputPanel onSearch={handleSearch} />
            {showResults && <RouteInfoCard />}
          </div>

          {/* Center - Map */}
          <div className="lg:col-span-2">
            <MapView className="h-full" />
          </div>
        </div>

        {/* Route Comparison Section */}
        {showResults && (
          <div className="mt-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Compare Routes</h2>
              <p className="text-muted-foreground">
                Choose the best route based on your priorities
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <RouteComparisonCard
                routeName="Route A - Via Ring Road"
                distance="12.5 km"
                time="25 min"
                aqi={45}
                isBest
              />
              <RouteComparisonCard
                routeName="Route B - Via Highway"
                distance="10.2 km"
                time="18 min"
                aqi={78}
                isFastest
              />
              <RouteComparisonCard
                routeName="Route C - Via City Center"
                distance="14.8 km"
                time="32 min"
                aqi={125}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;
