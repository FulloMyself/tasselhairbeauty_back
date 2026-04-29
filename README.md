# Tassel Hair & Beauty Studio - Backend API

A comprehensive Node.js/Express REST API for managing salon operations, customer bookings, product sales, and staff management.

## Features

✨ **Complete Salon Management System**
- 🔐 JWT-based authentication with role-based access control
- 💇 Service booking system with availability management
- 🛍️ Product catalog and inventory management
- 💳 PayFast payment gateway integration
- 📱 WhatsApp notifications via Twilio
- 📧 Email notifications
- 👥 Multi-role user system (Admin, Staff, Customer)
- 📊 Staff performance tracking and analytics
- 💰 Payroll management
- 📋 Leave request management

## Tech Stack

- **Runtime**: Node.js 14+
- **Framework**: Express.js 4.x
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator & Joi
- **Payments**: PayFast API
- **Notifications**: Twilio, Nodemailer
- **Security**: Helmet, CORS, bcryptjs

## Project Structure

```
backend/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   ├── payfast.js       # PayFast configuration
│   └── email.js         # Email service setup
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Service.js
│   ├── Product.js
│   ├── Booking.js
│   ├── Order.js
│   ├── Payment.js
│   ├── LeaveRequest.js
│   ├── Payroll.js
│   ├── StaffPerformance.js
│   └── CustomerAnalytics.js
├── controllers/         # Route handlers
│   ├── authController.js
│   ├── userController.js
│   └── ...
├── routes/              # API routes
│   ├── auth.js
│   ├── services.js
│   ├── products.js
│   └── ...
├── middleware/          # Custom middleware
│   ├── auth.js          # JWT verification
│   ├── authorization.js # Role-based access
│   ├── errorHandler.js
│   └── validation.js
├── utils/               # Utility functions
│   ├── jwt.js
│   ├── validators.js
│   ├── payfast.js
│   ├── whatsapp.js
│   └── email.js
├── server.js            # Express app entry point
└── package.json
```

## Installation

### Prerequisites
- Node.js v14.0.0 or higher
- npm v6.0.0 or higher
- MongoDB v4.4 or higher

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-username/tassel-hair-beauty.git
cd tassel-hair-beauty/backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Configure environment variables (edit .env)
nano .env

# 5. Start MongoDB
mongod

# 6. Run development server
npm run dev
```

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/tassel_hair_beauty

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=30d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@tasselhairandbeauty.co.za

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token

### Services
- `GET /api/services` - List all services
- `GET /api/services/:id` - Get service details
- `GET /api/services/:id/availability` - Check availability
- `POST /api/admin/services` - Create service (Admin)
- `PUT /api/admin/services/:id` - Update service (Admin)
- `DELETE /api/admin/services/:id` - Delete service (Admin)

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/admin/products` - Create product (Admin)
- `PUT /api/admin/products/:id` - Update product (Admin)
- `DELETE /api/admin/products/:id` - Delete product (Admin)

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/admin/orders/:id` - Update order status (Admin)

### Payments
- `POST /api/payments/payfast` - Create PayFast payment
- `GET /api/payments/:id` - Get payment details

### Staff
- `GET /api/staff/dashboard` - Staff dashboard
- `POST /api/staff/leave-request` - Submit leave request
- `GET /api/staff/performance` - Performance metrics
- `GET /api/staff/payroll` - Payroll records

### Admin
- `POST /api/admin/users/create-staff` - Create staff account
- `GET /api/admin/users` - List all users
- `GET /api/admin/leave-requests` - All leave requests
- `PUT /api/admin/leave-requests/:id` - Approve/reject leave
- `GET /api/admin/analytics` - Business analytics

**Full documentation**: See `../documentation/API_DOCUMENTATION.md`

## Development

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Code Style

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Database Seeding

```bash
# Seed sample data
npm run seed

# Reset database
npm run reset-db
```

## Scripts

```bash
npm run dev          # Start development server with auto-reload
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Watch tests
npm run lint         # Check code style
npm run format       # Format code
npm run seed         # Seed database
npm run reset-db     # Reset database
```

## Authentication Flow

1. User registers/logs in with email and password
2. Backend validates credentials and issues JWT token
3. Token stored in secure HTTP-only cookie and localStorage
4. Client includes token in Authorization header for protected requests
5. Backend middleware verifies token and extracts user info
6. Response returned with user data or error

## User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full system control, user management, analytics |
| **Staff** | View own bookings, performance, payroll, submit leave |
| **Customer** | Browse products/services, make purchases, book appointments |

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Database Models

See `../documentation/DATABASE_SCHEMA.md` for detailed schema documentation.

## Security

- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Rate limiting
- ✅ SQL injection prevention (using Mongoose)
- ✅ XSS protection

## Performance

- Database indexing on frequently queried fields
- Query optimization with lean() for read-only queries
- Pagination for large datasets
- Compression middleware
- Caching strategies (Redis ready)
- Connection pooling

## Deployment

See `../documentation/DEPLOYMENT.md` for production deployment guide.

Quick deployment checklist:
- [ ] Set all environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Set up MongoDB Atlas
- [ ] Configure PayFast for production
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up automated tests in CI/CD

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Monitoring & Logging

- Application logs: PM2 logs
- Error tracking: Sentry integration (optional)
- Performance monitoring: CloudWatch/Datadog
- Database monitoring: MongoDB Atlas dashboards

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version

# Test connection
mongo "mongodb://localhost:27017/tassel_hair_beauty"
```

### JWT Token Issues
```bash
# Verify token is being sent correctly
# Check Authorization header: Bearer <token>
# Verify JWT_SECRET is correct
```

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check existing issues on GitHub
- Create new issue with detailed description
- Email: support@tasselhairandbeauty.co.za

## Roadmap

- [ ] Phase 1: Core authentication and user management
- [ ] Phase 2: Products and services management
- [ ] Phase 3: Payment gateway integration
- [ ] Phase 4: Advanced features (analytics, payroll)
- [ ] Phase 5: Mobile app
- [ ] Phase 6: AI-powered recommendations

## Changelog

### v1.0.0 (2026-04-22)
- Initial project setup
- Database models created
- Authentication middleware implemented
- Basic API structure

---

**Created**: April 2026
**Last Updated**: April 2026
**Maintainer**: Your Team
