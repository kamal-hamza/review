import type { Request, Response } from "express";
import { IUser } from "../models/user.model";
import userModel from "../models/user.model";
import { createToken } from "../util/token";

async function createUser(req: Request, res: Response) {
    const body: IUser = req.body;
    if (!body || Object.keys(body).length === 0) {
        // Added check for empty body
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
        const user = await userModel.create(body);
        const token = createToken(user);
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
                },
            });
        return;
    } catch (err: any) {
        console.error("Create user error:", err);

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
        const users = await userModel.find();
        res.status(200).json({
            status: 200,
            message: "Users retrieved successfully.",
            data: {
                users: users,
            },
        });
        return;
    } catch (error) {
        console.error("Get users error:", error);
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
        // Changed from 401 to 400 as missing ID is a bad request
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "User ID parameter is missing.",
        });
        return; // Added return
    }
    try {
        const user = await userModel.findOne({
            _id: id,
        });
        if (user?.errors || user == null) {
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
                user: user,
            },
        });
        // .send() is not needed after .json()
        return;
    } catch (error) {
        console.error("Get user error:", error);
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
        // Changed from 401 to 400
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "User ID parameter is missing.",
        });
        return;
    }
    const body: IUser = req.body;
    if (!body || Object.keys(body).length === 0) {
        // Added check for empty body
        // Changed from 401 to 400
        res.status(400).json({
            status: 400,
            code: "BAD_REQUEST",
            message: "Request payload is missing or empty.",
        });
        return; // Added return
    }
    try {
        const updatedUser = await userModel.updateOne({ _id: id }, body);

        // Mongoose updateOne result:
        // acknowledged: boolean
        // modifiedCount: number (docs updated)
        // upsertedId: any (if upsert)
        // upsertedCount: number (if upsert)
        // matchedCount: number (docs matched query)

        if (!updatedUser.acknowledged) {
            res.status(500).json({
                // If DB did not acknowledge, it's a server-side issue
                status: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Database did not acknowledge the update operation.",
            });
            return;
        }

        if (updatedUser.matchedCount === 0) {
            res.status(404).json({
                // If no document matched, it's a NOT_FOUND
                status: 404,
                code: "NOT_FOUND",
                message: "User with the specified ID not found for update.",
            });
            return;
        }

        if (updatedUser.modifiedCount === 0 && updatedUser.matchedCount > 0) {
            // User found, but no changes applied (data might be identical)
            // Still retrieve and return the user as per original logic flow.
            const user = await userModel.findById(id);
            if (!user) {
                // Should ideally not happen if matchedCount > 0
                res.status(404).json({
                    status: 404,
                    code: "NOT_FOUND",
                    message:
                        "User found during update check, but could not be retrieved subsequently.",
                });
                return;
            }
            res.status(200).json({
                status: 200,
                message:
                    "User data remains unchanged as provided data matched existing data.",
                data: {
                    user: {
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                },
            });
            return;
        }

        const user = await userModel.findById(id);

        if (!user) {
            // This case should ideally be caught by matchedCount === 0 earlier
            // Or if user was deleted between update and findById
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message: "User not found after update operation.",
            });
            return;
        }

        res.status(200).json({
            status: 200,
            message: "User updated successfully.",
            data: {
                user: {
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            },
        });
        return;
    } catch (error: any) {
        console.error("Update user error:", error);
        if (error.code === 11000) {
            // Handle potential duplicate email on update
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
        // Changed from 401 to 400
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
                // If DB did not acknowledge
                status: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "Database did not acknowledge the delete operation.",
            });
            return;
        }

        if (deletedUser.deletedCount === 0) {
            // If acknowledged but nothing deleted, user wasn't found
            res.status(404).json({
                status: 404,
                code: "NOT_FOUND",
                message: "User not found or already deleted.",
            });
            return;
        }
        // Changed from 204 to 200 to allow a response body for consistency
        res.status(200).json({
            status: 200,
            message: "User deleted successfully.",
            // No data typically returned on delete, but message confirms action
        });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete user due to an internal error.",
        });
        return;
    }
}

export { createUser, getUsers, getUser, updateUser, deleteUser };
