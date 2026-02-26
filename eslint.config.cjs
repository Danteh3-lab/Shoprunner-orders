module.exports = [
    {
        files: ["scripts/**/*.js", "tests/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                AbortController: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                alert: "readonly",
                VANTA: "readonly",
                module: "readonly",
                require: "readonly",
                process: "readonly",
                console: "readonly",
                globalThis: "readonly",
                __dirname: "readonly"
            }
        },
        rules: {
            "no-undef": "error",
            "no-shadow": "error",
            "no-warning-comments": ["error", { terms: ["todo", "fixme"], location: "start" }],
            complexity: ["error", 30],
            "max-depth": ["error", 5],
            "max-lines-per-function": ["error", { max: 220, skipBlankLines: true, skipComments: true }]
        }
    },
    {
        files: ["scripts/dashboard/invoice-renderer.js"],
        rules: {
            complexity: ["error", 60],
            "max-lines-per-function": ["error", { max: 320, skipBlankLines: true, skipComments: true }]
        }
    },
    {
        files: ["scripts/dashboard/modules/order-normalization.js"],
        rules: {
            complexity: ["error", 60]
        }
    }
];
