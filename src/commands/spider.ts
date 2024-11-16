import fs from "node:fs";
import path from "node:path";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import SpiderScanner from "../modules/spider/index.js";
import { createLogger } from "../utils/index.js";

export type SpiderScannerCLIOptions = {
	url: string;
	depth?: number;
	output?: string;
	concurrency?: number;
	timeout?: number;
	retries?: number;
};

const cliLogger = createLogger("CLI");

export const spiderCommand: CommandModule = {
	command: "spider",
	describe:
		"Crawl a website and get an array of URLs which are internal to the website",
	builder: (yargs) => {
		return yargs
			.option("url", {
				alias: "u",
				type: "string",
				description: "The URL of the website to scan",
				demandOption: true,
				coerce: (url) => {
					try {
						new URL(url);

						return url;
					} catch (error) {
						throw new Error(`Invalid URL: ${url}`);
					}
				},
			})
			.option("depth", {
				alias: "d",
				type: "number",
				description: "The maximum depth to crawl",
				default: 250,
				coerce: (depth) => {
					if (depth < 0) {
						throw new Error("Depth must be a positive number");
					}

					if (depth > 250) {
						throw new Error("Depth must be less than 250");
					}

					return depth;
				},
			})
			.option("output", {
				alias: "o",
				type: "string",
				description:
					"The output file to write the results to. Must be a JSON file",
				coerce: (output) => {
					try {
						// Should throw an error if the path is invalid
						// Should Be A JSON File
						const resolvedPath = path.resolve(output);
						const parsedPath = path.parse(resolvedPath);

						if (parsedPath.ext !== ".json") {
							throw new Error("Output file must be a JSON file");
						}

						if (fs.existsSync(resolvedPath)) {
							throw new Error("Output file already exists");
						}

						return resolvedPath;
					} catch (error) {
						throw new Error(`Invalid output file: ${output}`);
					}
				},
				default: getDefaultFilePath(),
			})
			.option("concurrency", {
				alias: "c",
				type: "number",
				description: "The number of concurrent requests to make",
				default: 10,
				coerce: (concurrency) => {
					if (concurrency < 1) {
						throw new Error("Concurrency must be a positive number");
					}

					if (concurrency > 20) {
						throw new Error("Concurrency must be less than 20");
					}

					return concurrency;
				},
			})
			.option("timeout", {
				alias: "t",
				type: "number",
				description: "The timeout for each request in milliseconds",
				default: 5000,
				coerce: (timeout) => {
					if (timeout < 0) {
						throw new Error("Timeout must be a positive number");
					}

					if (timeout > 25_000) {
						throw new Error("Timeout must be less than 25,000");
					}

					return timeout;
				},
			})
			.option("retries", {
				alias: "r",
				type: "number",
				description: "The number of retries for each request",
				default: 3,
				coerce: (retries) => {
					if (retries < 0) {
						throw new Error("Retries must be a positive number");
					}

					if (retries > 10) {
						throw new Error("Retries must be less than 10");
					}

					return retries;
				},
			});
	},
	handler: async (args) => {
		try {
			const argData = args as ArgumentsCamelCase<SpiderScannerCLIOptions>;

			const scanner = new SpiderScanner(argData.url, {
				depth: argData.depth ?? 250,
				concurrency: argData.concurrency ?? 10,
				timeout: argData.timeout ?? 5000,
				retries: argData.retries ?? 3,
			});

			cliLogger.info("Starting to crawl website");

			const results = await scanner.crawl();

			if (argData.output) {
				fs.writeFileSync(argData.output, JSON.stringify(results, null, 2));
				cliLogger.info(`Results written to ${argData.output}`);
			} else {
				const resolvedPath = getDefaultFilePath();
				fs.writeFileSync(resolvedPath, JSON.stringify(results, null, 2));
				cliLogger.info(`Results written to ${resolvedPath}`);
			}
		} catch (error) {
			if (error instanceof Error) {
				cliLogger.error(error.message);
			}
			cliLogger.error("Failed to run spider command");
			process.exit(1);
		}
	},
};

const getDefaultFilePath = () => {
	try {
		const resolvedDir = path.resolve("sentinel_output");
		// Check If Directory Exists
		if (!fs.existsSync(resolvedDir)) {
			fs.mkdirSync(resolvedDir);
		}

		const resolvedPath = path.resolve(
			`sentinel_output/spider_${Date.now()}.json`,
		);
		// Check If File Exists
		if (fs.existsSync(resolvedPath)) {
			throw new Error("Output file already exists");
		}
		const parsedPath = path.parse(resolvedPath);

		if (parsedPath.ext !== ".json") {
			throw new Error("Output file must be a JSON file");
		}

		return resolvedPath;
	} catch (error) {
		throw new Error("Invalid output file");
	}
};
