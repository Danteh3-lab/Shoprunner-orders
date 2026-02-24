(() => {
    const TEAM_TABLE = "team_members";
    const ORDERS_TABLE = "orders";
    const UNASSIGNED_OWNER_ID = "unassigned";
    const ORDER_SELECT =
        "id,user_id,customer_name,owner_id,order_date,item_name,special_notes,purchase_price,weight_lbs,margin,shipping_cost,sale_price,advance_paid,remaining_due,arrived,paid,created_at,invoice_id,invoice_issued_at";
    const TEAM_SELECT = "id,user_id,name,created_at";

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

    async function createTeamMember(name) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const payload = {
            user_id: userId,
            name: String(name || "").trim()
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

    async function renameTeamMember(id, name) {
        const client = getClient();
        const userId = await getCurrentUserId();

        const { data, error } = await client
            .from(TEAM_TABLE)
            .update({ name: String(name || "").trim() })
            .eq("id", id)
            .eq("user_id", userId)
            .select(TEAM_SELECT)
            .single();

        if (error) {
            throw new Error(error.message || "Could not rename team member.");
        }

        return data;
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
        return {
            user_id: userId,
            customer_name: String(orderInput.customerName || "").trim(),
            owner_id: !ownerId || ownerId === UNASSIGNED_OWNER_ID ? null : ownerId,
            order_date: String(orderInput.orderDate || ""),
            item_name: String(orderInput.itemName || "").trim(),
            special_notes: String(orderInput.specialNotes || "").trim(),
            purchase_price: toMoney(orderInput.purchasePrice),
            weight_lbs: toMoney(orderInput.weightLbs),
            margin: Number.parseFloat(orderInput.margin),
            shipping_cost: toMoney(orderInput.shippingCost),
            sale_price: toMoney(orderInput.salePrice),
            advance_paid: toMoney(orderInput.advancePaid),
            remaining_due: toMoney(orderInput.remainingDue),
            arrived: Boolean(orderInput.arrived),
            paid: Boolean(orderInput.paid)
        };
    }

    function toMoney(value) {
        const numeric = Number.parseFloat(value);
        if (!Number.isFinite(numeric)) {
            return 0;
        }
        return Math.round((numeric + Number.EPSILON) * 100) / 100;
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
