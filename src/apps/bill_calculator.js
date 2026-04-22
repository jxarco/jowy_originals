import { LX } from 'lexgui';
import { BaseApp } from './base_app.js';

export class BillCalculatorApp extends BaseApp
{
    constructor( core, tool )
    {
        super( core, tool );

        this.title = 'Calculadora: <i>Facturas SEUR</i>';
        this.subtitle = '';
        this.icon = 'ReceiptEuro';
    }

    clear()
    {
        super.clear();
    }
}