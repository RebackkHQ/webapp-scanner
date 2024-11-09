import fetch from "isomorphic-fetch";
import jsdom from "jsdom";
import UserAgent from "user-agents";
import Logger from "../../lib/logger";

export type FormOutput = {
	id: number;
	url: string;
	fields: Array<{ name: string; id: string; class: string; type: string }>;
};

export type CrawlOutput = {
	links: string[];
	forms: FormOutput[];
};

export default class SpiderScanner {
	private header: Record<string, string> = {
		"User-Agent": new UserAgent().toString(),
	};
	private url: URL;
	private logger = new Logger("Spider");

	constructor(url: string) {
		try {
			this.url = new URL(url);
			this.logger.info(
				`Initialized with URL: ${url} & User-Agent: ${this.header["User-Agent"]}`,
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

	// Normalize domains (removes 'www.')
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

	private async fetchUrl(url: string): Promise<string | null> {
		try {
			this.logger.debug(`Fetching URL: ${url}`);
			const response = await fetch(url, { headers: this.header });
			if (!response.ok) {
				this.logger.warn(`Failed to fetch URL (${response.status}): ${url}`);
				return null;
			}
			this.logger.info(`Successfully fetched URL: ${url}`);
			return await response.text();
		} catch (error) {
			this.logger.error(`Error fetching URL: ${url} - ${error}`);
			return null;
		}
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

	private extractForms(html: string): FormOutput[] {
		const { JSDOM } = jsdom;
		const dom = new JSDOM(html);
		const forms = Array.from(dom.window.document.querySelectorAll("form"));
		this.logger.debug(`Extracted ${forms.length} forms from HTML content`);

		return forms.map((form, index) => {
			const fields = Array.from(form.querySelectorAll("input")).map(
				(input) => ({
					name: input.name,
					id: input.id,
					class: input.className,
					type: input.type,
				}),
			);

			return {
				id: index,
				url: this.url.href,
				fields,
			};
		});
	}

	// Main function to scan the website with concurrency support and return both links and forms
	public async crawl(depth = 250, concurrency = 5): Promise<CrawlOutput> {
		const visited = new Set<string>();
		const queue = new Set<string>([this.url.href]);
		const resultLinks = new Set<string>();
		const resultForms = new Set<FormOutput>();

		const fetchAndExtract = async (currentUrl: string) => {
			if (visited.has(currentUrl)) {
				this.logger.debug(`Skipping already visited URL: ${currentUrl}`);
				return;
			}
			visited.add(currentUrl);
			this.logger.info(`Visiting URL: ${currentUrl}`);

			const html = await this.fetchUrl(currentUrl);
			if (!html) return;

			// Extract links and forms
			const links = this.extractLinks(html);
			const forms = this.extractForms(html);

			for (const form of forms) {
				resultForms.add(form);
			}

			for (const link of links) {
				if (!visited.has(link) && queue.size < depth) {
					queue.add(link);
					this.logger.debug(`Added to queue: ${link}`);
				}
			}
			resultLinks.add(currentUrl);
		};

		const processBatch = async () => {
			const batch = Array.from(queue).slice(0, concurrency);
			for (const url of batch) {
				queue.delete(url);
			}
			await Promise.allSettled(batch.map((url) => fetchAndExtract(url)));
		};

		this.logger.info(
			`Starting crawl with depth: ${depth}, concurrency: ${concurrency}`,
		);
		while (queue.size > 0 && visited.size < depth) {
			await processBatch();
		}

		this.logger.info(
			`Crawling completed. Total pages visited: ${resultLinks.size}, Total forms found: ${resultForms.size}`,
		);

		return {
			links: Array.from(resultLinks),
			forms: Array.from(resultForms),
		};
	}
}
