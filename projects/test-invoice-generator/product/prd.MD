# Mexican Invoice Generator — MVP

## 1. Objective

Build a simple web application that allows Mexican businesses/freelancers to generate valid **CFDI 4.0 invoices** without interacting directly with SAT complexity.

The application will use the **Facturama API** for CFDI creation, stamping, PDF/XML generation, and cancellation.

## 2. Target User

Small business owner or freelancer in Mexico who:

* Has a valid RFC and fiscal information.
* Needs to invoice customers.
* Generates relatively few invoices.
* Wants a simpler experience than traditional accounting software.

## 3. Core User Flow

**Login → Create invoice → Enter/select customer → Add products/services → Review → Generate CFDI → Download/send invoice**

## 4. MVP Features

### Account & Issuer

* Sign up / login.
* Configure issuer:

  * RFC
  * Razón Social
  * Régimen Fiscal
  * Código Postal
* Configure Facturama credentials/integration.

### Customers

Create and save customers with:

* RFC
* Razón Social
* Código Postal
* Régimen Fiscal
* Uso CFDI
* Email

### Products / Services

Allow users to create reusable concepts:

* Description
* SAT product/service code
* Unit
* SAT unit code
* Price
* IVA configuration

### Invoice Creation

User can:

1. Select customer.
2. Add one or multiple concepts.
3. Set quantity and price.
4. Select payment method (`PUE` / `PPD`).
5. Select forma de pago.
6. Select Uso CFDI.
7. Preview totals.
8. Click **Generar factura**.

### Facturama Integration

Backend sends invoice data to Facturama and stores:

* Facturama ID
* UUID fiscal
* Status
* Timestamp
* Total
* XML
* PDF

The UI must clearly handle Facturama/SAT validation errors.

### Invoice History

Table showing:

* Folio
* Date
* Customer
* RFC
* Total
* Status

Actions:

* View
* Download PDF
* Download XML
* Send by email
* Cancel invoice

## 5. Main Screens

1. Login / Signup
2. Dashboard
3. Customers
4. Products & Services
5. New Invoice
6. Invoice Detail
7. Settings

## 6. Suggested Data Model

`users`

`organizations`

`customers`

`products`

`invoices`

`invoice_items`

`facturama_transactions`

Each invoice should store the original request and Facturama response for **traceability and debugging**.

## 7. Key Business Rules

* Validate required CFDI 4.0 fields before calling Facturama.
* RFC, Razón Social and Código Postal must comply with CFDI requirements.
* Monetary calculations must be performed server-side.
* A stamped invoice cannot be edited; corrections require cancellation/replacement.
* Facturama API credentials must never be exposed to the frontend.

## 8. Out of Scope for MVP

* Complemento de pago
* Nómina
* Carta Porte
* Multi-currency
* Advanced accounting
* Bank reconciliation
* Recurring invoices
* Inventory management
* Full SAT catalog management UI

## 9. Success Criteria

A new user should be able to configure their fiscal information and generate their **first valid CFDI in under 5 minutes**.
