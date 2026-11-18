const ALLOWED_HOSTS = new Set(["github.com", "api.github.com"]);

function validateReleaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Updater URL must be an HTTPS GitHub release URL");
  }
  return url.toString();
}

async function checkForUpdate({ fetchImpl = fetch, releaseApiUrl, currentVersion }) {
  const url = validateReleaseUrl(releaseApiUrl);
  const response = await fetchImpl(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`Update check failed: HTTP ${response.status}`);
  const release = await response.json();
  const latest = String(release.tag_name || "").replace(/^v/, "");
  return { available: Boolean(latest && latest !== currentVersion), currentVersion, latestVersion: latest, releaseUrl: release.html_url };
}

module.exports = { validateReleaseUrl, checkForUpdate };
