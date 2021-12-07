const supertest = require("supertest");
const app = require("../server");

const request = supertest(app);

test("Get 200 for API homepage", async () => {
  const response = await request.get("/");
  expect(response.status).toBe(200);
});
