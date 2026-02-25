const dashboardSupabase = window.shoprunnerSupabase;
const dashboardAuthConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const uiText = window.SHOPRUNNER_UI_TEXT || {};
const signOutBtn = document.getElementById("sign-out-btn");
const headerUserProfile = document.getElementById("header-user-profile");
const headerAvatarImg = document.getElementById("header-avatar-img");
const headerAvatarFallback = document.getElementById("header-avatar-fallback");

initDashboardAuth();

async function initDashboardAuth() {
    applyHeaderStaticText();

    if (hasAuthCallbackErrorInUrl()) {
        redirectToAuth();
        return;
    }

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
        signOutBtn.textContent = getDashboardText("header.signingOut", "Signing out...");

        try {
            await dashboardSupabase.auth.signOut();
        } finally {
            redirectToAuth();
        }
    });
}

function redirectToAuth() {
    const fallbackAuthPath = getDashboardText("routes.authFallback", "/auth");
    const authPath = typeof dashboardAuthConfig.authPath === "string" ? dashboardAuthConfig.authPath : fallbackAuthPath;
    window.location.replace(authPath);
}

function hasAuthCallbackErrorInUrl() {
    try {
        const searchParams = new URLSearchParams(window.location.search || "");
        if (searchParams.get("error_description") || searchParams.get("error")) {
            return true;
        }
    } catch (error) {
        // Ignore.
    }

    const rawHash = String(window.location.hash || "");
    if (!rawHash) {
        return false;
    }

    const hashValue = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (!hashValue.includes("=")) {
        return false;
    }

    try {
        const hashParams = new URLSearchParams(hashValue);
        return Boolean(hashParams.get("error_description") || hashParams.get("error"));
    } catch (error) {
        return false;
    }
}

function renderHeaderProfile(user) {
    if (!headerUserProfile || !headerAvatarImg || !headerAvatarFallback) {
        return;
    }

    const displayName = getDisplayName(user);
    const initials = getInitials(displayName);
    const avatarUrl = String(user && user.user_metadata && user.user_metadata.avatar_url ? user.user_metadata.avatar_url : "").trim();

    const signedInAsText = formatTemplate(
        getDashboardText("header.signedInAs", "Signed in as {name}"),
        { name: displayName }
    );
    headerUserProfile.setAttribute("aria-label", displayName ? signedInAsText : getDashboardText("header.signedInUser", "Signed in user"));
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
    headerAvatarImg.alt = getAvatarAlt(displayName);
}

function showAvatarFallback(displayName) {
    headerAvatarImg.classList.add("hidden");
    headerAvatarImg.removeAttribute("src");
    headerAvatarImg.alt = getAvatarAlt(displayName);
    headerAvatarFallback.classList.remove("hidden");
    const initialsForText = formatTemplate(
        getDashboardText("header.userInitialsFor", "User initials for {name}"),
        { name: displayName }
    );
    headerAvatarFallback.setAttribute("aria-label", displayName ? initialsForText : getDashboardText("header.userInitials", "User initials"));
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
        return getDashboardText("header.defaultInitials", "NA");
    }

    const parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return getDashboardText("header.defaultInitials", "NA");
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function applyHeaderStaticText() {
    if (signOutBtn) {
        signOutBtn.textContent = getDashboardText("header.signOut", "Sign out");
    }

    if (headerAvatarFallback) {
        headerAvatarFallback.textContent = getDashboardText("header.defaultInitials", "NA");
    }

    if (headerAvatarImg) {
        headerAvatarImg.alt = getDashboardText("header.userAvatarAlt", "User avatar");
    }
}

function getAvatarAlt(displayName) {
    if (!displayName) {
        return getDashboardText("header.userAvatarAlt", "User avatar");
    }

    return formatTemplate(
        getDashboardText("header.userAvatarFor", "User avatar for {name}"),
        { name: displayName }
    );
}

function getDashboardText(path, fallbackValue) {
    return getNestedString(uiText.dashboard, path, fallbackValue);
}

function getNestedString(source, path, fallbackValue) {
    if (!source || typeof source !== "object") {
        return fallbackValue;
    }

    const resolved = String(path || "")
        .split(".")
        .filter(Boolean)
        .reduce((acc, key) => {
            if (!acc || typeof acc !== "object") {
                return undefined;
            }
            return acc[key];
        }, source);

    return typeof resolved === "string" && resolved.trim() ? resolved : fallbackValue;
}

function formatTemplate(template, replacements) {
    if (typeof window.shoprunnerFormatText === "function") {
        return window.shoprunnerFormatText(template, replacements);
    }

    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
        if (!replacements || !(key in replacements)) {
            return "";
        }
        return String(replacements[key]);
    });
}
