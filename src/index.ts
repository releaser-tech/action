import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "fs";
import * as path from "path";

const PLATFORM_MAP: Record<string, string> = {
  ".dmg": "macos",
  ".pkg": "macos",
  ".exe": "windows",
  ".msi": "windows",
  ".msix": "windows",
  ".appimage": "linux",
  ".deb": "linux",
  ".rpm": "linux",
  ".snap": "linux",
  ".flatpak": "linux",
};

function detectPlatform(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [ext, platform] of Object.entries(PLATFORM_MAP)) {
    if (lower.endsWith(ext)) return platform;
  }
  return null;
}

function detectArch(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes("arm64") || lower.includes("aarch64")) return "arm64";
  if (lower.includes("x64") || lower.includes("x86_64") || lower.includes("amd64")) return "x64";
  return null;
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("api-key", { required: true });
    const url = core.getInput("url") || "https://api.releaser.tech";
    const tenant = core.getInput("tenant", { required: true });
    const app = core.getInput("app", { required: true });
    const tag = core.getInput("tag", { required: true });
    const channel = core.getInput("channel") || "stable";
    const changelog = core.getInput("changelog") || "";
    const filesInput = core.getInput("files", { required: true });

    if (!apiKey.startsWith("rlsr_")) {
      core.setFailed("API key must start with 'rlsr_'");
      return;
    }

    // Expand glob patterns
    const patterns = filesInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const globber = await glob.create(patterns.join("\n"));
    const files = await globber.glob();

    if (files.length === 0) {
      core.setFailed("No files matched the provided glob patterns");
      return;
    }

    core.info(`Found ${files.length} file(s) to upload`);

    const uploadUrl = `${url}/functions/v1/upload-asset`;
    let assetCount = 0;
    let versionId = "";

    for (const filePath of files) {
      const filename = path.basename(filePath);
      const platform = detectPlatform(filename);
      const arch = detectArch(filename);

      core.info(`Uploading ${filename}${platform ? ` (${platform}/${arch ?? "unknown"})` : ""}...`);

      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer]);

      const form = new FormData();
      form.append("file", blob, filename);
      form.append("tenant_slug", tenant);
      form.append("app_slug", app);
      form.append("tag", tag);
      form.append("channel", channel);
      if (platform) form.append("platform", platform);
      if (arch) form.append("arch", arch);
      if (changelog) form.append("changelog", changelog);

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });

      const body = (await response.json()) as Record<string, any>;

      if (!response.ok) {
        core.setFailed(`Failed to upload ${filename}: ${body.error || response.statusText}`);
        return;
      }

      core.info(`Uploaded ${filename} (${response.status})`);
      versionId = body.version?.id ?? versionId;
      assetCount++;
    }

    core.info(`Successfully uploaded ${assetCount} asset(s)`);
    core.setOutput("version-id", versionId);
    core.setOutput("asset-count", assetCount.toString());
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
