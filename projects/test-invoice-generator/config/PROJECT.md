# Project

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Do not
begin DISCOVERY until this file is complete.

## Venture Name

Test Invoice Generator

## One-Line Mission

Let Mexican freelancers and small businesses generate legally valid CFDI 4.0 invoices in
minutes, without dealing with SAT complexity directly.

## Initial Concept / Hypothesis

A simple web application where a small business or freelancer configures their fiscal
issuer data once, then creates invoices (select customer, add products/services, review,
generate) that are stamped as valid CFDI 4.0 through the Facturama API — avoiding the
complexity of full accounting software or direct SAT integration. This is a founder-supplied
hypothesis (via PRD), not yet independently validated through DISCOVERY.

## Target User (initial hypothesis)

Small business owner or freelancer in Mexico who has a valid RFC and fiscal information,
needs to invoice customers, generates relatively few invoices, and wants a simpler
experience than traditional accounting software.

## Problem (initial hypothesis)

Issuing SAT-compliant CFDI 4.0 invoices normally requires either full accounting software
(overkill for low invoice volume) or direct SAT/PAC integration complexity. Small
businesses and freelancers with simple invoicing needs lack a lightweight, fast option.

## Known Constraints on Scope

Explicitly out of scope for MVP (per PRD):
- Complemento de pago
- Nómina (payroll)
- Carta Porte
- Multi-currency
- Advanced accounting
- Bank reconciliation
- Recurring invoices
- Inventory management
- Full SAT catalog management UI

## Notes

Fast-start project: a PRD (product/prd.MD) and a rough technical architecture note
(engineering/architecture.md) were supplied directly by the founder. Per AGENTS.md
"Fast-start," DISCOVERY, BENCHMARK, and BRAND are marked `disabled` (skipped, no
deliverable expected) and PRODUCT_STRATEGY is marked `provided` (product/prd.MD supplied;
product/strategy.md and product/v1-scope.md were not separately supplied — treated as an
accepted gap in the provided deliverable, not fabricated). See agent/DECISIONS.md for the
full initialization record.

Success criteria per PRD: a new user should be able to configure their fiscal information
and generate their first valid CFDI in under 5 minutes.
