import express from "express";
import dotenv from "dotenv";
import morgan from "morgan"; // Import morgan
import userRouter from "./routes/user.routes";
import cookieParser from "cookie-parser";
import http from "http";

dotenv.config();

const app = express();

const port = process.env.PORT || 8080; // Fallback port if not defined

// const aiURL = process.env.AI_URL;
// const model = process.env.AI_MODEL;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

app.use(morgan("dev"));

// routes
app.use("/users", userRouter);

let server: http.Server;

// Basic error handler (optional, but good practice)
app.use(
    (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        console.error(err.stack);
        res.status(500).send({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong on the server!",
        });
    },
);

if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 3000; // Or your preferred port
    server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} else {
    server = app.listen();
}

export { app, server };
