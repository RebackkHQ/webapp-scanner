import fs from "node:fs";
import path from "node:path";
import {
	EnvironmentalMetric,
	type Metric,
	type MetricValue,
	TemporalMetric,
	type ValidationResult,
	calculateBaseScore,
	calculateExploitability,
	calculateImpact,
	calculateIss,
	humanizeBaseMetric,
	humanizeBaseMetricValue,
	validate,
} from "cvssify";
import winston from "winston";

/**
 * The regular expression used to extract the CVSS score from a CVSS vector.
 */
const scoreRegex = /(\/[A-Z]+:[A-Z]+)?$/;

/**
 * Generates CVSS scores and associated metadata from a CVSS vector.
 *
 * @param cvssVector - The CVSS vector string to be parsed and analyzed.
 * @returns An object containing various CVSS scores, human-readable metric details, and severity level.
 *
 * @throws {Error} If the CVSS vector is invalid or does not contain the required version or metrics map.
 *
 * @example
 * ```ts
 * const cvssVector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H";
 * const cvssScores = generateCvss(cvssVector);
 * console.log(cvssScores);
 * // Output: {
 * //   baseScore: 9.8,
 * //   impactScore: 6.4,
 * //   exploitabilityScore: 3.9,
 * //   temporalScore: null,
 * //   environmentalScore: null,
 * //   metricsMap: [
 * //     { metric: "Attack Vector", value: "Network" },
 * //     { metric: "Attack Complexity", value: "Low" },
 * //     { metric: "Privileges Required", value: "None" },
 * //     { metric: "User Interaction", value: "Required" },
 * //     { metric: "Scope", value: "Changed" },
 * //     { metric: "Confidentiality Impact", value: "High" },
 * //     { metric: "Integrity Impact", value: "High" },
 * //     { metric: "Availability Impact", value: "High" }
 * //   ],
 * //   severity: "Critical"
 * // }
 * ```
 */
export const generateCvss = (cvssVector: string) => {
	// Validate the input CVSS vector
	const validationResult: ValidationResult = validate(cvssVector);

	if (!validationResult.versionStr) {
		throw new Error("Invalid CVSS vector: Version not detected.");
	}

	if (!validationResult.metricsMap) {
		throw new Error("Invalid CVSS vector: Metrics map is missing.");
	}

	const { metricsMap, isTemporal, isEnvironmental } = validationResult;

	// Calculate Base Score
	const baseScore = calculateBaseScore(cvssVector);

	// Calculate Exploitability Score
	const exploitabilityScore = calculateExploitability(metricsMap);

	// Calculate ISS (Impact Subscore)
	const iss = calculateIss(metricsMap);

	// Calculate Impact Score
	const impactScore = calculateImpact(metricsMap, iss);

	// Generate Temporal and Environmental Scores (if applicable)
	let temporalScore: number | null = null;
	let environmentalScore: number | null = null;

	if (isTemporal) {
		const temporalMetrics = Array.from(metricsMap.entries())
			.filter(([key]) =>
				Object.values(TemporalMetric).includes(key as TemporalMetric),
			)
			.reduce(
				(acc, [key, value]) => {
					acc[key as Metric] = value;
					return acc;
				},
				{} as Record<Metric, MetricValue>,
			);

		temporalScore = calculateBaseScore(
			cvssVector.replace(scoreRegex, "") + temporalMetrics,
		);
	}

	if (isEnvironmental) {
		const environmentalMetrics = Array.from(metricsMap.entries())
			.filter(([key]) =>
				Object.values(EnvironmentalMetric).includes(key as EnvironmentalMetric),
			)
			.reduce(
				(acc, [key, value]) => {
					acc[key as Metric] = value;
					return acc;
				},
				{} as Record<Metric, MetricValue>,
			);

		environmentalScore = calculateBaseScore(
			cvssVector.replace(scoreRegex, "") + environmentalMetrics,
		);
	}

	return {
		baseScore,
		impactScore,
		exploitabilityScore,
		temporalScore,
		environmentalScore,
		metricsMap: Array.from(metricsMap.entries()).map(([metric, value]) => ({
			metric: humanizeBaseMetric(metric),
			value: humanizeBaseMetricValue(value, metric),
		})),
		severity: getLevelOfVulnerability(baseScore),
	};
};

/**
 * Determines the level of vulnerability based on the base score.
 *
 * @param score - The CVSS base score.
 * @returns The severity level as one of the following: "Critical", "High", "Medium", "Low", or "Info".
 *
 * @example
 * ```ts
 * console.log(getLevelOfVulnerability(9.0)); // Output: Critical
 * console.log(getLevelOfVulnerability(7.0)); // Output: High
 * console.log(getLevelOfVulnerability(4.0)); // Output: Medium
 * console.log(getLevelOfVulnerability(2.0)); // Output: Low
 * console.log(getLevelOfVulnerability(0.0)); // Output: Info
 * ```
 */
