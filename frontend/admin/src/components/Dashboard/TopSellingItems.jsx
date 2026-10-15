import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Package, Tag, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axiosInstance from '@/axios/adminAxios';

// Restrained palette; neighbouring slices stay distinguishable
const COLORS = [
  '#2563eb', '#0d9488', '#f59e0b', '#e11d48', '#7c3aed',
  '#0891b2', '#65a30d', '#ea580c', '#db2777', '#64748b'
];

// Percentage inside a slice, only when the slice is big enough to fit it;
// names live in the legend instead of around the pie.
const RADIAN = Math.PI / 180;
const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
  if (percentage < 8) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 shadow-lg rounded-lg border">
        <p className="font-semibold">
          {data.name}
        </p>
        <p className="text-sm text-gray-600">
          Quantity Sold: {data.totalQuantity}
        </p>
        <p className="text-sm text-gray-600">
          Percentage: {(data.percentage).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const ChartCard = ({ title, icon: Icon, data }) => {
  // Calculate total quantity for percentage calculations
  const totalQuantity = data.reduce((sum, item) => sum + item.totalQuantity, 0);

  // Prepare and sort data
  const chartData = data
    .map(item => ({
      name: item.productName || item.categoryName || item.brandName || 'Unknown',
      totalQuantity: item.totalQuantity,
      percentage: totalQuantity > 0 ? (item.totalQuantity / totalQuantity) * 100 : 0
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No sales data yet.</p>
        ) : (
          // Pie and legend get separate areas: side by side on wide screens,
          // stacked on narrow ones, so names never collide with the chart.
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div className="h-[260px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="totalQuantity"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="85%"
                    labelLine={false}
                    label={renderSliceLabel}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul data-chart-legend className="min-w-0 divide-y divide-gray-100 text-sm" aria-label={`${title} legend`}>
              {chartData.map((item, index) => (
                <li key={index} className="flex items-center gap-3 py-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-700" title={item.name}>
                    {item.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-gray-900">
                    {item.totalQuantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Table view for detailed data */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Rank</th>
                <th className="text-left py-2">Name</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{item.name}</td>
                  <td className="text-right py-2">{item.totalQuantity}</td>
                  <td className="text-right py-2">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      payload: PropTypes.shape({
        name: PropTypes.string,
        totalQuantity: PropTypes.number,
        percentage: PropTypes.number,
      }),
    })
  ),
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  // Analytics rows (product/category/brand name + quantity); may be empty
  data: PropTypes.arrayOf(
    PropTypes.shape({
      totalQuantity: PropTypes.number,
    })
  ),
};

export default function TopSellingItems() {
  const [analytics, setAnalytics] = useState({
    topProducts: [],
    topCategories: [],
    topBrands: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axiosInstance.get('/sales-analytics');
        setAnalytics(response.data.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Brands
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ChartCard title="Top Selling Products" icon={Package} data={analytics.topProducts} />
        </TabsContent>
        <TabsContent value="categories">
          <ChartCard title="Top Categories" icon={Tag} data={analytics.topCategories} />
        </TabsContent>
        <TabsContent value="brands">
          <ChartCard title="Top Brands" icon={Building2} data={analytics.topBrands} />
        </TabsContent>
      </Tabs>
    </div>
  );
}