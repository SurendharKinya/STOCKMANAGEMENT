import React from 'react'
import { useNavigate } from 'react-router-dom'

const Dashboard = ({ products, user, allProducts }) => {
  const navigate = useNavigate()

  const calculateStats = (product) => {
    const productData = products.find(p => p.id === product.id) || { parts: [] }
    const totalParts = productData.parts.length
    const totalStocks = productData.parts.reduce((sum, part) => sum + part.quantity, 0)
    const incomingStocks = productData.parts.filter(part => part.isNew).length
    const outOfStocks = productData.parts.filter(part => part.quantity === 0).length
    const totalReworks = productData.parts.reduce((sum,part)=>sum+part.rework,0)
    const lowStocks = productData.parts.filter(part => part.quantity > 0 && part.quantity < 5).length
    
    return { totalParts, totalStocks,totalReworks, incomingStocks, outOfStocks, lowStocks }
  }

  const handleStockClick = (productName, filterType) => {
    navigate('/products', { 
      state: { 
        filteredProduct: productName,
        filterType: filterType
      }
    })
  } 

  const getTotalStats = () => {
    const totalProducts = allProducts.length
    const totalRework=products.reduce((sum,part)=>sum+part.parts.reduce((sum,part)=>sum+part.rework,0),0)
    const activeProducts = allProducts.filter(product => {
      const productData = products.find(p => p.id === product.id)
      return productData && productData.parts.length > 0
    }).length
    
    const totalParts = products.reduce((sum, product) => sum + product.parts.length, 0)
    const totalStockItems = products.reduce((sum, product) => 
      sum + product.parts.reduce((partSum, part) => partSum + part.quantity, 0), 0
    )

    return { totalProducts, activeProducts, totalParts,totalRework, totalStockItems }
  }

  const totalStats = getTotalStats()

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="header-content">
          <h1><i className="fas fa-tachometer-alt"></i> Dashboard</h1>
          <p>Welcome back, <strong>{user?.name}</strong>! Here's your inventory overview.</p>
        </div>
      </div>
      
      <div className="stats-overview">
        <div className="stat-card total-products">
          <div className="stat-icon">
            <i className="fas fa-cubes"></i>
          </div>
          <div className="stat-content">
            <h3>Total Products</h3>
            <div className="stat-number">{totalStats.totalProducts}</div>
          </div>
        </div>
        
        <div className="stat-card active-products">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>Active Products</h3>
            <div className="stat-number">{totalStats.activeProducts}</div>
          </div>
        </div>

         <div className="stat-card total-rework">
          <div className="stat-icon">
            <i className="fas fa-cog"></i>
          </div>
          <div className="stat-content">
            <h3>Total rework</h3>
            <div className="stat-number">{totalStats.totalRework}</div>
          </div>
        </div>

       
         
        <div className="stat-card total-parts">
          <div className="stat-icon">
            <i className="fas fa-puzzle-piece"></i>
          </div>
          <div className="stat-content">
            <h3>Total Parts</h3>
            <div className="stat-number">{totalStats.totalParts}</div>
          </div>
        </div>
        
        <div className="stat-card total-stocks">
          <div className="stat-icon">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-content">
            <h3>Total Stock Items</h3>
            <div className="stat-number">{totalStats.totalStockItems}</div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        {allProducts.map(product => {
          const stats = calculateStats(product)
          const productData = products.find(p => p.id === product.id)
          const hasParts = productData && productData.parts.length > 0
          
          return (
            <div key={product.id} className={`product-card ${!hasParts ? 'no-parts' : ''}`}>
              <div className="product-header">
                <div className="product-icon">
                  <i className={product.icon}></i>
                </div>
                <h3>{product.name}</h3>
                {!hasParts && <span className="no-data-badge">No Parts</span>}
              </div>
              
              {hasParts ? (
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">
                      <i className="fas fa-list"></i>
                      <strong>Total Parts</strong>
                    </div>
                    <div className="stat-value">{stats.totalParts}</div>
                  </div>
                  
                  <div className="stat-item">
                    <div className="stat-label">
                      <i className="fas fa-box"></i>
                      <strong>Total Stocks</strong>
                    </div>
                    <div className="stat-value">{stats.totalStocks}</div>
                  </div>
                  <div className="stat-item bg-red-200 text-red-700">
                    <div className="stat-label ">
                      <i className="fas fa-cog"></i>
                      <strong>Rework</strong>
                    </div>
                    <div className="stat-value">{stats.totalReworks}</div>
                  </div>
                  
                  <div 
                    className={`stat-item bg-green-200 text-green-800 clickable incoming ${stats.incomingStocks > 0 ? 'has-data' : ''}`}
                    onClick={() => stats.incomingStocks > 0 && handleStockClick(product.name, 'incomingStock')}
                  >
                    <div className="stat-label">
                      <i className="fas fa-shipping-fast"></i>
                      <strong>Incoming Stocks</strong>
                    </div>
                    <div className="stat-value">
                      {stats.incomingStocks}
                      {stats.incomingStocks > 0 && <i className="fas fa-arrow-right"></i>}
                    </div>
                  </div>
                  
                  <div 
                    className={`stat-item clickable out-of-stock ${stats.outOfStocks > 0 ? 'has-data' : ''}`}
                    onClick={() => stats.outOfStocks > 0 && handleStockClick(product.name, 'outOfStock')}
                  >
                    <div className="stat-label">
                      <i className="fas fa-exclamation-triangle"></i>
                      <strong>Out of Stocks</strong>
                    </div>
                    <div className="stat-value">
                      {stats.outOfStocks}
                      {stats.outOfStocks > 0 && <i className="fas fa-arrow-right"></i>}
                    </div>
                  </div>
                  
                  <div 
                    className={`stat-item clickable low-stock ${stats.lowStocks > 0 ? 'has-data' : ''}`}
                    onClick={() => stats.lowStocks > 0 && handleStockClick(product.name, 'lowStock')}
                  >
                    <div className="stat-label">
                      <i className="fas fa-battery-quarter"></i>
                      <strong>Low Stocks</strong>
                    </div>
                    <div className="stat-value">
                      {stats.lowStocks}
                      {stats.lowStocks > 0 && <i className="fas fa-arrow-right"></i>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-parts-message">
                  <i className="fas fa-inbox"></i>
                  <p>No parts added yet</p>
                  {user?.role === 'admin' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/products')}
                    >
                      Add Parts
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard