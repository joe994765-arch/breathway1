import { Leaf, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/dashboard", label: "Home" },
    { path: "/history", label: "My History" },
    { path: "/analytics", label: "Analytics" },
    { path: "/about", label: "About" },
    { path: "/", label: "Logout" },
  ];
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-card shadow-soft">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Leaf className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <MapPin className="absolute -bottom-1 -right-1 h-4 w-4 text-secondary" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Pollution Aware
            </span>
            <span className="text-xs text-muted-foreground -mt-1">Route Planner</span>
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary relative",
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
              {location.pathname === item.path && (
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full" />
              )}
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium text-accent-foreground">Live AQI Data</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
