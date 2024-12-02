#!/usr/bin/env node --no-warnings

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { spiderCommand } from "./commands/spider.ts";
import { getPackageData } from "./utils/index.ts";

const { name, version } = getPackageData();

const commandHandler = yargs(hideBin(process.argv));

commandHandler.demandCommand();
commandHandler.version(version);
commandHandler.scriptName(name);
commandHandler.usage("Usage: $0 <command> [options]");
commandHandler.help().alias("help", "h");
commandHandler.version().alias("version", "v");
commandHandler.strict();
commandHandler.showHelpOnFail(true);

commandHandler.command(spiderCommand);

commandHandler.version().alias("version", "v");
commandHandler.parse();
