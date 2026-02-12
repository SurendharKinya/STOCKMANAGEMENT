import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const Product = ({ products, user, onUpdateProduct, allProducts }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })
  const [loadingStates, setLoadingStates] = useState({})
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [showEditPopup, setShowEditPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [currentPart, setCurrentPart] = useState(null)
  const [newPart, setNewPart] = useState({ name: '', partNo: '', quantity: 0, vendor: '' })
  const [editPart, setEditPart] = useState({ name: '', partNo: '', quantity: 0, vendor: '' })
  const [partToDelete, setPartToDelete] = useState(null)

  const location = useLocation()

  // Initialize
  useEffect(() => {
    if (location.state) {
      setSelectedProduct(location.state.filteredProduct || 'all')
      setStockFilter(location.state.filterType || 'all')
    }
  }, [location.state])

  // Show alert with auto-hide
  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000)
  }, [])

  // Memoized filtered products for performance
  const filteredProducts = useMemo(() => 
    allProducts.filter(product => {
      if (selectedProduct === 'all') return true
      return product.name === selectedProduct
    }), [allProducts, selectedProduct]
  )

  // Memoized filtered parts for each product
  const getFilteredParts = useCallback((parts) => {
    return parts.filter(part => {
      const matchesSearch = part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          part.partNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          part.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesStock = true
      if (stockFilter === 'outOfStock') {
        matchesStock = part.quantity === 0
      } else if (stockFilter === 'lowStock') {
        matchesStock = part.quantity > 0 && part.quantity < 5
      } else if (stockFilter === 'inStock') {
        matchesStock = part.quantity > 0
      } else if (stockFilter === 'incomingStock') {
        matchesStock = part.isNew === true
      }
      
      return matchesSearch && matchesStock
    })
  }, [searchTerm, stockFilter])

  // Check for duplicate part numbers
  const checkDuplicatePartNo = useCallback((productId, partNo, excludePartId = null) => {
    const product = products.find(p => p.id === productId)
    if (!product) return false
    
    return product.parts.some(part => 
      part.partNo.toLowerCase() === partNo.toLowerCase() && part.id !== excludePartId
    )
  }, [products])

  // Open Add Part Popup
  const openAddPopup = (product) => {
    setCurrentProduct(product)
    setNewPart({ name: '', partNo: '', quantity: 0, vendor: '' })
    setShowAddPopup(true)
  }

  // Open Edit Part Popup
  const openEditPopup = (product, part) => {
    setCurrentProduct(product)
    setCurrentPart(part)
    setEditPart({ ...part })
    setShowEditPopup(true)
  }

  // Open Delete Confirmation Popup
  const openDeletePopup = (product, part) => {
    setCurrentProduct(product)
    setPartToDelete(part)
    setShowDeletePopup(true)
  }

  // Close all popups
  const closePopups = () => {
    setShowAddPopup(false)
    setShowEditPopup(false)
    setShowDeletePopup(false)
    setCurrentProduct(null)
    setCurrentPart(null)
    setPartToDelete(null)
  }

  // Add Part
  const handleAddPart = async () => {
    if (!currentProduct) return
    
    // Validation
    if (!newPart.name.trim() || !newPart.partNo.trim() || !newPart.vendor.trim()) {
      showAlert('Please fill all required fields')
      return
    }

    if (newPart.quantity < 0) {
      showAlert('Quantity cannot be negative')
      return
    }

    // Check for duplicate partNo
    if (checkDuplicatePartNo(currentProduct.id, newPart.partNo)) {
      showAlert(`Part with Part No "${newPart.partNo}" already exists in this product`)
      return
    }

    setLoadingStates(prev => ({ ...prev, [`add-${currentProduct.id}`]: true }))

    try {
      const product = products.find(p => p.id === currentProduct.id) || { 
        id: currentProduct.id, 
        name: currentProduct.name, 
        parts: [] 
      }
      
      const partToAdd = {
        ...newPart,
        name: newPart.name.trim(),
        partNo: newPart.partNo.trim(),
        vendor: newPart.vendor.trim(),
        quantity: parseInt(newPart.quantity) || 0,
        id: Date.now().toString(), // Temporary ID
        createdAt: new Date().toISOString(),
        isNew: true
      }

      const updatedParts = [...product.parts, partToAdd]
      const result = await onUpdateProduct(currentProduct.id, updatedParts)
      
      if (result.success) {
        showAlert('Part added successfully!', 'success')
        closePopups()
      } else {
        showAlert(result.message || 'Failed to add part')
      }
    } catch (error) {
      showAlert('Error adding part. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, [`add-${currentProduct.id}`]: false }))
    }
  }

  // Edit Part
  const handleEditPart = async () => {
    if (!currentProduct || !currentPart) return

    // Validation
    if (!editPart.name.trim() || !editPart.partNo.trim() || !editPart.vendor.trim()) {
      showAlert('Please fill all required fields')
      return
    }

    if (editPart.quantity < 0) {
      showAlert('Quantity cannot be negative')
      return
    }

    // Check for duplicate partNo (excluding current part)
    if (checkDuplicatePartNo(currentProduct.id, editPart.partNo, currentPart.id)) {
      showAlert(`Part with Part No "${editPart.partNo}" already exists in this product`)
      return
    }

    setLoadingStates(prev => ({ ...prev, [`edit-${currentPart.id}`]: true }))

    try {
      const product = products.find(p => p.id === currentProduct.id)
      if (!product) return
      
      const updatedPartData = {
        ...editPart,
        name: editPart.name.trim(),
        partNo: editPart.partNo.trim(),
        vendor: editPart.vendor.trim(),
        quantity: parseInt(editPart.quantity) || 0,
        updatedAt: new Date().toISOString(),
        isNew: false
      }

      const updatedParts = product.parts.map(p => 
        p.id === currentPart.id ? { ...p, ...updatedPartData } : p
      )
      
      const result = await onUpdateProduct(currentProduct.id, updatedParts)
      
      if (result.success) {
        showAlert('Part updated successfully!', 'success')
        closePopups()
      } else {
        showAlert(result.message || 'Failed to update part')
      }
    } catch (error) {
      showAlert('Error updating part. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, [`edit-${currentPart.id}`]: false }))
    }
  }

  // Delete Part
  const handleDeletePart = async () => {
    if (!currentProduct || !partToDelete) return

    setLoadingStates(prev => ({ ...prev, [`delete-${partToDelete.id}`]: true }))

    try {
      const product = products.find(p => p.id === currentProduct.id)
      if (!product) return
      
      const updatedParts = product.parts.filter(p => p.id !== partToDelete.id)
      const result = await onUpdateProduct(currentProduct.id, updatedParts)
      
      if (result.success) {
        showAlert('Part deleted successfully!', 'success')
        closePopups()
      } else {
        showAlert(result.message || 'Failed to delete part')
      }
    } catch (error) {
      showAlert('Error deleting part. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, [`delete-${partToDelete.id}`]: false }))
    }
  }

  // Quick actions for faster operations
  const handleQuickQuantityUpdate = async (productId, partId, newQuantity) => {
    if (newQuantity < 0) return

    setLoadingStates(prev => ({ ...prev, [`quick-${partId}`]: true }))

    try {
      const product = products.find(p => p.id === productId)
      if (!product) return
      
      const updatedParts = product.parts.map(p => 
        p.id === partId ? { ...p, quantity: newQuantity, updatedAt: new Date().toISOString() } : p
      )
      
      await onUpdateProduct(productId, updatedParts)
    } catch (error) {
      showAlert('Error updating quantity')
    } finally {
      setLoadingStates(prev => ({ ...prev, [`quick-${partId}`]: false }))
    }
  }

  // Get stock status
  const getStockStatus = useCallback((quantity, isNew) => {
    if (isNew) return 'new'
    if (quantity === 0) return 'out-of-stock'
    if (quantity < 5) return 'low-stock'
    return 'in-stock'
  }, [])

  // Clear search term
  const clearSearch = () => {
    setSearchTerm('')
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <div className="header-content">
          <h1><i className="fas fa-cube"></i> Products Management</h1>
          <p>Manage all product parts and inventory</p>
        </div>
      </div>

      {/* Alert Notification */}
      {alert.show && (
        <div className={`alert alert-${alert.type}`}>
          <i className={`fas ${
            alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
          }`}></i>
          {alert.message}
        </div>
      )}

      {/* Add Part Popup */}
      {showAddPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3><i className="fas fa-plus-circle"></i> Add New Part to {currentProduct?.name}</h3>
              <button className="popup-close" onClick={closePopups}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="popup-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Part Name *</label>
                  <input
                    type="text"
                    value={newPart.name}
                    onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter part name"
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Part Number *</label>
                  <input
                    type="text"
                    value={newPart.partNo}
                    onChange={(e) => setNewPart(prev => ({ ...prev, partNo: e.target.value }))}
                    placeholder="Enter part number"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart(prev => ({ ...prev, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    placeholder="Enter quantity"
                    className="form-input"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor *</label>
                  <input
                    type="text"
                    value={newPart.vendor}
                    onChange={(e) => setNewPart(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Enter vendor name"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
            <div className="popup-footer">
              <button className="btn btn-secondary" onClick={closePopups}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddPart}
                disabled={loadingStates[`add-${currentProduct?.id}`]}
              >
                {loadingStates[`add-${currentProduct?.id}`] ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    Add Part
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Part Popup */}
      {showEditPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3><i className="fas fa-edit"></i> Edit Part in {currentProduct?.name}</h3>
              <button className="popup-close" onClick={closePopups}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="popup-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Part Name *</label>
                  <input
                    type="text"
                    value={editPart.name}
                    onChange={(e) => setEditPart(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Part Number *</label>
                  <input
                    type="text"
                    value={editPart.partNo}
                    onChange={(e) => setEditPart(prev => ({ ...prev, partNo: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={editPart.quantity}
                    onChange={(e) => setEditPart(prev => ({ ...prev, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="form-input"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor *</label>
                  <input
                    type="text"
                    value={editPart.vendor}
                    onChange={(e) => setEditPart(prev => ({ ...prev, vendor: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
            <div className="popup-footer">
              <button className="btn btn-secondary" onClick={closePopups}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleEditPart}
                disabled={loadingStates[`edit-${currentPart?.id}`]}
              >
                {loadingStates[`edit-${currentPart?.id}`] ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Update Part
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3><i className="fas fa-exclamation-triangle"></i> Confirm Delete</h3>
              <button className="popup-close" onClick={closePopups}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="popup-body">
              <div className="delete-confirmation">
                <i className="fas fa-trash-alt"></i>
                <p>Are you sure you want to delete part <strong>"{partToDelete?.name}"</strong> from <strong>{currentProduct?.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
            </div>
            <div className="popup-footer">
              <button className="btn btn-secondary" onClick={closePopups}>
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeletePart}
                disabled={loadingStates[`delete-${partToDelete?.id}`]}
              >
                {loadingStates[`delete-${partToDelete?.id}`] ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash"></i>
                    Delete Part
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search by part name, number, or vendor..."
            className="search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={clearSearch}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label><i className="fas fa-filter"></i> Product</label>
            <select 
              className="filter-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="all">All Products</option>
              {allProducts.map(product => (
                <option key={product.id} value={product.name}>{product.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label><i className="fas fa-box"></i> Stock Status</label>
            <select 
              className="filter-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Stocks</option>
              <option value="inStock">In Stock</option>
              <option value="outOfStock">Out of Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="incomingStock">Incoming Stocks</option>
            </select>
          </div>
        </div>
      </div>

      <div className="products-grid">
        {filteredProducts.map(product => {
          const productData = products.find(p => p.id === product.id) || { 
            id: product.id, 
            name: product.name, 
            parts: [] 
          }
          const filteredParts = getFilteredParts(productData.parts)
          
          return (
            <div key={product.id} className="product-card">
              <div className="product-header">
                <div className="product-title">
                  <i className={product.icon}></i>
                  <h3>{product.name}</h3>
                  <span className="parts-count">{productData.parts.length} parts</span>
                </div>
                
                {user?.role === 'admin' && (
                  <div className="product-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => openAddPopup(product)}
                    >
                      <i className="fas fa-plus"></i>
                      Add Part
                    </button>
                  </div>
                )}
              </div>

              {filteredParts.length === 0 ? (
                <div className="no-parts">
                  <i className="fas fa-inbox"></i>
                  <p>No parts found matching your criteria.</p>
                  {user?.role === 'admin' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => openAddPopup(product)}
                    >
                      <i className="fas fa-plus"></i>
                      Add First Part
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="parts-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>PART NAME</th>
                        <th>PART NO</th>
                        <th>QUANTITY</th>
                        <th>VENDOR</th>
                        {user?.role === 'admin' && <th>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.map((part, index) => (
                        <tr key={part.id} className={`part-row ${getStockStatus(part.quantity, part.isNew)}`}>
                          <td className="index-column">{index + 1}</td>
                          <td className="part-name">
                            {part.name}
                            {part.isNew && <span className="status-badge new">NEW</span>}
                          </td>
                          <td>{part.partNo}</td>
                          <td className="quantity-cell">
                            <div className="quantity-control">
                              {user?.role === 'admin' && (
                                <button 
                                  className="quantity-btn"
                                  onClick={() => handleQuickQuantityUpdate(product.id, part.id, part.quantity - 1)}
                                  disabled={part.quantity <= 0 || loadingStates[`quick-${part.id}`]}
                                >
                                  <i className="fas fa-minus"></i>
                                </button>
                              )}
                              <span className={`quantity-display ${getStockStatus(part.quantity, part.isNew)}`}>
                                {loadingStates[`quick-${part.id}`] ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i className={`fas ${
                                    part.quantity === 0 ? 'fa-times-circle' :
                                    part.quantity < 5 ? 'fa-exclamation-triangle' : 'fa-check-circle'
                                  }`}></i>
                                )}
                                {part.quantity}
                              </span>
                              {user?.role === 'admin' && (
                                <button 
                                  className="quantity-btn"
                                  onClick={() => handleQuickQuantityUpdate(product.id, part.id, part.quantity + 1)}
                                  disabled={loadingStates[`quick-${part.id}`]}
                                >
                                  <i className="fas fa-plus"></i>
                                </button>
                              )}
                            </div>
                          </td>
                          <td>{part.vendor}</td>
                          {user?.role === 'admin' && (
                            <td className="actions-cell">
                              <div className="action-buttons">
                                <button 
                                  className="btn btn-edit btn-sm"
                                  onClick={() => openEditPopup(product, part)}
                                  title="Edit Part"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="btn btn-delete btn-sm"
                                  onClick={() => openDeletePopup(product, part)}
                                  title="Delete Part"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(Product)