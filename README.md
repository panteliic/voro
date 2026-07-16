# VORO

<div align="center">

<img src="./client/apps/customer-app/public/logo.svg" width="140" alt="VORO Logo"/>

### Food Delivery Platform

Modern food delivery ecosystem consisting of three independent client applications and a centralized backend service.

</div>

---

## Overview

VORO is a full-stack food delivery platform designed to connect customers, restaurants, and delivery drivers through a unified system.

The platform consists of:

- Customer Application
- Restaurant Application
- Driver Application
- REST API Backend
- PostgreSQL Database
- Real-time communication services

The system enables customers to browse restaurants, place orders, track deliveries, restaurants to manage incoming orders, and drivers to efficiently handle deliveries.

---

## Architecture

```text
┌──────────────────────────┐
│       Customer App       │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│         API Server       │
└────────────┬─────────────┘
             │
 ┌───────────┼────────────┐
 │           │            │
 ▼           ▼            ▼
Restaurant  Driver  PostgreSQL
   App       App     Database
```

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Redux Toolkit
- Shadcn UI
- React Router

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- JWT Authentication
- Nodemailer

### Database

- PostgreSQL
- Redis

### DevOps

- Docker
- Docker Compose

---

## Applications

### Customer App

Features:

- User registration and login
- Restaurant browsing
- Food ordering
- Order history
- Profile management
- Address management
- Real-time order tracking

---

### Restaurant App

Features:

- Restaurant dashboard
- Order management
- Menu management
- Order status updates
- Business analytics

---

### Driver App

Features:

- Delivery management
- Order acceptance
- Route tracking
- Delivery status updates
- Earnings overview

---

## Backend Features

- JWT Authentication
- Role-based authorization
- Email verification
- Password reset
- Order processing
- Real-time notifications
- REST API architecture
- PostgreSQL integration

---

## Project Structure

```text
voro/
│
├── client/
│   ├── apps/
│   │   ├── customer-app/
│   │   ├── restaurant-app/
│   │   └── driver-app/
│
├── server/
│   ├── src/
│   ├── database/
│   ├── routes/
│   ├── services/
│   └── middleware/
│
└── docker-compose.yml
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/voro.git
cd voro
```

### Backend

```bash
cd server
npm install
npm run dev
```

### Demo podaci za testiranje

Za lokalni razvoj možeš da ubaciš kompletan demo set podataka:

```bash
cd server
npm run seed:demo
```

Ova eksplicitna seed migracija dodaje 50 restorana iz Beograda, 150 stavki menija,
20 kupaca, 20 dostavljača i 160 porudžbina. Podaci o nalozima, cenama i menijima
su test podaci; imena restorana i kategorije hrane su preuzeti iz javnih dostavnih
ponuda.

Svi demo nalozi koriste lozinku `password123`:

- Admin: `admin@seed.voro.test`
- Restaurant nalozi: npr. `restaurant.pizzeria-trg@voro.test`
- Dostavljači: npr. `marko.jovanovic@driver.voro.test`
- Kupci: `customer.*@seed.voro.test`

`seed:demo` se namerno ne pokreće uz običnu komandu `npm run migrate`, pa demo
podaci ne mogu slučajno da se ubace u produkcionu bazu.

### Customer Application

```bash
cd client/apps/customer-app
npm install
npm run dev
```

### Restaurant Application

```bash
cd client/apps/restaurant-app
npm install
npm run dev
```

### Driver Application

```bash
cd client/apps/driver-app
npm install
npm run dev
```

---

## Core Modules

- Authentication & Authorization
- Restaurant Management
- Menu Management
- Order Management
- Delivery Management
- User Management
- Notification System
- Real-Time Communication

---

## Future Enhancements

- Live GPS Tracking
- Payment Gateway Integration
- Recommendation Engine
- Loyalty Program
- Advanced Analytics
- Mobile Applications

---

## Author

**Nikola Pantelić**

Software Engineering Student

Faculty of Information Systems and Technologies

---

## License

This project was developed for educational and academic purposes.
