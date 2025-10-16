import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Leaf, Target, Zap, Shield } from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Leaf,
      title: "Eco-Friendly Routes",
      description: "Find routes with the cleanest air quality to protect your health and the environment.",
    },
    {
      icon: Target,
      title: "Real-time Data",
      description: "Access live air quality data from multiple sources for accurate route planning.",
    },
    {
      icon: Zap,
      title: "Smart Optimization",
      description: "AI-powered route optimization balancing distance, time, and air quality.",
    },
    {
      icon: Shield,
      title: "Health First",
      description: "Prioritize your respiratory health with pollution-aware navigation.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              About Pollution Aware Route Planner
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Empowering healthier journeys through intelligent, pollution-aware navigation
            </p>
          </div>

          {/* Mission Statement */}
          <Card className="p-8 glass-card shadow-elevated">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              In today's world, air pollution poses a significant health risk, especially in urban areas. 
              Our mission is to help people make informed decisions about their travel routes by providing 
              real-time air quality data and suggesting the healthiest paths between destinations. We believe 
              that everyone deserves to breathe cleaner air, and small changes in our daily routes can make 
              a big difference to our health.
            </p>
          </Card>

          {/* Features Grid */}
          <div>
            <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="p-6 glass-card shadow-soft hover:shadow-elevated transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <Card className="p-8 glass-card shadow-soft">
            <h2 className="text-2xl font-bold mb-4">Technology Stack</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span><strong className="text-foreground">React.js</strong> - Modern, responsive user interface</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span><strong className="text-foreground">Leaflet.js</strong> - Interactive maps with route visualization</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span><strong className="text-foreground">Chart.js</strong> - Beautiful data visualizations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span><strong className="text-foreground">MongoDB</strong> - Efficient data storage and retrieval</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span><strong className="text-foreground">Tailwind CSS</strong> - Modern, eco-friendly design system</span>
              </div>
            </div>
          </Card>

          {/* Developer Info */}
          <Card className="p-8 glass-card shadow-soft gradient-air">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Developed by Hemant</h2>
              <p className="text-muted-foreground">
                Built with passion for creating healthier, more sustainable urban environments
              </p>
              <div className="flex items-center justify-center gap-4 pt-4">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Connect on LinkedIn
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
