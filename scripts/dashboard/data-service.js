(() => {
    const TEAM_TABLE = "team_members";
    const ORDERS_TABLE = "orders";
    const UNASSIGNED_OWNER_ID = "unassigned";
    const SEA_INPUT_MODE_CUBE = "cube";
    const SEA_INPUT_MODE_DIMENSIONS = "dimensions";
    const ORDER_SELECT =
        "id,user_id,customer_name,owner_id,order_date,item_name,items,item_links,special_notes,purchase_price,tax_amount,weight_lbs,shipping_type,sea_cube,length_in,width_in,height_in,margin,shipping_cost,sale_price,advance_paid,remaining_due,arrived,paid,created_at,invoice_id,invoice_issued_at";
    const TEAM_SELECT = "id,user_id,name,email,created_at";

    function getClient() {
        const client = window.shoprunnerSupabase;
        if (!client) {
            throw new Error("Supabase client is unavailable.");
        }
        return client;
    }

    async function getCurrentUserId() {
        const client = getClient();
        const { data, error } = await client.auth.getUser();
        if (error) {
            throw new Error(error.message || "Could not resolve current user.");
        }

        const userId = data && data.user && data.user.id ? String(data.user.id) : "";
        if (!userId) {
            throw new Error("No authenticated user found.");
        }

        return userId;
    }

    async function fetchTeamMembers() {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { data, error } = await client
            .from(TEAM_TABLE)
            .select(TEAM_SELECT)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (error) {
            throw new Error(error.message || "Could not fetch team members.");
        }

        return Array.isArray(data) ? data : [];
    }

    async function createTeamMember(name, email) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const payload = {
            user_id: userId,
            name: String(name || "").trim(),
            email: normalizeEmailInput(email)
        };

        const { data, error } = await client
            .from(TEAM_TABLE)
            .insert(payload)
            .select(TEAM_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not create team member.");
        }

        return data;
    }

    async function updateTeamMember(id, profileInput) {
        const client = getClient();
        const userId = await getCurrentUserId();
        const nextProfile = profileInput && typeof profileInput === "object" ? profileInput : {};

        const { data, error } = await client
            .from(TEAM_TABLE)
            .update({
                name: String(nextProfile.name || "").trim(),
                email: normalizeEmailInput(nextProfile.email)
            })
            .eq("id", id)
            .eq("user_id", userId)
            .select(TEAM_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not update team member.");
        }

        return data;
    }

    async function renameTeamMember(id, name) {
        return updateTeamMember(id, { name });
    }

    async function deleteTeamMember(id) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { error } = await client
            .from(TEAM_TABLE)
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            throw new Error(error.message || "Could not delete team member.");
        }
    }

    async function fetchOrders() {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { data, error } = await client
            .from(ORDERS_TABLE)
            .select(ORDER_SELECT)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(error.message || "Could not fetch orders.");
        }

        return Array.isArray(data) ? data : [];
    }

    async function fetchOrderById(orderId) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { data, error } = await client
            .from(ORDERS_TABLE)
            .select(ORDER_SELECT)
            .eq("id", orderId)
            .eq("user_id", userId)
            .single();

        if (error) {
            throw new Error(error.message || "Could not fetch order.");
        }

        return data;
    }

    async function createOrder(orderInput) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const payload = toOrderPayload(orderInput, userId);

        const { data, error } = await client
            .from(ORDERS_TABLE)
            .insert(payload)
            .select(ORDER_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not create order.");
        }

        return data;
    }

    async function updateOrder(orderId, orderInput) {
        const client = getClient();
        const userId = await getCurrentUserId();
        const payload = toOrderPayload(orderInput, userId);
        delete payload.user_id;

        const { data, error } = await client
            .from(ORDERS_TABLE)
            .update(payload)
            .eq("id", orderId)
            .eq("user_id", userId)
            .select(ORDER_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not update order.");
        }

        return data;
    }

    async function deleteOrder(orderId) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { error } = await client
            .from(ORDERS_TABLE)
            .delete()
            .eq("id", orderId)
            .eq("user_id", userId);

        if (error) {
            throw new Error(error.message || "Could not delete order.");
        }
    }

    async function toggleOrderStatus(orderId, statusPatch) {
        const client = getClient();
        const userId = await getCurrentUserId();
        const payload = {};

        if (Object.prototype.hasOwnProperty.call(statusPatch, "arrived")) {
            payload.arrived = Boolean(statusPatch.arrived);
        }
        if (Object.prototype.hasOwnProperty.call(statusPatch, "paid")) {
            payload.paid = Boolean(statusPatch.paid);
        }

        const { data, error } = await client
            .from(ORDERS_TABLE)
            .update(payload)
            .eq("id", orderId)
            .eq("user_id", userId)
            .select(ORDER_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not update order status.");
        }

        return data;
    }

    async function ensureInvoiceIdentity(orderId) {
        const client = getClient();
        const userId = await getCurrentUserId();
        const current = await fetchOrderById(orderId);

        if (current && current.invoice_id) {
            return current;
        }

        const maxAttempts = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const candidateId = generateInvoiceId();
            const { data, error } = await client
                .from(ORDERS_TABLE)
                .update({
                    invoice_id: candidateId,
                    invoice_issued_at: new Date().toISOString()
                })
                .eq("id", orderId)
                .eq("user_id", userId)
                .is("invoice_id", null)
                .select(ORDER_SELECT)
                .single();

            if (!error && data) {
                return data;
            }

            lastError = error;
            const message = String(error && error.message ? error.message : "").toLowerCase();
            const noRowsAfterConditionalUpdate =
                message.includes("json object requested") ||
                message.includes("0 rows");
            if (noRowsAfterConditionalUpdate) {
                const latest = await fetchOrderById(orderId);
                if (latest && latest.invoice_id) {
                    return latest;
                }
            }

            const isUniqueCollision =
                message.includes("duplicate key") ||
                message.includes("orders_invoice_id_unique_idx") ||
                message.includes("invoice_id");

            if (!isUniqueCollision) {
                break;
            }
        }

        if (lastError) {
            throw new Error(lastError.message || "Could not assign invoice identity.");
        }

        return fetchOrderById(orderId);
    }

    function toOrderPayload(orderInput, userId) {
        const ownerId = String(orderInput.ownerId || "").trim();
        const shippingType = normalizeShippingType(orderInput.shippingType);
        const seaInputMode = normalizeSeaInputMode(orderInput.seaInputMode);
        const items = normalizeOrderItemsInput(orderInput.items);
        const purchasePrice = getItemsPurchaseTotal(items);
        const weightLbs = getItemsWeightTotal(items);
        const seaCube = shippingType === "sea"
            ? seaInputMode === SEA_INPUT_MODE_DIMENSIONS
                ? calculateSeaCubeFromDimensions(orderInput.lengthIn, orderInput.widthIn, orderInput.heightIn)
                : toMoney(orderInput.seaCube)
            : null;
        const hasSeaDimensions = shippingType === "sea" && seaInputMode === SEA_INPUT_MODE_DIMENSIONS;

        return {
            user_id: userId,
            customer_name: String(orderInput.customerName || "").trim(),
            owner_id: !ownerId || ownerId === UNASSIGNED_OWNER_ID ? null : ownerId,
            order_date: String(orderInput.orderDate || ""),
            item_name: buildItemNameSummary(items),
            items,
            item_links: normalizeItemLinksInput(orderInput.itemLinks),
            special_notes: String(orderInput.specialNotes || "").trim(),
            purchase_price: purchasePrice,
            tax_amount: toNullableMoney(orderInput.taxAmount),
            weight_lbs: weightLbs,
            shipping_type: shippingType,
            sea_cube: shippingType === "sea" ? toNullableMoney(seaCube) : null,
            length_in: hasSeaDimensions ? toMoney(orderInput.lengthIn) : null,
            width_in: hasSeaDimensions ? toMoney(orderInput.widthIn) : null,
            height_in: hasSeaDimensions ? toMoney(orderInput.heightIn) : null,
            margin: Number.parseFloat(orderInput.margin),
            shipping_cost: toMoney(orderInput.shippingCost),
            sale_price: toMoney(orderInput.salePrice),
            advance_paid: toMoney(orderInput.advancePaid),
            remaining_due: toMoney(orderInput.remainingDue),
            arrived: Boolean(orderInput.arrived),
            paid: Boolean(orderInput.paid)
        };
    }

    function normalizeShippingType(value) {
        return String(value || "").toLowerCase() === "sea" ? "sea" : "air";
    }

    function normalizeSeaInputMode(value) {
        return String(value || "").toLowerCase() === SEA_INPUT_MODE_CUBE
            ? SEA_INPUT_MODE_CUBE
            : SEA_INPUT_MODE_DIMENSIONS;
    }

    function normalizeEmailInput(value) {
        const normalized = String(value || "").trim().toLowerCase();
        return normalized || null;
    }

    function normalizeItemLinksInput(value) {
        const links = Array.isArray(value) ? value : [];
        const unique = [];
        const seen = new Set();

        for (const linkValue of links) {
            const link = String(linkValue || "").trim();
            if (!link) {
                continue;
            }
            if (seen.has(link)) {
                continue;
            }
            seen.add(link);
            unique.push(link);

            if (unique.length >= 20) {
                break;
            }
        }

        return unique;
    }

    function normalizeOrderItemsInput(value) {
        const items = Array.isArray(value) ? value : [];
        const normalized = [];

        for (const entry of items) {
            if (!entry || typeof entry !== "object") {
                continue;
            }

            const name = String(entry.name || "").trim();
            const price = toMoney(entry.price);
            const weightLbs = toMoney(entry.weightLbs);

            if (!name) {
                continue;
            }

            normalized.push({ name, price, weightLbs });
        }

        return normalized;
    }

    function buildItemNameSummary(items) {
        if (!items.length) {
            return "";
        }

        const firstName = String(items[0].name || "").trim();
        if (items.length === 1) {
            return firstName;
        }

        return `${firstName} +${items.length - 1} more`;
    }

    function getItemsPurchaseTotal(items) {
        return toMoney(items.reduce((sum, item) => sum + toMoney(item.price), 0));
    }

    function getItemsWeightTotal(items) {
        return toMoney(items.reduce((sum, item) => sum + toMoney(item.weightLbs), 0));
    }

    function hasPositiveSeaDimensions(lengthIn, widthIn, heightIn) {
        return toMoney(lengthIn) > 0 && toMoney(widthIn) > 0 && toMoney(heightIn) > 0;
    }

    function calculateSeaCubeFromDimensions(lengthIn, widthIn, heightIn) {
        if (!hasPositiveSeaDimensions(lengthIn, widthIn, heightIn)) {
            return 0;
        }

        return toMoney((toMoney(lengthIn) * toMoney(widthIn) * toMoney(heightIn)) / 1728);
    }

    function toMoney(value) {
        const numeric = Number.parseFloat(value);
        if (!Number.isFinite(numeric)) {
            return 0;
        }
        return Math.round((numeric + Number.EPSILON) * 100) / 100;
    }

    function toNullableMoney(value) {
        const numeric = Number.parseFloat(value);
        if (!Number.isFinite(numeric)) {
            return null;
        }
        const rounded = Math.round((numeric + Number.EPSILON) * 100) / 100;
        return rounded > 0 ? rounded : null;
    }

    function generateInvoiceId() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
        return `INV-${y}${m}${d}-${suffix}`;
    }

    window.shoprunnerDataService = {
        getCurrentUserId,
        fetchTeamMembers,
        createTeamMember,
        updateTeamMember,
        renameTeamMember,
        deleteTeamMember,
        fetchOrders,
        fetchOrderById,
        createOrder,
        updateOrder,
        deleteOrder,
        toggleOrderStatus,
        ensureInvoiceIdentity
    };
})();

