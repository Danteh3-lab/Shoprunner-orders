const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");
const indexPath = path.join(projectRoot, "index.html");
const authPath = path.join(projectRoot, "auth.html");

function assertContains(content, token, filePath) {
    if (!content.includes(token)) {
        throw new Error(`Missing required token "${token}" in ${filePath}`);
    }
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
const authHtml = fs.readFileSync(authPath, "utf8");

[
    "id=\"orders-body\"",
    "id=\"date-range-select\"",
    "id=\"owner-performance-period\"",
    "id=\"owner-performance-month\"",
    "id=\"owner-profit-chart\"",
    "id=\"notification-panel\""
].forEach((token) => assertContains(indexHtml, token, indexPath));

[
    "id=\"auth-system-status-line\"",
    "id=\"auth-system-status-dot\"",
    "id=\"auth-system-status-text\""
].forEach((token) => assertContains(authHtml, token, authPath));

console.log("Smoke checks passed.");
