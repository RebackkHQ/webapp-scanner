import puppeteer, { type Page } from "puppeteer";
import UserAgent from "user-agents";
import type { Vulnerability } from "../../index.js";
import { createLogger, generateCVSS } from "../../utils/index.js";
import payloads from "./payloads.json";

export type SupportedDatabases =
	| "MySQL"
	| "PostgreSQL"
	| "Microsoft SQL Server"
	| "Microsoft Access"
	| "Oracle"
	| "IBM DB2"
	| "SQLite"
	| "Sybase";

export type SQLErrors = Record<SupportedDatabases, Array<string>>;

export type SqliConstructorOpts = {
	// An Array of Links to scan for SQL Injection vulnerabilities On The Website
	spiderResults: Array<string>;
	retries?: number;
	timeout?: number;
	concurrency?: number;
};

export default class SqliScanner {
	private logger = createLogger("SQLIScanner");
	private spiderResults: Array<string> = [];
	private retries = 3;
	private timeout = 10000;
	private vulnerabilities: Array<Vulnerability> = [];
	private concurrency = 20;
	private payloads: Array<string> = payloads;

	constructor(opts: SqliConstructorOpts) {
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

					/**
					 * Implement Check for SQL Injection Vulnerability
					 */
					// Wait for the page to load after submitting the form
					await page.waitForNavigation({
						waitUntil: "domcontentloaded",
						timeout: this.timeout,
					});

					// Capture the page content
					const pageContent = await page.content();

					const { isVulnerable, dbms } = this.checkContentForErrors(
						pageContent,
						url,
					);

					if (isVulnerable) {
						this.logger.warn(
							`Potential SQL Injection vulnerability found on ${url}`,
						);

						this.logger.info(`Database: ${dbms}`);

						const cvssScore = generateCVSS(
							"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
						);

						console.info(`\x1b${JSON.stringify(cvssScore)}\x1b[0m`);

						this.vulnerabilities.push({
							type: cvssScore.severity,
							severity: cvssScore.baseScore,
							url,
							description: `Potential SQL Injection vulnerability found on ${url} with payload: ${payload} and database: ${dbms}. This can be exploited to perform unauthorized actions on the database.`,
							payloads: [payload],
						});

						this.logger.info(
							`CVSS Score: ${cvssScore.baseScore} (${cvssScore.severity})`,
						);
					}
				}

				this.logger.info(`Payload "${payload}" submitted on ${url}`);

