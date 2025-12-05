# Admin Panel Plan for The Vegan Aisle

## Overview
An admin panel to manage The Vegan Aisle platform, including user-contributed content moderation, store management, analytics, and system configuration.

**Note**: This plan assumes authentication is implemented first. See "Authentication Prerequisites" section below.

---

## Authentication Prerequisites 🔐

**Why First**: Authentication is required before building the admin panel because:
- Admin panel needs to identify admins vs regular users
- User-contributed products already reference `userId`
- Foundation for all user-related features

### User Authentication Features

#### Backend Requirements

1. **User Model Updates**:
   - Add `password` field (hashed with bcrypt)
   - Add `role` field: `'user' | 'admin' | 'moderator'` (default: 'user')
   - Keep existing: `email`, `displayName`
   - Add `emailVerified` boolean (future)
   - Add `lastLogin` timestamp (optional)

2. **Authentication Routes** (`/api/auth/*`):
   - `POST /api/auth/signup` - User registration
     - Body: `{ email, password, displayName }`
     - Validation: email format, password strength
     - Hash password with bcrypt
     - Return: JWT token + user info
   - `POST /api/auth/login` - User login
     - Body: `{ email, password }`
     - Verify password
     - Return: JWT token + user info
   - `POST /api/auth/logout` - Logout (optional, client-side token removal)
   - `GET /api/auth/me` - Get current user info
     - Protected route, requires valid JWT
   - `POST /api/auth/refresh` - Refresh JWT token (future)

3. **JWT Token Management**:
   - Generate JWT on login/signup
   - Include: `userId`, `email`, `role` in token payload
   - Token expiration: 7 days (configurable)
   - Secret key in environment variables

4. **Auth Middleware**:
   - `authMiddleware` - Verify JWT token, attach user to request
   - `adminMiddleware` - Check if user has admin role
   - Replace `demoUserMiddleware` with real auth

5. **Password Security**:
   - Use bcrypt for password hashing (10+ rounds)
   - Never return password in API responses
   - Password requirements: min 8 chars (configurable)

#### Frontend Requirements

1. **Auth Pages**:
   - `/signup` - Registration page
     - Form: email, password, confirm password, display name
     - Validation: email format, password match, password strength
     - Error handling
   - `/login` - Login page
     - Form: email, password
     - "Remember me" checkbox (future)
     - "Forgot password" link (future)
     - Error handling

2. **Auth Context/State**:
   - `AuthContext` - Global auth state
   - `useAuth` hook - Access current user, login, logout
   - `useAdmin` hook - Check if user is admin
   - Store JWT token in localStorage or httpOnly cookie

3. **Protected Routes**:
   - `ProtectedRoute` component - Redirect to login if not authenticated
   - `AdminRoute` component - Redirect if not admin
   - Update existing routes to use auth

4. **UI Updates**:
   - Header: Show user name when logged in
   - Header: Login/Signup buttons when logged out
   - Header: Logout button when logged in
   - Header: Admin link when user is admin

#### Implementation Order

**Phase 1: Basic Auth (MVP)**
1. ✅ Update User model (add password, role fields)
2. ✅ Install dependencies (jsonwebtoken, bcrypt, @types packages)
3. ✅ Create auth routes (signup, login)
4. ✅ Create JWT utilities
5. ✅ Create auth middleware
6. ✅ Replace demo user middleware
7. ✅ Create frontend signup/login pages
8. ✅ Create AuthContext
9. ✅ Add protected routes
10. ✅ Update Header component

**Phase 2: Admin Setup**
11. ✅ Create first admin user (script or manual)
12. ✅ Test admin access
13. ✅ Build admin panel (see below)

**Phase 3: Enhanced Auth (Future)**
- Password reset flow
- Email verification
- Social login (Google, etc.)
- Two-factor authentication
- Session management

#### Security Considerations

1. **Password Security**:
   - Hash passwords with bcrypt (never store plaintext)
   - Enforce password strength requirements
   - Rate limit login attempts (prevent brute force)

2. **JWT Security**:
   - Use strong secret key (store in .env)
   - Set reasonable expiration times
   - Consider refresh tokens for long sessions
   - Validate token on every request

3. **Input Validation**:
   - Validate email format
   - Sanitize user inputs
   - Prevent SQL injection (MongoDB handles, but validate)

4. **Rate Limiting**:
   - Limit login attempts per IP
   - Limit signup attempts
   - Prevent abuse

---

## Core Features

### 1. **Dashboard / Analytics** 📊
**Purpose**: Overview of platform health and activity

**Metrics to Display**:
- Total products (API-sourced vs user-contributed)
- Total stores (physical vs online)
- Total users
- Pending product approvals count
- Recent activity feed
- Growth trends (products added, users registered)
- Most popular categories/tags
- Store distribution (by type, region)

