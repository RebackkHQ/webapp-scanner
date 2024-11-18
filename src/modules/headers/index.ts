import type { Vulnerability } from "../../index.js";
import { generateCVSS } from "../../utils/index.js";
import { createLogger } from "../../utils/index.js";
import { informationLeakChecks, securityChecks } from "./headers.js";

export type HeaderScannerOptions = {
	spiderResults: Array<string>;
	retries?: number;
	timeout?: number;
	concurrency?: number;
};

export type HeadersData = {
	name: string;
	description: string;
	recommendation: string;
	check: (value: string) => boolean;
};

export default class HeaderScanner {
	private securityHeaders: HeadersData[];
	private informationalHeaders: HeadersData[];
	private spiderResults: Array<string>;
	private logger = createLogger("Header Scanner");
	private retries = 3;
	private timeout = 5000;
	private concurrency = 10;
	private vulnerabilities: Array<Vulnerability> = [];

	constructor(options: HeaderScannerOptions) {
		this.spiderResults = options.spiderResults;

		if (options.retries) {
			this.retries = options.retries;
		}

		if (options.timeout) {
			this.timeout = options.timeout;
		}

		if (options.concurrency) {
			this.concurrency = options.concurrency;
		}

		this.securityHeaders = securityChecks;
		this.informationalHeaders = informationLeakChecks;
	}

	private withRetries = async <T>(
		fn: () => Promise<T>,
		retries: number,
	): Promise<T> => {
		let lastError: Error | undefined;
		for (let i = 0; i < retries; i++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error as Error;
			}
		}
		throw lastError;
	};

	private getHeaders = async (url: string): Promise<Headers> => {
		const response = await fetch(url);
		return response.headers;
	};

	private chunkArray = <T>(
		array: Array<T>,
		chunkSize: number,
	): Array<Array<T>> => {
		const chunks = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	};

	private checkHeaders = (headers: Headers, url: string): void => {
		for (const header of this.securityHeaders) {
			const hasheader = headers.has(header.name);
			if (hasheader) {
				const value = headers.get(header.name);
				if (!value) {
					// handle Missing Security Headers
					const { score, level } = generateCVSS({
						accessVector: "N",
						accessComplexity: "L",
						attackRequirements: "N",
						privilegesRequired: "N",
						userInteraction: "N",
						confidentialityImpact: "N",
					});

					this.vulnerabilities.push({
						type: level,
						severity: score,
						url,
						description: `Header ${header.name} was not found. ${header.description} recommendation: ${header.recommendation}`,
					});

					continue;
				}

				const check = header.check(value);

				if (!check) {
					// handle Insecure value for header
					const { score, level } = generateCVSS({
						accessVector: "N",
						accessComplexity: "L",
						attackRequirements: "N",
						privilegesRequired: "N",
						userInteraction: "N",
						confidentialityImpact: "N",
					});

					this.vulnerabilities.push({
						type: level,
						severity: score,
						url,
						description: `Header ${header.name} was found it had the following value ${value} it ${header.description} recommendation: ${header.recommendation}`,
					});
				}
			}
		}

		for (const infoHeader of this.informationalHeaders) {
			// Should Not Have Informational Headers
			const hasheader = headers.has(infoHeader.name);
			if (hasheader) {
				const value = headers.get(infoHeader.name);
				if (!value) {
					continue;
				}

				const check = infoHeader.check(value);

				if (!check) {
					// handle Insecure value for header
					const { score, level } = generateCVSS({
						accessVector: "N",
						accessComplexity: "L",
						attackRequirements: "N",
						privilegesRequired: "N",
						userInteraction: "N",
						confidentialityImpact: "N",
					});

					this.vulnerabilities.push({
						type: level,
						severity: score,
						url,
						description: `Header ${infoHeader.name} was found it ${infoHeader.description} recommendation: ${infoHeader.recommendation}`,
					});
				}
			}
		}
	};

	async scan(): Promise<Array<Vulnerability>> {
		const chunks = this.chunkArray(this.spiderResults, 10);

		for (const chunk of chunks) {
			await Promise.all(
				chunk.map(async (url) => {
					try {
						const headers = await this.withRetries(
							() => this.getHeaders(url),
							this.retries,
						);
						this.checkHeaders(headers, url);
					} catch (error) {
						this.logger.error(`Error scanning headers for ${url}: ${error}`);
					}
				}),
			);
		}

		return this.vulnerabilities;
	}
}
