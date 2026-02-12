import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Product from './pages/Products'
import Profile from './pages/Profile'
import './App.css'

// Define all products globally
const allProducts = [
  { id: 1, name: 'HOPE-10000', icon: 'fas fa-microscope' },
  { id: 2, name: 'IV POLE', icon: 'fas fa-procedures' },
  { id: 3, name: 'FOOT-PEDAL-V3', icon: 'fas fa-shoe-prints' },
  { id: 4, name: 'FOOT-PEDAL-V4', icon: 'fas fa-shoe-prints' },
  { id: 5, name: 'STANDALONE-LIGHTSOURCE', icon: 'fas fa-lightbulb' },
  { id: 6, name: 'ANT_VIT', icon: 'fas fa-capsules' },
  { id: 7, name: 'SCREWS-M', icon: 'fas fa-cogs' },
  { id: 8, name: 'POWDER-COAT', icon: 'fas fa-paint-roller' },
  { id: 9, name: 'Tools', icon: 'fas fa-tools' }
]

function AppContent() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })
  const navigate = useNavigate()
  const location = useLocation()

  // Show notification
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000)
  }, [])

  useEffect(() => {
    const init = async () => {
      await checkAuthStatus()
      await fetchProducts()
    }
    init()
  }, [])

  const checkAuthStatus = () => {
    const savedUser = localStorage.getItem('stockUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('stockUser')
      }
    }
    setAuthChecked(true)
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      
      // Fetch all products with their parts from Supabase
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (productsError) throw productsError

      // Transform the data to match our application structure
      const transformedProducts = transformProductsData(productsData || [])
      setProducts(transformedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      // Start with empty state
      setProducts(allProducts.map(product => ({ 
        id: product.id, 
        name: product.name, 
        parts: [] 
      })))
    } finally {
      setLoading(false)
    }
  }

  const transformProductsData = (dbData) => {
    const productsMap = {}
    
    // Initialize all products with empty parts
    allProducts.forEach(product => {
      productsMap[product.name] = {
        id: product.id,
        name: product.name,
        parts: []
      }
    })
    
    // Group parts by product name
    dbData.forEach(item => {
      if (productsMap[item.product_name]) {
        productsMap[item.product_name].parts.push({
          id: item.id,
          name: item.part_name,
          partNo: item.part_number,
          quantity: item.quantity || 0,
          vendor: item.vendor,
          isNew: item.is_new || false,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })
      }
    })
    
    return Object.values(productsMap)
  }

  const login = async (email, password) => {
    try {
      console.log('Attempting login for email:', email)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      if (data) {
        // Direct password comparison (plain text for demo)
        if (data.password === password) {
          const userData = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role
          }
          setUser(userData)
          localStorage.setItem('stockUser', JSON.stringify(userData))
          showNotification(`Welcome back, ${data.name}!`, 'success')
          return { success: true }
        } else {
          return { success: false, message: 'Invalid password' }
        }
      } else {
        return { success: false, message: 'User not found' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Login failed. Please try again.' }
    }
  }

  const signup = async (userData) => {
    try {
      console.log('Attempting signup for email:', userData.email)
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email.toLowerCase().trim())
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing user:', checkError)
        throw checkError
      }

      if (existingUser) {
        return { success: false, message: 'User with this email already exists' }
      }

      const newUser = {
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password, // Store plain text for demo
        role: userData.role || 'staff',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      console.log('User created successfully:', data)
      showNotification('Account created successfully! Please login.', 'success')
      return { success: true }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, message: 'Signup failed. Please try again.' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('stockUser')
    showNotification('Logged out successfully', 'info')
    navigate('/login')
  }

  const updateProduct = async (productId, updatedParts) => {
    try {
      // Update local state immediately for better UX
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, parts: updatedParts } : product
      ))

      // Sync with Supabase
      await syncProductWithSupabase(productId, updatedParts)
      showNotification('Product updated successfully', 'success')
      return { success: true }
    } catch (error) {
      console.error('Error updating product:', error)
      showNotification('Failed to update product', 'error')
      return { success: false, message: 'Failed to update product' }
    }
  }

  const syncProductWithSupabase = async (productId, parts) => {
    const product = allProducts.find(p => p.id === productId)
    if (!product) return

    try {
      // Get existing parts for this product
      const { data: existingParts, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('product_name', product.name)

      if (fetchError) throw fetchError

      const currentPartIds = parts.map(part => part.id)
      const partsToDelete = (existingParts || [])
        .filter(part => !currentPartIds.includes(part.id))
        .map(part => part.id)

      // Delete obsolete parts
      if (partsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .in('id', partsToDelete)

        if (deleteError) throw deleteError
      }

      // Update or create parts
      for (const part of parts) {
        const partData = {
          product_name: product.name,
          part_name: part.name,
          part_number: part.partNo,
          quantity: part.quantity,
          vendor: part.vendor,
          is_new: part.isNew || false,
          updated_at: new Date().toISOString()
        }

        const existingPart = (existingParts || []).find(p => p.id === part.id)
        
        if (existingPart) {
          // Update existing part
          const { error: updateError } = await supabase
            .from('products')
            .update(partData)
            .eq('id', part.id)

          if (updateError) throw updateError
        } else {
          // Create new part - let Supabase generate the ID
          const { error: insertError } = await supabase
            .from('products')
            .insert([partData])

          if (insertError) throw insertError
        }
      }

      // Refresh products to get new IDs
      await fetchProducts()
    } catch (error) {
      console.error('Error syncing with Supabase:', error)
      throw error
    }
  }

  const handleNavigation = (path) => {
    navigate(path)
    setIsMobileNavOpen(false)
  }

  // Memoized page content to prevent unnecessary re-renders
  const pageContent = useMemo(() => {
    if (!authChecked) {
      return (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      )
    }

    if (!user && location.pathname !== '/login' && location.pathname !== '/signup') {
      return <Navigate to="/login" replace />
    }

    if (user && (location.pathname === '/login' || location.pathname === '/signup')) {
      return <Navigate to="/dashboard" replace />
    }

    if (loading && location.pathname !== '/login' && location.pathname !== '/signup') {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory data...</p>
        </div>
      )
    }

    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/signup" element={<Signup onSignup={signup} />} />
        <Route path="/dashboard" element={<Dashboard products={products} user={user} allProducts={allProducts} />} />
        <Route path="/products" element={<Product products={products} user={user} onUpdateProduct={updateProduct} allProducts={allProducts} />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }, [authChecked, user, location.pathname, loading, products])

  return (
    <div className="app">
      {/* Notification System */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <i className={`fas ${
            notification.type === 'success' ? 'fa-check-circle' : 
            notification.type === 'error' ? 'fa-exclamation-circle' : 
            'fa-info-circle'
          }`}></i>
          <span>{notification.message}</span>
          <button onClick={() => setNotification({ show: false, message: '', type: '' })}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {user && (
        <>
          {/* Mobile Navigation Overlay */}
          {isMobileNavOpen && (
            <div 
              className="mobile-nav-overlay"
              onClick={() => setIsMobileNavOpen(false)}
            ></div>
          )}
          
          {/* Side Navigation */}
          <div className={`side-navigation ${isMobileNavOpen ? 'mobile-open' : ''}`}>
            <div className="nav-header">
              <div className="nav-brand">
                <i className="fas fa-boxes"></i>
                <h3 className="nav-title">Stock System</h3>
              </div>
              <button 
                className="nav-close-btn"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="nav-links">
              <button 
                onClick={() => handleNavigation('/dashboard')} 
                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              >
                <i className="fas fa-tachometer-alt"></i>
                <span>Dashboard</span>
              </button>
              <button 
                onClick={() => handleNavigation('/products')} 
                className={`nav-link ${location.pathname === '/products' ? 'active' : ''}`}
              >
                <i className="fas fa-cube"></i>
                <span>Products</span>
              </button>
              <button 
                onClick={() => handleNavigation('/profile')} 
                className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </button>
              <button onClick={logout} className="nav-link logout">
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
            
            <div className="user-info">
              <div className="user-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="user-details">
                <strong>{user?.name}</strong>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className={user ? "main-content" : "auth-content"}>
        {/* Mobile Header */}
        {user && (
          <div className="mobile-header">
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="mobile-header-title">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/products' && 'Products'}
              {location.pathname === '/profile' && 'Profile'}
            </div>
            <div className="mobile-user">
              <i className="fas fa-user-circle"></i>
            </div>
          </div>
        )}
        
        {pageContent}
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App