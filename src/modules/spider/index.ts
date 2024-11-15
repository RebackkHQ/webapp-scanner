import fetch from "isomorphic-fetch";
import jsdom from "jsdom";
import UserAgent from "user-agents";
import { createLogger } from "../../utils";

export interface SpiderScannerOptions {
	depth?: number;
	concurrency?: number;
	retries?: number;
	timeout?: number;
}

export default class SpiderScanner {
	private header: Record<string, string> = {
		"User-Agent": new UserAgent().toString(),
	};
	private url: URL;
	private logger = createLogger("SpiderScanner");

	private depth: number;
	private concurrency: number;
	private retries: number;
	private timeout: number;

	constructor(url: string, options: SpiderScannerOptions = {}) {
		const {
			depth = 250,
			concurrency = 5,
			retries = 3,
			timeout = 5000,
		} = options;
		this.depth = depth;
		this.concurrency = concurrency;
		this.retries = retries;
		this.timeout = timeout;

		try {
			this.url = new URL(url);
			this.logger.info(
				`Initialized with URL: ${url}, User-Agent: ${this.header["User-Agent"]}`,
			);
		} catch (error) {
			if (error instanceof TypeError) {
				this.logger.error("Invalid URL");
				throw new Error("Invalid URL");
			}
			this.logger.error(`Unexpected error in constructor: ${error}`);
			throw error;
		}
	}

	private normalizeDomain(domain: string): string {
		return domain.startsWith("www.") ? domain.slice(4) : domain;
	}

	private convertRelativeUrlToAbsolute(url: string): string {
		return new URL(url, this.url.toString()).toString();
	}

	private isInternalLink(url: string): boolean {
		try {
			const parsedUrl = new URL(url, this.url.href);
			if (!["http:", "https:"].includes(parsedUrl.protocol)) {
				return false;
			}
			const baseDomain = this.normalizeDomain(this.url.hostname);
			const parsedDomain = this.normalizeDomain(parsedUrl.hostname);
			return parsedDomain === baseDomain;
		} catch (error) {
			this.logger.warn(`Error parsing URL: ${url} - ${error}`);
			return false;
		}
	}

	private async fetchWithRetries(
		url: string,
		retries: number,
	): Promise<string | null> {
		for (let attempt = 1; attempt <= retries; attempt++) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
				this.logger.debug(`Fetching URL (Attempt ${attempt}): ${url}`);
				const randomUserAgent = new UserAgent().toString();
				this.logger.info(`Changing User-Agent to: ${randomUserAgent}`);
				this.header["User-Agent"] = randomUserAgent;
				const response = await fetch(url, {
					headers: this.header,
					signal: controller.signal,
					redirect: "follow",
				});

				clearTimeout(timeoutId);

				if (response.ok) {
					this.logger.info(`Successfully fetched URL: ${url}`);
					return await response.text();
				}

				this.logger.warn(`Failed to fetch URL (${response.status}): ${url}`);
			} catch (error) {
				if ((error as Error).name === "AbortError") {
					this.logger.warn(`Fetch timed out: ${url}`);
				} else {
					this.logger.error(`Error fetching URL: ${url} - ${error}`);
				}
			}
		}
		return null;
	}

	private extractLinks(html: string): string[] {
		const { JSDOM } = jsdom;
		const dom = new JSDOM(html);
		const links = Array.from(dom.window.document.querySelectorAll("a"));
		const hrefs = links.map((link) => link.href);
		const internalLinks = hrefs.filter((href) => this.isInternalLink(href));
		this.logger.debug(
			`Extracted ${internalLinks.length} internal links from HTML content`,
		);
		return internalLinks.map((link) => this.convertRelativeUrlToAbsolute(link));
	}

	public async crawl(): Promise<Array<string>> {
		const visited = new Set<string>();
		const queue = new Set<string>([this.url.href]);
		const resultLinks = new Set<string>();

		// Assets to ignore
		const assetExtensions = [
			".css",
			".js",
			".png",
			".jpg",
			".jpeg",
			".gif",
			".svg",
			".ico",
			".webp",
			".mp4",
			".mp3",
			".wav",
			".avi",
			".mov",
			".webm",
			".pdf",
			".doc",
			".docx",
			".xls",
			".xlsx",
			".ppt",
			".pptx",
			".zip",
			".rar",
			".tar",
			".gz",
		];

		const fetchAndExtract = async (currentUrl: string) => {
			if (visited.has(currentUrl)) {
				this.logger.debug(`Skipping already visited URL: ${currentUrl}`);
				return;
			}
			visited.add(currentUrl);
			this.logger.info(`Visiting URL: ${currentUrl}`);

			const html = await this.fetchWithRetries(currentUrl, this.retries);
			if (!html) return;

			const links = this.extractLinks(html);

			// Filter out asset links
			for (const link of links) {
				if (assetExtensions.some((ext) => link.endsWith(ext))) {
					this.logger.debug(`Ignoring asset link: ${link}`);
					continue;
				}
				this.logger.debug(`Found link: ${link}`);
			}

			for (const link of links) {
				if (!visited.has(link) && queue.size < this.depth) {
					queue.add(link);
					this.logger.debug(`Added to queue: ${link}`);
				}
			}
			resultLinks.add(currentUrl);
		};

		const processBatch = async () => {
			const batch = Array.from(queue).slice(0, this.concurrency);
			for (const url of batch) {
				queue.delete(url);
			}
			await Promise.allSettled(batch.map((url) => fetchAndExtract(url)));
		};

		this.logger.info(
			`Starting crawl with depth: ${this.depth}, concurrency: ${this.concurrency}`,
		);
		while (queue.size > 0 && visited.size < this.depth) {
			await processBatch();
		}

		this.logger.info(
			`Crawling completed. Total pages visited: ${resultLinks.size}`,
		);

		return Array.from(resultLinks);
	}
}
