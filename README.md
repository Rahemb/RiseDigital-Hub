# Rise Digital Hub

**Rise Digital Hub** is a self-hosted CRM and business management platform developed for Rise Digital, a digital agency providing websites, SEO, and digital solutions for businesses.

The platform centralizes client information, lead discovery, payments, and daily business operations in one streamlined dashboard.

## Features

### Client Management
- Create, edit, archive, and manage client profiles.
- Track client statuses, including leads and active clients.
- Store contact information, notes, and activity history.
- Search and filter clients.

### Lead Finder
- Discover Norwegian businesses using the Brønnøysund Register Centre API.
- Search for businesses on Google.
- Save potential customers for later.
- Track lead statuses, notes, and follow-up dates.
- Convert discovered businesses directly into CRM clients.

### Payments & Financial Tracking
- Register and manage client payments.
- Track payment statuses and recurring payments.
- View financial summaries.

### Dashboard
- Overview of clients and business activity.
- Quick access to essential management tools.
- Light and dark mode.

### Security & Data
- Authentication and login protection.
- Local SQLite database with Prisma ORM.
- Persistent client and business records.
- Backup and data protection functionality.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack application framework |
| TypeScript | Application development |
| React | User interface |
| Prisma | Database ORM |
| SQLite | Local database |
| Node.js | Runtime environment |

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

2. Install dependencies:

```bash
npm install
```

3. Configure the required environment variables according to the project's environment configuration.

4. Initialize the database and create an owner account using the setup scripts provided in `package.json`.

5. Start the application:

```bash
npm start
```

Open http://localhost:3000 in your browser.

**Note:** A production build may be required before running `npm start`. For local development, use the project's development script.

## Project Structure

The application separates user interface components, business logic, database operations, and API functionality using the Next.js architecture.

## Deployment

Rise Digital Hub is currently designed for local, self-hosted use.

Public deployment requires additional configuration, security review, and an appropriate database and hosting environment.

## Project Status

**Active Development — Local Use**

The core CRM, Lead Finder, client management, and payment tracking functionality has been implemented and tested.

## License

Proprietary software developed for Rise Digital. All rights reserved.

---

Developed by **Rise Digital**

Website: https://risedigital.no
