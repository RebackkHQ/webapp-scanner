#!/usr/bin/env node --no-warnings

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { spiderCommand } from "./commands/spider.js";

const commandHandler = yargs(hideBin(process.argv));

commandHandler.demandCommand();
commandHandler.scriptName("sentinel-scanner");
commandHandler.usage("Usage: $0 <command> [options]");
commandHandler.help().alias("help", "h");
commandHandler.version().alias("version", "v");
commandHandler.strict();
commandHandler.showHelpOnFail(true);

// Handle Commands
commandHandler.command(spiderCommand);

commandHandler.parse();
