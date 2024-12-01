import fs from "node:fs";
import path from "node:path";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import { Spider } from "../spider/index.ts";
import type { SpiderConstructorOptions } from "../spider/types/index.ts";
import { createLogger } from "../utils/index.ts";

const cliLogger = createLogger("CLI");

export const spiderCommand: CommandModule = {
	command: "spider",
	describe:
		"Crawl a website and get an array of URLs which are internal to the website",
	builder: (yargs) => {
		return yargs
			.option("seed", {
				alias: "s",
				describe: "The seed URL to start crawling",
				type: "string",
				demandOption: true,
				coerce: (arg) => {
					try {
						new URL(arg);

						return arg;
					} catch (error) {
						cliLogger.error(error instanceof Error ? error.message : error);
						process.exit(1);
					}
				},
			})
			.option("maxDepth", {
				alias: "d",
				describe: "The maximum depth to crawl",
				type: "number",
				default: 250,
			})
			.option("maxRetries", {
				alias: "r",
				describe: "The maximum retries for a failed request",
				type: "number",
				default: 3,
			})
			.option("concurrency", {
				alias: "c",
				describe: "The number of concurrent requests",
				type: "number",
				default: 30,
			})
			.option("ignoreExternalLinks", {
				alias: "i",
				describe: "Ignore external links",
				type: "boolean",
				default: true,
			})
			.option("timeout", {
				alias: "t",
				describe: "Request timeout in milliseconds",
				type: "number",
				default: 8000,
			})
			.option("output", {
				alias: "o",
				describe: "Output file path",
				type: "string",
				default: getDefaultFilePath(),
			});
	},
	handler: async (yargs) => {
		const args = yargs as ArgumentsCamelCase<{
			seed: string;
			maxDepth: number;
			maxRetries: number;
			concurrency: number;
			ignoreExternalLinks: boolean;
			timeout: number;
			output: string;
		}>;
		const opts: SpiderConstructorOptions = {
			seed: args.seed,
			maxDepth: args.maxDepth || 250,
			maxRetries: args.maxRetries || 3,
			concurrency: args.concurrency || 30,
			ignoreExternalLinks:
				args.ignoreExternalLinks === undefined
					? true
					: args.ignoreExternalLinks,
			timeout: args.timeout || 8000,
		};

		const scanner = new Spider(opts);
		try {
			const results = await scanner.scan();
			fs.writeFileSync(args.output, JSON.stringify(results, null, 2));
			cliLogger.info(`Results saved to ${args.output}`);
		} catch (error) {
			cliLogger.error(error instanceof Error ? error.message : error);
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
	} catch (_) {
		throw new Error("Invalid output file");
	}
};
