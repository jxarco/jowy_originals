// --- WooCommerce Read-Only API Client (Frontend-Safe) --- //
// Nothing is stored persistently. Keys live only in memory.
// Requires: store URL, consumer key, consumer secret (read-only keys).

export class WooCommerceClient {
    constructor() {
        this.store = null;
        this.ck = null;
        this.cs = null;
        this.connected = false;
    }

    async configure(store, ck, cs) {
        this.store = store.replace(/\/$/, "");
        this.ck = ck;
        this.cs = cs;

        const r = await this.checkConnection();
        if (r.ok) {
            this.connected = true;
        }

        return r;
    }

    async _get(endpoint, params = {}) {
        if (!this.store || !this.ck || !this.cs) {
            throw new Error("WooCommerce API not configured.");
        }

        const url = new URL(`${this.store}/wp-json/wc/v3/${endpoint}`);

        // Add provided params
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        // Add API keys
        url.searchParams.append("consumer_key", this.ck);
        url.searchParams.append("consumer_secret", this.cs);

        const res = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`WooCommerce API error ${res.status}: ${text}`);
        }

        // Return data + pagination info
        return {
            ok: true,
            data: await res.json(),
            total: res.headers.get("X-WP-Total"),
            totalPages: res.headers.get("X-WP-TotalPages")
        };
    }

    async _put(endpoint, body = {}, params = {}) {
        if (!this.store || !this.ck || !this.cs) {
            throw new Error("WooCommerce API not configured.");
        }

        const url = new URL(`${this.store}/wp-json/wc/v3/${endpoint}`);

        // Add provided params
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        // Add API keys
        url.searchParams.append("consumer_key", this.ck);
        url.searchParams.append("consumer_secret", this.cs);

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`PUT request failed: ${response.status}`);
        }

        return response.json();
    }


    //
    // --- PUBLIC READ-ONLY HELPERS ---
    //

    async checkConnection() {
        try {
            // Try a minimal request

            // const a = new Date();
            await this._get("");
            // console.log(new Date().getTime() - a.getTime())

            // If we get here, credentials and server are OK
            return { ok: true };
        } catch (err) {
            // Return detailed error
            return {
                ok: false,
                error: err.message
            };
        }
    }

    async updateOrderStatus(orderId, status) {
        if (!orderId) {
            throw new Error("updateOrderStatus requires an orderId");
        }
        if (!status || typeof status !== "string") {
            throw new Error("updateOrderStatus requires a valid status string");
        }

        const payload = { status };

        try {
            const updated = await this._put(`orders/${orderId}`, payload);
            return {
                ok: true,
                updated
            };
        } catch (err) {
            console.error("Error updating order status:", err);
            return {
                ok: false,
                error: err.message
            };
        }
    }


    async getOrdersPage(page = 1, perPage = 20) {
        try {
            const r = await this._get("orders", { page, per_page: perPage });
            return r;
        } catch (err) {
            return {
                ok: false,
                error: err.message
            };
        }
    }

    //
    // --- GET ORDERS FILTERED BY DATE + STATUS ---
    //
    async getOrdersByFilter(after = null, before = null, status = null, per_page = 100, page = 1) {
        const params = { per_page, page };

        if (after) params.after = new Date(after).toISOString();
        if (before) params.before = new Date(before).toISOString();
        if (status) {
            if (Array.isArray(status)) {
                params.status = status.join(",");
            } else {
                params.status = status;
            }
        }

        return this._get("orders", params);
    }

    async getAllOrdersByFilter(after = null, before = null, status = null, per_page = 100) {
        let page = 1;
        let allOrders = [];

        while (true) {
            const { data, totalPages } = await this.getOrdersByFilter(after, before, status, per_page, page);

            allOrders.push(...data);

            if (page >= totalPages) break;

            page++;
        }

        return allOrders;
    }

    async getOrdersByIds(ids = [], page = 1, per_page = 100) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("getOrdersByIds requires a non-empty array of IDs");
        }

        // Convert to query params: include[]=123&include[]=456
        const params = {
            page,
            per_page,
        };

        ids.forEach((id, index) => {
            params[`include[${index}]`] = id;
        });

        return await this._get("orders", params);
    }

    // Get ALL orders (auto-pagination)
    async getAllOrders(perPage = 50) {
        let page = 1;
        let allOrders = [];

        while (true) {
            const { data, totalPages } = await this.getOrdersPage(page, perPage);
            allOrders.push(...data);
            if (page >= Number(totalPages)) break;
            page++;
        }

        return allOrders;
    }

    async getOrder(id) {
        try {
            const r = await this._get(`orders/${id}`)
            return r;
        } catch (err) {
            return {
                ok: false,
                error: err.message
            };
        }
    }

    //
    // --- CHECK IF ORDER HAS AN INVOICE ---
    //
    async hasInvoice(orderId) {
        const { data } = await this.getOrder(orderId);

        if (!data || !data.meta_data) return false;

        // Look for invoice number and invoice date
        const numberMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_number");
        const dateMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date");
        const dateFormattedMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date_formatted");

        return Boolean(numberMeta && numberMeta.value
            && dateMeta && dateMeta.value
            && dateFormattedMeta && dateFormattedMeta.value
        );
    }

    //
    // --- GET INVOICE INFO FOR AN ORDER ---
    //
    async getInvoice(orderId, data) {

        if (!data) {
            const r = await this.getOrder(orderId);
            data = r.data;
        }

        if (!data || !data.meta_data) return null;

        const numberMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_number");
        const dateMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date");
        const dateFormattedMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date_formatted");
        const numberDataMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_number_data");

        if (numberMeta && numberMeta.value && dateMeta && dateMeta.value
            && dateFormattedMeta && dateFormattedMeta.value && numberDataMeta && numberDataMeta.value) {
            const d = new Date(dateFormattedMeta.value);
            return {
                number: parseInt(numberDataMeta.value.number),
                numberFormatted: numberMeta.value,
                date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
            };
        }

        return null;
    }

    // ORDER ACTIONS

    //
    // --- CREATE ORDER NOTE ---
    //
    async createOrderNote(orderId, note, customerNote = true) {
        if (!this.store || !this.ck || !this.cs) {
            return {
                ok: false,
                error: `WooCommerce API error: API not configured`
            };
        }

        const url = new URL(`${this.store}/wp-json/wc/v3/orders/${orderId}/notes`);
        url.searchParams.append("consumer_key", this.ck);
        url.searchParams.append("consumer_secret", this.cs);

        const payload = {
            note: note,
            customer_note: customerNote
        };

        const res = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const text = await res.text();
            return {
                ok: false,
                error: `WooCommerce API error ${res.status}: ${text}`
            };
        }

        return { ok: true, data: await res.json() };
    }

    //
    // --- UPDATE INVOICE (WooCommerce PDF Invoices plugin compatible) ---
    //
    async updateInvoice(orderId, number, date, prefix = "4-", suffix = "", padding = 6) {
        if (!this.store || !this.ck || !this.cs) {
            return {
                ok: false,
                error: `WooCommerce API error: API not configured`
            };
        }

        // Convert JS Date or string to timestamp + formatted version
        const dateObj = new Date(`${date.trim()}`);
        const timestamp = Math.floor(dateObj.getTime() / 1000);
        const formattedDate = dateObj.toISOString();

        // Construct formatted invoice number
        number = number.constructor !== Number ? parseInt(number) : number;
        const formattedNumber = `${prefix}${number.toString().padStart(padding, "0")}${suffix}`;

        const payload = {
            wpo_wcpdf_invoice_number: formattedNumber,
            meta_data: [
                {
                    key: "_wcpdf_invoice_number_data",
                    value: {
                        number: number,
                        formatted_number: formattedNumber,
                        prefix,
                        suffix,
                        document_type: "invoice",
                        order_id: orderId,
                        padding
                    }
                },
                { key: "_wcpdf_invoice_number", value: formattedNumber },
                { key: "_wcpdf_invoice_date", value: timestamp },
                { key: "_wcpdf_invoice_date_formatted", value: formattedDate },
                { key: "_wcpdf_invoice_display_date", value: "document_date" },
                { key: "_wcpdf_invoice_creation_trigger", value: "document_data" },
            ]
        };

        const url = new URL(`${this.store}/wp-json/wc/v3/orders/${orderId}`);
        url.searchParams.append("consumer_key", this.ck);
        url.searchParams.append("consumer_secret", this.cs);

        const res = await fetch(url.toString(), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const text = await res.text();
            return {
                ok: false,
                error: `WooCommerce API error ${res.status}: ${text}`
            };
        }

        return { ok: true, data: await res.json() };
    }
}
