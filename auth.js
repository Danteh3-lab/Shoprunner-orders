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

let authMode = "signin";
let vantaInstance = null;

initVanta();
renderAuthMode();

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
        showFeedback("UI mode only: Forgot password will be connected in the Supabase phase.");
    }
});

authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!authForm.checkValidity()) {
        authForm.reportValidity();
        return;
    }

    const message =
        authMode === "signin"
            ? "UI mode only: Login design flow works. Supabase auth comes next."
            : "UI mode only: Register design flow works. Supabase auth comes next.";

    showFeedback(message);
});

ssoBtn.addEventListener("click", () => {
    showFeedback("UI mode only: SSO action is a placeholder.");
});

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
        placeholder: "••••••••",
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
        placeholder: "••••••••",
        autocomplete: "new-password"
    })}
        ${renderField({
        label: "CONFIRM PASSWORD",
        name: "confirmPassword",
        type: "password",
        placeholder: "••••••••",
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

function showFeedback(message) {
    authFeedback.textContent = message;
    authFeedback.classList.remove("hidden");
}

function hideFeedback() {
    authFeedback.textContent = "";
    authFeedback.classList.add("hidden");
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
