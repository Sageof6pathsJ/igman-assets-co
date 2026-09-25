# Soft Chaos Shadow Backend

Read-only bridge for the Soft Chaos Agent HQ.

## Safety
- Shopify reads only
- No customer email/address exposed
- No refunds
- No fulfillment writes
- No customer messaging
- No money movement
- No trading

## Endpoints
- GET /health
- GET /api/state

Required Render environment variables:
- SHOPIFY_STORE_DOMAIN
- SHOPIFY_ADMIN_ACCESS_TOKEN (secret)
- HQ_ORIGIN=https://sageof6pathsj.github.io
