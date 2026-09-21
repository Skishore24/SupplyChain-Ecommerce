import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User as UserIcon, Menu, X, ChevronDown, LogOut, LayoutDashboard, Settings, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export const Header = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-surface/90 backdrop-blur-md border-b border-line shadow-subtle py-3'
            : 'bg-surface border-b border-line py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Left: Mobile Hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-lg tracking-tighter">S</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-ink-primary">SHOPERA</span>
                <span className="text-[9px] uppercase tracking-widest text-ink-muted -mt-1 font-semibold">Studio Edition</span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                location.pathname === '/' ? 'text-accent font-semibold' : 'text-ink-secondary'
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                location.pathname === '/products' ? 'text-accent font-semibold' : 'text-ink-secondary'
              }`}
            >
              Shop
            </Link>
            <Link
              to="/products?sort=newest"
              className="text-sm font-medium text-ink-secondary hover:text-accent transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              to="/products?sort=popular"
              className="text-sm font-medium text-ink-secondary hover:text-accent transition-colors"
            >
              Best Sellers
            </Link>
            <Link
              to="/products?min_price=0&max_price=100"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Deals
            </Link>
          </nav>

          {/* Right: Search, Wishlist, Cart, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors flex items-center gap-2"
              aria-label="Search products"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline text-xs text-ink-muted">Search...</span>
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 rounded-btn text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Profile / Dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-btn hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-accent font-semibold text-xs flex items-center justify-center border border-blue-200">
                    {user?.first_name?.[0] || 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-ink-primary">
                    {user?.first_name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-surface rounded-card border border-line shadow-float py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-line">
                      <p className="text-xs font-semibold text-ink-primary">{user.first_name} {user.last_name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-accent hover:bg-blue-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      to="/profile/orders"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      Orders History
                    </Link>
                    <Link
                      to="/profile/settings"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>

                    <div className="border-t border-line my-1"></div>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-danger hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-btn transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary-hover rounded-btn transition-colors shadow-subtle"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-surface rounded-card-lg border border-line shadow-drawer w-full max-w-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Search Catalog</span>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-full text-ink-muted hover:text-ink-primary hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSearchSubmit} className="mt-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search audio, watches, backpacks, keyboards, lamps..."
                  className="w-full bg-slate-50 border border-line rounded-input pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="text-ink-muted py-1">Popular searches:</span>
              {['Headphones', 'Automatic Watch', 'Waterproof Pack', 'Mechanical Keyboard', 'Studio Display'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    navigate(`/products?search=${encodeURIComponent(tag)}`);
                    setSearchOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-badge bg-slate-100 text-ink-secondary hover:bg-blue-50 hover:text-accent transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-4/5 max-w-xs bg-surface h-full shadow-drawer p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                    S
                  </div>
                  <span className="font-bold text-lg">SHOPERA</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-ink-muted" />
                </button>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <Link to="/" className="text-sm font-medium py-2 border-b border-line/60">Home</Link>
                <Link to="/products" className="text-sm font-medium py-2 border-b border-line/60">All Products</Link>
                <Link to="/products?sort=newest" className="text-sm font-medium py-2 border-b border-line/60">New Arrivals</Link>
                <Link to="/products?sort=popular" className="text-sm font-medium py-2 border-b border-line/60">Best Sellers</Link>
                <Link to="/wishlist" className="text-sm font-medium py-2 border-b border-line/60 flex items-center justify-between">
                  <span>Wishlist</span>
                  {wishlistCount > 0 && <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{wishlistCount}</span>}
                </Link>
                <Link to="/cart" className="text-sm font-medium py-2 border-b border-line/60 flex items-center justify-between">
                  <span>Cart</span>
                  {cartCount > 0 && <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>}
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-bold text-accent py-2 border-b border-line/60">
                    Admin Portal
                  </Link>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-line">
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="w-full py-2.5 text-sm font-semibold text-danger border border-danger/20 rounded-btn hover:bg-red-50"
                >
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="w-full py-2 text-center text-sm font-semibold border border-line rounded-btn">
                    Sign In
                  </Link>
                  <Link to="/register" className="w-full py-2 text-center text-sm font-semibold bg-primary text-white rounded-btn">
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