**Visualizations**:
- Charts for growth over time
- Pie charts for product sources
- Bar charts for top categories/brands

---

### 2. **Product Moderation** ✅
**Purpose**: Review and manage user-contributed products

**Features**:
- **Pending Queue**: List of products awaiting approval
  - Filter by: date, user, brand, category
  - Sort by: newest, oldest, brand
  - Bulk actions: approve/reject multiple
- **Product Review Page**: 
  - Full product details
  - User info (who submitted)
  - Edit product before approving
  - Approve / Reject / Request Changes buttons
  - Rejection reason field
  - View availability/stores
- **Approved Products**: 
  - List all approved user products
  - Edit/delete approved products
  - Change status back to pending if needed
- **Rejected Products**:
  - View rejection history
  - Restore rejected products if needed

**Actions**:
- Approve → status: 'approved', product appears in search
- Reject → status: 'rejected', reason stored, notify user (future)
- Edit → modify any field before approval
- Delete → permanently remove

---

### 3. **Store Management** 🏪
**Purpose**: Manage all stores (physical and online)

**Features**:
- **Store List**:
  - View all stores (physical, online, brand direct)
  - Filter by: type, region, has coordinates
  - Search by name
  - Sort by: name, type, created date
- **Store Details/Edit**:
  - Edit store information
  - Add/update location coordinates
  - Update website URL
  - View products available at store
  - Delete store (with confirmation)
- **Store Creation**:
  - Manual store creation form
  - Import from Google Places
  - Bulk import (CSV) - future feature

**Actions**:
- Create new store
- Edit existing store
- Delete store (check for products using it first)
- Merge duplicate stores (future)

---

### 4. **User Management** 👥
**Purpose**: Manage users and their contributions

**Features**:
- **User List**:
  - View all users
  - Search by email/name
  - Filter by: contribution count, registration date
  - Sort by: name, contributions, date
- **User Profile**:
  - View user details
  - See all products contributed by user
  - See shopping lists (if applicable)
  - User activity history
  - Admin actions: ban/unban, delete account (future)

**Metrics per User**:
- Products contributed
- Products approved/rejected
- Registration date
- Last activity

---

### 5. **Content Management** 📝
**Purpose**: Manage categories, tags, and other content

**Features**:
- **Categories Management**:
  - View all categories
  - Add new categories
  - Edit/rename categories
  - Merge duplicate categories
  - Delete unused categories
  - See product count per category
- **Tags Management**:
  - View all tags
  - Add new tags
  - Edit/rename tags
  - Merge duplicate tags
  - Delete unused tags
  - See product count per tag
- **Bulk Operations**:
  - Clean up duplicate categories/tags
  - Standardize naming (capitalization, etc.)

---

### 6. **Availability Management** 📍
**Purpose**: View and manage product availability data

**Features**:
- **Availability Overview**:
  - View all availability entries
  - Filter by: product, store, source (user_contribution vs api)
  - See stale/outdated availability
- **Manual Availability**:
  - Add availability for any product
  - Edit existing availability
  - Remove incorrect availability
- **Bulk Operations**:
  - Clean up fake/old availability
  - Export availability data

---

### 7. **System Settings** ⚙️
**Purpose**: Configure platform settings

**Features**:
- **API Configuration**:
  - Google API key status
  - Test API connections
  - API usage stats
- **Moderation Settings**:
  - Auto-approve products (on/off)
  - Require approval for user products (on/off)
  - Default product status
- **Content Settings**:
  - Allowed categories (whitelist)
  - Blocked tags/categories (blacklist)
  - Content guidelines link
- **Export/Import**:
  - Export user products to CSV/JSON
  - Export stores to CSV/JSON
  - Import data (future)

---

## Technical Implementation Plan

### Backend Requirements

1. **Admin Authentication**:
   - Add `role` field to User model: 'user' | 'admin' | 'moderator'
   - Admin middleware to check role
   - Admin-only routes

2. **New Admin Routes** (`/api/admin/*`):
   - `/api/admin/dashboard` - Get dashboard stats
   - `/api/admin/products` - List/filter products (with status)
   - `/api/admin/products/:id/approve` - Approve product
   - `/api/admin/products/:id/reject` - Reject product
   - `/api/admin/products/:id` - Get/edit product
   - `/api/admin/stores` - List/manage stores
   - `/api/admin/users` - List/manage users
   - `/api/admin/categories` - Manage categories
   - `/api/admin/tags` - Manage tags
   - `/api/admin/availability` - Manage availability
   - `/api/admin/settings` - Get/update settings

