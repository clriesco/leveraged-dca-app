import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Load environment variables from .env file
 * This must be called before any other imports that use process.env
 */
dotenv.config({ path: path.resolve(__dirname, "../.env") });
