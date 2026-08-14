# Tourism Booking API

A Fastify REST API on top of the PostgreSQL tourism booking schema: tour
catalog, tour photo galleries, customers, saved payment methods
(credit card / PayPal, tokenized), bookings, and transactions.

## Auth model

Every route (except `GET /health`) requires an API key:

```
x-api-key: <your API_KEY>
```

Routes that **publish or modify catalog content** — creating, editing, or
deleting tours, tour gallery images, or standalone image records — require
a **second** header on top of the API key:

```
x-publish-key: <your PUBLISH_KEY>
```

This lets you hand the general API key to your storefront/frontend while
keeping the publish key restricted to whoever manages the catalog (an
admin panel, a CMS integration, a CI job, etc.). Missing/invalid
`x-api-key` → `401`. Missing/invalid `x-publish-key` on a protected route
→ `403`.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

3. **Build the database** (requires `psql` and an empty/target database)

   ```bash
   psql "$DATABASE_URL" -f schema.sql
   ```

   To wipe and start over:

   ```bash
   psql "$DATABASE_URL" -f clear.sql
   psql "$DATABASE_URL" -f schema.sql
   ```

4. **Run the API**

   ```bash
   npm start     # production
   npm run dev   # auto-restart on file changes
   ```

   The server listens on `PORT` (default `3000`).

## Endpoints

All paths below are relative to the server root and require `x-api-key`
unless noted. 🔒 marks endpoints that also require `x-publish-key`.

### Tours

| Method | Path | Notes |
|---|---|---|
| GET | `/tours` | List tours. Query: `active`, `limit`, `offset` |
| GET | `/tours/:id` | Tour with its gallery |
| POST | `/tours` | 🔒 Create a tour |
| PATCH | `/tours/:id` | 🔒 Update a tour |
| DELETE | `/tours/:id` | 🔒 Archive (deactivate) a tour |

### Tour gallery

| Method | Path | Notes |
|---|---|---|
| GET | `/tours/:tourId/gallery` | List gallery images |
| POST | `/tours/:tourId/gallery` | 🔒 Attach an image (`imageId`, or `url`/`alt` to create one) |
| DELETE | `/tours/:tourId/gallery/:galleryId` | 🔒 Remove an image from the gallery |

### Images

| Method | Path | Notes |
|---|---|---|
| GET | `/images/:id` | Fetch one image record |
| POST | `/images` | 🔒 Create a standalone image record |
| DELETE | `/images/:id` | 🔒 Delete an image record |

### Customers

| Method | Path | Notes |
|---|---|---|
| POST | `/customers` | Register a customer |
| GET | `/customers/:id` | Fetch a customer |
| PATCH | `/customers/:id` | Update a customer |
| GET | `/customers/:id/bookings` | A customer's booking history |
| GET | `/customers/:id/payment-methods` | A customer's saved payment methods |
| POST | `/customers/:id/payment-methods` | Save a new payment method |

### Bookings

| Method | Path | Notes |
|---|---|---|
| POST | `/bookings` | Purchase a tour (snapshots current price) |
| GET | `/bookings/:id` | Booking with tour + customer info |
| PATCH | `/bookings/:id/status` | Update booking status |
| GET | `/bookings/:id/transactions` | Transactions for a booking |