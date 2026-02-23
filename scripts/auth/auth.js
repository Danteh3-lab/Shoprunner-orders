const authApp = document.getElementById("auth-app");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const dynamicFields = document.getElementById("dynamic-fields");
const submitBtn = document.getElementById("auth-submit-btn");
const ssoBtn = document.getElementById("sso-btn");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const authSwitchText = document.getElementById("auth-switch-text");
const authFeedback = document.getElementById("auth-feedback");
const vantaCanvas = document.getElementById("vanta-canvas");

const supabaseClient = window.shoprunnerSupabase;
const authConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const uiText = window.SHOPRUNNER_UI_TEXT || {};
const defaultAuthPath = "/auth";
const defaultAppPath = "/app";

let authMode = "signin";
let vantaInstance = null;

init();

function init() {
    initVanta();
    renderAuthMode();
    setSsoVisibility();
    wireEvents();
    redirectIfAuthenticated();
}

function wireEvents() {
    authApp.addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-auth-mode]");
        if (toggle) {
            event.preventDefault();
            const nextMode = toggle.dataset.authMode;
            if (nextMode === "signin" || nextMode === "signup") {
                authMode = nextMode;
                hideFeedback();
                renderAuthMode();
            }
            return;
        }

        if (event.target.id === "forgot-password-link") {
            event.preventDefault();
            handleForgotPassword();
        }
    });

    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback();

        if (!authForm.checkValidity()) {
            authForm.reportValidity();
            return;
        }

        const formValues = getFormValues();
        if (authMode === "signin") {
            await handleSignIn(formValues);
            return;
        }

        await handleSignUp(formValues);
    });

    ssoBtn.addEventListener("click", handleGoogleSso);
}

async function redirectIfAuthenticated() {
    if (!supabaseClient) {
        showFeedback(getAuthFeedback("supabaseUnavailable", "Supabase client is not available. Check configuration."), "error");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            showFeedback(normalizeAuthError(error), "error");
            return;
        }

        if (data.session) {
            redirectToApp();
        }
    } catch (error) {
        showFeedback(getAuthFeedback("sessionValidationFailed", "Could not validate session. Please refresh."), "error");
    }
}

async function handleSignIn(values) {
    if (!supabaseClient) {
        showFeedback(getAuthFeedback("supabaseUnavailable", "Supabase client is not available. Check configuration."), "error");
        return;
    }

    setSubmitState(true);
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: values.email,
            password: values.password
        });

        if (error) {
            showFeedback(normalizeAuthError(error), "error");
            return;
        }

        showFeedback(getAuthFeedback("signInSuccess", "Signed in successfully. Redirecting..."), "success");
        redirectToApp();
    } catch (error) {
        showFeedback(getAuthFeedback("signInFailed", "Sign in failed. Please try again."), "error");
    } finally {
        setSubmitState(false);
    }
}

async function handleSignUp(values) {
    if (!supabaseClient) {
        showFeedback(getAuthFeedback("supabaseUnavailable", "Supabase client is not available. Check configuration."), "error");
        return;
    }

    if (!values.fullName) {
        showFeedback(getAuthFeedback("fullNameRequired", "Full name is required."), "error");
        return;
    }

    if (values.password !== values.confirmPassword) {
        showFeedback(getAuthFeedback("passwordsDoNotMatch", "Passwords do not match."), "error");
        return;
    }

    setSubmitState(true);
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                data: {
                    full_name: values.fullName
                },
                emailRedirectTo: getEmailRedirectUrl()
            }
        });

        if (error) {
            showFeedback(normalizeAuthError(error), "error");
            return;
        }

        if (data.session) {
            showFeedback(getAuthFeedback("signUpAndSignedIn", "Account created and signed in. Redirecting..."), "success");
            redirectToApp();
            return;
        }

        showFeedback(getAuthFeedback("signUpEmailConfirm", "Account created. Check your email to confirm your account."), "success");
    } catch (error) {
        showFeedback(getAuthFeedback("signUpFailed", "Sign up failed. Please try again."), "error");
    } finally {
        setSubmitState(false);
    }
}

async function handleForgotPassword() {
    if (authMode !== "signin") {
        showFeedback(getAuthFeedback("switchToSignInForReset", "Switch to sign in mode to reset password."), "error");
        return;
    }

    if (!supabaseClient) {
        showFeedback(getAuthFeedback("supabaseUnavailable", "Supabase client is not available. Check configuration."), "error");
        return;
    }

    const emailField = authForm.elements.namedItem("email");
    const email = String(emailField ? emailField.value : "").trim();
    if (!email) {
        showFeedback(getAuthFeedback("enterEmailBeforeForgot", "Enter your email first, then click Forgot."), "error");
        return;
    }

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: getPasswordResetRedirectUrl()
        });

        if (error) {
            showFeedback(normalizeAuthError(error), "error");
            return;
        }

        showFeedback(getAuthFeedback("passwordResetSent", "Password reset email sent. Check your inbox."), "success");
    } catch (error) {
        showFeedback(getAuthFeedback("passwordResetFailed", "Could not send reset email. Please try again."), "error");
    }
}

