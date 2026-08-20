const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');
const Brand = require('../models/brandSchema');

const salesReport = async (req, res) => {
  try {
    const { startDate, endDate, dateRange } = req.query;

    let matchCondition = { paymentStatus: 'Completed' };
    const today = new Date();

    if (dateRange === 'custom' && startDate && endDate) {
      matchCondition.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      switch (dateRange) {
        case 'yearly':
          // Set the range from the beginning to the end of the current year
          matchCondition.orderDate = {
            $gte: new Date(today.getFullYear(), 0, 1), // Jan 1
            $lte: new Date(today.getFullYear(), 11, 31, 23, 59, 59), // Dec 31
          };
          break;

        case 'monthly':
          // Set the range from the beginning to the end of the current month
          matchCondition.orderDate = {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1), // Start of the month
            $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59), // End of the month
          };
          break;

        case 'weekly':
          // Set the range from the start of the week (Sunday) to the end of the week (Saturday)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday of this week
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday of this week

          matchCondition.orderDate = {
            $gte: startOfWeek, // Sunday
            $lte: new Date(endOfWeek.setHours(23, 59, 59)), // Saturday end of day
          };
          break;

        case 'daily':
          // Set the range for today's sales
          const startOfDay = new Date(today);
          startOfDay.setHours(0, 0, 0, 0); // Start of today
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59); // End of today

          matchCondition.orderDate = { $gte: startOfDay, $lte: endOfDay };
          break;

        default:
          return res.status(400).json({ message: 'Invalid date range' });
      }
    }

    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } } },
          totalSales: { $sum: "$finalAmount" },  // Fixed finalAmount field
          totalOrders: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },  // Fixed discountAmount field
          totalProductsSold: { $sum: { $sum: "$products.quantity" } },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    return res.status(200).json({
      message: "Sales report fetched successfully",
      data: salesData.map((item) => ({
        date: item._id.date,
        totalSales: item.totalSales,
        totalOrders: item.totalOrders,
        totalDiscount: item.totalDiscount,
        totalProductsSold: item.totalProductsSold,
      })),
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return res.status(500).json({ message: "Error while fetching sales report" });
  }
};


const getSalesAnalytics = async (req, res) => {
  try {
    // Top Products
    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: 'Completed' } },
      { $unwind: { path: '$products', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$products.productId',
          productName: { $first: '$products.name' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Top Categories
    const topCategories = await Order.aggregate([
      { $match: { paymentStatus: 'Completed' } },
      { $unwind: { path: '$products', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Top Brands
    const topBrands = await Order.aggregate([
      { $match: { paymentStatus: 'Completed' } },
      { $unwind: { path: '$products', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'brands',
          localField: 'product.brandId',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$brand._id',
          brandName: { $first: '$brand.name' },
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    return res.status(200).json({
      message: 'Analytics data fetched successfully',
      data: {
        topProducts,
        topCategories,
        topBrands
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ message: 'Error while fetching analytics data' });
  }
};




module.exports = {
  salesReport,
  getSalesAnalytics,

};
