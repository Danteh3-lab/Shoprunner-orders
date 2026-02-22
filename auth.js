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
        showFeedback("Supabase client is not available. Check configuration.", "error");
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
        showFeedback("Could not validate session. Please refresh.", "error");
    }
}

async function handleSignIn(values) {
    if (!supabaseClient) {
        showFeedback("Supabase client is not available. Check configuration.", "error");
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

        showFeedback("Signed in successfully. Redirecting...", "success");
        redirectToApp();
    } catch (error) {
        showFeedback("Sign in failed. Please try again.", "error");
    } finally {
        setSubmitState(false);
    }
}

async function handleSignUp(values) {
    if (!supabaseClient) {
        showFeedback("Supabase client is not available. Check configuration.", "error");
        return;
    }

    if (!values.fullName) {
        showFeedback("Full name is required.", "error");
        return;
    }

    if (values.password !== values.confirmPassword) {
        showFeedback("Passwords do not match.", "error");
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
            showFeedback("Account created and signed in. Redirecting...", "success");
            redirectToApp();
            return;
        }

        showFeedback("Account created. Check your email to confirm your account.", "success");
    } catch (error) {
        showFeedback("Sign up failed. Please try again.", "error");
    } finally {
        setSubmitState(false);
    }
}

async function handleForgotPassword() {
    if (authMode !== "signin") {
        showFeedback("Switch to sign in mode to reset password.", "error");
        return;
    }

    if (!supabaseClient) {
        showFeedback("Supabase client is not available. Check configuration.", "error");
        return;
    }

    const emailField = authForm.elements.namedItem("email");
    const email = String(emailField ? emailField.value : "").trim();
    if (!email) {
        showFeedback("Enter your email first, then click Forgot.", "error");
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

        showFeedback("Password reset email sent. Check your inbox.", "success");
    } catch (error) {
        showFeedback("Could not send reset email. Please try again.", "error");
    }
}

async function handleGoogleSso() {
    if (!isGoogleEnabled()) {
        return;
    }

    if (!supabaseClient) {
        showFeedback("Supabase client is not available. Check configuration.", "error");
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
        showFeedback("Google sign in failed. Please try again.", "error");
    }
}

function renderAuthMode() {
    if (authMode === "signin") {
        authTitle.textContent = "Account Login";
        submitBtn.textContent = "Login";
        forgotPasswordLink.classList.remove("hidden");
        dynamicFields.innerHTML = buildSignInFields();
        authSwitchText.innerHTML =
            'Don\'t have an account? <a href="#" class="text-link strong-link" data-auth-mode="signup">Sign up.</a>';
        return;
    }

    authTitle.textContent = "Create Account";
    submitBtn.textContent = "Register";
    forgotPasswordLink.classList.add("hidden");
    dynamicFields.innerHTML = buildSignUpFields();
    authSwitchText.innerHTML =
        'Already have an account? <a href="#" class="text-link strong-link" data-auth-mode="signin">Sign in.</a>';
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
            label: "EMAIL",
            name: "email",
            type: "email",
            placeholder: "your@email.com",
            autocomplete: "email"
        })}
        ${renderField({
            label: "PASSWORD",
            name: "password",
            type: "password",
            placeholder: "********",
            autocomplete: "current-password"
        })}
        <label class="remember-row">
            <input type="checkbox" name="remember" />
            <span>Remember this device</span>
        </label>
    `;
}

function buildSignUpFields() {
    return `
        ${renderField({
            label: "FULL NAME",
            name: "fullName",
            type: "text",
            placeholder: "Your full name",
            autocomplete: "name"
        })}
        ${renderField({
            label: "EMAIL",
            name: "email",
            type: "email",
            placeholder: "your@email.com",
            autocomplete: "email"
        })}
        ${renderField({
            label: "PASSWORD",
            name: "password",
            type: "password",
            placeholder: "********",
            autocomplete: "new-password"
        })}
        ${renderField({
            label: "CONFIRM PASSWORD",
            name: "confirmPassword",
            type: "password",
            placeholder: "********",
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
    submitBtn.textContent = isLoading ? "Please wait..." : authMode === "signin" ? "Login" : "Register";
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
        return "Invalid email or password.";
    }
    if (message.includes("email not confirmed")) {
        return "Please confirm your email before signing in.";
    }
    if (message.includes("user already registered")) {
        return "This email is already registered. Try signing in.";
    }
    if (message.includes("password should be at least")) {
        return "Password must meet minimum length requirements.";
    }
    if (message.includes("rate limit")) {
        return "Too many requests. Please wait and try again.";
    }
    if (message) {
        return error.message || String(error);
    }
    return "Authentication failed. Please try again.";
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
