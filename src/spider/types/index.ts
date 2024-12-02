import type { z } from "zod";
import type {
	SpiderConstructorOptionsSchema,
	SpiderResultSchema,
} from "./schema.ts";

/**
 * Represents the options for constructing a Spider object.
 *
 * @see SpiderConstructorOptionsSchema
 */
export type SpiderConstructorOptions = z.infer<
	typeof SpiderConstructorOptionsSchema
>;

/**
 * Represents the result of a Spider object.
 *
 * @see SpiderResultSchema
 */
export type SpiderResults = z.infer<typeof SpiderResultSchema>;
