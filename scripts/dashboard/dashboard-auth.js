const dashboardSupabase = window.shoprunnerSupabase;
const dashboardAuthConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const signOutBtn = document.getElementById("sign-out-btn");
const headerUserProfile = document.getElementById("header-user-profile");
const headerAvatarImg = document.getElementById("header-avatar-img");
const headerAvatarFallback = document.getElementById("header-avatar-fallback");

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

        renderHeaderProfile(data.session.user);
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

function renderHeaderProfile(user) {
    if (!headerUserProfile || !headerAvatarImg || !headerAvatarFallback) {
        return;
    }

    const displayName = getDisplayName(user);
    const initials = getInitials(displayName);
    const avatarUrl = String(user && user.user_metadata && user.user_metadata.avatar_url ? user.user_metadata.avatar_url : "").trim();

    headerUserProfile.setAttribute("aria-label", displayName ? `Signed in as ${displayName}` : "Signed in user");
    headerAvatarFallback.textContent = initials;

    if (!avatarUrl) {
        showAvatarFallback(displayName);
        return;
    }

    headerAvatarImg.onerror = () => {
        showAvatarFallback(displayName);
    };
    headerAvatarImg.onload = () => {
        headerAvatarImg.classList.remove("hidden");
        headerAvatarFallback.classList.add("hidden");
    };
    headerAvatarImg.src = avatarUrl;
    headerAvatarImg.alt = displayName ? `User avatar for ${displayName}` : "User avatar";
}

function showAvatarFallback(displayName) {
    headerAvatarImg.classList.add("hidden");
    headerAvatarImg.removeAttribute("src");
    headerAvatarImg.alt = displayName ? `User avatar for ${displayName}` : "User avatar";
    headerAvatarFallback.classList.remove("hidden");
    headerAvatarFallback.setAttribute("aria-label", displayName ? `User initials for ${displayName}` : "User initials");
}

function getDisplayName(user) {
    const fullName = String(user && user.user_metadata && user.user_metadata.full_name ? user.user_metadata.full_name : "").trim();
    if (fullName) {
        return fullName;
    }

    const email = String(user && user.email ? user.email : "").trim();
    if (!email) {
        return "";
    }

    const localPart = email.split("@")[0] || "";
    return localPart.trim();
}

function getInitials(value) {
    const clean = String(value || "").trim();
    if (!clean) {
        return "NA";
    }

    const parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "NA";
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
