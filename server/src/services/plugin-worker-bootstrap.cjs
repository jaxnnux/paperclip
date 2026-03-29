const { fileURLToPath, pathToFileURL } = require("node:url");
const path = require("node:path");

const entrypointArg = process.argv[2];
if (!entrypointArg) {
  console.error("plugin-worker-bootstrap: missing worker entrypoint path");
  process.exit(1);
}

const entrypointSpecifier = entrypointArg.startsWith("file:")
  ? entrypointArg
  : pathToFileURL(entrypointArg).href;
const entrypointPath = entrypointSpecifier.startsWith("file:")
  ? fileURLToPath(entrypointSpecifier)
  : entrypointArg;

// Make SDK main-module checks (runWorker(plugin, import.meta.url)) behave as if
// the plugin worker bundle itself were the process entrypoint.
process.argv[1] = entrypointPath;

(async () => {
  const mod = await import(entrypointSpecifier);

  // Detect definePlugin-style workers that export the plugin as default but
  // don't call runWorker() themselves (older SDK contract or compiled bundles
  // that rely on the host to bootstrap). The definePlugin() return value is
  // { definition: { setup, onHealth, ... } }.
  const defaultExport = mod.default;
  if (
    defaultExport != null &&
    typeof defaultExport === "object" &&
    typeof defaultExport.definition === "object" &&
    defaultExport.definition !== null
  ) {
    // Resolve startWorkerRpcHost from the plugin's own sdk copy so IPC
    // protocol versions stay in sync.
    const pluginDir = path.dirname(entrypointPath);
    // Walk up from the dist/ folder to find the plugin root, then resolve sdk
    const pluginRoot = path.dirname(pluginDir);
    let startWorkerRpcHost;
    try {
      const sdkPath = path.join(pluginRoot, "node_modules", "@paperclipai", "plugin-sdk", "dist", "worker-rpc-host.js");
      const sdkUrl = pathToFileURL(sdkPath).href;
      const sdk = await import(sdkUrl);
      startWorkerRpcHost = sdk.startWorkerRpcHost;
    } catch (_) {
      // Fallback: try the server's own sdk
      const { startWorkerRpcHost: fn } = await import("@paperclipai/plugin-sdk");
      startWorkerRpcHost = fn;
    }

    if (typeof startWorkerRpcHost === "function") {
      startWorkerRpcHost({ plugin: defaultExport });
    } else {
      console.error("plugin-worker-bootstrap: could not resolve startWorkerRpcHost");
      process.exit(1);
    }
  }
  // If runWorker() was called inside the module import above, it already
  // started the RPC host — nothing more to do here.
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
