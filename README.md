# Unity Enterprise

### A deployed product catalog and internal management portal for a wholesale bag business

Unity Enterprise is a web application built for a family-owned bag business in Bharuch, Gujarat, India. It brings the public product catalog and internal product and inventory workflows into one application, while preserving the business's existing customer enquiry process.

- **Live website:** https://www.unitybag.com
- **Customer catalog:** https://www.unitybag.com/catalog
- **Source code:** https://github.com/Shaili-Patel2503/unity-enterprise-portal

---

## Overview

The business previously relied on product photos, PDF catalogs, phone calls, and WhatsApp to share product information. Unity Enterprise provides a public catalog for product discovery and a staff-facing portal for maintaining product records and reviewing inventory information.

The project focuses on practical application engineering: spreadsheet import and validation, product-photo handling, database-backed workflows, access control, and production deployment.

## Features

### Public product catalog

- Browse active products and their available details.
- View product pages with photographs, sizes, colours, descriptions, and pricing where provided.
- Keep inactive internal product records out of the public catalog.
- Display catalog availability separately from whether a product is active.

### Product management

- Review and search product records.
- Maintain model, name, category, size, colour, cost, selling-price, description, and image information where applicable.
- Upload product photographs to Supabase Storage.

### Excel product importer

The `.xlsx` importer supports a preview-and-validation workflow before creating products.

- Read product rows from the workbook.
- Extract supported embedded workbook images and match them to product rows.
- Flag validation problems such as duplicate model numbers, missing or multiple matched photos, and invalid numeric values.
- Compress product photographs and upload them to Supabase Storage.
- Store the uploaded image path against the product record.
- Create imported products in a safe initial state: inactive, unavailable from the public catalog, and stock-unverified.
- Keep product import separate from inventory creation; importing a product does not automatically create inventory balances, movements, or stock-count records.

Controlled tests have been run for a single-product import, duplicate protection, and spreadsheet validation scenarios.

### Inventory views

- Review recorded balances by product and location.
- Review inventory movements and their reasons.
- View stock-count records when present.
- Keep recorded stock quantities distinct from physical stock verification.

Inventory quantities should be treated as recorded values, not physically verified stock, until the business completes its counting process.

### Authentication and access control

- Supabase Authentication for staff access.
- Row Level Security (RLS) policies for key database tables.
- Staff-restricted operations for relevant product, inventory, and storage actions.
- Public catalog access separated from internal management workflows.

### Deployment and development

- Deployed website using the project's production hosting setup.
- TypeScript checks and optimized production builds using Next.js.
- Git and GitHub for source control.

## Technology stack

| Area | Technologies |
|---|---|
| Application framework | Next.js App Router, React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Image storage | Supabase Storage |
| Spreadsheet processing | SheetJS (`xlsx`), JSZip |
| Image processing | `browser-image-compression` |
| Version control | Git, GitHub |
| Hosting | Vercel |

## High-level architecture

```text
Customers                         Staff
   |                                |
   v                                v
Public catalog                 Staff portal
   |                         /       |        \
   |                    Products  Inventory  Excel import
   |                         \       |        /
   +---------------------------+----+--------+
                               |
                               v
                         Supabase platform
                    PostgreSQL | Auth | Storage
```

The public catalog reads active product records through the catalog view. Staff workflows use the application's authenticated database access policies.

## Run locally

### Prerequisites

- Node.js and npm
- Access to a configured Supabase project
- Required environment variables for the application's Supabase configuration

### 1. Clone the repository

```bash
git clone https://github.com/Shaili-Patel2503/unity-enterprise-portal.git
cd unity-enterprise-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env.local` file in the project root and configure the variable names expected by the project's Supabase client and application configuration. Use your own project values.

**Never commit `.env.local`, passwords, service-role keys, or other secrets.**

### 4. Start the development server

```bash
npm run dev
```

Open http://localhost:3000.

### 5. Run a production build

```bash
npm run build
```

The application requires the corresponding Supabase schema, database functions, access policies, and Storage configuration for the relevant features to work.

## Engineering considerations

- **Validate before writing:** Preview spreadsheet data and surface issues before importing.
- **Prevent accidental duplicates:** Check duplicate product models before creating records.
- **Use safe import defaults:** Newly imported products are inactive and stock-unverified.
- **Separate products from stock:** Product creation does not imply verified physical inventory.
- **Control public visibility:** Internal records should not automatically appear in the public catalog.
- **Protect privileged operations:** Use database policies and staff authorization checks.

## Current scope and verification

- The production build and TypeScript checks passed during the latest project closeout.
- Controlled tests passed for the Excel importer, duplicate protection, and validation cases.
- The test product's image was confirmed in Supabase Storage, and the test product remained inactive with no related inventory records.
- The public catalog data audit found 83 active catalog records with image paths and slugs.
- Product and inventory pages were checked on the deployed website.
- The order-management interface and database functions exist, but the business currently handles customer enquiries through its existing phone/WhatsApp workflow. The order workflow has not been fully verified end to end.
- A complete, restorable database-and-storage backup procedure remains an operational follow-up; CSV exports alone are not a full backup.

## Business context

Unity Enterprise is a practical software project built around the needs of a small wholesale bag business. Its goal is to improve product discovery and internal record management without forcing the business to change its current customer enquiry process.

## License

No open-source license is provided in this repository. All rights are reserved unless the project owner adds a license explicitly.