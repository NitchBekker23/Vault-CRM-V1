# Security Implementation - The Vault

## Multi-Layer Security Architecture

### 1. Authentication & Session Management
- **OpenID Connect Integration**: Replit Auth with automatic token refresh
- **Session Storage**: PostgreSQL-based session persistence with TTL
- **Token Management**: Access/refresh token handling with expiration checks
- **Multi-domain Support**: Configurable authentication across environments

### 2. Authorization & Access Control
- **Role-Based Access Control (RBAC)**: Admin and user role separation
- **Resource Ownership**: Users can only access their own data unless admin
- **Protected Endpoints**: Middleware validates authentication on sensitive routes
- **Activity Auditing**: Complete action logging with user context

### 3. Row Level Security (RLS) - Supabase
```sql
-- Database-level security policies:
- Users can only read/update their own profiles
- Admins have full user management access
- Inventory items restricted by creator ownership
- Activity logs filtered by user context
- Wishlist items private to requestor
- Account requests visible only to admins
```

### 4. Input Validation & Sanitization
- **Zod Schema Validation**: Type-safe input validation
- **XSS Protection**: Request sanitization middleware
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **File Upload Security**: Multer with file type restrictions

### 5. Rate Limiting & DDoS Protection
- **Per-User Rate Limiting**: Request throttling by user ID
- **IP-Based Fallback**: Rate limiting for unauthenticated requests
- **Configurable Windows**: Adjustable rate limits per endpoint

### 6. Password & Token Security
- **bcrypt Hashing**: Industry-standard password encryption
- **Two-Factor Authentication**: TOTP code generation and validation
- **Token Expiration**: Time-based token invalidation
- **Secure Token Storage**: Database-stored tokens with cleanup

### 7. Data Protection
- **HTTPS Enforcement**: SSL/TLS for all communications
- **Secure Cookies**: HttpOnly, Secure, SameSite cookie settings
- **Connection Encryption**: SSL database connections
- **Environment Variable Protection**: Sensitive data in environment secrets

### 8. API Security
- **Authentication Headers**: Bearer token validation
- **CORS Configuration**: Restricted cross-origin requests
- **Request Validation**: Schema-based input checking
- **Error Handling**: Secure error responses without data leakage

### 9. File Upload Security
- **Type Validation**: Restricted file types and extensions
- **Size Limits**: Maximum file size enforcement
- **Path Traversal Prevention**: Secure file naming and storage
- **Image Optimization**: Automatic image processing and validation

### 10. Audit & Monitoring
- **Activity Logging**: Comprehensive user action tracking
- **IP Address Recording**: Request origin tracking
- **User Agent Logging**: Client identification
- **Timestamp Tracking**: Precise action timing

## Security Middleware Implementation

### Authentication Middleware
```typescript
isAuthenticated: Validates session and token expiration
requireRole: Role-based access control
addUserContext: Injects user data into requests
```

### Security Middleware
```typescript
requireOwnership: Resource ownership validation
validateInput: Input sanitization and validation
rateLimit: Request throttling per user
logActivity: Audit trail creation
```

## Deployment Security Checklist

### Environment Variables
- [ ] SESSION_SECRET configured
- [ ] Database credentials secured
- [ ] API keys in environment secrets
- [ ] HTTPS certificates configured

### Database Security
- [ ] RLS policies applied
- [ ] User permissions configured
- [ ] Connection encryption enabled
- [ ] Regular backup verification

### Application Security
- [ ] Rate limiting active
- [ ] Input validation enabled
- [ ] Activity logging functional
- [ ] Error handling secure

## Security Best Practices Applied

1. **Principle of Least Privilege**: Users access only necessary resources
2. **Defense in Depth**: Multiple security layers at application and database levels
3. **Fail Secure**: Default deny policies with explicit allow rules
4. **Audit Trail**: Complete logging of user actions
5. **Data Encryption**: At rest and in transit protection
6. **Regular Token Rotation**: Automatic session and token refresh
7. **Input Validation**: Client and server-side validation
8. **Secure Defaults**: Security-first configuration settings

## Monitoring & Alerts

- User authentication failures tracked
- Suspicious activity patterns logged
- Rate limit violations recorded
- Database access attempts audited
- File upload activities monitored

The security implementation provides enterprise-grade protection suitable for production inventory management systems handling sensitive business data.