import fs from "node:fs/promises";
import path from "node:path";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import { XSSScanner } from "../index.js";
import { createLogger } from "../utils/index.js";

export type XSSScannerCLIoptions = {
	spiderResults: string;
	retries?: number;
	timeout?: number;
	concurrency?: number;
	output?: string;
};

const cliLogger = createLogger("CLI");

export const xssCommand: CommandModule = {
	command: "xss",
	describe: "Check a website for XSS vulnerabilities by scanning each page",
	builder: (yargs) => {
		return yargs
			.option("spiderResults", {
				alias: "s",
				type: "string",
				description:
					"The spider results file to use for scanning. It will use the URLs from the spider results to scan for XSS vulnerabilities",
				demandOption: true,
				coerce: (url) => {
					if (!path.isAbsolute(url)) {
						return path.resolve(url);
					}
					return url;
				},
			})
			.option("output", {
				alias: "o",
				type: "string",
				description:
					"The output file to write the results to. Must be a JSON file",
				default: () => getDefaultFilePath(),
				coerce: (output) => {
					const resolvedPath = path.resolve(output);
					const { ext } = path.parse(resolvedPath);

					if (ext !== ".json") {
						throw new Error("Output file must be a JSON file");
					}
					return resolvedPath;
				},
			})
			.option("concurrency", {
				alias: "c",
				type: "number",
				description: "The number of concurrent requests to make",
				default: 10,
				coerce: (concurrency) => {
					if (concurrency < 1 || concurrency > 20) {
						throw new Error("Concurrency must be between 1 and 20");
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
					if (timeout < 0 || timeout > 25000) {
						throw new Error("Timeout must be between 0 and 25,000 ms");
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
					if (retries < 0 || retries > 10) {
						throw new Error("Retries must be between 0 and 10");
					}
					return retries;
				},
			});
	},
	handler: async (args) => {
		try {
			const argData = args as ArgumentsCamelCase<XSSScannerCLIoptions>;
			const spiderResultsPath = path.resolve(argData.spiderResults);

			// Check if the spider results file exists
			if (!(await fileExists(spiderResultsPath))) {
				throw new Error(
					`Spider results file not found at ${spiderResultsPath}`,
				);
			}

			const spiderResults = JSON.parse(
				await fs.readFile(spiderResultsPath, "utf-8"),
			);

			cliLogger.info("Starting XSS scan on website");

			const scanner = new XSSScanner({
				spiderResults,
				concurrency: argData.concurrency,
				timeout: argData.timeout,
				retries: argData.retries,
			});

			const results = await scanner.scan();

			const outputPath = argData.output || getDefaultFilePath();
			await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
			cliLogger.info(`Results successfully written to ${outputPath}`);
		} catch (error) {
			if (error instanceof Error) {
				cliLogger.error(`Error: ${error.message}`);
			}
			cliLogger.error("Failed to run XSS command");
			process.exit(1);
		}
	},
};

// Utility function to check if a file exists
const fileExists = async (filePath: string) => {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
};

// Utility function to get the default file path
const getDefaultFilePath = () => {
	const resolvedDir = path.resolve("sentinel_output");

	// Ensure the directory exists or create it
	fs.mkdir(resolvedDir, { recursive: true }).catch((err) => {
		cliLogger.error(`Failed to create directory: ${err.message}`);
		process.exit(1);
	});

	return path.resolve(resolvedDir, `xssResult_${Date.now()}.json`);
};
