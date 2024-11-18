import { cpus } from "node:os";
import puppeteer, { type ElementHandle, type Page } from "puppeteer";
import { createLogger, generateCVSS } from "../../utils/index.js";
import type { Vulnerability } from "../../utils/types.js";
import payloads from "./payloads.json";

export type XSSConstructorOpts = {
	spiderResults: Array<string>;
	retries?: number;
	timeout?: number;
	concurrency?: number;
};

export default class XSSScanner {
	private logger = createLogger("XSSScanner");
	private spiderResults: Array<string> = [];
	private retries = 3;
	private timeout = 10000;
	private vulnerabilities: Array<Vulnerability> = [];
	private concurrency = 20;

	constructor(opts: XSSConstructorOpts) {
		try {
			this.validateSpiderResults(opts.spiderResults);

			this.spiderResults = opts.spiderResults;

			if (opts.retries) {
				this.retries = opts.retries;
			}

			if (opts.timeout) {
				this.timeout = opts.timeout;
			}

			if (opts.concurrency) {
				if (opts.concurrency < 1) {
					throw new Error("Concurrency must be greater than 0");
				}

				if (opts.concurrency > 100) {
					throw new Error("Concurrency must be less than or equal to 100");
				}

				this.concurrency = opts.concurrency;
			}

			this.logger.info(
				`XSSScanner initialized with ${this.spiderResults.length} URLs, ${this.retries} retries, ${this.timeout}ms timeout, and ${this.concurrency} workers`,
			);
		} catch (error) {
			throw new Error(`Error initializing XSSScanner: ${error}`);
		}
	}

	private validateSpiderResults(spiderResults: Array<string>) {
		if (!spiderResults) {
			throw new Error("Missing required spiderResults parameter");
		}

		if (!Array.isArray(spiderResults)) {
			throw new Error("spiderResults must be an array");
		}

		if (Array.isArray(spiderResults) && spiderResults.length === 0) {
			throw new Error("spiderResults array cannot be empty");
		}

		spiderResults.some((url) => {
			if (typeof url !== "string") {
				throw new Error("spiderResults array must contain only strings");
			}
		});
	}

	private async fillFormIfExists(page: Page, url: string) {
		try {
			const formsExist = await page.evaluate(() => {
				return document.forms.length > 0;
			});

			if (!formsExist) {
				this.logger.info(`No forms found on ${url}`);
				return;
			}

			this.logger.info(`Found forms on ${url}`);

			for (const payload of payloads) {
				if (typeof payload !== "string" || payload.length === 0) {
					this.logger.warn(`Skipping malformed payload: "${payload}"`);
					continue;
				}

				this.logger.info(`Testing payload "${payload}" on ${url}`);

				const forms = await page.$$("form");

				if (!forms || forms.length === 0) {
					this.logger.info(`No forms found on ${url}`);
					return;
				}

				for (const form of forms) {
					const inputs = await form.$$("input");
					for (const input of inputs) {
						const type = await input.evaluate((node) => node.type);
						switch (type) {
							case "text":
							case "email":
							case "password":
							case "number":
							case "tel":
							case "url":
							case "search":
							case "date":
							case "time":
							case "month":
							case "week":
							case "datetime-local":
								await input.type(payload);
								break;
							case "checkbox":
							case "radio":
								await input.evaluate((node) => {
									node.checked = true;
								});
								break;
						}
					}

					const textAreas = await form.$$("textarea");
					for (const textArea of textAreas) {
						await textArea.type(payload);
					}

					const selects = await form.$$("select");
					for (const select of selects) {
						select.evaluate((node) => {
							if (node.options.length > 0) {
								node.selectedIndex = 0;
							}
						});
					}

					await form.evaluate((node) => node.submit());

					page.removeAllListeners("dialog"); // Add this line
					page.removeAllListeners("console"); // Add this line

					page.on("dialog", async (dialog) => {
						this.logger.info(
							`XSS Potentially Found - Dialog message: ${dialog.message()}`,
						);

						const dialogMessage = dialog.message();

						await dialog.dismiss();

						const isVulnerable = payload.includes(dialogMessage);

						if (isVulnerable) {
							this.logger.info(
								`XSS Potentially Found - Dialog message: ${dialogMessage}`,
							);
							const description =
								"Payload was reflected on dialog message. People can inject malicious code into the website.";

							const { score, level } = generateCVSS({
								accessVector: "A",
								accessComplexity: "H",
								attackRequirements: "P",
								privilegesRequired: "L",
								userInteraction: "A",
								confidentialityImpact: "L",
							});

							const sameVulnerability = this.vulnerabilities.find(
								(vulnerability) => vulnerability.description === description,
							);

							if (!sameVulnerability) {
								this.vulnerabilities.push({
									type: level,
									url,
									description,
									severity: score,
									payloads: [payload],
								});
							} else {
								const payloadToBeAdded = sameVulnerability.payloads
									? [...sameVulnerability.payloads, payload]
									: [payload];

								sameVulnerability.payloads = Array.from(
									new Set(payloadToBeAdded),
								);
							}
						}
					});

					page.on("console", (msg) => {
						this.logger.info(
							`XSS Potentially Found - Console message: ${msg.text()}`,
						);
						const consoleMessage = msg.text();

						const isVulnerable = payload.includes(consoleMessage);

						if (isVulnerable) {
							this.logger.info(
								`XSS Potentially Found - Console message: ${consoleMessage}`,
							);
							const description =
								"Payload was reflected on the console. People can inject malicious code into the website.";
							const { score, level } = generateCVSS({
								accessVector: "A",
								accessComplexity: "H",
								attackRequirements: "P",
								privilegesRequired: "L",
								userInteraction: "A",
								confidentialityImpact: "L",
							});

							const sameVulnerability = this.vulnerabilities.find(
								(vulnerability) => vulnerability.description === description,
							);

							if (!sameVulnerability) {
								this.vulnerabilities.push({
									type: level,
									url,
									description,
									severity: score,
									payloads: [payload],
								});
							} else {
								const payloadToBeAdded = sameVulnerability.payloads
									? [...sameVulnerability.payloads, payload]
									: [payload];

								sameVulnerability.payloads = Array.from(
									new Set(payloadToBeAdded),
								);
							}
						}
					});

					// Wait for navigation to complete
					await page.waitForNavigation();

					// Check The Website Content To See If The Payload Was Reflected
					const content = await page.content();

					const isVulnerable = content.includes(payload);

					// Push The Vulnerability To The Array
					if (isVulnerable) {
						this.logger.info(
							`XSS Potentially Found - Payload "${payload}" was reflected on ${url} content as it is. People can inject malicious code into the website.`,
						);
						const description =
							"Payload was reflected on content as it is. People can inject malicious code into the website.";

						const { score, level } = generateCVSS({
							accessVector: "A",
							accessComplexity: "H",
							attackRequirements: "P",
							privilegesRequired: "L",
							userInteraction: "A",
							confidentialityImpact: "L",
						});

						const sameVulnerability = this.vulnerabilities.find(
							(vulnerability) => vulnerability.description === description,
						);

						if (!sameVulnerability) {
							this.vulnerabilities.push({
								type: level,
								url,
								description,
								severity: score,
								payloads: [payload],
							});
						} else {
							const payloadToBeAdded = sameVulnerability.payloads
								? [...sameVulnerability.payloads, payload]
								: [payload];

							sameVulnerability.payloads = Array.from(
								new Set(payloadToBeAdded),
							);
						}
					}
				}

				this.logger.info(`Payload "${payload}" submitted on ${url}`);

				await this.sleep(1000);
			}
		} catch (error) {
			this.logger.error(`Error in fillFormIfExists for ${url}: ${error}`);
		}
	}

