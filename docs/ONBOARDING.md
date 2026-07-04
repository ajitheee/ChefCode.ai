# ChefCode.ai — Setup Guide

Get from sign-up to your first coded invoice in about 20 minutes.

This guide works two ways:

- **Self-serve** — you follow the steps yourself.
- **Concierge** — send us your filled-in templates and we set it up for you.

---

## What you'll set up

1. Your account
2. Locations
3. GL codes
4. Vendors
5. Products
6. Your team

Then you scan your first invoice. **Do the steps in order** — each one builds on
the last.

---

## Before you start

Gather these four things. The templates in `docs/templates/` already have the
exact columns the app expects — just fill them in.

| # | You'll need | Template |
| --- | --- | --- |
| Locations | Name, code, and address of each kitchen | *(entered in the app)* |
| GL codes | Your codes and categories | `gl_codes_template.csv` |
| Vendors | Vendor name + account code | `vendors_template.csv` |
| Products | Product, description, category, GL code | `products_template.csv` |

**The product list matters most** — it's what teaches the AI. The more complete
it is, the better it codes from day one.

---

## Step 1 — Create your account

1. Open the app and choose **Create account**.
2. Enter your name, organization name, email, and password. Pick a plan.
3. Your 15-day free trial starts. You're the owner.

You and your team sign in with just **email and password**.

## Step 2 — Add your locations

**Admin Panel → Locations & Codes.** For each kitchen, enter:

- Name
- Location code (e.g. `170130`)
- Address — lets the app confirm invoices went to the right place

## Step 3 — Add your GL codes

**Admin Panel → GL Codes.** Add each code (code, category, food or non-food).

Do this **before** products, because products point at these codes.

## Step 4 — Add your vendors

**Admin Panel → Vendor Accounts → Upload CSV/Excel.** Upload your filled-in
`vendors_template.csv`.

## Step 5 — Upload your products

**Admin Panel → Product Database → Upload.** Upload your filled-in
`products_template.csv`. This is the AI's brain — re-upload anytime to add more.

## Step 6 — Invite your team

**Admin Panel → Team Members.** Invite by email, and give each person a role and
the locations they can see. They get an email to set their password.

## Step 7 — Scan your first invoice

**Invoice Processor.**

1. Pick your location.
2. Upload an invoice (photo or PDF).
3. The AI codes every line — review and fix anything.
4. Save, then download the coded PDF or CSV.

If an item isn't matched, click **Add Product** and it's saved for next time.

Coding looks good? You're set up. A lot wrong? Add more products (Step 5).

---

## For the ChefCode team (concierge setup)

- [ ] Collect the customer's data (locations + the 3 templates)
- [ ] Create or confirm their account
- [ ] Add locations, GL codes, vendors, and products
- [ ] Invite their team with the right roles and locations
- [ ] Run one real invoice together
- [ ] Show them the Invoice Processor and "Add Product"

---

## Common questions

- **Can't log in?** Use your email and password only. Forgot it? Click
  **Forgot password?** on the login screen.
- **Address not verifying?** Make sure the location's address is filled in (Step 2).
- **Wrong GL codes?** Your product list is missing items — add them (Step 5 or
  "Add Product").
- **Trial ended?** The account becomes read-only until you move to a paid plan.
