---
layout: default
title: Sentinel by Rebackk | Header Scanner
---
## Sentinel by Rebackk | Header Scanner Intro

# 🛡️ Header Scanner

A robust Header vulnerability scanner that utilizes the output from the Spider crawler to check websites for missing or misconfigured security headers, which can lead to security risks and information leaks. The scanner supports concurrency, retries, and customizable timeouts, ensuring an efficient and thorough scan.

## Features

- **Leverages Spider Results**: Uses URLs collected by the Spider tool to perform targeted header vulnerability scanning.
- **Customizable Concurrency**: Supports multiple requests in parallel to speed up the scanning process.
- **Retries on Failure**: Automatically retries failed requests to enhance reliability.
- **Timeout Handling**: Configurable timeout for each request to handle slow responses.
- **Output in JSON Format**: Saves the scan results in a detailed JSON file.
- **Command Line Interface (CLI)**: Provides a simple and powerful CLI for quick scans.

## Installation and Usage

### Using NPM Exec

- Install the `sentinel-scanner` globally:
  ```bash
  npm install -g sentinel-scanner
  ```

- Run the **Header Scanner** using the Spider results:
  ```bash
  npx sentinel-scanner header -s <path_to_spider_results>
  ```

## Using PreBuilt Releases

- Download the [Latest Release](https://github.com/RebackkHQ/webapp-scanner/releases/latest).
- Extract the files.
- Run the Header Scanner from the command line:
  ```bash
  npx . header -s <path_to_spider_results>
  ```

## Parameters

### Options

| Option             | Alias | Type     | Default                                      | Description                                                      |
|--------------------|-------|----------|----------------------------------------------|------------------------------------------------------------------|
| `--spiderResults`  | `-s`  | `string` | -                                            | Path to the spider results file (**required**).                  |
| `--output`         | `-o`  | `string` | `sentinel_output/headerResults_<timestamp>.json` | Path to save the output JSON file.                               |
| `--concurrency`    | `-c`  | `number` | 10                                           | Number of concurrent requests (range: 1-20).                     |
| `--timeout`        | `-t`  | `number` | 5000 (ms)                                    | Timeout for each request in milliseconds (range: 0-25,000).      |
| `--retries`        | `-r`  | `number` | 3                                            | Number of retries for each request (range: 0-10).                |

## Example Commands

### Basic Scan
To scan for header vulnerabilities using Spider results:
```bash
npx sentinel-scanner header -s spiderResults.json
```

### Advanced Scan with Custom Output and Concurrency
To scan with custom concurrency, timeout, and output path:
```bash
npx sentinel-scanner header -s spiderResults.json -c 15 -t 8000 -o ./output/headerScanResults.json
```

### Default Output Path
If the `--output` option is not specified, the results will be saved to:
```
sentinel_output/headerResults_<timestamp>.json
```