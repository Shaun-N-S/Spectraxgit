const Wallet = require("../models/walletSchema");
const User = require("../models/userModel");
const { model } = require("mongoose");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { WALLET_MESSAGES } = require("../constants/messages");
const {
  isPaginationRequested,
  parsePagination,
  buildPagination,
} = require("../utils/pagination");

const WALLET_PAGE_SIZE = 5;

const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const walletDetails = await Wallet.findOne({ userId });
    if (walletDetails && walletDetails.transactions) {
      walletDetails.transactions = walletDetails.transactions.reverse();
    }
    console.log(walletDetails);

    if (isPaginationRequested(req.query)) {
      const { page, limit } = parsePagination(req.query, WALLET_PAGE_SIZE);
      const wallet = walletDetails ? walletDetails.toObject() : null;
      const transactions = wallet ? wallet.transactions : [];
      const pagination = buildPagination(transactions.length, page, limit);
      const start = (pagination.currentPage - 1) * limit;
      if (wallet)
        wallet.transactions = transactions.slice(start, start + limit);

      return res
        .status(HTTP_STATUS.OK)
        .json({
          message: WALLET_MESSAGES.FETCHED,
          walletDetails: wallet,
          pagination,
        });
    }

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: WALLET_MESSAGES.FETCHED, walletDetails });
  } catch (error) {
    console.log("Error in fetching wallet details ..........", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: WALLET_MESSAGES.FETCH_FAILED });
  }
};

module.exports = {
  getWallet,
};
