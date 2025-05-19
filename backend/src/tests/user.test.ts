import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import importt from "../server";
import { IUser } from "../models/user.model";

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

describe("User Routes", () => {
    let createdUserId: string;
    let _authToken: string;

    const userPayload: IUser = {
        username: "testname",
        email: "test@example.com",
        password: "testpassword",
        profile_pic_url: null,
        role: [],
        reviews: [],
        liked_products: [],
    };

    it("POST /users/create/ - should create a user based on data provided", async () => {
        const res = await request(importt)
            .post("/users/create")
            .send(userPayload);

        expect(res.status).toBe(201);
        expect(res.body._id).toBeDefined();
        expect(res.body.username).toBe(userPayload.username);
        expect(res.body.email).toBe(userPayload.email);
        // expect(res.body.role).toBe("guest");
        expect(res.body.token).toBeDefined();

        createdUserId = res.body._id;
        _authToken = res.body.token;
    });

    it("should get all users from db", async () => {
        const res = await request(importt).get("/users/get");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it("should get a user by ID", async () => {
        const res = await request(importt).get(`/users/get/${createdUserId}`);
        expect(res.status).toBe(200);
        expect(res.body.username).toBe(userPayload.username);
    });

    it("should update a user", async () => {
        const updateRes = await request(importt)
            .patch(`/users/update/${createdUserId}`)
            .send({
                username: "updatedName",
                email: "new@email.com",
                role: "admin",
            });

        expect(updateRes.status).toBe(204);

        const checkRes = await request(importt).get(
            `/users/get/${createdUserId}`,
        );
        expect(checkRes.body.username).toBe("updatedName");
        expect(checkRes.body.role).toBe("admin");
    });

    it("should delete a user", async () => {
        const delRes = await request(importt).delete(
            `/users/delete/${createdUserId}`,
        );
        expect(delRes.status).toBe(204);

        const check = await request(importt).get(`/users/get/${createdUserId}`);
        expect(check.status).toBe(404);
    });

    // Extra test: JWT protected route
    it("should deny access to protected route without token", async () => {
        const res = await request(importt).get("/users/me"); // example protected route
        expect([401, 403]).toContain(res.status);
    });

    it("should allow access to protected route with valid token", async () => {
        // Recreate user to get a valid token
        const res = await request(importt)
            .post("/users/create")
            .send(userPayload);
        const token = res.body.token;

        const protectedRes = await request(importt)
            .get("/users/me")
            .set("Authorization", `Bearer ${token}`);

        expect(protectedRes.status).toBe(200);
        expect(protectedRes.body.email).toBe(userPayload.email);
    });

    // Extra test: creating user with missing required fields
    it("should return 400 for missing required fields", async () => {
        const res = await request(importt).post("/users/create").send({
            username: "baduser",
            // missing email/password
        });
        expect(res.status).toBe(400);
    });

    // Extra test: duplicate email
    it("should not allow creating user with duplicate email", async () => {
        await request(importt).post("/users/create").send(userPayload);
        const res = await request(importt)
            .post("/users/create")
            .send(userPayload);
        expect([400, 409]).toContain(res.status); // Depending on your validation
    });
});
