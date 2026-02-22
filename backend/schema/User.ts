import mongoose, { Schema } from "mongoose";

export interface UserDocument extends mongoose.Document {
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);
export default User;


