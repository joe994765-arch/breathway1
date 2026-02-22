import { Leaf, MapPin, User, LogOut, Settings, UserCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

const Header = () => {
  const location = useLocation();
  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);

  // Fetch user data from localStorage
  useEffect(() => {
    const fetchUserData = async () => {
      const email = localStorage.getItem("userEmail");
      if (!email) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/user/${email}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user data for header:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    // Force reload/navigate to ensure state is cleared if needed
    window.location.href = "/";
  };

  const navItems = [
    { path: "/dashboard", label: "Home" },
    { path: "/history", label: "My History" },
    { path: "/analytics", label: "Analytics" },
    { path: "/about", label: "About" },
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
              Breathway
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center p-2 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <User className="h-5 w-5 text-accent-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-border/50 shadow-elevated">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold">{userData?.name || localStorage.getItem("userName") || "User"}</span>
                  <span className="text-xs text-muted-foreground font-normal">{userData?.email || localStorage.getItem("userEmail") || "Guest"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer w-full flex items-center">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer w-full flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
                <div className="cursor-pointer w-full flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