	async scan() {
		try {
			this.logger.debug(
				`Starting XSS Scan with ${this.concurrency} workers checking ${this.spiderResults.length} URLs with ${payloads.length} payloads`,
			);
			const browser = await puppeteer.launch({
				headless: true,
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-web-security",
					"--disable-features=IsolateOrigins,site-per-process",
				],
			});

			let [page] = await browser.pages();

			if (!page) {
				page = await browser.newPage();
			}

			const chunkSize = this.concurrency;
			const chunks = this.chunkArray(this.spiderResults, chunkSize);

			for (const chunk of chunks) {
				const batchPromises = chunk.map(async (url) => {
					try {
						if (!page) {
							page = await browser.newPage();
						}

						await this.retryPageNavigation(page, url);
						await this.retryFormFilling(page, url);
					} catch (error) {
						this.logger.error(`Error processing URL: ${url} - ${error}`);
					}
				});

				await Promise.allSettled(batchPromises);
				await this.sleep(500);
			}

			await browser.close();

			this.logger.info(
				`XSS Scan Complete - Found ${this.vulnerabilities.length} vulnerabilities`,
			);

			return this.vulnerabilities;
		} catch (error) {
			this.logger.error(`Scan error: ${error}`);
		}
	}

	private async retryPageNavigation(page: Page, url: string) {
		let attempt = 0;
		while (attempt < this.retries) {
			try {
				attempt++;
				this.logger.info(`Navigating to ${url} (Attempt ${attempt})`);
				await page.goto(url);
				return;
			} catch (error) {
				if (attempt >= this.retries) {
					this.logger.error(
						`Failed to navigate to ${url} after ${this.retries} retries`,
					);
					throw error;
				}
				const delay = 2 ** attempt * 1000;
				this.logger.warn(`Retrying navigation to ${url} in ${delay}ms...`);
				await this.sleep(delay);
			}
		}
	}

	private async retryFormFilling(page: Page, url: string) {
		let attempt = 0;
		while (attempt < this.retries) {
			try {
				attempt++;
				await this.fillFormIfExists(page, url);
				return;
			} catch (error) {
				if (attempt >= this.retries) {
					this.logger.error(
						`Failed to fill form on ${url} after ${this.retries} retries`,
					);
					throw error;
				}
				const delay = 2 ** attempt * 1000;
				this.logger.warn(`Retrying form fill on ${url} in ${delay}ms...`);
				await this.sleep(delay);
			}
		}
	}

	private chunkArray<T>(array: T[], size: number): T[][] {
		const result: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			result.push(array.slice(i, i + size));
		}
		return result;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
