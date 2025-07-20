# Replit.md - Cokha Energy Bars E-commerce Application

## Overview

This is a full-stack e-commerce application for Cokha energy bars by Rajsic Foods. The application features a React frontend with Express.js backend, PostgreSQL database with Drizzle ORM, and Razorpay payment integration. The system allows customers to browse products, place orders, and make payments, while also providing contact and newsletter subscription functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom color scheme and dark mode support
- **State Management**: TanStack Query for server state, local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API endpoints
- **Session Management**: Express sessions with PostgreSQL storage
- **Error Handling**: Centralized error middleware with proper HTTP status codes

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless driver for edge compatibility

## Key Components

### Frontend Components
1. **Layout Components**
   - Navigation with cart functionality and mobile responsiveness
   - Floating action buttons for quick purchase and WhatsApp contact
   - Product cards with interactive elements and hover effects

2. **Page Components**
   - Home page with product showcase, contact form, and newsletter signup
   - Checkout page with Stripe payment integration
   - 404 error page for unmatched routes

3. **UI Components**
   - Complete Shadcn/ui component library (buttons, forms, cards, dialogs, etc.)
   - Custom styled components following design system
   - Responsive design patterns for mobile and desktop

### Backend Components
1. **API Routes**
   - `/api/products` - Product listing and individual product retrieval
   - `/api/create-order` - Razorpay order creation
   - `/api/verify-payment` - Razorpay payment verification
   - `/api/orders` - Order creation and management
   - `/api/contacts` - Contact form submissions
   - `/api/newsletter` - Newsletter subscription handling

2. **Storage Layer**
   - Abstract storage interface with memory and database implementations
   - Product management with default product seeding
   - Order lifecycle management with payment status tracking

3. **Database Schema**
   - Products table with pricing, inventory, and metadata
   - Orders table with customer details and payment tracking
   - Contacts table for customer inquiries
   - Newsletters table for email subscriptions

## Data Flow

### Product Browsing
1. Frontend requests products from `/api/products`
2. Backend queries database using Drizzle ORM
3. Products displayed in responsive grid with filtering/sorting capabilities
4. Add to cart functionality updates local state

### Order Processing
1. Customer fills order form with shipping details
2. Frontend validates form data using Zod schemas
3. Order created in database with "pending" status
4. Razorpay order generated with order total
5. Customer completes payment through Razorpay Checkout
6. Payment signature verified and order status updated
7. Success/failure feedback provided to customer

### Contact and Newsletter
1. Form submissions validated on frontend and backend
2. Data stored in respective database tables
3. Immediate feedback provided to users
4. Newsletter emails deduplicated using unique constraints

## External Dependencies

### Payment Processing
- **Razorpay**: Complete payment processing with client-side Checkout
- **Integration**: Server-side order creation, client-side payment, and server-side verification
- **Security**: Environment-based API key management with signature verification

### UI Framework
- **Radix UI**: Accessible component primitives for complex interactions
- **Tailwind CSS**: Utility-first styling with custom design system
- **Lucide Icons**: Comprehensive icon library for consistent visual language

### Development Tools
- **Vite**: Fast development server with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **ESLint/Prettier**: Code formatting and quality enforcement

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds optimized React bundle to `dist/public`
2. **Backend**: ESBuild bundles Node.js server to `dist/index.js`
3. **Database**: Drizzle migrations applied during deployment

### Environment Configuration
- **Development**: Local development with file watching and hot reload
- **Production**: Optimized builds with proper error handling
- **Database**: Environment-based connection strings for different stages

### Hosting Requirements
- Node.js runtime environment
- PostgreSQL database (Neon serverless recommended)
- Environment variables for Stripe keys and database URLs
- Static file serving for built frontend assets

### Key Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `RAZORPAY_KEY_ID`: Razorpay Key ID for API authentication
- `RAZORPAY_KEY_SECRET`: Razorpay Key Secret for server-side operations
- `NODE_ENV`: Environment flag for development/production behavior