import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true }
);

// Get or create model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Database connection helper
async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    return mongoose.connect(process.env.MONGODB_URI);
}

export async function POST(req) {
    try {
        await connectToDatabase();

        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const emailNormalized = String(email).trim().toLowerCase();
        const nameTrimmed = String(name).trim();

        const existing = await User.findOne({ email: emailNormalized }).lean();
        if (existing) {
            return NextResponse.json({ message: "Email already registered" }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: nameTrimmed,
            email: emailNormalized,
            passwordHash
        });

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            }
        }, { status: 201 });
    } catch (err) {
        console.error("Signup error:", err);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