const getLevelOfVulnerability = (
	score: number,
): "Critical" | "High" | "Medium" | "Low" | "Info" => {
	if (score >= 0.1 && score <= 3.9) {
		return "Low";
	}

	if (score >= 4.0 && score <= 6.9) {
		return "Medium";
	}

	if (score >= 7.0 && score <= 8.9) {
		return "High";
	}

	if (score >= 9.0 && score <= 10.0) {
		return "Critical";
	}

	return "Info";
};

/**
 * Creates a logger instance with the specified label for logging messages.
 *
 * @param label - The label to associate with the logger.
 * @returns A configured Winston logger instance.
 *
 * @example
 * ```ts
 * const logger = createLogger("MyApp");
 * logger.info("Hello, world!");
 * ```
 */
export const createLogger = (label: string) =>
	winston.createLogger({
		level: "silly",
		levels: {
			error: 0,
			warn: 1,
			info: 2,
			http: 3,
			verbose: 4,
			debug: 5,
			silly: 6,
		},
		format: winston.format.combine(
			winston.format.label({ label }),
			winston.format.colorize(),
			winston.format.timestamp({
				format: () => {
					return new Date().toLocaleString("en-US");
				},
			}),
			winston.format.align(),
			winston.format.printf(
				(info) =>
					`\x1b[34m(${info.label})\x1b[0m \x1b[33m${info.timestamp}\x1b[0m [${info.level}]: ${info.message}`,
			),
		),
		transports: [new winston.transports.Console()],
	});

/**
 * Determines if a value is an object.
 *
 * @param value - The value to check.
 * @returns `true` if the value is an object (excluding arrays), otherwise `false`.
 *
 * @example
 * ```ts
 * console.log(isObject({})); // Output: true
 * console.log(isObject([])); // Output: false
 * console.log(isObject(null)); // Output: false
 * ```
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Safely stringifies a value into a JSON string.
 * Handles circular references by replacing them with `[Circular]`.
 *
 * @param value - The value to stringify.
 * @returns A JSON string representation of the value.
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: { c: 2 } };
 * console.log(safeStringify(obj));
 * // Output: {"a":1,"b":{"c":2}}
 * ```
 */
export const safeStringify = (value: unknown): string => {
	const seen = new Array<unknown>();

	return JSON.stringify(value, (_, value) => {
		if (isObject(value)) {
			if (seen.includes(value)) {
				return "[Circular]";
			}

			seen.push(value);
		}

		return value;
	});
};

/**
 *
 * @param fn - The function to execute with retries.
 * @param args - The arguments to pass to the function as an array.
 * @param maxRetries - The maximum number of retries to attempt.
 * @param numRetry - The current number of retries attempted.
 * @returns The result of the function after successful execution
 * or an error if the maximum number of retries is exceeded.
 *
 * @template Result - The return type of the function.
 * @template Args - The argument types of the function.
 *
 * @example
 * ```ts
 * const fetchPage = async (url: string): Promise<string> => {
 * 	const response = await fetch(url);
 * 	return response.text();
 * };
 *
 * const url = "https://example.com";
 *
 * withRetries(fetchPage, [url], 3).then((content) => {
 * 	console.log(content);
 * }).catch((error) => {
 * 	console.error(error);
 * });
 * ```
 */
// biome-ignore lint/complexity/noUselessTypeConstraint: This is a return type for a function.
export function withRetries<Result extends unknown, Args extends unknown[]>(
	fn: (...args: Args) => Promise<Result>,
	args: Args,
	maxRetries = 3,
	numRetry = 0,
): Promise<Result> {
	return fn(...args).catch((error) => {
		if (numRetry >= maxRetries) {
			throw error;
		}

		return withRetries(fn, args, maxRetries, numRetry + 1);
	});
}

/**
 * Chunks an array into smaller arrays of a specified size.
 *
 * @param arr - The array to chunk.
 * @param size - The size of each chunk.
 * @returns An array of chunks containing the original array elements.
 *
 * @template T - The type of the array elements.
 *
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
 * const chunkedArray = chunkArray(arr, 3);
 * console.log(chunkedArray);
 * // Output: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
 * ```
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunkedArray: T[][] = [];

	for (let i = 0; i < arr.length; i += size) {
		chunkedArray.push(arr.slice(i, i + size));
	}

	return chunkedArray;
}

export const getPackageData = () => {
	const packageJsonPath = path.join(import.meta.dirname, "..", "package.json");

	const packageJson = fs.readFileSync(packageJsonPath, "utf-8");

	return {
		name: JSON.parse(packageJson).name,
		version: JSON.parse(packageJson).version,
	};
};
