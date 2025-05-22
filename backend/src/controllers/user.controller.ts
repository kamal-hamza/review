import type { Request, Response } from "express";
import { IUser } from "../models/user.model"; // Assuming IUser might not have password as optional for creation
import userModel from "../models/user.model";
import { createToken } from "../util/token";
import bcrypt from "bcryptjs"; // Added for password hashing

const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

async function createUser(req: Request, res: Response) {
    const body: IUser = req.body;
    if (!body || Object.keys(body).length === 0) {
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "Request payload is missing or empty.",
        });
        return;
    }
    const requiredFields: (keyof IUser)[] = ["username", "email", "password"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
        res.status(400).json({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "One or more required fields are missing.",
            details: `Missing fields: ${missingFields.join(", ")}`,
        });
        return;
    }

    try {
        // Hash the password before creating the user
        const hashedPassword = await bcrypt.hash(body.password, SALT_ROUNDS);
        const userDataToCreate = {
            ...body,
            password: hashedPassword, // Store the hashed password
        };

        const user = await userModel.create(userDataToCreate);
        const token = createToken(user); // Assuming createToken doesn't need the password

        // Ensure password is not returned
        res.status(201)
            .cookie("token", token)
            .json({
                status: 201,
                message: "User created successfully.",
                data: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    // Explicitly not including user.password
                },
            });
        return;
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(409).json({
                status: 409,
                code: "CONFLICT",
                message: "Email address already in use.",
            });
            return;
        }
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user due to an internal error.",
        });
        return;
    }
}

async function getUsers(req: Request, res: Response) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required. Invalid or missing token.",
        });
        return;
    }
    try {
        // Exclude password field from the result
        const users = await userModel.find().select("-password");
        res.status(200).json({
            status: 200,
            message: "Users retrieved successfully.",
            data: {
                users: users, // Password field is now excluded
            },
        });
        return;
    } catch (error) {
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve users due to an internal error.",
        });
        return;
    }
}

async function getUser(req: Request, res: Response) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required. Invalid or missing token.",
        });
        return;
    }
    const id = req.params.id;
    if (!id) {
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "User ID parameter is missing.",
        });
        return;
    }
    try {
        // Exclude password field from the result
        const user = await userModel.findOne({ _id: id }).select("-password");

        if (!user) {
            // Simplified check for null user
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message: "User with the specified ID was not found.",
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "User retrieved successfully.",
            data: {
                user: user, // Password field is now excluded
            },
        });
        return;
    } catch (error) {
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve user due to an internal error.",
        });
        return;
    }
}

async function updateUser(req: Request, res: Response) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required. Invalid or missing token.",
        });
        return;
    }
    const id = req.params.id;
    if (!id) {
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "User ID parameter is missing.",
        });
        return;
    }
    const body: Partial<IUser> = req.body; // Use Partial<IUser> for updates
    if (!body || Object.keys(body).length === 0) {
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "Request payload is missing or empty.",
        });
        return;
    }

    try {
        const updateData: Partial<IUser> = { ...body };

        // If password is being updated, hash it
        if (body.password) {
            updateData.password = await bcrypt.hash(body.password, SALT_ROUNDS);
        }

        const updatedUserResult = await userModel.updateOne(
            { _id: id },
            updateData,
        );

        if (!updatedUserResult.acknowledged) {
            res.status(500).json({
                status: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Database did not acknowledge the update operation.",
            });
            return;
        }

        if (updatedUserResult.matchedCount === 0) {
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message: "User with the specified ID not found for update.",
            });
            return;
        }

        // Fetch the updated user (without password) to return in the response
        const user = await userModel.findById(id).select("-password");

        if (!user) {
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message:
                    "User not found after update operation. This should not normally occur if matchedCount > 0.",
            });
            return;
        }

        const message =
            updatedUserResult.modifiedCount > 0
                ? "User updated successfully."
                : "User data remains unchanged as provided data matched existing data.";

        res.status(200).json({
            status: 200,
            message: message,
            data: {
                user: user, // user object already has password excluded
            },
        });
        return;
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(409).json({
                status: 409,
                code: "CONFLICT",
                message: "Email address already in use by another account.",
            });
            return;
        }
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update user due to an internal error.",
        });
        return;
    }
}

async function deleteUser(req: Request, res: Response) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required. Invalid or missing token.",
        });
        return;
    }
    const id = req.params.id;
    if (!id) {
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "User ID parameter is missing.",
        });
        return;
    }
    try {
        const deletedUser = await userModel.deleteOne({
            _id: id,
        });

        if (!deletedUser.acknowledged) {
            res.status(500).json({
                status: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Database did not acknowledge the delete operation.",
            });
            return;
        }

        if (deletedUser.deletedCount === 0) {
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message: "User not found or already deleted.",
            });
            return;
        }
        res.status(200).json({
            status: 200,
            message: "User deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete user due to an internal error.",
        });
        return;
    }
}

export { createUser, getUsers, getUser, updateUser, deleteUser };
