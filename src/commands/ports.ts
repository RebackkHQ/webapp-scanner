import fs from "node:fs/promises";
import path from "node:path";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import { PortsScanner } from "../index.js";
import { createLogger } from "../utils/index.js";

export type PortScannerCLIOpts = {
	spiderResults: string;
	fromPort?: number;
	toPort?: number;
	allowList?: Array<number>;
	concurrency?: number;
	timeout?: number;
	output?: string;
};

const cliLogger = createLogger("CLI");

export const portsCommand: CommandModule = {
	command: "ports",
	describe:
		"Check a website for Open Port vulnerabilities. Check the ports between the specified range for open ports",
	builder: (yargs) => {
		return yargs
			.option("spiderResults", {
				alias: "s",
				type: "string",
				description:
					"The spider results file to use for scanning. It will use the URLs from the spider results to scan for header vulnerabilities",
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
			.option("fromPort", {
				alias: "fp",
				type: "number",
				description: "The starting port to scan",
				default: 3,
				coerce: (fromPort) => {
					if (fromPort < 1 || fromPort > 65535) {
						throw new Error("Port must be between 1 and 65,535");
					}
				},
			})
			.option("toPort", {
				alias: "tp",
				type: "number",
				description: "The ending port to scan",
				default: 8080,
				coerce: (toPort) => {
					if (toPort < 1 || toPort > 65535) {
						throw new Error("Port must be between 1 and 65,535");
					}
				},
			})
			.option("allowList", {
				alias: "al",
				type: "array",
				description: "A list of ports to allow",
				default: [22, 80, 443],
				coerce: (allowList) => {
					if (!Array.isArray(allowList)) {
						throw new Error("Allow list must be an array");
					}
					return allowList;
				},
			});
	},
	handler: async (args) => {
		try {
			const argData = args as ArgumentsCamelCase<PortScannerCLIOpts>;
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

			cliLogger.info("Starting Port scan on website");

			const scanner = new PortsScanner({
				spiderResults,
				fromPort: argData.fromPort ?? 1,
				toPort: argData.toPort ?? 65535,
				allowList: argData.allowList ?? [22, 80, 443],
				concurrency: argData.concurrency ?? 30,
				timeout: argData.timeout ?? 10000,
			});
			const results = await scanner.scan();

			const outputPath = argData.output || getDefaultFilePath();
			await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
			cliLogger.info(`Results successfully written to ${outputPath}`);
		} catch (error) {
			if (error instanceof Error) {
				cliLogger.error(`Error: ${error.message}`);
			}
			cliLogger.error("Failed to run Port Scan command");
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

	return path.resolve(resolvedDir, `portsResults_${Date.now()}.json`);
};
