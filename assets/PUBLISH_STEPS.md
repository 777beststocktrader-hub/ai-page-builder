# PageGenie Shopify App Store Publish Guide

## Status

The app code now uses Shopify OAuth, Shopify session tokens, Shopify Billing, GraphQL Admin API calls, GDPR webhook verification, and Shopify-safe listing copy.

Before submitting, finish the Partner Dashboard and deployment settings below.

## Step 1: Create the App in Shopify Partners

1. Go to https://partners.shopify.com.
2. Create a public app named PageGenie.
3. Set the app URL to `https://ai-page-builder-6h7l.onrender.com`.
4. Set the allowed redirect URL to `https://ai-page-builder-6h7l.onrender.com/api/auth/callback`.
5. Copy the Client ID and Client secret.

## Step 2: Configure Deployment Environment

Add these environment variables:

- `SHOPIFY_API_KEY`: Partner Dashboard Client ID
- `SHOPIFY_API_SECRET`: Partner Dashboard Client secret
- `VITE_SHOPIFY_API_KEY`: Partner Dashboard Client ID
- `APP_URL`: `https://ai-page-builder-6h7l.onrender.com`
- `FRONTEND_URL`: `https://ai-page-builder-6h7l.onrender.com`
- `SHOPIFY_API_VERSION`: `2026-01`
- `SHOPIFY_BILLING_PRICE`: `19`
- `SHOPIFY_BILLING_TRIAL_DAYS`: `30`

## Step 3: Test Install

Install the app from the Partner Dashboard test install flow, then open it inside Shopify admin. Merchants should not need to paste a store domain, create a custom app, or enter an Admin API token.

## Step 4: Submit Listing

Use `assets/APP_STORE_LISTING.md` for the listing copy.

- Pricing: Free trial, then $19/month through Shopify Billing
- Customer data request: `https://ai-page-builder-6h7l.onrender.com/api/webhooks/customers/data_request`
- Customer data erasure: `https://ai-page-builder-6h7l.onrender.com/api/webhooks/customers/redact`
- Shop data erasure: `https://ai-page-builder-6h7l.onrender.com/api/webhooks/shop/redact`
- Privacy Policy URL: `https://ai-page-builder-6h7l.onrender.com/privacy`
- Terms URL: `https://ai-page-builder-6h7l.onrender.com/terms`
- Support email: `777beststocktrader@gmail.com`

## Review Checklist

- Shopify Billing is used for paid plans.
- App requests only necessary scopes: `read_content`, `write_content`, `read_products`.
- Embedded requests send Shopify session tokens when `VITE_SHOPIFY_API_KEY` is configured.
- Webhooks verify the raw Shopify HMAC body.
- GDPR endpoints are configured and shop redaction removes stored shop/session/billing/contact/subscriber data.
- Listing copy does not claim fake results, fake reviews, or conflicting pricing.