async function handleGoogleSso() {
    if (!isGoogleEnabled()) {
        return;
    }

    if (!supabaseClient) {
        showFeedback(getAuthFeedback("supabaseUnavailable", "Supabase client is not available. Check configuration."), "error");
        return;
    }

    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: getEmailRedirectUrl()
            }
        });

        if (error) {
            showFeedback(normalizeAuthError(error), "error");
        }
    } catch (error) {
        showFeedback(getAuthFeedback("googleSignInFailed", "Google sign in failed. Please try again."), "error");
    }
}

function renderAuthMode() {
    if (authMode === "signin") {
        authTitle.textContent = getAuthLabel("titleSignIn", "Account Login");
        submitBtn.textContent = getAuthLabel("submitSignIn", "Login");
        ssoBtn.textContent = getAuthLabel("ssoButton", "SSO");
        forgotPasswordLink.textContent = getAuthLabel("forgotLink", "Forgot?");
        forgotPasswordLink.classList.remove("hidden");
        dynamicFields.innerHTML = buildSignInFields();
        authSwitchText.innerHTML = buildModeSwitchMarkup("signup");
        return;
    }

    authTitle.textContent = getAuthLabel("titleSignUp", "Create Account");
    submitBtn.textContent = getAuthLabel("submitSignUp", "Register");
    ssoBtn.textContent = getAuthLabel("ssoButton", "SSO");
    forgotPasswordLink.textContent = getAuthLabel("forgotLink", "Forgot?");
    forgotPasswordLink.classList.add("hidden");
    dynamicFields.innerHTML = buildSignUpFields();
    authSwitchText.innerHTML = buildModeSwitchMarkup("signin");
}

function setSsoVisibility() {
    if (isGoogleEnabled()) {
        ssoBtn.classList.remove("hidden");
        return;
    }

    ssoBtn.classList.add("hidden");
}

function buildSignInFields() {
    return `
        ${renderField({
            label: getAuthLabel("fieldEmail", "EMAIL"),
            name: "email",
            type: "email",
            placeholder: getAuthLabel("placeholderEmail", "your@email.com"),
            autocomplete: "email"
        })}
        ${renderField({
            label: getAuthLabel("fieldPassword", "PASSWORD"),
            name: "password",
            type: "password",
            placeholder: getAuthLabel("placeholderPassword", "********"),
            autocomplete: "current-password"
        })}
        <label class="remember-row">
            <input type="checkbox" name="remember" />
            <span>${escapeHtml(getAuthLabel("rememberDevice", "Remember this device"))}</span>
        </label>
    `;
}

function buildSignUpFields() {
    return `
        ${renderField({
            label: getAuthLabel("fieldFullName", "FULL NAME"),
            name: "fullName",
            type: "text",
            placeholder: getAuthLabel("placeholderFullName", "Your full name"),
            autocomplete: "name"
        })}
        ${renderField({
            label: getAuthLabel("fieldEmail", "EMAIL"),
            name: "email",
            type: "email",
            placeholder: getAuthLabel("placeholderEmail", "your@email.com"),
            autocomplete: "email"
        })}
        ${renderField({
            label: getAuthLabel("fieldPassword", "PASSWORD"),
            name: "password",
            type: "password",
            placeholder: getAuthLabel("placeholderPassword", "********"),
            autocomplete: "new-password"
        })}
        ${renderField({
            label: getAuthLabel("fieldConfirmPassword", "CONFIRM PASSWORD"),
            name: "confirmPassword",
            type: "password",
            placeholder: getAuthLabel("placeholderPassword", "********"),
            autocomplete: "new-password"
        })}
    `;
}

function renderField({ label, name, type, placeholder, autocomplete }) {
    return `
        <label class="field">
            <span class="field-label">${escapeHtml(label)}</span>
            <input
                class="field-input"
                type="${escapeHtml(type)}"
                name="${escapeHtml(name)}"
                placeholder="${escapeHtml(placeholder)}"
                autocomplete="${escapeHtml(autocomplete)}"
                required
            />
        </label>
    `;
}

function getFormValues() {
    return {
        fullName: readField("fullName"),
        email: readField("email"),
        password: readField("password"),
        confirmPassword: readField("confirmPassword")
    };
}

function readField(name) {
    const field = authForm.elements.namedItem(name);
    return String(field ? field.value : "").trim();
}

