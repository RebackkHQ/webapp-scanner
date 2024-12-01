import { z } from "zod";

/**
 * Options for constructing a Spider instance.
 */
export const SpiderConstructorOptionsSchema = z
	.object({
		/**
		 * The seed URL for the spider to start crawling from.
		 */
		seed: z.string().url(),

		/**
		 * The maximum depth of crawling. Defaults to 250.
		 */
		maxDepth: z.number().int().positive().max(250).default(250),

		/**
		 * The concurrency level for crawling. Defaults to 10.
		 */
		concurrency: z.number().int().positive().max(30).default(30),

		/**
		 * Whether to ignore external links. Defaults to true.
		 */
		ignoreExternalLinks: z.boolean().default(true),
		/**
		 * The maximum number of retries for failed requests. Defaults to 3.
		 */
		maxRetries: z.number().int().positive().max(10).default(3),

		/**
		 * The timeout for requests in milliseconds. Defaults to 5000.
		 */
		timeout: z.number().int().positive().max(60_000).default(5000),
	})
	/**
	 * Ensure that default values are applied when the options are not provided.
	 */
	.strict();

/**
 * Represents the result of a spider operation.
 */
export const SpiderResultSchema = z.object({
	/**
	 * The seed URL used for the spider operation.
	 */
	seed: z.string(),
	/**
	 * An array of URLs found during the spider operation.
	 */
	urls: z.array(z.string()),
});
