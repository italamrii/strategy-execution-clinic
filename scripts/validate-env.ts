#!/usr/bin/env tsx
import "dotenv/config";
import { validateEnvironment } from "../src/shared/config/env";

const result = validateEnvironment(process.env);
if (!result.ok) {
  console.error("Environment validation FAILED:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}
console.log(`Environment validation OK (${result.environment})`);
