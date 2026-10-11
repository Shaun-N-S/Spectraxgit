const Wallet = require('../models/walletSchema');
const User = require('../models/userModel');
const { model } = require('mongoose');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { WALLET_MESSAGES } = require('../constants/messages');


const getWallet = async (req,res) =>{
    try {
        const userId = req.user.id;

        const walletDetails = await Wallet.findOne({userId});
        if (walletDetails && walletDetails.transactions) {
            walletDetails.transactions = walletDetails.transactions.reverse(); 
          }
        console.log(walletDetails);

        return res.status(HTTP_STATUS.OK).json({message:WALLET_MESSAGES.FETCHED,walletDetails});
    } catch (error) {
        console.log("Error in fetching wallet details ..........",error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:WALLET_MESSAGES.FETCH_FAILED});
    }
}


module.exports = {
    getWallet,
}