const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [{ 
        transaction_id: { 
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['credit', 'upi', 'refund', 'razorpay','wallet'],
            required: true
        },
        amount: { 
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        description: {
            type: String
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'], 
            default: 'completed'
        }
    }],
    createdAt: { 
        type: Date,
        default: Date.now
    }
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
