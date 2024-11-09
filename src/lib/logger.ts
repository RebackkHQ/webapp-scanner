export default class Logger {
	private moduleName: string;
	private colors = {
		error: "\x1b[31m",
		info: "\x1b[32m",
		warn: "\x1b[33m",
		debug: "\x1b[35m",
		reset: "\x1b[0m",
		module: "\x1b[46m",
	};

	constructor(moduleName: string) {
		this.moduleName = moduleName;
	}

	private formatMessage(
		level: keyof typeof this.colors,
		...message: string[]
	): string {
		const timestamp = new Date().toTimeString().split(" ")[0];
		return `[${level}] ${this.colors[level]}${this.colors.reset}${this.colors[level]}[${timestamp}]${this.colors.reset} ${this.colors.module}[${this.moduleName}]${this.colors.reset} ${this.colors[level]}${message}${this.colors.reset}`;
	}

	public error(...message: string[]): void {
		console.error(this.formatMessage("error", ...message));
	}

	public info(...message: string[]): void {
		console.info(this.formatMessage("info", ...message));
	}

	public warn(...message: string[]): void {
		console.warn(this.formatMessage("warn", ...message));
	}

	public log(...message: string[]): void {
		console.log(this.formatMessage("info", ...message));
	}

	public debug(...message: string[]): void {
		console.debug(this.formatMessage("debug", ...message));
	}
}
