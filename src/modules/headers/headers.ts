import type { HeadersData } from "./index.js";

const securityChecks: HeadersData[] = [
	{
		name: "X-Content-Type-Options",
		description: "Prevents MIME-type sniffing.",
		recommendation: "nosniff",
		check: (value: string) => value === "nosniff",
	},
	{
		name: "X-Frame-Options",
		description: "Mitigates clickjacking attacks.",
		recommendation: "DENY or SAMEORIGIN",
		check: (value: string) =>
			value === "DENY" ||
			value === "SAMEORIGIN" ||
			value?.startsWith("ALLOW-FROM"),
	},
	{
		name: "Strict-Transport-Security",
		description: "Enforces HTTPS and prevents downgrade attacks.",
		recommendation: "max-age=31536000; includeSubDomains; preload",
		check: (value: string) =>
			value?.includes("max-age=") && value.includes("includeSubDomains"),
	},
	{
		name: "Content-Security-Policy",
		description:
			"Prevents cross-site scripting (XSS) and data injection attacks.",
		recommendation: "script-src 'self'; object-src 'none'",
		check: (value: string) => !!value,
	},
	{
		name: "Referrer-Policy",
		description:
			"Controls how much referrer information is included with requests.",
		recommendation: "no-referrer or strict-origin",
		check: (value: string) =>
			[
				"no-referrer",
				"strict-origin",
				"strict-origin-when-cross-origin",
			].includes(value ?? ""),
	},
	{
		name: "Permissions-Policy",
		description: "Manages permissions of APIs (e.g., camera, geolocation).",
		recommendation: "default settings for better privacy",
		check: (value: string) => !!value,
	},
	{
		name: "Cross-Origin-Embedder-Policy",
		description:
			"Prevents a document from loading any cross-origin resources that don't explicitly grant permission.",
		recommendation: "require-corp",
		check: (value: string) => value === "require-corp",
	},
	{
		name: "Cross-Origin-Opener-Policy",
		description:
			"Prevents other domains from taking control of your context via window.opener.",
		recommendation: "same-origin",
		check: (value: string) => value === "same-origin",
	},
	{
		name: "Cross-Origin-Resource-Policy",
		description: "Prevents your resources from being used by other sites.",
		recommendation: "same-origin",
		check: (value: string) => value === "same-origin" || value === "same-site",
	},
];

const informationLeakChecks: HeadersData[] = [
	{
		name: "Server",
		description: "Reveals server software information.",
		recommendation: "Remove or obfuscate this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Powered-By",
		description:
			"Reveals information about the framework (e.g., Express, PHP).",
		recommendation: "Remove or set to a generic value.",
		check: (value: string) => !value,
	},
	{
		name: "X-AspNet-Version",
		description: "Reveals ASP.NET version.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-AspNetMvc-Version",
		description: "Reveals ASP.NET MVC version.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-PHP-Version",
		description: "Reveals PHP version.",
		recommendation: "Disable or remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Generator",
		description: "Reveals information about CMS (e.g., WordPress, Joomla).",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Drupal-Dynamic-Cache",
		description: "Reveals Drupal cache status.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Runtime",
		description: "Reveals the application's runtime environment.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Backend-Server",
		description: "Leaks information about backend server infrastructure.",
		recommendation: "Remove or obfuscate this header.",
		check: (value: string) => !value,
	},
	{
		name: "Via",
		description: "Reveals intermediate proxies and gateways.",
		recommendation: "Remove or obfuscate this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Cache",
		description: "Indicates if a resource was served from cache.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-CF-Powered-By",
		description: "Reveals that the app is behind Cloudflare.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Edge-IP",
		description: "Leaks edge server IP addresses.",
		recommendation: "Remove or obfuscate this header.",
		check: (value: string) => !value,
	},
	{
		name: "X-Edge-Location",
		description: "Reveals the physical location of edge servers.",
		recommendation: "Remove this header.",
		check: (value: string) => !value,
	},
];

export { securityChecks, informationLeakChecks };
