const dashboardSupabase = window.shoprunnerSupabase;
const dashboardAuthConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const signOutBtn = document.getElementById("sign-out-btn");

initDashboardAuth();

async function initDashboardAuth() {
    if (!dashboardSupabase) {
        console.error("Supabase client is unavailable on dashboard.");
        redirectToAuth();
        return;
    }

    try {
        const { data, error } = await dashboardSupabase.auth.getSession();
        if (error || !data.session) {
            redirectToAuth();
            return;
        }

        bindSignOut();
        document.body.classList.remove("auth-pending");
    } catch (error) {
        redirectToAuth();
    }
}

function bindSignOut() {
    if (!signOutBtn) {
        return;
    }

    signOutBtn.addEventListener("click", async () => {
        signOutBtn.disabled = true;
        signOutBtn.textContent = "Signing out...";

        try {
            await dashboardSupabase.auth.signOut();
        } finally {
            redirectToAuth();
        }
    });
}

function redirectToAuth() {
    const authPath = typeof dashboardAuthConfig.authPath === "string" ? dashboardAuthConfig.authPath : "/auth";
    window.location.replace(authPath);
}
