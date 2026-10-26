# Enterprise Node.js Application with TypeScript

A production-ready Node.js application with enterprise-level architecture, security, and best practices. Built with TypeScript, Express.js, Sequelize ORM, and PostgreSQL.

## Features

- **TypeScript** - Full type safety and modern JavaScript features
- **Express.js** - Fast, unopinionated web framework
- **Sequelize ORM** - PostgreSQL integration with migrations and seeders
- **Security** - Helmet, CORS, rate limiting
- **Logging** - Winston with structured logging
- **Validation** - Express-validator with type-safe validation
- **Testing** - Jest with Supertest and TypeScript support
- **Code Quality** - ESLint and Prettier with TypeScript rules
- **Error Handling** - Centralized error handling with proper types
- **Health Checks** - Built-in health monitoring
- **Docker** - Container support with TypeScript build
- **Environment Config** - Dotenv configuration with type safety

## Project Structure

```
├── src/
│   ├── controllers/     # Route controllers (TypeScript)
│   ├── middleware/      # Custom middleware (TypeScript)
│   ├── models/         # Sequelize models (TypeScript)
│   ├── routes/         # API routes (TypeScript)
│   ├── services/       # Business logic (TypeScript)
│   ├── utils/          # Utility functions (TypeScript)
│   ├── config/         # Database configuration (TypeScript)
│   ├── types/          # TypeScript type definitions
│   ├── app.ts          # Express app configuration
│   └── server.ts       # Server entry point
├── dist/               # Compiled JavaScript (generated)
├── database/
│   ├── migrations/     # Database migrations
│   └── seeders/        # Database seeders
├── tests/              # Test files (TypeScript)
├── config/             # Configuration files
├── logs/               # Log files (created automatically)
├── tsconfig.json       # TypeScript configuration
├── nodemon.json        # Nodemon configuration
└── Dockerfile          # Docker configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 12.0
- TypeScript knowledge recommended

### Installation

1. Clone the repository

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up PostgreSQL database:

   ```bash
   # Create databases
   createdb taskify_dev
   createdb taskify_test
   ```

4. Copy environment variables:

   ```bash
   copy .env.example .env
   ```

5. Update the `.env` file with your database credentials

6. Run database migrations:

   ```bash
   npm run db:migrate
   ```

7. (Optional) Seed the database with sample data:

   ```bash
   npm run db:seed
   ```

8. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## Available Scripts

### Development

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server (requires build)
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Compile TypeScript in watch mode

### Testing

- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Code Quality

- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Database

- `npm run db:create` - Create database
- `npm run db:drop` - Drop database
- `npm run db:migrate` - Run migrations
- `npm run db:migrate:undo` - Undo last migration
- `npm run db:seed` - Run all seeders
- `npm run db:seed:undo` - Undo all seeders

## TypeScript Features

### Type Safety

- Strict TypeScript configuration with comprehensive type checking
- Custom type definitions for API responses and database models
- Type-safe request/response handling
- Proper error typing and handling

### Path Mapping

The project uses TypeScript path mapping for cleaner imports:

```typescript
import { UserAttributes } from '@/types';
import userService from '@/services/userService';
```

### Type Definitions

- `UserAttributes` - Complete user object type
- `UserCreationAttributes` - User creation payload type
- `ApiResponse<T>` - Standardized API response type
- `PaginatedResponse<T>` - Paginated API response type

## API Endpoints

### Health Check

- `GET /health` - Application health status

### Users API

- `GET /api/v1/users` - Get all users (supports pagination)
  - Query params: `page`, `limit`, `isActive`
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (hard delete)
- `PATCH /api/v1/users/:id/deactivate` - Deactivate user (soft delete)

### Example API Usage

```bash
# Get all users with pagination
curl "http://localhost:3000/api/v1/users?page=1&limit=10"

# Create a new user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Get user by ID
curl http://localhost:3000/api/v1/users/{user-id}
```

## Database Schema

### Users Table

- `id` (UUID, Primary Key)
- `name` (String, Required)
- `email` (String, Required, Unique)
- `is_active` (Boolean, Default: true)
- `last_login_at` (Date, Nullable)
- `created_at` (Date)
- `updated_at` (Date)

## Docker

Build and run with Docker:

```bash
npm run docker:build
npm run docker:run
```

The Docker build process includes TypeScript compilation.

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:

- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `SESSION_SECRET` - Secret for session encryption
- `JWT_SECRET` - Secret for JWT access tokens
- `JWT_REFRESH_SECRET` - Secret for JWT refresh tokens

## Development Workflow

1. **Write TypeScript code** with full type safety
2. **Run type checking** with `npm run type-check`
3. **Test your changes** with `npm test`
4. **Lint and format** with `npm run lint:fix` and `npm run format`
5. **Build for production** with `npm run build`

## Contributing

1. Follow the existing code style and TypeScript patterns
2. Write tests for new features with proper typing
3. Run type checking, linting, and tests before committing
4. Use conventional commit messages
5. Create migrations for database changes
6. Maintain type definitions for new features

## License

MIT
