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
    }

    configure( store, ck, cs )
    {
        this.store = store.replace(/\/$/, "");
        this.ck = ck;
        this.cs = cs;
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

        // Parse JSON
        const data = await res.json();

        // Return data + pagination info
        return {
            data,
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
        return this._get("orders", { page, per_page: perPage });
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

    async getOrder(id)
    {
        return this._get( `orders/${id}` );
    }
}
