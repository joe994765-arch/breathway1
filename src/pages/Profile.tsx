import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UserProfile from "@/components/UserProfile";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState<string>("");

    useEffect(() => {
        const email = localStorage.getItem("userEmail");
        if (!email) {
            toast.error("Please login to view your profile");
            navigate("/");
        } else {
            setUserEmail(email);
        }
    }, [navigate]);

    if (!userEmail) return null;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container py-12 animate-fade-in">
                <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    My Profile
                </h1>
                <div className="max-w-2xl mx-auto">
                    <UserProfile userEmail={userEmail} />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;
