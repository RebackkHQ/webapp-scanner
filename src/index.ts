import { Command } from "commander";
// @ts-ignore
import packageData from "../package.json";

const program = new Command();

program.version(packageData.version);
program.name(packageData.name);
program.description(packageData.description);

program.helpCommand(true);

program.parse();
