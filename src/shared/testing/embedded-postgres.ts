import EmbeddedPostgres from "embedded-postgres";
import { rm } from "node:fs/promises";
import path from "node:path";

/** Retry transient Windows file locks after the test database has stopped. */
export default class TestPostgres extends EmbeddedPostgres {
  override async stop(): Promise<void> {
    const dataRoot = path.resolve(process.cwd(), ".data");
    const databaseDir = path.resolve(this.options.databaseDir);
    const relative = path.relative(dataRoot, databaseDir);
    if (this.options.persistent === false &&
        (!relative || relative.startsWith("..") || path.isAbsolute(relative))) {
      throw new Error("Test database cleanup must stay inside the project .data directory");
    }
    try {
      await super.stop();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (this.options.persistent !== false ||
          !["EBUSY", "EPERM", "ENOTEMPTY"].includes(code ?? "")) {
        throw error;
      }
      await rm(databaseDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  }
}
