import express from "express";
import dotenv from "dotenv";
import morgan from "morgan"; // Import morgan
import userRouter from "./routes/user.routes";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

const port = process.env.PORT || 8080; // Fallback port if not defined

// const aiURL = process.env.AI_URL;
// const model = process.env.AI_MODEL;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// HTTP request logger middleware
// Using the 'dev' format for concise output suited for development
// Other formats: 'combined', 'common', 'short', 'tiny'
// You can also create custom formats.
app.use(morgan("dev"));

// routes
app.use("/users", userRouter);

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

app.listen(port, () => {
    console.log(`Server Running on port ${port}`);
});

export default app;
