const mongoose = require('mongoose');
const User = require('./userModel');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
    },
    pinCode: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
        trim: true,
    },
    phone:{
        type: String,
        required: true,
        trim: true,

    },
    status: {
        type: String,
        enum: ['active', 'Blocked'],
        default: 'active',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Address', addressSchema);
