# PageGenie — Complete Shopify App Store Publish Guide

## Status: Everything is ready EXCEPT your Partner API keys

All code, GDPR webhooks, privacy policy, terms, and deployment are done.
You need to do 2 things (takes ~10 minutes total).

---

## STEP 1: Create Shopify Partner Account + App (5 min)

1. Go to: https://partners.shopify.com
2. Click **Join as a partner** → sign up with your email
3. Once inside the dashboard, click **Apps** in the left sidebar
4. Click **Create app** (top right)
5. Choose **Create app manually**
6. Fill in:
   - **App name:** PageGenie
   - **App URL:** https://ai-page-builder-6h7l.onrender.com
   - **Allowed redirection URLs:** https://ai-page-builder-6h7l.onrender.com/api/auth/callback
7. Click **Create app**
8. You'll see your **Client ID** and **Client secret** — COPY BOTH

---

## STEP 2: Add API Keys to Render (2 min)

1. Go to: https://dashboard.render.com
2. Click your **ai-page-builder** service
3. Click **Environment** tab
4. Add these env vars:
   - `SHOPIFY_API_KEY` = paste your Client ID from Step 1
   - `SHOPIFY_API_SECRET` = paste your Client secret from Step 1
   - `APP_URL` = https://ai-page-builder-6h7l.onrender.com
   - `FRONTEND_URL` = https://ai-page-builder-6h7l.onrender.com
5. Click **Save Changes** → Render will auto-redeploy (takes ~2 min)

---

## STEP 3: Install App on Your Test Store (2 min)

1. In your Partner Dashboard → **Stores** → **Add store**
2. Choose **Development store** → Create one named "PageGenie Test"
3. Go to this URL (replace with your store domain):
   ```
   https://ai-page-builder-6h7l.onrender.com/api/auth?shop=YOUR-STORE.myshopify.com
   ```
4. You should be redirected to Shopify OAuth → click **Install**
5. App loads inside Shopify admin — test it works!

---

## STEP 4: Submit to App Store (10 min)

1. In Partner Dashboard → **Apps** → click **PageGenie**
2. Click **Distribution** → **Shopify App Store**
3. Fill in the listing (copy from APP_STORE_LISTING.md):
   - **App name:** PageGenie: AI Landing Page Builder
   - **Tagline:** Build beautiful landing pages in minutes with AI. No coding. No designer.
   - **Description:** (copy from APP_STORE_LISTING.md)
   - **Key benefits:** (3 bullets from APP_STORE_LISTING.md)
4. Upload icon: `assets/pagegenie-icon-1024.png`
5. Take 3+ screenshots of the live app
6. Set categories: Page Builders, Store Design, Marketing & Conversions
7. Pricing: Free (or set your pricing model)
8. GDPR webhooks:
   - Customer data request: https://ai-page-builder-6h7l.onrender.com/api/webhooks/customers/data_request
   - Customer data erasure: https://ai-page-builder-6h7l.onrender.com/api/webhooks/customers/redact
   - Shop data erasure: https://ai-page-builder-6h7l.onrender.com/api/webhooks/shop/redact
9. Privacy Policy URL: https://ai-page-builder-6h7l.onrender.com/privacy
10. Support email: 777beststocktrader@gmail.com
11. Click **Submit for review**

---

## Shopify Review Timeline
- Shopify reviews apps within 3-7 business days
- You'll get an email at 777beststocktrader@gmail.com
- Common rejection reasons (all already handled):
  - ✅ GDPR webhooks (done)
  - ✅ Privacy policy page (done at /privacy)
  - ✅ Terms of service (done at /terms)
  - ✅ App loads in Shopify iframe (CSP headers set)

---

## After Approval

Install on novgoods.com:
```
https://ai-page-builder-6h7l.onrender.com/api/auth?shop=novgoods.myshopify.com
```
