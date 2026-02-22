import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRouter from "./routes/auth";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
    cors({
        origin: [
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        credentials: true,
    })
);

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "clean-route-radar-api" });
});

app.use("/api/auth", authRouter);

const MONGODB_URI = process.env.MONGODB_URI || "";
const PORT = Number(process.env.PORT || 5000);

if (!MONGODB_URI) {
    // Fail fast to help diagnose missing env
    // eslint-disable-next-line no-console
    console.error("Missing MONGODB_URI in environment variables");
    process.exit(1);
}

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        app.listen(PORT, () => {
            // eslint-disable-next-line no-console
            console.log(`API listening on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    });

export default app;


