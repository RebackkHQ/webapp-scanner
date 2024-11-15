import winston from "winston";

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
