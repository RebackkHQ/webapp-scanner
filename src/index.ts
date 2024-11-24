import HeaderScanner, {
	type HeadersData,
	type HeaderScannerOptions,
} from "./modules/headers/index.js";
import PortsScanner, { type PortsScannerOpts } from "./modules/ports/index.js";
import SpiderScanner, {
	type SpiderScannerOptions,
} from "./modules/spider/index.js";
import SqliScanner, {
	type SqliConstructorOpts,
	type SQLErrors,
	type SupportedDatabases,
} from "./modules/sqli/index.js";
import XSSScanner, { type XSSConstructorOpts } from "./modules/xss/index.js";
import { Vulnerability } from "./utils/types.js";

export { SpiderScanner, type SpiderScannerOptions };
export { XSSScanner, type XSSConstructorOpts };
export { Vulnerability };
export { HeaderScanner, type HeadersData, type HeaderScannerOptions };
export {
	SqliScanner,
	type SqliConstructorOpts,
	type SQLErrors,
	type SupportedDatabases,
};
export { PortsScanner, type PortsScannerOpts };

const scanner = new PortsScanner({
	spiderResults: ["https://example.com"],
	fromPort: 1,
	toPort: 8080,
});

scanner.scan().then((results) => {
	console.log(results);
});
