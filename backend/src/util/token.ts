import jwt from "jsonwebtoken";
import { IUser } from "../models/user.model";
import dotenv from "dotenv";

// load dotenv
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

function createToken(user: IUser): string {
    return jwt.sign(
        {
            username: user.username,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET as string,
        {
            expiresIn: "20m",
        },
    );
}

function verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET as string);
}

function getUserFromToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET as string);
    } catch {
        return null;
    }
}

export { createToken, verifyToken, getUserFromToken };
