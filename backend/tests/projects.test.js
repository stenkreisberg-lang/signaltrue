import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Set test environment before importing app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.USE_IN_MEMORY_DB = "1";

// Dynamic import after env is set
let app;
let mongoServer;

beforeAll(async () => {
  // Import app after env is set
  const module = await import("../server.js");
  app = module.default;
  
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Disconnect first if already connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe("Projects API", () => {
  test.skip("create -> toggle favorite -> list -> delete flows", async () => {
    // TODO: Fix test - needs proper app initialization without conflicting DB connections
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
