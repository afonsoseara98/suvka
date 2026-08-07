import { randomBytes } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { ALLOWED_TYPES } from "./photoLimits";

// THE OWNER'S OWN PHOTOGRAPHS
//
// A restaurant does not publish a website showing another restaurant's food. The stock
// photographs are what makes the first thirty seconds convincing; they are not what makes
// the site publishable. Until an owner can put their own dish on their own page, every
// preview is a demo.
//
// Local disk, deliberately. S3 and R2 both need an account, keys and a bucket before a
// single photo can be stored, and this has to work today on a VPS. PhotoStore is the seam
// they drop into later - same shape as DraftStore and ImageProvider - and the URL the rest
// of the app sees does not change when they do.
export interface StoredPhoto {
  url: string;
  // The key is what a delete needs. Kept separate from the URL so a future object store can
  // serve from a CDN domain while still knowing what to remove.
  key: string;
}

export interface PhotoStore {
  save(bytes: Buffer, contentType: string): Promise<StoredPhoto>;
  remove(key: string): Promise<void>;
}

export class LocalPhotoStore implements PhotoStore {
  constructor(private readonly directory: string = path.join(process.cwd(), "public", "uploads")) {}

  async save(bytes: Buffer, contentType: string): Promise<StoredPhoto> {
    const extension = ALLOWED_TYPES[contentType];
    if (!extension) throw new Error(`Unsupported image type: ${contentType}`);

    await mkdir(this.directory, { recursive: true });

    // Random name, never the uploaded filename. A name chosen by the uploader is a path
    // traversal waiting to happen, and two restaurants both uploading "IMG_0001.jpg" must
    // not collide.
    const key = `${randomBytes(12).toString("hex")}.${extension}`;
    await writeFile(path.join(this.directory, key), bytes);

    return { url: `/uploads/${key}`, key };
  }

  async remove(key: string): Promise<void> {
    // Only ever a bare filename from save(). Anything containing a separator is not
    // something this store produced.
    if (key.includes("/") || key.includes("\\") || key.includes("..")) return;

    try {
      await unlink(path.join(this.directory, key));
    } catch {
      // Already gone is the outcome the caller wanted.
    }
  }
}

const globalForPhotos = globalThis as unknown as { photoStore?: PhotoStore };

export const photoStore: PhotoStore = globalForPhotos.photoStore ?? new LocalPhotoStore();

if (process.env.NODE_ENV !== "production") {
  globalForPhotos.photoStore = photoStore;
}

