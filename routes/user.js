const { response } = require('express');
var express = require('express');
const session = require('express-session');
var router = express.Router();
var productHelpers  = require('../helpers/product-helpers')
const userHelpers  = require('../helpers/user-helpers')
/* GET home page. */

const verifyLogin = (req,res,next)=>{
  if(req.session.loggedIn) next()
  else res.redirect('/login')
}

router.get('/',async function(req, res, next) {
  let user = req.session.user
  let cartCount = 0
  // console.log(user)
  if(user) cartCount =await userHelpers.getCartCount(req.session.user._id)
  productHelpers.getAllProducts().then((products)=>{
  res.render("user/view-products",{ products, user,cartCount})
  })

});
router.get('/login',(req,res)=>{
  if(req.session.loggedIn){
    res.redirect("/")
  }
 else {res.render('user/login',{"loginErr":req.session.loginErr })
       req.session.loginErr=false}
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
   userHelpers.doSignup(req.body).then((response)=>{
    //  console.log(response)
     req.session.loggedIn=true;
     req.session.user=  response
     res.redirect('/')
   })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    // console.log(response.status)
    if(response.status==true){
      
      req.session.loggedIn  =true;
      req.session.user = response.user
      res.redirect('/')
    
    }
    else {
      req.session.loginErr = "invalid UserName or PassWord"
      res.redirect("/login")

    }

  })
})
router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res,next)=>{
  let products= await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  res.render("user/cart",{products,user:req.session.user,totalValue})
})
router.get('/add-to-cart/:id',verifyLogin,((req,res)=>{
  proId= req.params.id
  userHelpers.addToCart(proId,req.session.user._id).then((e)=>{
    res.json({status:true})
  })
}))
//FUNCTION CALLED BY AJAX WILL NOT HAVE SESSION
router.post('/change-product-quantitiy',(req,res,next)=>{
  // console.log(req.body)
  userHelpers.changeProductQuantity(req.body).then(async(e)=>{
     e.total = await userHelpers.getTotalAmount(req.body.userId)
     console.log(e.total)
    res.json(e)
  })
})
router.get('/place-order',verifyLogin,async(req,res)=>{
 let total = await userHelpers.getTotalAmount(req.session.user._id)
 res.render('user/place-order',{total, user:req.session.user}) 
})
router.post('/place-order',async(req,res)=>{
  let products= await userHelpers.getCartProductList(req.body.userId)
  let total = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,total).then((orderId)=>{
    if(req.body['payment-method']=='COD'){
      res.json({status:true})
    }else{
      userHelpers.generateRazorPay(orderId,total).then((response)=>{
        res.json(response)
      })
    }
     
      })
})
router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
router.get('/orders', async(req,res)=>{
  let orders= await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})
router.get('/view-order-products/:id',async(req,res)=>{
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
module.exports = router;
