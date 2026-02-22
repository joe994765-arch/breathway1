import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Bell, Shield, User, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";

const Settings = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container py-12 animate-fade-in">
                <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Settings
                </h1>

                <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="p-6 glass-card shadow-elevated">
                        <div className="flex items-center gap-4 mb-6">
                            <User className="h-6 w-6 text-primary" />
                            <h2 className="text-xl font-semibold">Account Settings</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                                <div>
                                    <p className="font-medium">Public Profile</p>
                                    <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 glass-card shadow-elevated">
                        <div className="flex items-center gap-4 mb-6">
                            <Bell className="h-6 w-6 text-primary" />
                            <h2 className="text-xl font-semibold">Notifications</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                                <div>
                                    <p className="font-medium">Route Alerts</p>
                                    <p className="text-sm text-muted-foreground">Get notified about traffic on your daily routes</p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                                <div>
                                    <p className="font-medium">AQI Warnings</p>
                                    <p className="text-sm text-muted-foreground">Alert when air quality drops below healthy levels</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 glass-card shadow-elevated">
                        <div className="flex items-center gap-4 mb-6">
                            <Moon className="h-6 w-6 text-primary" />
                            <h2 className="text-xl font-semibold">Appearance</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
                                <div>
                                    <p className="font-medium">Dark Mode</p>
                                    <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                                </div>
                                <Switch
                                    checked={theme === 'dark'}
                                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Settings;
