(() => {
    const SUPABASE_URL = "https://ahnhbmmcrfpvkclkkmuh.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ks552wfKQ_ajnL2ALynlHQ_nig0hUqg";
    const AUTH_REDIRECT_BASE_PLACEHOLDER = "https://<your-netlify-site>.netlify.app";

    const origin = typeof window.location.origin === "string" ? window.location.origin : "";
    const hasHttpOrigin = /^https?:\/\//i.test(origin);
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

    const isFileMode = !hasHttpOrigin;
    const authPath = isFileMode ? "auth.html" : isLocalhost ? "/auth.html" : "/auth";
    const appPath = isFileMode ? "index.html" : isLocalhost ? "/index.html" : "/app";
    const authRedirectBase = hasHttpOrigin ? origin : AUTH_REDIRECT_BASE_PLACEHOLDER;
    const authPathForEmail = authPath.startsWith("/") ? authPath : `/${authPath}`;
    const appPathForEmail = appPath.startsWith("/") ? appPath : `/${appPath}`;

    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
    window.SHOPRUNNER_AUTH_CONFIG = {
        AUTH_REDIRECT_BASE: authRedirectBase,
        AUTH_REDIRECT_BASE_PLACEHOLDER,
        authPath,
        appPath,
        emailRedirectTo: `${authRedirectBase}${appPathForEmail}`,
        passwordResetRedirectTo: `${authRedirectBase}${authPathForEmail}`,
        googleEnabled: false
    };
})();
