const { reject, resolve } = require('promise')
var db = require('../Config/Connections')
var Collection = require('../Config/collections')
var objectId = require('mongodb').ObjectId
module.exports={
    addProducts:(product, callback)=>{
        db.get().collection(Collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
        callback(data.insertedId.toString())
        })
    },

    getAllProducts:()=>{
     return new Promise(async(resolve, reject)=>{
       let products= await db.get().collection('product').find().toArray()
       resolve(products)
     })
    }
   ,
    deleteProducts:(proId)=>{
            return new Promise((resolve,reject)=>{
              db.get().collection(Collection.PRODUCT_COLLECTION).remove({_id:objectId(proId)},{justOne:true}).then((response)=>{
                resolve(response)
              })
            })      
    },

    getProductDetails:(proId)=>{
      return new Promise((resolve,reject)=>{
        db.get().collection(Collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).
        then(product=> resolve(product))
      })
    },
    
    updateProduct:(proId, proDetails)=>{
        return new Promise((resolve,reject)=>{
          db.get().collection(Collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{
            $set:{
              Name:proDetails.Name,
              Description:proDetails.Description,
              Price:proDetails.Price,
              Category:proDetails.Category
            }
          }).then(respense=>resolve(respense))
        })
    }
}