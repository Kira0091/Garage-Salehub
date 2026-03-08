# GarageSaleHub 🏷️
### The Digital Marketplace Revolution
> Presented by Group 11 | March 2026

A web-based e-commerce platform for buying and selling second-hand household items.

---

## 📁 Project Structure

```
garagesalehub/
├── backend/               # Python Flask REST API
│   ├── app.py             # Flask app entry point
│   ├── database.py        # SQLAlchemy models (User, Product, Order, Message, etc.)
│   ├── seed.py            # Seed script for demo data
│   ├── requirements.txt   # Python dependencies
│   └── routes/
│       ├── auth.py        # Login, Register, Profile
│       ├── products.py    # CRUD + image upload + categories
│       ├── orders.py      # Orders + simulated payment + delivery
│       ├── chat.py        # Messaging between users/admin
│       ├── admin.py       # Admin review, approval, dashboard
│       └── users.py       # User lookup
│
└── frontend/              # React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx          # Routes + providers
        ├── index.css        # Global styles (red/black brand)
        ├── services/
        │   └── api.js       # All API calls
        ├── context/
        │   ├── AuthContext.jsx
        │   └── CartContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Footer.jsx
        │   ├── ProductCard.jsx
        │   └── Toast.jsx
        └── pages/
            ├── HomePage.jsx
            ├── ShopPage.jsx
            ├── ProductDetailPage.jsx
            ├── CartPage.jsx
            ├── CheckoutPage.jsx    # Simulated payment (COD/GCash/Card/Bank)
            ├── SellPage.jsx        # Submit item for review
            ├── MyProductsPage.jsx  # Track submission status
            ├── OrdersPage.jsx      # Simulated delivery tracking
            ├── ChatPage.jsx        # Buyer-seller messaging
            ├── AdminPage.jsx       # Dashboard, review, approve/reject, orders
            ├── ProfilePage.jsx
            └── AuthPages.jsx       # Login + Register
```

---

## 🚀 Setup & Run

### Backend (Python Flask)

```bash
cd garagesalehub/backend

# Install dependencies
pip install -r requirements.txt

# Seed the database with demo data
python seed.py

# Run the server
python app.py
# → Runs on http://localhost:5000
```

**Demo credentials (after seeding):**
| Role  | Email                        | Password  |
|-------|------------------------------|-----------|
| Admin | admin@garagesalehub.com      | admin123  |
| User  | user@garagesalehub.com       | user123   |

---

### Frontend (React + Vite)

```bash
cd garagesalehub/frontend

# Install dependencies
npm install

# Run dev server
npm run dev
# → Runs on http://localhost:3000
```

---

## ✅ Features Implemented

### User Features
- ✅ Register / Login / Profile management
- ✅ Browse and search approved products
- ✅ Filter by category
- ✅ Product detail with image gallery
- ✅ Add to cart, update quantity, remove
- ✅ Submit items for resale (with photo upload + guidelines)
- ✅ Track submission status (Pending/Approved/Rejected/Sold)
- ✅ Chat with seller/admin about a product
- ✅ Checkout with simulated payment (COD, GCash, Card, Bank Transfer)
- ✅ Order history with delivery status tracking
- ✅ Cancel orders (pending/processing stage)

### Admin Features
- ✅ Dashboard with stats (users, products, revenue, orders)
- ✅ Review pending submissions with images
- ✅ Approve with price negotiation (set final selling price)
- ✅ Reject with reason (sent back to seller)
- ✅ Manage all orders + update delivery status
- ✅ View all users and their submission counts

### System Features
- ✅ JWT authentication
- ✅ Image upload & serving
- ✅ Simulated payment processing (order marked as paid)
- ✅ Simulated delivery tracking (admin manually updates status)
- ✅ Auto-generated tracking numbers
- ✅ Stock management (auto-set to Sold when stock = 0)
- ✅ Stock restored on order cancellation
- ✅ User-generated product count tracking

---

## ⚠️ Known Limitations (by design)
- Payment is **simulated** — no real money charged
- Delivery tracking is **simulated** — admin manually updates status
- Seller payouts are **manual** outside the platform
- No real-time WebSocket chat (polling-based)
