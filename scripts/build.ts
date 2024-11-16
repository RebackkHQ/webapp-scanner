import { execFile as execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { build as esbuild } from "esbuild";
import { rimraf } from "rimraf";

const execFile = promisify(execFileSync);

const srcPath = path.join(process.cwd(), "src");
const buildPath = path.join(process.cwd(), "build");

async function clear(): Promise<void> {
  const time = Date.now();

  await fs.rm(buildPath, { recursive: true, force: true });

  // biome-ignore lint/suspicious/noConsoleLog: script file
  console.log(`🚀 cleared in ${Date.now() - time}ms`);
}

async function buildDts(): Promise<void> {
  const time = Date.now();

  const { stderr } = await execFile("tsc", [
    "--emitDeclarationOnly",
    "--project",
    "tsconfig.build.json",
  ]);

  if (stderr) {
    console.error(stderr);
  }

  // biome-ignore lint/suspicious/noConsoleLog: script file
  console.log(`🚀 built definitions files in ${Date.now() - time} ms`);
}

async function extractDts(): Promise<void> {
  const time = Date.now();

  const { stderr } = await execFile("api-extractor", ["run"]);

  if (stderr) {
    console.error(stderr);
  }

  await rimraf("./build/*", { glob: true });
  await fs.rename("trimmed.d.ts", "build/index.d.ts");

  // biome-ignore lint/suspicious/noConsoleLog: script file
  console.log(`🚀 extracted definitions files in ${Date.now() - time} ms`);
}

async function build(): Promise<void> {
  const time = Date.now();

  const banner =
    "const require = (await import('node:module')).createRequire(import.meta.url);";

  await esbuild({
    banner: { js: banner },
    platform: "node",
    format: "esm",
    nodePaths: [srcPath],
    sourcemap: true,
    external: [],
    bundle: true,
    entryPoints: [path.join(srcPath, "index.ts"), path.join(srcPath, "bin.ts")],
    outdir: buildPath,
    footer: {
      js: "// @RebackkHQ/webapp-scanner",
    },
    inject: [path.resolve("./scripts/extras/document-shim.js")],
  });

  // biome-ignore lint/suspicious/noConsoleLog: script file
  console.log(`🚀 bundled in ${Date.now() - time}ms`);
}

async function copyXhrSync() {
  const currentPath = path.join(
    process.cwd(),
    "node_modules/jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js"
  );
  const targetPath = path.join(buildPath, "xhr-sync-worker.js");

  try {
    // Check if the source file exists
    await fs.access(currentPath);

    // Copy the file to the build path
    await fs.copyFile(currentPath, targetPath);

    console.log(
      "📄 xhr-sync-worker.js copied successfully to the build folder."
    );
  } catch (error) {
    console.error("❌ Failed to copy xhr-sync-worker.js:", error);
  }
}

if (process.argv[1] === import.meta.filename) {
  await clear();
  await buildDts();
  await extractDts();
  await build();
  await copyXhrSync();
}
