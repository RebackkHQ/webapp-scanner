import { parse } from "node-html-parser";
import {
	chunkArray,
	createLogger,
	safeStringify,
	withRetries,
} from "../utils/index.ts";
import type { SpiderConstructorOptions, SpiderResults } from "./types/index.ts";
import { SpiderConstructorOptionsSchema } from "./types/schema.ts";

/**
 * The Spider class is used to scan a web application by crawling through the URLs and extracting information.
 * The Spider class uses a breadth-first search algorithm to crawl through the URLs.
 */
export class Spider {
	/**
	 * The logger instance for the Spider class.
	 * We use this to log messages to the console.
	 */
	private logger = createLogger("Spider");
	/**
	 * The options provided to the Spider constructor.
	 * These options are used to configure the behavior of the Spider.
	 *
	 * @see SpiderConstructorOptionsSchema
	 */
	private options: SpiderConstructorOptions;

	constructor(opts: SpiderConstructorOptions) {
		/**
		 * Validate the options provided to the Spider constructor.
		 */
		const result = SpiderConstructorOptionsSchema.safeParse(opts);

		if (result.error !== undefined || !result.data) {
			/**
			 * If the options are invalid, we should throw an error and exit the process.
			 */
			this.logger.error("Invalid options provided to the Spider constructor.");
			throw new Error(
				`Invalid options provided to the Spider constructor: ${safeStringify(
					result.error,
				)}`,
			);
		}

		/**
		 * If the options are valid, we can proceed with the initialization of the Spider.
		 */
		this.options = SpiderConstructorOptionsSchema.parse(opts);

		/**
		 * Log the options provided to the Spider constructor.
		 */
		this.logger.info(
			`Spider created with options: ${safeStringify(this.options)}`,
		);
	}

	private isInternalUrl(url: string): boolean {
		/**
		 * Check if the URL starts with the seed URL.
		 * If it does, then it is an internal URL.
		 * Otherwise, it is an external URL.
		 */
		return new URL(url).origin === new URL(this.options.seed).origin;
	}

	/**
	 * Fetches the page at the given URL.
	 * @param url - The URL of the page to fetch.
	 * @returns A promise that resolves to the fetched page content as a string.
	 */
	private async fetchPage(url: string): Promise<string | null> {
		const fetchUrl = (url: string) => {
			this.logger.info(`Fetching URL: ${url}`);
			/**
			 * We return a promise that resolves when the first of the following promises resolves.
			 * This allows us to handle cases where the request takes too long to complete.
			 */
			return Promise.race([
				/**
				 * We use the `fetch` API to fetch the page at the given URL.
				 */
				fetch(url, {
					/**
					 * We set the `redirect` option to "follow" to follow redirects.
					 *
					 * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters
					 */
					redirect: "follow",
				})
					/**
					 * We extract the text content of the response.
					 * This will be the HTML content of the page.
					 */
					.then((res) => res.text()),
				/**
				 * We create a promise that resolves to null after the specified timeout.
				 * This handles cases where the request takes too long to complete.
				 */
				new Promise<string | null>((resolve) =>
					setTimeout(() => resolve(null), this.options.timeout),
				),
			]);
		};

		/**
		 * Fetch the page at the given URL.
		 * We use the `withRetries` utility function to retry the fetch operation
		 * in case of a failure.
		 */
		return await withRetries(fetchUrl, [url], this.options.maxRetries);
	}

	private normalizeUrl(baseUrl: string, href: string): string | null {
		try {
			if (href.startsWith("http://") || href.startsWith("https://")) {
				return new URL(href).toString();
			}

			if (href.startsWith("/")) {
				return new URL(href, baseUrl).toString();
			}

			const url = new URL(href, baseUrl);

			return url.toString();
		} catch (error) {
			/**
			 * If an error occurs while normalizing the URL, log the error and return null.
			 */
			this.logger.error(`Error normalizing URL: ${href}`);
			this.logger.error(error);
			return null;
		}
	}

