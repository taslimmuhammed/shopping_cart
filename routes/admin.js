var express = require('express');
const res = require('express/lib/response');
const productHelpers = require('../helpers/product-helpers');


var router = express.Router();
/* GET users listing. */
router.get('/', function(req, res, next) {
   productHelpers.getAllProducts().then((products)=>{
   res.render("admin/view-products",{admin: true, products})
   })
 
});
router.get('/add-product',(req,res)=>{
 res.render('admin/add-product')
})

router.post("/add-product",(req,res)=>{
  productHelpers.addProducts(req.body,(id)=>{
    let image =  req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
     if(err) console.log(err)
    })
  })
  res.redirect('/admin/')
})
router.get("/delete-product/",(req,res)=>{
  //req.params.id gives the /:id part in url
  //req.query.id is used when the id is passed in url as ?id=--id--
    let proId = req.query.id
    productHelpers.deleteProducts(proId).then((response)=>{
      res.redirect('/admin/')
    })

})
router.get('/edit-product/:id',(async(req,res)=>{
  let product = await productHelpers.getProductDetails(req.params.id)
  res.render("admin/edit-product", {product})
}))
router.post('/edit-product/:id',(req,res)=>{
  let _id = req.params.id
    productHelpers.updateProduct(_id,req.body).then(e=>{
      res.redirect('/admin/')
      if(req.files.Image){
        let image =  req.files.Image
        image.mv('./public/product-images/'+_id+'.jpg')
      }
    })
})
module.exports = router;
