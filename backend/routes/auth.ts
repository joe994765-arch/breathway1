import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../schema/User";

const router = Router();

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body as { name: string; email: string; password: string };
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const emailNormalized = String(email).trim().toLowerCase();
        const nameTrimmed = String(name).trim();

        const existing = await User.findOne({ email: emailNormalized }).lean();
        if (existing) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name: nameTrimmed, email: emailNormalized, passwordHash });

        return res.status(201).json({
            id: user._id,
            name: user.name,
            email: user.email,
        });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body as { email: string; password: string };
        if (!email || !password) {
            return res.status(400).json({ message: "Missing email or password" });
        }

        const emailNormalized = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: emailNormalized });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Prefer hashed comparison; support plaintext migration if legacy field exists
        if (user.passwordHash) {
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
        } else if ((user as any).password) {
            // Legacy: stored plaintext; if matches, migrate to hash
            if ((user as any).password !== password) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            user.set("passwordHash", await bcrypt.hash(password, 10));
            user.set("password", undefined);
            await user.save();
        } else {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        return res.json({ id: user._id, name: user.name, email: user.email });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;


