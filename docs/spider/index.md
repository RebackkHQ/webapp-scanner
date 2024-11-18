---
layout: default
title: Sentinel by Rebackk | Spider Intro
---
# 🕷️ Spider

A powerful and customizable web crawler designed to scan websites and extract internal links. This tool is capable of handling concurrency, retries, and timeouts while providing detailed logging for each step. It can be easily used via a CLI command.

## Features
- **Customizable Crawl Depth**: Define how deep the scanner should go within the site structure.

- **Concurrency Support**: Perform multiple requests in parallel to speed up crawling.

- **Retries on Failure**: Automatically retries fetching URLs on failure.

- **Timeout Handling**: Configurable timeout for each request.

- **User-Agent Rotation**: Randomly rotates User-Agent strings for each request to avoid detection.

- **Extracts Internal Links**: Filters out external links and assets, focusing on internal links.

- **Command Line Interface (CLI)**: Easy-to-use CLI for quick scans.


## Installation and Usage

### Using NPM Exec

- Install The `sentinel-scanner` globally
> ```bash
> npm install -g sentinel-scanner
> ```

- You Can Start The **Spider** Crawler Now
> ```bash
> npx sentinel-scanner spider -u <url_to_scan>
> ```

## Using PreBuilt Releases

- Download The [Latest Release](https://github.com/RebackkHQ/webapp-scanner/releases/latest)

- Extract The Code

- Run The CLI Tool Using Command Line
> ```bash
> npx . spider -u <url_to_scan>
> ```

## Parameters

### Options

| Option           | Alias | Type     | Default          | Description                               |
|------------------|-------|----------|------------------|-------------------------------------------|
| `--url`          | `-u`  | `string` | -                | The URL of the website to scan (**required**). |
| `--depth`        | `-d`  | `number` | 250              | Maximum depth to crawl.                   |
| `--concurrency`  | `-c`  | `number` | 10               | Number of concurrent requests.           |
| `--timeout`      | `-t`  | `number` | 5000 (ms)        | Timeout for each request in milliseconds. |
| `--retries`      | `-r`  | `number` | 3                | Number of retries for each request.       |
| `--output`       | `-o`  | `string` | `sentinel_output/spider_<timestamp>.json` | Output file to save results in JSON format. |