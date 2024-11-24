layout: default  
title: Sentinel by Rebackk | Ports Scanner  

## Sentinel by Rebackk | Ports Scanner Intro

# 🛡️ Ports Scanner

The **Ports Scanner** is a powerful tool designed to identify open ports on a target website, leveraging the results of a Spider crawl. It provides customizable settings such as port ranges, concurrency, and timeouts, ensuring efficient and thorough scanning for open ports.

## Features

- **Leverages Spider Results**: Uses URLs from the Spider tool to perform port scanning on relevant website endpoints.
- **Customizable Port Range**: Scan for open ports within a specified range or across a wide range (1-65535).
- **Concurrency Support**: Perform multiple scans simultaneously to speed up the process.
- **Timeout Handling**: Configurable timeout for each request to manage slow or unresponsive services.
- **Allow List**: Option to scan specific ports or allow certain ports to be skipped.
- **Output in JSON Format**: Stores scan results in an easy-to-use JSON file for further analysis.
- **Command Line Interface (CLI)**: Simple and flexible CLI for on-the-go scanning.

## Installation and Usage

### Using NPM Exec

- Install the `sentinel-scanner` globally:
  ```bash
  npm install -g sentinel-scanner
  ```

- Run the **Ports Scanner** using Spider results:
  ```bash
  npx sentinel-scanner ports -s <path_to_spider_results>
  ```

## Using PreBuilt Releases

- Download the [Latest Release](https://github.com/RebackkHQ/webapp-scanner/releases/latest).
- Extract the files.
- Run the Ports Scanner from the command line:
  ```bash
  npx . ports -s <path_to_spider_results>
  ```

## Parameters

### Options

| Option             | Alias | Type     | Default                                        | Description                                                       |
|--------------------|-------|----------|------------------------------------------------|-------------------------------------------------------------------|
| `--spiderResults`  | `-s`  | `string` | -                                              | Path to the spider results file (**required**).                   |
| `--output`         | `-o`  | `string` | `sentinel_output/portsResults_<timestamp>.json` | Path to save the output JSON file.                                |
| `--concurrency`    | `-c`  | `number` | 10                                             | Number of concurrent requests (range: 1-20).                      |
| `--timeout`        | `-t`  | `number` | 5000 (ms)                                      | Timeout for each request in milliseconds (range: 0-25,000).       |
| `--fromPort`       | `-fp` | `number` | 1                                              | Starting port to scan (range: 1-65535).                           |
| `--toPort`         | `-tp` | `number` | 8080                                           | Ending port to scan (range: 1-65535).                             |
| `--allowList`      | `-al` | `array`  | [22, 80, 443]                                  | List of ports to allow (will not be scanned).                     |

## Example Commands

### Basic Scan
To scan for open ports using Spider results:
```bash
npx sentinel-scanner ports -s spiderResults.json
```

### Advanced Scan with Custom Output and Concurrency
To scan with custom concurrency, timeout, and output path:
```bash
npx sentinel-scanner ports -s spiderResults.json -c 15 -t 8000 -o ./output/portsScanResults.json
```

### Default Output Path
If the `--output` option is not specified, the results will be saved to:
```
sentinel_output/portsResults_<timestamp>.json
```

## Example Output

The Ports Scanner will generate a JSON file that contains detailed results about each scanned port, including:

- **Port Number**: The port that was scanned.
- **Status**: Whether the port is open or closed.
- **Target URL**: The URL that was scanned.
- **Error Message**: If any error occurred during the scan.