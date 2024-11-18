import { Cvss4P0 } from "ae-cvss-calculator";
import winston from "winston";

export const generateCVSS = ({
	accessVector,
	accessComplexity,
	attackRequirements,
	privilegesRequired,
	userInteraction,
}: {
	accessVector:
		| "N"
		| "A"
		| "L"
		| "P" /**  N: Network, A: Adjacent, L: Local, P: Physical */;
	accessComplexity: "L" | "H" /** L: Low, H: High */;
	attackRequirements: "N" | "P" /** N: None, P: Present */;
	privilegesRequired: "N" | "L" | "H" /** N: None, L: Low, H: High */;
	userInteraction: "N" | "P" | "A" /** N: None, P: Passive, A: Active */;
	confidentialityImpact: "N" | "L" | "H" /** N: None, L: Low, H: High */;
}) => {
	// Generate CVSS vector
	const cvssVector = `AV:${accessVector}/AC:${accessComplexity}/PR:${privilegesRequired}/UI:${userInteraction}/S:${attackRequirements}/VI:N/VA:N/SC:N/SI:N/SA:N`;

	// calculate CVSS score
	const cvssCalc = new Cvss4P0(cvssVector);

	const score = cvssCalc.calculateScores().overall;

	return {
		score,
		level: getLevelOfVulnerability(score),
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
