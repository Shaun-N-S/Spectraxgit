const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variantId: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    orderStatus: {
      type: String,
      enum: ['active', 'ordered', 'canceled'],
      default: 'active',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('Cart', cartSchema);
