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

export const generateCVSS = (cvssVector: string) => {
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
			cvssVector.replace(/(\/[A-Z]+:[A-Z]+)?$/, "") + temporalMetrics,
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
			cvssVector.replace(/(\/[A-Z]+:[A-Z]+)?$/, "") + environmentalMetrics,
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
