import request from "supertest";
import mongoose, { set } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server"; // Assuming server.ts exports the app
import { IUser } from "../models/user.model"; // Assuming this path is correct

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

async function createTestUserAndGetCookie() {
    const username = `authuser${Math.random().toString(36).substring(7)}`;
    const email = `authuser${Math.random().toString(36).substring(7)}@example.com`;
    const password = "securepassword";
    const res = await request(app).post("/users/create").send({
        username: username,
        email: email,
        password: password,
    });

    // Check if user creation was successful and has the new structure
    if (res.status !== 201 || !res.body.data || !res.body.data._id) {
        console.error("Failed to create test user:", res.body);
        throw new Error(
            "Test user creation failed or response format is incorrect.",
        );
    }

    const rawCookie = res.headers["set-cookie"]?.[0];
    if (!rawCookie)
        throw new Error("No cookie returned during test user creation");

    const id: string = res.body.data._id; // Adjusted to access id from data object
    return { rawCookie, id, username, email, password };
}

describe("User Routes", () => {
    const userPayload: Partial<IUser> = {
        // Using Partial as not all fields are always sent for creation
        username: "testname",
        email: "test@example.com",
        password: "testpassword",
        // profile_pic_url, role, reviews, liked_products are optional or set by default by model/controller
    };

    const fullUserPayloadForCreation: IUser = {
        username: "fulluser",
        email: `fulluser${Math.random()}@example.com`,
        password: "testpassword",
        profile_pic_url: null,
        role: [], // Assuming role is an array as per IUser, default might be set in model
        reviews: [],
        liked_products: [],
    };

    it("POST /users/create - should create a user based on data provided", async () => {
        const res = await request(app).post("/users/create").send({
            username: fullUserPayloadForCreation.username,
            email: fullUserPayloadForCreation.email,
            password: fullUserPayloadForCreation.password,
        });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe(201);
        expect(res.body.message).toBe("User created successfully.");
        expect(res.body.data._id).toBeDefined();
        expect(res.body.data.username).toBe(
            fullUserPayloadForCreation.username,
        );
        expect(res.body.data.email).toBe(fullUserPayloadForCreation.email);
        expect(res.body.data.role).toBeDefined(); // Default role should be set
        expect(res.headers["set-cookie"]).toBeDefined();
        expect(res.headers["set-cookie"]?.[0]).toMatch(/token=/);
    });

    it("GET /users/get - should get all users from db", async () => {
        const { rawCookie } = await createTestUserAndGetCookie();
        const res = await request(app)
            .get("/users/get")
            .set("Cookie", rawCookie);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(200);
        expect(res.body.message).toBe("Users retrieved successfully.");
        expect(Array.isArray(res.body.data.users)).toBe(true);
        expect(res.body.data.users.length).toBeGreaterThanOrEqual(1); // At least the auth user
    });

    it("GET /users/get/:id - should get a user by ID", async () => {
        const { rawCookie, id, username, email } =
            await createTestUserAndGetCookie();
        const res = await request(app)
            .get(`/users/get/${id}`)
            .set("Cookie", rawCookie);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(200);
        expect(res.body.message).toBe("User retrieved successfully.");
        expect(res.body.data.user._id).toBe(id);
        expect(res.body.data.user.username).toBe(username);
        expect(res.body.data.user.email).toBe(email);
    });

    it("PATCH /users/update/:id - should update a user", async () => {
        const { rawCookie, id } = await createTestUserAndGetCookie();
        const updatedData = {
            username: "updatedName",
            email: `updated${Math.random()}@example.com`, // Ensure unique email for update
        };
        const updateRes = await request(app)
            .patch(`/users/update/${id}`)
            .set("Cookie", rawCookie)
            .send(updatedData);

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.status).toBe(200);
        expect(updateRes.body.message).toBe("User updated successfully.");
        expect(updateRes.body.data.user.username).toBe(updatedData.username);
        expect(updateRes.body.data.user.email).toBe(updatedData.email);
        // expect(updateRes.body.data.user.role).toBeDefined(); // Role might not be part of this update
    });

    it("PATCH /users/update/:id - should return 200 if user found but no data changed", async () => {
        const { rawCookie, id, username, email, password } =
            await createTestUserAndGetCookie(); // Get existing data
        const updateRes = await request(app)
            .patch(`/users/update/${id}`)
            .set("Cookie", rawCookie)
            .send({ username, email, password }); // Send the exact same data

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.status).toBe(200);
        expect(updateRes.body.message).toBe(
            "User data remains unchanged as provided data matched existing data.",
        );
        expect(updateRes.body.data.user.username).toBe(username);
    });

    it("DELETE /users/delete/:id - should delete a user", async () => {
        const { rawCookie, id } = await createTestUserAndGetCookie();
        const delRes = await request(app)
            .delete(`/users/delete/${id}`)
            .set("Cookie", rawCookie);

        expect(delRes.status).toBe(200); // Changed from 204
        expect(delRes.body.status).toBe(200);
        expect(delRes.body.message).toBe("User deleted successfully.");

        // Verify user is deleted
        const checkRes = await request(app)
            .get(`/users/get/${id}`)
            .set("Cookie", rawCookie);

        expect(checkRes.status).toBe(404);
        expect(checkRes.body.status).toBe(404);
        expect(checkRes.body.code).toBe("NOT_FOUND");
        expect(checkRes.body.message).toBe(
            "User with the specified ID was not found.",
        );
    });

    it("should deny access to protected GET /users/get route without token", async () => {
        const res = await request(app).get("/users/get");
        expect(res.status).toBe(401);
        expect(res.body.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHORIZED");
        expect(res.body.message).toBe(
            "Authentication required. Invalid or missing token.",
        );
    });

    it("should deny access to protected GET /users/get/:id route without token", async () => {
        const res = await request(app).get("/users/get/somefakeid");
        expect(res.status).toBe(401);
        expect(res.body.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHORIZED");
        expect(res.body.message).toBe(
            "Authentication required. Invalid or missing token.",
        );
    });

    it("should allow access to protected GET /users/get/:id route with valid token", async () => {
        const { rawCookie, id, email } = await createTestUserAndGetCookie();
        const protectedRes = await request(app)
            .get(`/users/get/${id}`)
            .set("Cookie", rawCookie);

        expect(protectedRes.status).toBe(200);
        expect(protectedRes.body.status).toBe(200);
        expect(protectedRes.body.message).toBe("User retrieved successfully.");
        expect(protectedRes.body.data.user.email).toBe(email);
        expect(protectedRes.body.data.user._id).toBe(id);
    });

    it("POST /users/create - should return 400 for missing required fields (e.g., email)", async () => {
        const res = await request(app).post("/users/create").send({
            username: "baduser",
            password: "password123",
            // Missing email
        });
        expect(res.status).toBe(400);
        expect(res.body.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.message).toBe(
            "One or more required fields are missing.",
        );
        expect(res.body.details).toContain("email");
    });

    it("POST /users/create - should return 400 for empty payload", async () => {
        const res = await request(app).post("/users/create").send({});
        expect(res.status).toBe(400);
        expect(res.body.status).toBe(400);
        expect(res.body.code).toBe("BAD_REQUEST"); // As per controller logic for empty body
        expect(res.body.message).toBe("Request payload is missing or empty.");
    });

    it("POST /users/create - should return 409 for duplicate email", async () => {
        // Use a unique email for the first creation to avoid interference from other tests
        const uniqueEmailPayload = {
            username: "uniqueuser",
            email: `unique_${Date.now()}@example.com`,
            password: "testpassword",
        };
        const firstRes = await request(app)
            .post("/users/create")
            .send(uniqueEmailPayload);
        expect(firstRes.status).toBe(201); // Ensure first user is created

        // Attempt to create another user with the same email
        const res = await request(app)
            .post("/users/create")
            .send(uniqueEmailPayload);
        expect(res.status).toBe(409);
        expect(res.body.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.message).toBe("Email address already in use.");
    });

    it("GET /users/get/:id - should return 404 for non-existent user ID", async () => {
        const { rawCookie } = await createTestUserAndGetCookie();
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .get(`/users/get/${nonExistentId}`)
            .set("Cookie", rawCookie);

        expect(res.status).toBe(404);
        expect(res.body.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.message).toBe(
            "User with the specified ID was not found.",
        );
    });

    it("PATCH /users/update/:id - should return 404 for non-existent user ID", async () => {
        const { rawCookie } = await createTestUserAndGetCookie();
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .patch(`/users/update/${nonExistentId}`)
            .set("Cookie", rawCookie)
            .send({ username: "ghostupdate" });

        expect(res.status).toBe(404);
        expect(res.body.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.message).toBe(
            "User with the specified ID not found for update.",
        );
    });

    it("DELETE /users/delete/:id - should return 404 for non-existent user ID", async () => {
        const { rawCookie } = await createTestUserAndGetCookie();
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .delete(`/users/delete/${nonExistentId}`)
            .set("Cookie", rawCookie);

        expect(res.status).toBe(404);
        expect(res.body.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.message).toBe("User not found or already deleted.");
    });
});
