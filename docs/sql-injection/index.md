---
layout: default
title: Sentinel by Rebackk | SQLi Scanner
---
## Sentinel by Rebackk | SQLi Scanner Intro

# 🛡️ SQLi Scanner

A powerful SQL Injection (SQLi) vulnerability scanner that uses the output from a Spider crawler to identify SQL Injection vulnerabilities on each page of a website. It supports concurrency, retries, and customizable timeouts, ensuring efficient and thorough scanning.

## Features

- **Leverages Spider Results**: Uses URLs collected by the Spider tool to perform targeted SQL Injection scanning.
- **Customizable Concurrency**: Supports multiple requests in parallel to speed up the scanning process.
- **Retries on Failure**: Automatically retries failed requests to ensure reliable results.
- **Timeout Handling**: Configurable timeout for each request to manage slow or unresponsive pages.
- **Output in JSON Format**: Saves the scan results in a detailed and easily accessible JSON file.
- **Command Line Interface (CLI)**: Provides a simple yet powerful CLI for quick and flexible scanning.

## Installation and Usage

### Using NPM Exec

- Install the `sentinel-scanner` globally:
  ```bash
  npm install -g sentinel-scanner
  ```

- Run the **SQLi Scanner** using the Spider results:
  ```bash
  npx sentinel-scanner sqli -s <path_to_spider_results>
  ```

## Using PreBuilt Releases

- Download the [Latest Release](https://github.com/RebackkHQ/webapp-scanner/releases/latest).
- Extract the files.
- Run the SQLi Scanner from the command line:
  ```bash
  npx . sqli -s <path_to_spider_results>
  ```

## Parameters

### Options

| Option             | Alias | Type     | Default                                      | Description                                                       |
|--------------------|-------|----------|----------------------------------------------|-------------------------------------------------------------------|
| `--spiderResults`  | `-s`  | `string` | -                                            | Path to the spider results file (**required**).                   |
| `--output`         | `-o`  | `string` | `sentinel_output/sqliResult_<timestamp>.json` | Path to save the output JSON file.                                |
| `--concurrency`    | `-c`  | `number` | 10                                           | Number of concurrent requests (range: 1-20).                      |
| `--timeout`        | `-t`  | `number` | 5000 (ms)                                    | Timeout for each request in milliseconds (range: 0-25,000).       |
| `--retries`        | `-r`  | `number` | 3                                            | Number of retries for each request (range: 0-10).                 |

## Example Commands

### Basic Scan
To scan for SQL Injection vulnerabilities using Spider results:
```bash
npx sentinel-scanner sqli -s spiderResults.json
```

### Advanced Scan with Custom Output and Concurrency
To scan with custom concurrency, timeout, and output path:
```bash
npx sentinel-scanner sqli -s spiderResults.json -c 15 -t 8000 -o ./output/sqliScanResults.json
```

### Default Output Path
If the `--output` option is not specified, the results will be saved to:
```
sentinel_output/sqliResult_<timestamp>.json
```