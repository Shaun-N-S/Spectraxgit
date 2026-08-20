const mongoose = require('mongoose');
const {Schema} = mongoose

const WishlistSchema = new mongoose.Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        index:true
    },
    product:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product"
        },
        variantId:{
            type:Schema.Types.ObjectId,
            required:true
        }
    }],
    createdOn:{
        type:Date,
        default:Date.now
    }

})

const Wishlist = mongoose.model('Wishlist',WishlistSchema)
module.exports = Wishlist