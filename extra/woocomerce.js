// --- WooCommerce Read-Only API Client (Frontend-Safe) --- //
// Nothing is stored persistently. Keys live only in memory.
// Requires: store URL, consumer key, consumer secret (read-only keys).

export class WooCommerceClient
{
    constructor()
    {
        this.store = null;
        this.ck = null;
        this.cs = null;
        this.connected = false;
    }

    async configure( store, ck, cs )
    {
        this.store = store.replace(/\/$/, "");
        this.ck = ck;
        this.cs = cs;

        const r = await this.checkConnection();
        if( r.ok )
        {
            this.connected = true;
        }

        return r;
    }

    async _get( endpoint, params = {} )
    {
        if( !this.store || !this.ck || !this.cs )
        {
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

        if( !res.ok )
        {
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

    //
    // --- PUBLIC READ-ONLY HELPERS ---
    //

    async checkConnection()
    {
        try {
            // Try a minimal request
            await this._get("orders", { per_page: 1 });

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

    async getOrdersPage( page = 1, perPage = 20 )
    {
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

    // Get ALL orders (auto-pagination)
    async getAllOrders( perPage = 50 )
    {
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

    async getOrder( id )
    {
        try {
            const r = await this._get( `orders/${id}` )
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
    async hasInvoice( orderId )
    {
        const { data } = await this.getOrder( orderId );

        if( !data || !data.meta_data ) return false;

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
    async getInvoice( orderId )
    {
        const { data } = await this.getOrder( orderId );

        if( !data || !data.meta_data ) return null;

        const numberMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_number");
        const dateMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date");
        const dateFormattedMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_date_formatted");
        const numberDataMeta = data.meta_data.find(m => m.key === "_wcpdf_invoice_number_data");

        if (numberMeta && numberMeta.value && dateMeta && dateMeta.value 
            && dateFormattedMeta && dateFormattedMeta.value && numberDataMeta && numberDataMeta.value) {
            const d = new Date( dateFormattedMeta.value );
            return {
                number: parseInt( numberDataMeta.value.number ),
                date: `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`
            };
        }

        return null;
    }

    // ORDER ACTIONS

    //
    // --- CREATE ORDER NOTE ---
    //
    async createOrderNote( orderId, note, customerNote = true )
    {
        if( !this.store || !this.ck || !this.cs )
        {
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
    async updateInvoice( orderId, number, date, prefix = "4-", suffix = "", padding = 6 )
    {
        if( !this.store || !this.ck || !this.cs )
        {
            return {
                ok: false,
                error: `WooCommerce API error: API not configured`
            };
        }

        // Convert JS Date or string to timestamp + formatted version
        const dateObj = new Date( `${ date.trim() } 08:00` );
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

    // async createOrUpdateInvoice( orderId, number, dateISO, note = "" )
    // {
    //     if( !this.store || !this.ck || !this.cs )
    //     {
    //         throw new Error("WooCommerce API not configured.");
    //     }

    //     const url = new URL(`${this.store}/wp-json/wc/v3/orders/${orderId}/documents`);
    //     url.searchParams.append("consumer_key", this.ck);
    //     url.searchParams.append("consumer_secret", this.cs);

    //     const body = new FormData();
    //     body.append("type", "invoice");
    //     body.append("number", number);
    //     body.append("date", dateISO);
    //     if (note) body.append("note", note);

    //     const res = await fetch(url.toString(), {
    //         method: "POST",
    //         body
    //     });

    //     if (!res.ok) {
    //         const text = await res.text();
    //         throw new Error(`WooCommerce Invoice API error ${res.status}: ${text}`);
    //     }

    //     return await res.json();  // will include { number, date, date_timestamp }
    // }
}
