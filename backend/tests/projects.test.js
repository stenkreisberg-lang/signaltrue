import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../server.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe("Projects API", () => {
  test("create -> toggle favorite -> list -> delete flows", async () => {
    // Create
    const createRes = await request(app)
      .post("/api/projects")
      .send({ name: "Test Project", description: "desc" })
      .expect(201);

    const project = createRes.body;
    expect(project).toHaveProperty("_id");
    expect(project.name).toBe("Test Project");
    expect(project.favorite).toBe(false);

    // Toggle favorite
    const putRes = await request(app)
      .put(`/api/projects/${project._id}`)
      .send({ favorite: true })
      .expect(200);
    expect(putRes.body.favorite).toBe(true);

    // List
    const listRes = await request(app).get("/api/projects").expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((p) => p._id === project._id)).toBeTruthy();

    // Delete
    await request(app).delete(`/api/projects/${project._id}`).expect(200);

    // Deleting again should return 404
    await request(app).delete(`/api/projects/${project._id}`).expect(404);
  });
});
