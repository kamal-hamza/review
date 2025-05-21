import { Router } from "express";
import {
    createUser,
    deleteUser,
    getUser,
    getUsers,
    updateUser,
} from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";

const userRouter = Router();

userRouter.post("/create", createUser);
userRouter.get("/get", requireAuth, getUsers);
userRouter.get("/get/:id", requireAuth, getUser);
userRouter.patch("/update/:id", requireAuth, updateUser);
userRouter.delete("/delete/:id", requireAuth, deleteUser);

export default userRouter;