function showFeedback(message, type = "info") {
    authFeedback.textContent = message;
    authFeedback.classList.remove("hidden", "feedback-error", "feedback-success");
    if (type === "error") {
        authFeedback.classList.add("feedback-error");
    }
    if (type === "success") {
        authFeedback.classList.add("feedback-success");
    }
}

function hideFeedback() {
    authFeedback.textContent = "";
    authFeedback.classList.add("hidden");
    authFeedback.classList.remove("feedback-error", "feedback-success");
}

function setSubmitState(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
        submitBtn.textContent = getAuthLabel("submitLoading", "Please wait...");
        return;
    }

    submitBtn.textContent = authMode === "signin"
        ? getAuthLabel("submitSignIn", "Login")
        : getAuthLabel("submitSignUp", "Register");
}

function getAppPath() {
    const configured = String(authConfig.appPath || "").trim();
    if (configured) {
        return configured;
    }
    return defaultAppPath;
}

function getAuthPath() {
    const configured = String(authConfig.authPath || "").trim();
    if (configured) {
        return configured;
    }
    return defaultAuthPath;
}

function getEmailRedirectUrl() {
    if (typeof authConfig.emailRedirectTo === "string" && authConfig.emailRedirectTo.trim()) {
        return authConfig.emailRedirectTo;
    }
    return `${window.location.origin}${getAppPath()}`;
}

function getPasswordResetRedirectUrl() {
    if (typeof authConfig.passwordResetRedirectTo === "string" && authConfig.passwordResetRedirectTo.trim()) {
        return authConfig.passwordResetRedirectTo;
    }
    return `${window.location.origin}${getAuthPath()}`;
}

function redirectToApp() {
    window.location.replace(getAppPath());
}

function isGoogleEnabled() {
    return Boolean(authConfig.googleEnabled);
}

function normalizeAuthError(error) {
    const message = String(error && error.message ? error.message : error || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
        return getAuthFeedback("invalidCredentials", "Invalid email or password.");
    }
    if (message.includes("email not confirmed")) {
        return getAuthFeedback("emailNotConfirmed", "Please confirm your email before signing in.");
    }
    if (message.includes("user already registered")) {
        return getAuthFeedback("alreadyRegistered", "This email is already registered. Try signing in.");
    }
    if (message.includes("password should be at least")) {
        return getAuthFeedback("passwordMinLength", "Password must meet minimum length requirements.");
    }
    if (message.includes("rate limit")) {
        return getAuthFeedback("rateLimited", "Too many requests. Please wait and try again.");
    }
    if (message) {
        return error.message || String(error);
    }
    return getAuthFeedback("authenticationFailed", "Authentication failed. Please try again.");
}

function buildModeSwitchMarkup(targetMode) {
    if (targetMode === "signup") {
        return `${escapeHtml(getAuthLabel("switchToSignupPrefix", "Don't have an account?"))} <a href="#" class="text-link strong-link" data-auth-mode="signup">${escapeHtml(getAuthLabel("switchToSignupLink", "Sign up."))}</a>`;
    }

    return `${escapeHtml(getAuthLabel("switchToSigninPrefix", "Already have an account?"))} <a href="#" class="text-link strong-link" data-auth-mode="signin">${escapeHtml(getAuthLabel("switchToSigninLink", "Sign in."))}</a>`;
}

function getAuthLabel(key, fallbackValue) {
    return getNestedString(uiText, ["auth", "labels", key], fallbackValue);
}

function getAuthFeedback(key, fallbackValue) {
    return getNestedString(uiText, ["auth", "feedback", key], fallbackValue);
}

function getNestedString(source, pathSegments, fallbackValue) {
    const resolved = Array.isArray(pathSegments)
        ? pathSegments.reduce((acc, segment) => {
            if (!acc || typeof acc !== "object") {
                return undefined;
            }
            return acc[segment];
        }, source)
        : undefined;

    return typeof resolved === "string" && resolved.trim() ? resolved : fallbackValue;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function initVanta() {
    if (!vantaCanvas || typeof VANTA === "undefined" || typeof THREE === "undefined") {
        return;
    }

    try {
        vantaInstance = VANTA.NET({
            el: "#vanta-canvas",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 164,
            minWidth: 260,
            scale: 1,
            scaleMobile: 1,
            color: 0x9db5d9,
            backgroundColor: 0x1c2434,
            points: 8,
            maxDistance: 20,
            spacing: 18,
            showDots: true
        });
    } catch (error) {
        vantaInstance = null;
    }
}

window.addEventListener("beforeunload", () => {
    if (vantaInstance && typeof vantaInstance.destroy === "function") {
        vantaInstance.destroy();
    }
});