3. **New Admin Services**:
   - `adminService.ts` - Dashboard stats, bulk operations
   - `moderationService.ts` - Product approval/rejection logic
   - `contentManagementService.ts` - Categories/tags management

### Frontend Requirements

1. **Admin Layout**:
   - Admin sidebar navigation
   - Admin header with user info
   - Protected routes (check admin role)

2. **Admin Screens**:
   - `/admin` - Dashboard
   - `/admin/products` - Product moderation
   - `/admin/products/:id` - Product review
   - `/admin/stores` - Store management
   - `/admin/users` - User management
   - `/admin/categories` - Category management
   - `/admin/tags` - Tag management
   - `/admin/availability` - Availability management
   - `/admin/settings` - System settings

3. **Components**:
   - `AdminLayout` - Layout wrapper
   - `AdminSidebar` - Navigation
   - `ProductModerationQueue` - Pending products list
   - `ProductReviewCard` - Product review UI
   - `StoreManagementTable` - Stores list/edit
   - `UserManagementTable` - Users list
   - `CategoryTagManager` - Categories/tags CRUD
   - `DashboardStats` - Analytics cards/charts

---

## MVP Priority

### Phase 0: Authentication (Prerequisite) 🔐
**Must Have**:
1. ✅ User signup (email, password, display name)
2. ✅ User login (email, password)
3. ✅ JWT token authentication
4. ✅ Protected routes (require auth)
5. ✅ Admin role in User model
6. ✅ Admin middleware

### Phase 1: Admin Panel Core Features 👨‍💼
**Must Have**:
1. ✅ Dashboard with basic stats
2. ✅ Product moderation (approve/reject pending products)
3. ✅ Store management (view/edit/delete stores)
4. ✅ Admin route protection

**Nice to Have** (Phase 2):
5. User management
6. Category/tag management
7. Availability management
8. Advanced analytics/charts

**Future** (Phase 3):
9. Bulk operations
10. Export/import
11. Advanced filtering/search
12. Activity logs/audit trail
13. Password reset
14. Email verification

---

## Security Considerations

1. **Admin Routes Protection**:
   - All `/api/admin/*` routes require admin role
   - Middleware to verify admin status
   - Rate limiting on admin actions

2. **Data Validation**:
   - Validate all admin inputs
   - Sanitize user inputs
   - Prevent SQL injection (MongoDB handles this, but still validate)

3. **Audit Trail** (Future):
   - Log all admin actions
   - Track who made changes
   - Timestamps for all modifications

---

## UI/UX Considerations

1. **Design**:
   - Consistent with main app design (same color scheme)
   - Clear visual hierarchy
   - Responsive design (mobile-friendly)

2. **User Experience**:
   - Quick actions (bulk approve/reject)
   - Keyboard shortcuts for power users
   - Confirmation dialogs for destructive actions
   - Success/error notifications
   - Loading states

3. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

---

## Implementation Order

### Step 1: Authentication (Prerequisite) 🔐
1. Update User model (add password, role)
2. Install auth dependencies (jsonwebtoken, bcrypt)
3. Create auth routes (signup, login)
4. Create JWT utilities and middleware
5. Replace demo user middleware
6. Create frontend auth pages (signup/login)
7. Create AuthContext and protected routes
8. Update Header with auth UI
9. Create first admin user

### Step 2: Admin Panel (After Auth) 👨‍💼
1. **Add Admin Role to User Model** (if not done in Step 1)
2. **Create Admin Middleware**
3. **Build Admin Dashboard (stats)**
4. **Build Product Moderation Queue**
5. **Build Store Management**
6. **Add Admin Routes to Backend**
7. **Create Admin Frontend Layout**
8. **Implement Admin Screens**

---

## Questions to Consider

### Authentication Questions

1. **Where to store JWT tokens?**
   - **Recommendation**: localStorage for MVP (simple), httpOnly cookies for production (more secure)

2. **Token expiration time?**
   - **Recommendation**: 7 days for MVP, with refresh token support later

3. **How to create first admin?**
   - **Recommendation**: Manual database update or script to set first user as admin

4. **Password requirements?**
   - **Recommendation**: Minimum 8 characters for MVP, add complexity requirements later

### Admin Panel Questions

1. Should we auto-approve products or require moderation?
   - **Recommendation**: Start with auto-approve for MVP, add moderation toggle in admin settings

2. Should admins be able to edit API-sourced products?
   - **Recommendation**: No, only user-contributed products should be editable

3. Should we have different admin roles (admin vs moderator)?
   - **Recommendation**: Start with single admin role, add moderator role later if needed

4. How should we handle rejected products?
   - **Recommendation**: Store rejection reason, allow user to resubmit with changes

5. Should admin actions be logged?
   - **Recommendation**: Yes, but can be Phase 2 feature