				await this.sleep(1000);
			}
		} catch (error) {
			this.logger.error(`Error in fillFormIfExists for ${url}: ${error}`);
		}
	}

	private async sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private chunkArray(array: Array<string>, size: number) {
		const chunkedArray = [];
		for (let i = 0; i < array.length; i += size) {
			chunkedArray.push(array.slice(i, i + size));
		}

		return chunkedArray;
	}

	private async scanWithBrowser(urls: Array<string>) {
		try {
			const browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			const userAgent = new UserAgent();

			let [page] = await browser.pages();

			if (!page) {
				page = await browser.newPage();
			}

			await page.setUserAgent(userAgent.toString());

			for (const url of urls) {
				this.logger.info(`Navigating to ${url}`);

				await page.goto(url, {
					waitUntil: "domcontentloaded",
					timeout: this.timeout,
				});

				await this.fillFormIfExists(page, url);
			}

			await browser.close();
		} catch (error) {
			this.logger.error(`Error in scan: ${error}`);
			throw new Error(`Error in scan: ${error}`);
		}
	}

	private async fetchWithRetries(
		url: string,
		retries: number,
		method: "GET" | "POST" = "GET",
	): Promise<string | null> {
		for (let attempt = 1; attempt <= retries; attempt++) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
				this.logger.debug(`Fetching URL (Attempt ${attempt}): ${url}`);
				const randomUserAgent = new UserAgent().toString();
				this.logger.info(`Changing User-Agent to: ${randomUserAgent}`);

				const response = await fetch(url, {
					headers: {
						"User-Agent": randomUserAgent,
					},
					signal: controller.signal,
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

	private async scanWithParams(urls: Array<string>) {
		try {
			for (const url of urls) {
				const urlToTest = new URL(url);
				if (urlToTest.search === "" || urlToTest.search === null) {
					this.logger.info(`No query parameters found in ${url}`);
					continue;
				}

				const params = urlToTest.searchParams;

				for (const [key, value] of params) {
					for (const payload of this.payloads) {
						const newUrl = new URL(url);
						newUrl.searchParams.set(key, payload);

						const response = await this.fetchWithRetries(newUrl.toString(), 3);

						if (!response) {
							this.logger.warn(`Failed to fetch URL: ${newUrl}`);
							continue;
						}

						const { isVulnerable, dbms } = this.checkContentForErrors(
							response,
							newUrl.toString(),
						);

						if (isVulnerable) {
							this.logger.warn(
								`Potential SQL Injection vulnerability found on ${url}`,
							);

							const cvssScore = generateCVSS(
								"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
							);

							this.vulnerabilities.push({
								type: cvssScore.severity,
								severity: cvssScore.baseScore,
								url,
								description: `Potential SQL Injection vulnerability found on ${url} with payload: ${payload} and database: ${dbms}. This can be exploited to perform unauthorized actions on the database.`,
								payloads: [payload],
							});

							this.logger.info(
								`CVSS Score: ${cvssScore.baseScore} (${cvssScore.severity})`,
							);

							this.logger.info(`Database: ${dbms}`);
						}

						const postResponse = await this.fetchWithRetries(
							newUrl.toString(),
							3,
							"POST",
						);

						if (!postResponse) {
							this.logger.warn(`Failed to fetch URL: ${newUrl}`);
							continue;
						}

						const postDbms = this.checkContentForErrors(
							postResponse,
							newUrl.toString(),
						);

						if (postDbms.isVulnerable) {
							const cvssScore = generateCVSS(
								"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
							);

							this.vulnerabilities.push({
								type: cvssScore.severity,
								severity: cvssScore.baseScore,
								url,
								description: `Potential SQL Injection vulnerability found on ${url} with payload: ${payload} and database: ${dbms}. This can be exploited to perform unauthorized actions on the database.`,
								payloads: [payload],
							});

							this.logger.info(
								`CVSS Score: ${cvssScore.baseScore} (${cvssScore.severity})`,
							);

							this.logger.info(`Database: ${dbms}`);
						}
					}
				}
			}
		} catch (error) {
			this.logger.error(`Error in scan: ${error}`);
			throw new Error(`Error in scan: ${error}`);
		}
	}

	private checkContentForErrors(content: string, url: string) {
		const errorPatterns = {
			MySQL: [
				"SQL syntax",
				"MySQL",
				"Warning mysql_",
				"valid MySQL result",
				"MySqlClient",
			],
			PostgreSQL: [
				"PostgreSQL ERROR",
				"Warning pg_",
				"valid PostgreSQL result",
				"Npgsql",
			],
			"Microsoft SQL Server": [
				"Driver SQL Server",
				"OLE DB SQL Server",
				"SQL Server Driver",
				"Warning mssql_",
				"SQL Server",
				"System.Data.SqlClient",
				"Roadhouse.Cms",
			],
			"Microsoft Access": [
				"Microsoft Access Driver",
				"JET Database Engine",
				"Access Database Engine",
			],
			Oracle: [
				"ORA-",
				"Oracle error",
				"Oracle Driver",
				"Warning oci_",
				"Warning ora_",
			],
			"IBM DB2": ["CLI Driver DB2", "DB2 SQL error", "db2_"],
			SQLite: [
				"SQLite/JDBCDriver",
				"SQLite.Exception",
				"System.Data.SQLite.SQLiteException",
				"Warning sqlite_",
				"Warning SQLite3::",
				"SQLITE_ERROR",
			],
			Sybase: ["Warning sybase", "Sybase message", "Sybase Server message"],
		};

		for (const [dbms, patterns] of Object.entries(errorPatterns)) {
			for (const pattern of patterns) {
				if (content.includes(pattern)) {
					return {
						dbms,
						isVulnerable: true,
					};
				}
			}
		}

		return {
			dbms: null,
			isVulnerable: false,
		};
	}

	public async scan() {
		try {
			// Adjust the chunk size dynamically based on concurrency
			const chunkedUrls = this.chunkArray(this.spiderResults, this.concurrency);

			const promises = chunkedUrls.map(async (urls) => {
				// Running both scans (with browser and parameters) in parallel
				return Promise.allSettled([
					this.scanWithBrowser(urls), // Scan with Puppeteer for forms
					this.scanWithParams(urls), // Scan with URL parameters
				]);
			});

			// Wait for all scans to finish
			await Promise.all(promises);

			return this.vulnerabilities;
		} catch (error) {
			this.logger.error(`Error in scan: ${error}`);
			throw new Error(`Error in scan: ${error}`);
		}
	}
}
