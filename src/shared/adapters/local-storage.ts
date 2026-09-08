import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage, StoredObject } from "@/shared/ports/storage";

const ROOT = path.resolve(process.cwd(), ".data", "credential-assets");

export class LocalObjectStorage implements ObjectStorage {
  async putPrivate(input: {
    mime: string;
    body: Uint8Array;
  }): Promise<StoredObject> {
    await mkdir(ROOT, { recursive: true });
    const key = `${Date.now()}-${crypto.randomUUID()}`;
    const file = path.join(ROOT, key);
    await writeFile(file, input.body);
    return {
      bucket: "local-private",
      key,
      mime: input.mime,
      bytes: input.body.byteLength,
    };
  }

  async signedUrl(key: string, expiresSeconds = 3600): Promise<string> {
    void expiresSeconds;
    const safe = key.replace(/\.\./g, "");
    return path.join(ROOT, safe);
  }

  async read(key: string): Promise<Uint8Array> {
    return readFile(path.join(ROOT, key));
  }
}

let storage: LocalObjectStorage | null = null;

/** @deprecated Use getObjectStorage from storage-factory */
export function getLocalObjectStorage(): LocalObjectStorage {
  if (!storage) {
    storage = new LocalObjectStorage();
  }
  return storage;
}
