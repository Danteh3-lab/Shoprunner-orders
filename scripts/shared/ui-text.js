(function attachUiTextConfig() {
    const uiText = {
        dashboard: {
            header: {
                signOut: "Sign out",
                signingOut: "Signing out...",
                userAvatarAlt: "User avatar",
                userAvatarFor: "User avatar for {name}",
                userInitials: "User initials",
                userInitialsFor: "User initials for {name}",
                signedInUser: "Signed in user",
                signedInAs: "Signed in as {name}",
                defaultInitials: "NA"
            },
            routes: {
                authFallback: "/auth"
            }
        },
        auth: {
            labels: {
                titleSignIn: "Account Login",
                titleSignUp: "Create Account",
                submitSignIn: "Login",
                submitSignUp: "Register",
                submitLoading: "Please wait...",
                forgotLink: "Forgot?",
                switchToSignupPrefix: "Don't have an account?",
                switchToSignupLink: "Sign up.",
                switchToSigninPrefix: "Already have an account?",
                switchToSigninLink: "Sign in.",
                fieldEmail: "EMAIL",
                fieldPassword: "PASSWORD",
                fieldFullName: "FULL NAME",
                fieldConfirmPassword: "CONFIRM PASSWORD",
                placeholderEmail: "your@email.com",
                placeholderPassword: "********",
                placeholderFullName: "Your full name",
                rememberDevice: "Remember this device",
                ssoButton: "SSO",
                systemStatusChecking: "System Status: Checking...",
                systemStatusOperational: "System Status: Operational",
                systemStatusDegraded: "System Status: Degraded"
            },
            feedback: {
                supabaseUnavailable: "Supabase client is not available. Check configuration.",
                sessionValidationFailed: "Could not validate session. Please refresh.",
                signInSuccess: "Signed in successfully. Redirecting...",
                signInFailed: "Sign in failed. Please try again.",
                fullNameRequired: "Full name is required.",
                passwordsDoNotMatch: "Passwords do not match.",
                signUpAndSignedIn: "Account created and signed in. Redirecting...",
                signUpEmailConfirm: "Account created. Check your email to confirm your account.",
                signUpFailed: "Sign up failed. Please try again.",
                switchToSignInForReset: "Switch to sign in mode to reset password.",
                enterEmailBeforeForgot: "Enter your email first, then click Forgot.",
                passwordResetSent: "Password reset email sent. Check your inbox.",
                passwordResetFailed: "Could not send reset email. Please try again.",
                googleSignInFailed: "Google sign in failed. Please try again.",
                invalidCredentials: "Invalid email or password.",
                emailNotConfirmed: "Please confirm your email before signing in.",
                alreadyRegistered: "This email is already registered. Try signing in.",
                passwordMinLength: "Password must meet minimum length requirements.",
                rateLimited: "Too many requests. Please wait and try again.",
                authenticationFailed: "Authentication failed. Please try again."
            }
        }
    };

    function formatText(template, replacements) {
        const source = String(template || "");
        return source.replace(/\{(\w+)\}/g, (match, key) => {
            if (!replacements || !(key in replacements)) {
                return "";
            }
            return String(replacements[key]);
        });
    }

    window.SHOPRUNNER_UI_TEXT = uiText;
    window.shoprunnerFormatText = formatText;
})();
