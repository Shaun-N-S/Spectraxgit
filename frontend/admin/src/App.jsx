import React from 'react'
import Login from './components/Login/Login'
import { BrowserRouter ,Route, Routes } from 'react-router-dom'
import Home from './components/Dashboard/Home'
import AdminAuth from './components/Protect/adminAuth'
import AdminLoginAuth from './components/Protect/adminLogin'
import ProductList from './components/Products/ProductList'
import CategoryManagement from './components/Category/CategoryMangment'
import AddProduct from './components/Products/AddProduct'
import AdminSidebar from './components/SideBar/AdminSidebar'
import CustomerList from './components/Customers/CustomerList'
import BrandManagement from './components/Brand/BrandManagment'
import EditProduct from './components/Products/EditProduct'
import OrderManagement from './components/OrderManagement/OrderManagment'
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';


const App = () => (
  <div>
    {/* <ToastContainer /> */}
    <BrowserRouter>
    <Toaster />
      <Routes>
        <Route path='/' element={<AdminLoginAuth><Login /></AdminLoginAuth>} />
        <Route path='/home' element={<AdminAuth><AdminSidebar><Home /></AdminSidebar></AdminAuth>} />
        <Route path='/products' element={<AdminAuth><AdminSidebar><ProductList/></AdminSidebar></AdminAuth>} />
        <Route path="/add-product" element={<AdminAuth><AdminSidebar><AddProduct /></AdminSidebar></AdminAuth>} />
        <Route path='/customerlist' element={<AdminAuth><AdminSidebar><CustomerList/></AdminSidebar></AdminAuth>}/>
        <Route path='/brands' element={<AdminAuth><AdminSidebar><BrandManagement/></AdminSidebar></AdminAuth>}/>
        <Route path='/orders' element={<AdminAuth><AdminSidebar><OrderManagement/></AdminSidebar></AdminAuth>}/>
        <Route path='/categories' element={<AdminAuth><AdminSidebar><CategoryManagement/></AdminSidebar></AdminAuth>}/>
        <Route path='/edit-product/:id' element={<AdminAuth><AdminSidebar><EditProduct/></AdminSidebar></AdminAuth>}/>
      </Routes>
    </BrowserRouter>
  </div>
)

export default App