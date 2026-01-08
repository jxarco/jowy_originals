// mirakl-api.js

export class MiraklClient
{
    constructor( baseUrl )
    {
        if ( !baseUrl )
        {
            throw new Error( 'MiraklAPI requires baseUrl' );
        }

        this.baseUrl = baseUrl.replace( /\/+$/, '' );
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /* ------------------------ */
    /* Internal helpers         */
    /* ------------------------ */

    _buildUrl( path, query )
    {
        const url = new URL( this.baseUrl + path );

        if ( query )
        {
            Object.entries( query ).forEach( ( [ key, value ] ) => {
                if ( value !== undefined && value !== null )
                {
                    url.searchParams.set( key, value );
                }
            } );
        }

        return url.toString();
    }

    async _request( method, path, { query, body } = {} )
    {
        const url = this._buildUrl( path, query );

        const res = await fetch( url, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify( body ) : undefined
        } );

        if ( !res.ok )
        {
            const text = await res.text();
            throw new Error(
                `Mirakl API error ${res.status}: ${text || res.statusText}`
            );
        }

        if ( res.status === 204 ) return null;
        return res.json();
    }

    _get( path, options )
    {
        return this._request( 'GET', path, options );
    }

    _put( path, options )
    {
        return this._request( 'PUT', path, options );
    }

    _post( path, options )
    {
        return this._request( 'POST', path, options );
    }

    /* ------------------------ */
    /* Orders API               */
    /* ------------------------ */

    /**
     * List orders
     * https://developer.mirakl.com/content/product/mmp/rest/seller/openapi3/orders.md
     */
    listOrders( params = {} )
    {
        return this._get( '/api/orders', { query: params } );
    }

    /**
     * Get order details
     */
    getOrder( orderId, shop_id )
    {
        return this._get( `/api/orders/${orderId}`, {
            query: { shop_id }
        } );
    }

    /**
     * Accept an order
     */
    acceptOrder( orderId, shop_id )
    {
        return this._put( `/api/orders/${orderId}/accept`, {
            query: { shop_id }
        } );
    }

    /**
     * Refuse an order
     * body example:
     * {
     *   reason_code: "OUT_OF_STOCK",
     *   reason_label: "Item not available"
     * }
     */
    refuseOrder( orderId, body, shop_id )
    {
        return this._put( `/api/orders/${orderId}/refuse`, {
            query: { shop_id },
            body
        } );
    }

    /**
     * Consume (fulfill) an order
     * body example:
     * {
     *   order_lines: [
     *     {
     *       order_line_id: "123",
     *       quantity: 1
     *     }
     *   ]
     * }
     */
    consumeOrder( orderId, body, shop_id )
    {
        return this._put( `/api/orders/${orderId}/consume`, {
            query: { shop_id },
            body
        } );
    }

    /**
     * Refund an order
     */
    refundOrder( orderId, body, shop_id )
    {
        return this._put( `/api/orders/${orderId}/refund`, {
            query: { shop_id },
            body
        } );
    }
}
