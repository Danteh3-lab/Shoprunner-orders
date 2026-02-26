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
            "no-shadow": "error"
        }
    }
];
