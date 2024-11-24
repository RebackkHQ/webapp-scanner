import dns from "node:dns";
import net from "node:net";
import { createLogger, generateCVSS } from "../../utils/index.js";
import type { Vulnerability } from "../../utils/types.js"; // Assuming this interface is in types.ts

export interface PortsScannerOpts {
	spiderResults: Array<string>;
	fromPort?: number;
	toPort?: number;
	allowList?: Array<number>;
	concurrency?: number;
	timeout?: number;
}

export default class PortsScanner {
	private allowList: Array<number> = [22, 80, 443];
	private toScan: Array<number> = [];
	private spiderResults: Array<string> = [];
	private concurrency = 30;
	private timeout = 10000;
	private domain: Set<string> = new Set();
	private logger = createLogger("PortsScanner");

	constructor(opts: PortsScannerOpts) {
		this.spiderResults = opts.spiderResults;
		this.allowList = opts.allowList || this.allowList;
		this.toScan = this.getPortsToScan(opts.fromPort, opts.toPort);
		this.concurrency = opts.concurrency || this.concurrency;
		this.timeout = opts.timeout || this.timeout;

		this.validateSpiderResults(this.spiderResults);

		this.spiderResults.map((url) => {
			this.domain.add(this.getDomainFromUrl(url));
		});

		this.logger.info(
			`PortsScanner initialized with ${this.domain.size} domains and ${this.toScan.length} ports to scan`,
		);
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

	private getPortsToScan(fromPort = 1, toPort = 65535): Array<number> {
		const allowSet = new Set(this.allowList);
		const ports = [];

		for (let i = fromPort; i <= toPort; i++) {
			if (!allowSet.has(i)) {
				ports.push(i);
			}
		}

		this.logger.info(`Scanning ports from ${fromPort} to ${toPort}`);

		return ports;
	}

	private getDomainFromUrl(url: string): string {
		const urlObj = new URL(url);
		return urlObj.hostname;
	}

	// Scan a specific port on a given IP
	private async scanPort(host: string, port: number): Promise<boolean> {
		this.logger.info(`Scanning port ${port} on ${host}`);
		return new Promise((resolve, reject) => {
			const socket = new net.Socket();

			// Create a timeout using setTimeout
			const timeout = setTimeout(() => {
				socket.destroy();
				this.logger.info(`Timeout occurred for ${host}:${port}`);
				resolve(false); // Timeout occurred
			}, this.timeout);

			socket.on("connect", () => {
				clearTimeout(timeout); // Clear timeout when connection is successful
				socket.destroy();
				this.logger.info(`Port ${port} is open on ${host}`);
				resolve(true); // Port is open
			});

			socket.on("timeout", () => {
				clearTimeout(timeout); // Clear timeout in case of socket timeout event
				socket.destroy();
				this.logger.info(`Timeout for ${host}:${port}`);
				resolve(false); // Timeout event triggered
			});

			socket.on("error", (err) => {
				clearTimeout(timeout); // Clear timeout in case of socket error
				socket.destroy();
				this.logger.info(`Error for ${host}:${port} - ${err.message}`);
				resolve(false); // Port closed or connection failed
			});

			socket.connect(port, host); // Initiates connection to the port
		});
	}

	private async scanDomain(domain: string): Promise<Vulnerability[]> {
		const vulnerabilities: Vulnerability[] = [];
		for (const port of this.toScan) {
			try {
				const isOpen = await this.scanPort(domain, port);
				if (isOpen) {
					const vulnerability = await this.generateVulnerability(domain, port);
					this.logger.info(
						`Vulnerability found: ${vulnerability.severity} - ${vulnerability.description} - ${vulnerability.url} - ${vulnerability.type}`,
					);
					if (vulnerability) vulnerabilities.push(vulnerability);
				}
			} catch (err) {
				this.logger.error(`Error scanning port ${port} on ${domain}: ${err}`);
			}
		}
		return vulnerabilities;
	}

	// Limit the number of concurrent scans
	private async executeWithConcurrency<T>(
		tasks: (() => Promise<T>)[],
		concurrency: number,
	): Promise<T[]> {
		const results: T[] = [];
		const queue: Array<() => Promise<T>> = [...tasks];
		let activePromises = 0;

		this.logger.info(
			`Executing ${tasks.length} tasks with concurrency ${concurrency}`,
		);

		// Helper to process a task
		const processQueue = async () => {
			if (queue.length === 0 && activePromises === 0) return; // All tasks done

			if (activePromises < concurrency && queue.length > 0) {
				const nextTask = queue.shift();
				if (!nextTask) return;
				activePromises++;
				try {
					const result = await nextTask();
					results.push(result);
				} catch (err) {
					console.error(err);
				} finally {
					activePromises--;
					// Continue processing the queue recursively
					await processQueue(); // Await the recursive call
				}
			}
		};

		// Start processing the queue
		await processQueue();

		return results;
	}

	private getBanner(host: string, port: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const socket = new net.Socket();
			let banner = "";

			socket.setTimeout(this.timeout);

			socket.on("data", (data) => {
				this.logger.info(`Received data from ${host}:${port} - ${data}`);
				banner += data.toString();
			});

			socket.on("end", () => {
				socket.destroy();
				this.logger.info(`Banner for ${host}:${port} - ${banner}`);
				resolve(banner);
			});

			socket.on("timeout", () => {
				socket.destroy();
				this.logger.info(`Timeout for ${host}:${port}`);
				resolve(banner);
			});

			socket.on("error", () => {
				socket.destroy();
				this.logger.info(`Error for ${host}:${port}`);
				resolve(banner);
			});

			socket.connect(port, host);
		});
	}

	// Generate a vulnerability report based on the open port
	private async generateVulnerability(
		domain: string,
		port: number,
	): Promise<Vulnerability> {
		let type: Vulnerability["type"] = "Info";
		let severity = 1;
		let description = `Port ${port} is open on ${domain}`;
		let payloads: string[] | undefined;

		const banner = await this.getBanner(domain, port);

		if (banner.includes("SSH")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H",
			).baseScore;
			description = "SSH service detected. Ensure strong credentials.";
		} else if (banner.includes("HTTP")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
			).baseScore;
			description =
				"HTTP service detected. Check for outdated software or misconfigurations.";
		} else if (banner.includes("HTTPS")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
			).baseScore;
			description =
				"HTTPS service detected. Ensure SSL/TLS is properly configured.";
		} else if (banner.includes("MySQL")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H",
			).baseScore;
			description =
				"MySQL service detected. Verify access restrictions and secure configurations.";
		} else if (banner.includes("SMTP")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:L",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:L",
			).baseScore;
			description =
				"SMTP service detected. Verify access restrictions and secure configurations.";
		} else if (banner.includes("FTP")) {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
			).baseScore;
			description =
				"FTP service detected. Verify access restrictions and secure configurations.";
		} else {
			type = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:U/UI:N/S:U/C:U/I:U/A:U",
			).severity;
			severity = generateCVSS(
				"CVSS:3.0/AV:N/AC:L/PR:U/UI:N/S:U/C:U/I:U/A:U",
			).baseScore;
			description = `Unknown service on port ${port}. Investigate further. Banner of the service: ${banner}`;
		}

		return {
			type,
			severity,
			url: `${domain}:${port}`,
			description,
			payloads,
		};
	}

	// Start scanning
	public async scan(): Promise<Vulnerability[]> {
		this.logger.info("Starting scan");
		const tasks = Array.from(this.domain).map((domain) => () => {
			this.logger.info(`Scanning domain ${domain}`);
			return this.scanDomain(domain);
		});

		const vulnerabilities = await this.executeWithConcurrency(
			tasks,
			this.concurrency,
		);
		return vulnerabilities.flat();
	}
}
