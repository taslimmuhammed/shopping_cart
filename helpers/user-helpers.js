const { reject, resolve } = require('promise')
var db = require('../Config/Connections')
var Collection = require('../Config/collections')
const bcrypt = require('bcrypt')
const { status } = require('express/lib/response')
var objectId = require('mongodb').ObjectId
const res = require('express/lib/response')
const { response } = require('express')
const Razorpay= require('razorpay')
const crypto= require('crypto')

var instance = new Razorpay({
    key_id: 'rzp_test_6dQW7jJ10vQtN6',
    key_secret: 'OrPYq5bIe95u6RtxSZ5j9F6I',
  });
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(Collection.USER_COLLECTION).insertOne(userData).
                then((data) => resolve(data.insertedId.toString()))
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(Collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        resolve({ status: false })
                    }
                })
            }
            else {
                alert("Wrong UserId")
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(Collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                //find Index Works simalr to forEach 
                let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(Collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                       $inc: {'products.$.quantity':1}
                    }).then((e)=>resolve())
                }
               else{ db.get().collection(Collection.CART_COLLECTION)
                .updateOne({ user: objectId(userId) },
                    {
                        $push: { products: proObj }
                    }).then(response => resolve())}
            }
            else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(Collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(Collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind:'$products'
                },
                {
                    //$ symbol is used in case of array
                    $project:{
                        item: '$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from: Collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'

                    }

                },
                {
                    $project:{
                        item:1, quantity:1,product:{$arrayElemAt:['$product',0]}
                        //giving 1 for elements which has to be displayed
                    }
                }
            ]).toArray()
           resolve(cartItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(Collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) count = cart.products.length
            resolve(count)
        })
    },

    changeProductQuantity:(details)=>{
        details.count =parseInt(details.count)
        details.quantity= parseInt(details.quantity)

          return new Promise((resolve,reject)=>{
              if(details.quantity==1 && details.count==-1){
                 db.get().collection(Collection.CART_COLLECTION)
                 .updateOne(
                     {_id:objectId(details.cart)},
                     {
                     '$pull':{'products':{
                             'item':objectId(details.product)
                        }
                    }
                     }).then((e)=>resolve({removeItem:true}))
              }
            else{
                db.get().collection(Collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
               $inc: {'products.$.quantity':details.count}
            }).then((e)=>resolve({status:true}))
            }
          })
    },

    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(Collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind:'$products'
                },
                {
                    //$ symbol is used in case of array
                    $project:{
                        item: '$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from: Collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'

                    }

                },
                {
                    $project:{
                        item:1, quantity:1,product:{$arrayElemAt:['$product',0]}
                        //giving 1 for elements which has to be displayed
                    }
                },
 
                {
                    $group:{
                        //used to get the grouped result of all
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',               {
                            $convert:
                               {
                                  input: '$product.Price',
                                  to: "int",
                               }
                               //CONVERTING THE PRICE FROM STRING TO INT FROM THE DB
                         }]}}
                    }
                }
            ]).toArray()
            //nessasary to use toArray()
           if(total.length!=0) resolve(total[0].total)
           else resolve('0')
        })
    },
    getCartProductList:(userId)=>{
       return new Promise(async(resolve,reject)=>{
        let userCart = await db.get().collection(Collection.CART_COLLECTION).findOne({ user: objectId(userId) })
           resolve(userCart)
       })
    },
    placeOrder:(order,products,total)=>{
       return new Promise((resolve, reject)=>{
            let status =(order['payment-method']=='COD')?'placed':'pending'
            let orderObj = {
                delivaryDetails: {
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                peymentMethod: order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date: new Date()
            }

        db.get().collection(Collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(Collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})  
            resolve(response.insertedId.toString())
        })
       })
    },
    getUserOrders: (userId)=>{
       return new Promise(async(resolve, reject)=>{
             let orders = await db.get().collection(Collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()   
            resolve(orders)
       })
    },

    getOrderProducts:(orderId)=>{
        return new Promise(async (resolve,reject)=>{
            let OrderItems =  await db.get().collection(Collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item: '$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            resolve(OrderItems)
        })
    },
    generateRazorPay:(orderId,total)=>{
        return new Promise((resolve , reject)=>{
          var options = {
              amount:total*100,
              currency:"INR",
              receipt:''+orderId
          } 
          instance.orders.create(options,(err, order)=>{
                console.log("New Order",order)
                resolve(order)
          })
        })
    },
    verifyPayment:(details)=>{

        new Promise(async(resolve,reject)=>{
           try{
               console.log(details['payment[razorpay_order_id]'])
            let hmac = crypto.createHmac('sha256', 'OrPYq5bIe95u6RtxSZ5j9F6I')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
           hmac = hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                console.log("Payment succesful")
                resolve()
            }else{
                console.log("Payment failed.....")
                reject()
            }
           }catch(err){
               console.log(err)
           }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            console.log("hello World")
            db.get().collection(Collection.ORDER_COLLECTION).updateOne(
                {_id:objectId(orderId)},
                {
                    $set:{
                        status:'placed'
                    }
                }
                ).then(()=>{
                    resolve()
                })
        })
    }
}