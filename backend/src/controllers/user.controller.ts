import type { Request, Response } from "express";
import { IUser } from "../models/user.model";
import userModel from "../models/user.model";
import { createToken } from "../util/token";

async function createUser(req: Request, res: Response) {
    // get body as IUser
    const body: IUser = req.body;
    // check if body is valid
    if (!body) {
        console.log(body);
        // invalid payload
        res.status(400).send({ error: "Invalid Payload" });
    }
    // body is good so create the use
    const user = await userModel.create(body);
    // check if user was created successfully
    if (!user) {
        res.status(500).send({ message: "Unable to create user!" });
    }
    // create the token
    const token = createToken(user);
    // return the proper info
    res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: token,
    });
}

export { createUser };
