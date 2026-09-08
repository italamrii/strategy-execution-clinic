import type { ObjectStorage } from "@/shared/ports/storage";
import { isProductionRuntime } from "@/shared/config/runtime";
import { LocalObjectStorage } from "./local-storage";
import { S3ObjectStorage } from "./s3-storage";

let instance: ObjectStorage | null = null;

export function getObjectStorage(): ObjectStorage {
  if (instance) return instance;
  const provider = process.env.OBJECT_STORAGE_PROVIDER ?? (process.env.S3_BUCKET ? "s3" : "local");
  if (provider === "s3" || (isProductionRuntime() && process.env.S3_BUCKET)) {
    instance = new S3ObjectStorage();
    return instance;
  }
  if (isProductionRuntime()) {
    throw new Error("production requires OBJECT_STORAGE_PROVIDER=s3");
  }
  instance = new LocalObjectStorage();
  return instance;
}

export function resetObjectStorageForTests(): void {
  instance = null;
}
