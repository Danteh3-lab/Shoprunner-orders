#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const MAX_COMMITS = 120;
const MAX_ITEMS_PER_DAY = 8;
const MAX_COMMITS_PER_DAY = 10;
const DEFAULT_SUMMARY = "Recent changes shipped to Shoprunner.";
const OUTPUT_PATH = path.resolve(__dirname, "../shared/changelog-data.js");
const CHANGELOG_ARTIFACT_PATHS = new Set(["scripts/shared/changelog-data.js", "README.md"]);

function runGit(args) {
    return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    }).trimEnd();
}

function parseCommitRows(raw) {
    if (!raw) {
        return [];
    }

    return raw
        .split("\x1e")
        .map((record) => record.trim())
        .filter(Boolean)
        .map((record) => {
            const [hash, shortHash, date, subject] = record.split("\x1f");
            return {
                hash: String(hash || "").trim(),
                shortHash: String(shortHash || "").trim(),
                date: String(date || "").trim(),
                subject: String(subject || "").trim()
            };
        })
        .filter((record) => record.hash && record.shortHash && /^\d{4}-\d{2}-\d{2}$/.test(record.date));
}

function listCommits() {
    const format = "%H%x1f%h%x1f%ad%x1f%s%x1e";
    const raw = runGit([
        "log",
        "--no-merges",
        `-n`,
        String(MAX_COMMITS),
        "--date=short",
        `--pretty=format:${format}`
    ]);

    return parseCommitRows(raw);
}

function getCommitFiles(hash) {
    const raw = runGit(["show", "--pretty=format:", "--name-only", "--no-renames", hash]);
    if (!raw) {
        return [];
    }

    return raw
        .split(/\r?\n/)
        .map((line) => String(line || "").trim())
        .filter(Boolean)
        .map((line) => line.replace(/\\/g, "/"));
}

function isArtifactOnlyCommit(files) {
    if (!files.length) {
        return false;
    }
    return files.every((filePath) => CHANGELOG_ARTIFACT_PATHS.has(filePath));
}

function cleanSubject(subject) {
    const collapsed = String(subject || "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, "");

    if (!collapsed) {
        return "";
    }

    const normalized = collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function uniqueLimit(values, limit) {
    const seen = new Set();
    const output = [];

    for (const value of values) {
        if (!value || seen.has(value)) {
            continue;
        }
        seen.add(value);
        output.push(value);
        if (output.length >= limit) {
            break;
        }
    }

    return output;
}

function buildEntries(commits) {
    const grouped = new Map();

    for (const commit of commits) {
        if (!grouped.has(commit.date)) {
            grouped.set(commit.date, []);
        }
        grouped.get(commit.date).push(commit);
    }

    const dates = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1));

    return dates.map((date) => {
        const dateCommits = grouped.get(date) || [];
        const items = uniqueLimit(
            dateCommits.map((commit) => cleanSubject(commit.subject)).filter(Boolean),
            MAX_ITEMS_PER_DAY
        );
        const commitRefs = uniqueLimit(
            dateCommits.map((commit) => commit.shortHash).filter(Boolean),
            MAX_COMMITS_PER_DAY
        );

        return {
            date,
            title: `Updates - ${date}`,
            summary: DEFAULT_SUMMARY,
            items,
            commits: commitRefs,
            version: dateCommits[0] ? dateCommits[0].hash : ""
        };
    });
}

function buildOutputSource(entries) {
    const json = JSON.stringify(entries, null, 4)
        .split("\n")
        .map((line, index) => (index === 0 ? line : `    ${line}`))
        .join("\n");

    return `(() => {\n    window.SHOPRUNNER_CHANGELOG = ${json};\n})();\n`;
}

function writeOutput(entries) {
    const source = buildOutputSource(entries);
    fs.writeFileSync(OUTPUT_PATH, source, "utf8");
}

function shouldFailBuildOnError() {
    return Boolean(process.env.CI || process.env.NETLIFY || process.env.CONTEXT || process.env.BUILD_ID);
}

function main() {
    try {
        const commits = listCommits();
        const seenHashes = new Set();
        const filtered = [];

        for (const commit of commits) {
            if (seenHashes.has(commit.hash)) {
                continue;
            }
            seenHashes.add(commit.hash);

            const files = getCommitFiles(commit.hash);
            if (isArtifactOnlyCommit(files)) {
                continue;
            }

            filtered.push(commit);
        }

        const entries = buildEntries(filtered);
        writeOutput(entries);
        console.log(`Generated changelog with ${entries.length} day entries.`);
    } catch (error) {
        writeOutput([]);
        console.error("Failed to generate changelog:", error && error.message ? error.message : error);
        if (shouldFailBuildOnError()) {
            process.exit(1);
        }
    }
}

main();
