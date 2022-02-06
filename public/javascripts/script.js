const { response } = require("express")

function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
            if(response.status){
                // console.log(response.status)
                let count = $('#cart-count').html()
                count = parseInt(count)+1
                $('#cart-count').html(count)
            }
           
        }
    })
}

function changeQauntity(cartId,proId,userId,count,quantity)

{  
    $.ajax({
        url:'/change-product-quantitiy',
        data:{
            cart:cartId,
            product:proId,
            userId:userId,
            count:count,
            quantity:$(`#${proId}`).html()
        },
        method:'post',
        success:(response)=>{ 
           console.log(response)
           let x = $(`#${proId}`).html()
           x = parseInt(x)+ count
           if(x==0){
              alert('product removed from the cart')
              location.reload()
           }
           else{
            $(`#${proId}`).html(x)
            document.getElementById('totalValue').innerHTML=response.total
           }
        }
    })
}
