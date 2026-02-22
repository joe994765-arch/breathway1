import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteHistory from "@/components/RouteHistory";

const History = () => {
  const storedEmail = localStorage.getItem("userEmail");
  const [userEmail, setUserEmail] = useState((storedEmail && storedEmail !== "null") ? storedEmail : "hemant@example.com");

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

          {/* Real Route History from MongoDB */}
          <RouteHistory userEmail={userEmail} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default History;
