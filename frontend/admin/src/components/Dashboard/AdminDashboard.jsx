import { motion } from "framer-motion"
import SalesReport from "./SalesReport"
import TopSellingItems from './TopSellingItems';

// Sample data for the chart
// const salesData = [
//   { name: "Jan", sales: 4000 },
//   { name: "Feb", sales: 3000 },
//   { name: "Mar", sales: 5000 },
//   { name: "Apr", sales: 2780 },
//   { name: "May", sales: 1890 },
//   { name: "Jun", sales: 2390 },
// ]

const AdminDashboard = () => {

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      {/* Main Content */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-8 bg-gray-50">
        {/* Stats Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total Sales", value: "₹12,426", trend: "+8%" },
            { title: "Active Users", value: "2,128", trend: "+23%" },
            { title: "New Orders", value: "48", trend: "+12%" },
            { title: "Pending Delivery", value: "6", trend: "-2%" },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-2xl font-semibold text-black">{stat.value}</p>
                <span
                  className={`text-sm font-medium ${stat.trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                >
                  {stat.trend}
                </span>
              </div>
            </motion.div>
          ))}
        </div> */}

        {/* Sales Report */}
        <motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.4 }}
  className="mb-8"
>
  <SalesReport />
</motion.div>


<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.3 }}
  className="mb-8"
>
  <TopSellingItems />
</motion.div>


        {/* Sales Line Chart */}
        {/* <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8"
        >
          <h2 className="text-lg font-semibold text-black mb-4">Sales Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3498db" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div> */}

        {/* Recent Activity */}
        {/* <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-black mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { text: "New order #1234 received", time: "5 minutes ago" },
              { text: "Payment processed for order #1233", time: "2 hours ago" },
              { text: "New user registration", time: "3 hours ago" },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">{activity.text}</span>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div> */}
      </motion.div>
    </div>
  )
}

export default AdminDashboard

