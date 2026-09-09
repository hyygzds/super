import { describe, expect, it } from "vitest";
import {
  getValueAtPath,
  joinNamePath,
  normalizeNamePath,
  parseNamePath,
  setValueAtPath,
} from "./name-path";

describe("name-path", () => {
  it("parses dotted and bracket paths", () => {
    expect(parseNamePath("user.address.city")).toEqual([
      "user",
      "address",
      "city",
    ]);
    expect(parseNamePath("users[0].name")).toEqual(["users", 0, "name"]);
    expect(parseNamePath("users.0.name")).toEqual(["users", 0, "name"]);
    expect(parseNamePath(["users", 0, "name"])).toEqual(["users", 0, "name"]);
  });

  it("normalizes and joins paths", () => {
    expect(normalizeNamePath("users[0].name")).toBe("users.0.name");
    expect(normalizeNamePath(["user", "email"])).toBe("user.email");
    expect(joinNamePath("users", [0, "name"])).toBe("users.0.name");
    expect(joinNamePath(["users"], 0, "name")).toBe("users.0.name");
  });

  it("gets and sets nested values without flattening keys", () => {
    const root: Record<string, unknown> = {};
    setValueAtPath(root, "user.email", "a@b.c");
    setValueAtPath(root, ["users", 0, "name"], "Ada");
    expect(root).toEqual({
      user: { email: "a@b.c" },
      users: [{ name: "Ada" }],
    });
    expect(getValueAtPath(root, "user.email")).toBe("a@b.c");
    expect(getValueAtPath(root, "users.0.name")).toBe("Ada");
  });

  it("keeps single-segment names flat", () => {
    const root: Record<string, unknown> = {};
    setValueAtPath(root, "email", "x");
    expect(root).toEqual({ email: "x" });
    expect(getValueAtPath(root, "email")).toBe("x");
  });
});
