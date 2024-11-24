#!/usr/bin/env node --no-warnings

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { headerCommand } from "./commands/header.js";
import { portsCommand } from "./commands/ports.js";
import { spiderCommand } from "./commands/spider.js";
import { sqliCommand } from "./commands/sqli.js";
import { xssCommand } from "./commands/xss.js";

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
commandHandler.command(xssCommand);
commandHandler.command(headerCommand);
commandHandler.command(sqliCommand);
commandHandler.command(portsCommand);

commandHandler.version().alias("version", "v");
commandHandler.parse();
