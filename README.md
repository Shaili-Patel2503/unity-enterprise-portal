# Unity Enterprise — Digital Bag Catalog & Storefront

A web application for **Unity Enterprise**, a small eco-friendly bag business based in Bharuch, Gujarat, India. The project aims to modernize product discovery and customer inquiries through a digital catalog and online storefront.

## Project Overview

Unity Enterprise traditionally manages product information and customer inquiries through product photos, PDF catalogs, phone calls, and WhatsApp. This project brings the product browsing experience into a web application that customers can access from anywhere.

## Features

- **Product catalog:** Browse available bag models and product information.
- **Product detail pages:** View individual products and their available information.
- **Online storefront:** A dedicated public-facing storefront.
- **WhatsApp inquiries:** Contact the business to enquire about products.
- **Supabase integration:** Connect the application to its product data.
- **Product image storage:** Store and display product images using Supabase Storage.
- **Responsive interface:** Built with modern web technologies for a web-based browsing experience.

> Feature availability depends on the current implementation and database configuration. Planned features are listed separately below.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | React framework and application routing |
| React | Component-based user interface |
| TypeScript | Type-safe JavaScript development |
| Tailwind CSS | Styling and responsive layouts |
| Supabase | Database and backend services |
| Supabase Storage | Product image storage |
| Git | Version control |
| GitHub | Source-code hosting and collaboration |
| npm | Dependency management and project scripts |
| Vercel | Planned deployment and hosting |

## Application Structure

```text
unity-enterprise-portal/
├── app/
│   ├── catalog/       # Public product catalog and product details
│   ├── login/         # Login interface
│   ├── products/      # Product management pages
│   ├── store/         # Public storefront
│   ├── layout.tsx     # Root application layout
│   ├── page.tsx       # Main application page
│   └── globals.css    # Global styles
├── lib/
│   └── supabase/      # Supabase client and related utilities
├── public/            # Static assets and business logo
├── proxy.ts           # Application request handling, as implemented
├── package.json       # Dependencies and npm scripts
└── README.md
```

The structure may evolve as the application grows.

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project with the required database tables and storage configured

### 1. Clone the repository

After the GitHub repository has been created:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd unity-enterprise-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root. Add the variable names required by the application's Supabase configuration, using your own Supabase project values.

Do not commit `.env.local` or publish secret keys.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
```

## Configuration and Security

- Environment-specific credentials must remain outside version control.
- Configure the necessary environment variables in the deployment platform.
- Apply appropriate Supabase Row Level Security (RLS) policies to database tables.
- Do not expose Supabase service-role keys in client-side code.
- Restrict product-management operations to authorized users as the application evolves.

## Roadmap

Potential future improvements include:

- Secure administrator authentication and authorization
- Product creation, editing, and image management
- Inventory and stock tracking
- Product variants, sizes, and pricing management
- Improved catalog search and filtering
- Automated catalog generation
- Deployment and production monitoring
- Additional customer inquiry and order-management workflows

Roadmap items are proposals and should not be interpreted as completed features.

## Business Context

**Unity Enterprise**  
Bharuch, Gujarat, India

The project focuses on helping a small bag business present its products digitally and make customer inquiries easier to manage.

## License

All rights reserved unless a license is added explicitly by the project owner.