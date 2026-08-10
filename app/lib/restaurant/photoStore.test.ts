import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { LocalPhotoStore, uploadsDirectory } from "./photoStore";
import { rejectPhoto, MAX_PHOTO_BYTES, MAX_PHOTOS } from "./photoLimits";

const dirs: string[] = [];
function tempStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "noctra-photos-"));
  dirs.push(dir);
  return { store: new LocalPhotoStore(dir), dir };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("storing an owner's photograph", () => {
  it("writes the file and returns a servable url", async () => {
    const { store, dir } = tempStore();
    const stored = await store.save(Buffer.from("jpeg-bytes"), "image/jpeg");

    expect(stored.url).toMatch(/^\/uploads\/[0-9a-f]{24}\.jpg$/);
    expect(existsSync(path.join(dir, stored.key))).toBe(true);
  });

  it("never uses a name the uploader chose", async () => {
    // A filename from the client is a path traversal waiting to happen, and two restaurants
    // both uploading IMG_0001.jpg must not collide.
    const { store } = tempStore();
    const names = new Set<string>();
    for (let i = 0; i < 30; i++) names.add((await store.save(Buffer.from("x"), "image/png")).key);
    expect(names.size).toBe(30);
  });

  it("refuses a type it was not built to serve", async () => {
    const { store } = tempStore();
    await expect(store.save(Buffer.from("<svg/>"), "image/svg+xml")).rejects.toThrow();
  });

  it("deletes what it created", async () => {
    const { store, dir } = tempStore();
    const stored = await store.save(Buffer.from("x"), "image/webp");
    await store.remove(stored.key);
    expect(existsSync(path.join(dir, stored.key))).toBe(false);
  });

  it("ignores a key that tries to escape its own directory", async () => {
    // The key arrives from a URL in stored draft data. Turning it into a path without
    // checking is how a delete endpoint becomes a way to remove arbitrary files.
    const { store } = tempStore();
    await expect(store.remove("../../package.json")).resolves.toBeUndefined();
    expect(existsSync(path.join(process.cwd(), "package.json"))).toBe(true);
  });

  it("treats an already-deleted file as done", async () => {
    const { store } = tempStore();
    await expect(store.remove("nao-existe.jpg")).resolves.toBeUndefined();
  });
});

describe("what we tell an owner when we refuse a photo", () => {
  it("accepts what a phone camera produces", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
      expect(rejectPhoto(2_000_000, type, 0), type).toBeNull();
    }
  });

  it("refuses anything that could execute from our own origin", () => {
    expect(rejectPhoto(1000, "image/svg+xml", 0)).toBeTruthy();
    expect(rejectPhoto(1000, "text/html", 0)).toBeTruthy();
    expect(rejectPhoto(1000, "application/pdf", 0)).toBeTruthy();
  });

  it("refuses a photo too large to serve, in Portuguese", () => {
    const message = rejectPhoto(MAX_PHOTO_BYTES + 1, "image/jpeg", 0);
    expect(message).toContain("10 MB");
  });

  it("accepts one right at the limit", () => {
    expect(rejectPhoto(MAX_PHOTO_BYTES, "image/jpeg", 0)).toBeNull();
  });

  it("stops at six and says what to do instead", () => {
    expect(rejectPhoto(1000, "image/jpeg", MAX_PHOTOS - 1)).toBeNull();
    expect(rejectPhoto(1000, "image/jpeg", MAX_PHOTOS)).toContain("Apague uma");
  });

  it("refuses an empty file", () => {
    expect(rejectPhoto(0, "image/jpeg", 0)).toBeTruthy();
  });
});

// The only directory in this product that cannot be rebuilt from anything else. It used to
// default inside the git working tree, where a clean checkout or a `git clean -fdx` takes
// every photograph a restaurant ever took of its own food.
describe("where uploads live", () => {
  it("stays out of the repository in production", () => {
    const dir = uploadsDirectory({ NODE_ENV: "production" } as NodeJS.ProcessEnv);
    expect(dir).toBe("/srv/noctra-uploads");
    expect(dir).not.toContain("public");
  });

  it("is overridable, because a server may not be laid out the way we assumed", () => {
    expect(uploadsDirectory({ NODE_ENV: "production", NOCTRA_UPLOADS_DIR: "/mnt/fotos" } as NodeJS.ProcessEnv))
      .toBe("/mnt/fotos");
  });

  it("keeps public/uploads locally, where Next serves it with no configuration", () => {
    expect(uploadsDirectory({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toContain("public");
  });
});
