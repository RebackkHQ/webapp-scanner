import SpiderScanner, {
	type SpiderScannerOptions,
} from "./modules/spider/index.js";
import XSSScanner, { XSSConstructorOpts } from "./modules/xss/index.js";
import { Vulnerability } from "./utils/types.js";

export { SpiderScanner, type SpiderScannerOptions };
export { XSSScanner, XSSConstructorOpts };
export { Vulnerability };
