#!/usr/bin/env node

import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { SpiderScanner } from "./modules";

const commandHandler = yargs(hideBin(process.argv));

/**
 * Command to scan for XSS vulnerabilities
 *
 * @param {string} url - URL to scan
 * @param {string} wordlist - Path to wordlist file
 * @returns {void}
 *
 * @example
 * npx sentinel-scanner xss --url https://example.com
 */
commandHandler.command(
	"xss",
	"Scan for XSS vulnerabilities",
	{
		url: {
			describe: "URL to scan",
			demandOption: true,
			type: "string",
			coerce: (value) => {
				try {
					new URL(value);
					return value;
				} catch (err) {
					throw new Error("Invalid URL format");
				}
			},
		},
		wordlist: {
			describe: "Path to wordlist file",
			type: "string",
		},
	},
	(argv) => {
		console.log("Scanning for XSS vulnerabilities...");
		console.log(`URL: ${argv.url}`);
		console.log(`Wordlist: ${argv.wordlist || "Default"}`);
	},
);

// Command to Spider a website
commandHandler.command(
	"spider",
	"Scan a website for vulnerabilities",
	{
		url: {
			describe: "URL to scan",
			demandOption: true,
			type: "string",
			coerce: (value) => {
				try {
					new URL(value);
					return value;
				} catch (err) {
					throw new Error("Invalid URL format");
				}
			},
		},
	},
	(argv) => {
		const spider = new SpiderScanner(argv.url);

		spider.crawl().then((output) => {
			console.log(
				JSON.stringify(
					{
						forms: output.forms,
						links: output.links,
					},
					null,
					2,
				),
			);
		});
	},
);

// Parse arguments and handle commands
commandHandler.parse();
