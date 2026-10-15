/** Loads .env for standalone scripts using Next's own loader (supports ${VAR} expansion). */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
