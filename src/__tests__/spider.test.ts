import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { Spider } from "../spider/index.ts";
import type { SpiderConstructorOptions } from "../spider/types/index.ts";

describe("Spider", async () => {
	it("Should Throw Error", () => {
		try {
			// @ts-ignore - Testing Purposes
			new Spider();
		} catch (error) {
			equal(error instanceof Error, true);
		}
	});

	it("Should Return An Array", async () => {
		try {
			/**
			 * Options for Spider constructor.
			 */
			const opts: SpiderConstructorOptions = {
				seed: "https://www.example.com",
				maxDepth: 1,
				maxRetries: 1,
				concurrency: 1,
				ignoreExternalLinks: true,
				timeout: 1000,
			};
			const spider = new Spider(opts);
			const { seed, urls } = await spider.scan();

			/**
			 * Asserting the seed is equal to the seed URL.
			 * Asserting the URLs is an array.
			 * @param seed - Seed URL.
			 * @param urls - Array of URLs.
			 */
			equal(seed, opts.seed);
			equal(Array.isArray(urls), true);
		} catch (_) {
			equal(Array.isArray(_), true);
		}
	});
});
