import test from "node:test";
import assert from "node:assert/strict";
import { checkAdminAuth } from "./adminAuth.js";

test("allows requests in non-production when token is not configured", () => {
  process.env.NODE_ENV = "development";
  delete process.env.ADMIN_API_TOKEN;

  const result = checkAdminAuth(new Request("http://localhost/test"));
  assert.equal(result.ok, true);
});

test("rejects requests in production when token is not configured", () => {
  process.env.NODE_ENV = "production";
  delete process.env.ADMIN_API_TOKEN;

  const result = checkAdminAuth(new Request("http://localhost/test"));
  assert.equal(result.ok, false);
  assert.equal(result.status, 500);
});

test("accepts x-admin-token when it matches configured token", () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_API_TOKEN = "secret-token";

  const request = new Request("http://localhost/test", {
    headers: { "x-admin-token": "secret-token" }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, true);
});

test("rejects invalid token", () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_API_TOKEN = "secret-token";

  const request = new Request("http://localhost/test", {
    headers: { "x-admin-token": "wrong-token" }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test("accepts bearer token", () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_API_TOKEN = "secret-token";

  const request = new Request("http://localhost/test", {
    headers: { authorization: "Bearer secret-token" }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, true);
});

