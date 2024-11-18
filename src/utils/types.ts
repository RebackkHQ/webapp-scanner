export interface Vulnerability {
	type: "Critical" | "High" | "Medium" | "Low" | "Info";
	severity: number;
	url: string;
	description: string;
	payloads?: string[];
}