	/**
	 * Extracts URLs from the given HTML content using a URL regex and a base URL.
	 *
	 * @param html - The HTML content from which to extract URLs.
	 * @param baseUrl - The base URL used to normalize the extracted URLs.
	 * @returns An array of extracted URLs.
	 */
	private extractUrls(html: string, baseUrl: string) {
		const extracted = new Set<string>();

		/**
		 * Parse the HTML content using the `parse` function from the `node-html-parser` package.
		 */
		const root = parse(html);

		/**
		 * Find all the anchor elements in the HTML content.
		 */
		const anchors = root
			.querySelectorAll("a")
			.concat(root.querySelectorAll("link"))
			.concat(root.querySelectorAll("area"))
			.concat(root.querySelectorAll("base"));

		/**
		 * Iterate over the anchor elements.
		 */
		for (const anchor of anchors) {
			/**
			 * Extract the `href` attribute from the anchor element.
			 */
			const href = anchor.getAttribute("href");

			/**
			 * If the `href` attribute is not present, skip to the next anchor element.
			 */
			if (!href) {
				continue;
			}

			/**
			 * Normalize the extracted URL using the base URL.
			 */
			const normalized = this.normalizeUrl(baseUrl, href);

			if (normalized) {
				if (
					this.options.ignoreExternalLinks &&
					!this.isInternalUrl(normalized)
				) {
					this.logger.info(`Ignoring external URL: ${normalized}`);
					continue;
				}

				extracted.add(normalized);
			}
		}

		/**
		 * Return the array of extracted URLs.
		 */
		return Array.from(extracted);
	}

	/**
	 * Scans the web application by crawling through the URLs and extracting information.
	 * Returns the spider results containing the seed URL and the visited URLs.
	 *
	 * @returns A promise that resolves to the spider results.
	 * @see SpiderResults
	 */
	public async scan(): Promise<SpiderResults> {
		this.logger.info("Starting scan...");
		/**
		 * Create a set to keep track of visited URLs.
		 * This set will be used to avoid visiting the same URL multiple times.
		 * Initially, the set is empty.
		 */
		const visited = new Set<string>();
		/**
		 * Create a queue of URLs to visit.
		 * Initially, the queue contains only the seed URL.
		 */
		const queue = new Set<string>([this.options.seed]);

		/**
		 * Process a URL.
		 * This function fetches the content of the URL, extracts URLs from the content, and adds the extracted URLs to the queue.
		 * It also adds the current URL to the set of visited URLs.
		 *
		 * @param url - The URL to process.
		 * @returns A promise that resolves to an array of extracted URLs.
		 */
		const processUrl = async (url: string) => {
			this.logger.info(`Processing URL: ${url}`);
			/**
			 * Fetch the page at the given URL.
			 */
			const pageContent = await this.fetchPage(url);

			/**
			 * Extract URLs from the fetched page content.
			 * and log the number of URLs extracted.
			 */
			if (!pageContent) {
				this.logger.warn(`Failed to fetch URL: ${url}`);
				return [];
			}

			const extractedUrls = this.extractUrls(pageContent, url);
			this.logger.info(`Extracted ${extractedUrls.length} URLs`);

			/**
			 * Add the current URL to the set of visited URLs.
			 */
			visited.add(url);

			/**
			 * Return the extracted URLs.
			 */
			return extractedUrls;
		};

		/**
		 * Process a batch of URLs.
		 * This function fetches the content of the URLs in the batch,
		 * extracts URLs from the content, and adds the extracted URLs to the queue.
		 * It also removes the processed URLs from the queue.
		 *
		 * @param batch - The batch of URLs to process.
		 * @returns A promise that resolves when the batch is processed.
		 */
		const processBatch = async (batch: string[]) => {
			/**
			 * Process the URLs in the current batch.
			 */
			const promises = batch.map(processUrl);
			/**
			 * Wait for all the promises to resolve.
			 */
			const results = await Promise.all(promises);
			/**
			 * Flatten the results to get a single array of URLs.
			 * Then log the number of URLs processed.
			 */
			const urls = results.flat();
			this.logger.info(`Processed ${batch.length} URLs`);

			/**
			 * Add the extracted URLs to the queue.
			 */
			for (const url of urls) {
				this.logger.info(`Adding URL to queue: ${url}`);
				if (!visited.has(url)) {
					this.logger.info(`URL not visited: ${url}`);
					queue.add(url);
					visited.add(url);
				}
			}

			/**
			 * Remove the processed URLs from the queue.
			 */
			for (const url of batch) {
				queue.delete(url);
			}
		};

		/**
		 * Initialize the current depth to 0.
		 */
		let currentDepth = 0;

		while (queue.size > 0 && currentDepth < this.options.maxDepth) {
			this.logger.info(`Processing depth: ${currentDepth}`);
			/**
			 * Split the queue into batches of URLs.
			 */
			const batches = chunkArray(Array.from(queue), this.options.concurrency);
			/**
			 * Iterate over the batches of URLs.
			 */
			for (const batch of batches) {
				/**
				 * Process the current batch of URLs.
				 */
				await withRetries(processBatch, [batch], this.options.maxRetries);
			}

			/**
			 * Increment the current depth.
			 */
			currentDepth++;
			this.logger.silly(`Processed depth: ${currentDepth}`);
		}

		/**
		 * Return The Spider Results
		 *
		 * @see SpiderResults
		 */
		return {
			seed: this.options.seed,
			urls: Array.from(visited),
		};
	}
}
