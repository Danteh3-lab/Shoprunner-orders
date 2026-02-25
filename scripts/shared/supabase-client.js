(() => {
    const SHOPRUNNER_AUTH_STORAGE_MODE_KEY = "shoprunner.auth.storage.mode.v1";
    const STORAGE_MODE_LOCAL = "local";
    const STORAGE_MODE_SESSION = "session";

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase client SDK is not loaded.");
        return;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
        console.error("Supabase configuration is missing.");
        return;
    }

    let memoryStore = {};
    const memoryStorage = {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
        },
        setItem(key, value) {
            memoryStore[key] = String(value);
        },
        removeItem(key) {
            delete memoryStore[key];
        }
    };

    function getSafeStorage(kind) {
        const candidate = kind === STORAGE_MODE_SESSION ? window.sessionStorage : window.localStorage;
        if (!candidate) {
            return null;
        }

        try {
            const probeKey = "__shoprunner_storage_probe__";
            candidate.setItem(probeKey, "1");
            candidate.removeItem(probeKey);
            return candidate;
        } catch (error) {
            return null;
        }
    }

    function normalizeMode(mode) {
        return mode === STORAGE_MODE_SESSION ? STORAGE_MODE_SESSION : STORAGE_MODE_LOCAL;
    }

    function readModeFromStorage(storage) {
        if (!storage) {
            return "";
        }

        try {
            return String(storage.getItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY) || "").trim().toLowerCase();
        } catch (error) {
            return "";
        }
    }

    function getStorageMode() {
        const sessionMode = readModeFromStorage(getSafeStorage(STORAGE_MODE_SESSION));
        if (sessionMode === STORAGE_MODE_SESSION) {
            return STORAGE_MODE_SESSION;
        }

        const localMode = readModeFromStorage(getSafeStorage(STORAGE_MODE_LOCAL));
        if (localMode === STORAGE_MODE_LOCAL) {
            return STORAGE_MODE_LOCAL;
        }

        return STORAGE_MODE_LOCAL;
    }

    function setStorageMode(mode) {
        const nextMode = normalizeMode(mode);
        const localStorageRef = getSafeStorage(STORAGE_MODE_LOCAL);
        const sessionStorageRef = getSafeStorage(STORAGE_MODE_SESSION);

        if (nextMode === STORAGE_MODE_SESSION) {
            try {
                if (sessionStorageRef) {
                    sessionStorageRef.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_SESSION);
                } else {
                    memoryStorage.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_SESSION);
                }
            } catch (error) {
                memoryStorage.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_SESSION);
            }

            try {
                if (localStorageRef) {
                    localStorageRef.removeItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY);
                }
            } catch (error) {
                // Ignore.
            }

            return STORAGE_MODE_SESSION;
        }

        try {
            if (localStorageRef) {
                localStorageRef.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_LOCAL);
            } else {
                memoryStorage.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_LOCAL);
            }
        } catch (error) {
            memoryStorage.setItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY, STORAGE_MODE_LOCAL);
        }

        try {
            if (sessionStorageRef) {
                sessionStorageRef.removeItem(SHOPRUNNER_AUTH_STORAGE_MODE_KEY);
            }
        } catch (error) {
            // Ignore.
        }

        return STORAGE_MODE_LOCAL;
    }

    function resolveStorage(mode) {
        const normalized = normalizeMode(mode);
        const preferred = getSafeStorage(normalized);
        if (preferred) {
            return preferred;
        }

        const fallback = getSafeStorage(STORAGE_MODE_LOCAL);
        if (fallback) {
            return fallback;
        }

        return memoryStorage;
    }

    function createShoprunnerClient(mode) {
        const normalizedMode = normalizeMode(mode || getStorageMode());
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: resolveStorage(normalizedMode)
            }
        });
    }

    window.shoprunnerGetAuthStorageMode = getStorageMode;
    window.shoprunnerSetAuthStorageMode = setStorageMode;
    window.shoprunnerCreateSupabaseClient = createShoprunnerClient;
    window.shoprunnerSupabase = createShoprunnerClient(getStorageMode());
})();
