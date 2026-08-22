const Wallet = require('../models/walletSchema');
const User = require('../models/userModel');
const { model } = require('mongoose');


const getWallet = async (req,res) =>{
    try {
        const userId = req.user.id;

        const walletDetails = await Wallet.findOne({userId});
        if (walletDetails && walletDetails.transactions) {
            walletDetails.transactions = walletDetails.transactions.reverse(); 
          }
        console.log(walletDetails);

        return res.status(200).json({message:"Wallet details fetched succesfully !",walletDetails});
    } catch (error) {
        console.log("Error in fetching wallet details ..........",error);
        return res.status(500).json({message:"Internal Server Error while fetching wallet details."});
    }
}


module.exports = {
    getWallet,
}