const Address = require('../models/addressSchema');
const User = require('../models/userModel');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, ADDRESS_MESSAGES } = require('../constants/messages');

const addAddress = async (req, res) => {
  
    try {
      console.log(req.body)
        const userId = req.user.id;
        const { address, city, state, pinCode, country,phone } = req.body;


        if (!address || !city || !state || !pinCode || !country || !phone) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED });
        }

        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
        }

        const existingAddress = await Address.findOne({ userId, address, city, state, pinCode, country ,phone});
        if (existingAddress) {
            return res.status(HTTP_STATUS.CONFLICT).json({ message: ADDRESS_MESSAGES.ALREADY_EXISTS });
        }

        const newAddress = new Address({
            userId,
            address,
            city,
            state,
            pinCode,
            country,
            phone,
        });

        await newAddress.save();

        return res.status(HTTP_STATUS.CREATED).json({ message: ADDRESS_MESSAGES.ADDED, newAddress });
    } catch (error) {
        console.log("Error in addAddress:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};




const fetchAddress = async (req, res) => {
  console.log("fetchAddress")
    try {
        const userId = req.user.id; // Use the authenticated user, not the client-supplied param
        console.log("suer ID........",userId)

        // Fetch the user by ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
        }

        // Fetch address associated with the user
        const address = await Address.find({ userId , status:'active' });

        return res.status(HTTP_STATUS.OK).json({ message: ADDRESS_MESSAGES.FETCHED, address });

    } catch (error) {
        console.error("Error in fetching address:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const updateAddressStatus = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = req.user.id;

      // Find the address by ID and verify ownership
      const address = await Address.findOne({ _id: addressId, userId });

      if (!address) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ADDRESS_MESSAGES.NOT_FOUND });
      }
  
      
      const newStatus = address.status === 'active' ? 'Blocked' : 'active';
  
      // Update the status in the database
      address.status = newStatus;
      await address.save();
  
      res.status(HTTP_STATUS.OK).json({ 
        message: ADDRESS_MESSAGES.statusChanged(newStatus), 
        address 
      });
    } catch (error) {
      console.error("Error updating address status:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ADDRESS_MESSAGES.STATUS_UPDATE_FAILED });
    }
  };
  

  const updateAddress = async (req, res) => {
    try {
      const { id } = req.params; // Get address ID from URL params
      const userId = req.user.id;
      const { address, city, state, pinCode, country,phone } = req.body; // Destructure updated fields from request body

      // Validate required fields
      if (!id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ADDRESS_MESSAGES.ID_REQUIRED_WITH_PERIOD });
      }
  
      // Find the address by ID and verify ownership
      const existingAddress = await Address.findOne({ _id: id, userId });
  
      if (!existingAddress) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ADDRESS_MESSAGES.NOT_FOUND_OR_UNAUTHORIZED });
      }
  
      // Update address fields
      existingAddress.address = address || existingAddress.address;
      existingAddress.city = city || existingAddress.city;
      existingAddress.state = state || existingAddress.state;
      existingAddress.pinCode = pinCode || existingAddress.pinCode;
      existingAddress.country = country || existingAddress.country;
      existingAddress.phone = phone || existingAddress.phone;
  
      // Save updated address
      await existingAddress.save();
  
      res.status(HTTP_STATUS.OK).json({ message: ADDRESS_MESSAGES.UPDATED, data: existingAddress });
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ADDRESS_MESSAGES.UPDATE_FAILED, error: error.message });
    }
  };

  const fetchAddressById = async (req, res) => {
    try {
      const { id } = req.params; // Match the route parameter name
      const userId = req.user.id;

      if (!id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ADDRESS_MESSAGES.ID_REQUIRED });
      }

      const shippingAddress = await Address.findOne({ _id: id, userId });

      if (!shippingAddress) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ADDRESS_MESSAGES.NOT_FOUND });
      }
  
      return res.status(HTTP_STATUS.OK).json({
        message: ADDRESS_MESSAGES.FOUND,
        address: shippingAddress,
      });
    } catch (error) {
      console.error("Error fetching address:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ADDRESS_MESSAGES.FETCH_FAILED, error: error.message });
    }
  };
  




module.exports = {
    addAddress,
    fetchAddress,
    updateAddressStatus,
    updateAddress,
    fetchAddressById,
};
