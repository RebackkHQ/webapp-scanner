#!/usr/bin/env node

import { Command } from "commander";
// @ts-ignore: For TypeScript compatibility when importing JSON files
import packageData from "../package.json";

// Create a new Command object
const program = new Command();

// Set version, name, and description from the package.json
program
	.version(packageData.version)
	.name(packageData.name)
	.description(packageData.description);

// Add a help command explicitly if needed
program.helpOption("-h, --help", "Display help for command");

// Parse command-line arguments
program.parse(process.argv);

const options = program.opts();

// If no arguments are provided, display help
if (Object.keys(options).length === 0) {
	program.help();
}
