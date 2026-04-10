import { Linkedin, Github, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© 2025 Breathway</span>
          </div>


        </div>
      </div>
    </footer>
  );
};

export default Footer;
