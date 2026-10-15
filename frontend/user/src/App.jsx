import SignUp from './components/signup/SignUp'
import Login from './components/login/Login'
import OtpVerification from './components/otp/otp'
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from './components/home/Home'
import ProtectEdit from './components/Protect/userAuth'
import ProtectHome from './components/Protect/userLogin'
import ProductPage from './components/Products/ProductPage'
import Header from './components/Header/Header'
import ProductDetails from './components/Products/ProductDetails'
import ProtectedComponent from './components/Protect/ProtectedComponent'
import Footer from './components/Footer/Footer'
import Breadcrumbs from './components/BreadCrump/BreadCrump'
import { Toaster } from 'react-hot-toast';
import AccountPage from './components/AccountPage/AccountPage'
import ForgetPassword from './components/ForgetPassword/ForgetPassword'
import ForgotPasswordOtp from './components/ForgetPassword/ForgetPasswordOtp'
import ResetPassword from './components/ForgetPassword/ResetPassword'
import CartPage from './components/Cart/CartPage'
import Filter from './components/Products/Filter'
import CheckoutPage from './components/CheckoutPage/CheckoutPage'
import OrderSuccessful from './components/CheckoutPage/OrderSuccessfull'
import WishlistPage from './components/Wishlist/WishlistPage'
import PaymentFailed from './components/CheckoutPage/PaymentFailed'

const App = () => {
  return (
    <>
    <BrowserRouter>
    <Header/>
    <Breadcrumbs/>
    <Toaster />
    <Routes>
    {/* <Route path='/' element={<ProtectHome><Home/></ProtectHome>}/> */}
    <Route path='/' element={<Home/>}/>
      <Route path="/login" element={<ProtectEdit><Login/></ProtectEdit>} />
      <Route path='/signup' element={<ProtectEdit><SignUp/></ProtectEdit>}/>
      <Route path='/otp' element={<ProtectEdit><OtpVerification/></ProtectEdit>}/>
      <Route path='/forgotpassword' element={<ProtectEdit><ForgetPassword/></ProtectEdit>}/>
      <Route path='/forgotpassword/otp' element={<ProtectEdit><ForgotPasswordOtp/></ProtectEdit>}/>
      <Route path='/resetpassword' element={<ProtectEdit><ResetPassword/></ProtectEdit>}/>
      <Route path='/home' element={<ProtectHome><Home/></ProtectHome>}/>
      {/* <Route path='/shop' element={<ProtectedComponent><ProductPage/></ProtectedComponent>}/> */}
      <Route path='/shop' element={<ProductPage/>}/>

      {/* <Route path='/product_details/:id' element={<ProtectedComponent><ProductDetails/></ProtectedComponent>}/> */}
      <Route path='/product_details/:id' element={<ProductDetails/>}/>

      <Route path='/Account' element={<ProtectedComponent><AccountPage/></ProtectedComponent>} />
      <Route path='/cart' element ={<ProtectedComponent><CartPage/></ProtectedComponent>}/>
      <Route path='/filter' element={<ProtectedComponent><Filter/></ProtectedComponent>}/>
      <Route path='/checkout' element={<ProtectedComponent><CheckoutPage/></ProtectedComponent>} />
      <Route path='/orderSuccessful/:id' element={<ProtectedComponent><OrderSuccessful/></ProtectedComponent>}/>
      <Route path='/wishlist' element ={<ProtectedComponent><WishlistPage/></ProtectedComponent>}/>
      <Route path='/Payment Failed' element={<ProtectedComponent><PaymentFailed/></ProtectedComponent>}/>
      </Routes>
    <Footer/>
    </BrowserRouter>
    </>
  )
}

export default App