(() => {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase client SDK is not loaded.");
        return;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
        console.error("Supabase configuration is missing.");
        return;
    }

    window.shoprunnerSupabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
})();
