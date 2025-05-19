import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import userRouter from "./routes/user.routes";

dotenv.config();

const app = express();

app.get("/", (req: Request, res: Response) => {
    res.send("hello world");
});

const port = process.env.PORT;

// const aiURL = process.env.AI_URL;
// const model = process.env.AI_MODEL;

app.use("/users", userRouter);

app.listen(port, () => {
    console.log(`Server Running on port ${port}`);
});

export default app;
