import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { format, subDays, subWeeks, subMonths, parseISO } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import axiosInstance from "@/axios/adminAxios"
import { toast } from "react-hot-toast"
import { formatCurrency, formatCurrencyForPdf } from "@/lib/utils"
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';



const SalesReport = () => {
  const [reportType, setReportType] = useState("daily")
  const [startDate, setStartDate] = useState(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState(new Date())
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDatePickers, setShowDatePickers] = useState(false)

  // Latest values for the effects below, which keep their original triggers.
  const fetchSalesDataRef = useRef(null)
  const reportTypeRef = useRef(reportType)

  useEffect(() => {
    if (reportType !== "custom") {
      fetchSalesDataRef.current()
    }
  }, [reportType])

  useEffect(() => {
    if (reportTypeRef.current === "custom") {
      fetchSalesDataRef.current()
    }
  }, [startDate, endDate])

  const fetchSalesData = async () => {
    if (!startDate || !endDate) return
    
    setLoading(true)
    try {
      const response = await axiosInstance.get("/sales-report", {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dateRange: reportType,
        },
      })

      if (response.data.data && response.data.data.length > 0) {
        // Transform the data for the chart
        const transformedData = response.data.data.map(item => ({
          ...item,
          date: format(parseISO(item.date), "MMM dd"),
          totalSales: Number(item.totalSales),
          totalOrders: Number(item.totalOrders),
          totalDiscount: Number(item.totalDiscount),
          totalProductsSold: Number(item.totalProductsSold),
        }))
        setSalesData(transformedData)
      } else {
        toast.error("No sales data available for the selected range.")
        setSalesData([])
      }
    } catch (error) {
      console.error("Error fetching sales data:", error)
      toast.error("Failed to fetch sales report.")
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }
  

  // Layout effects run before passive effects in every commit, so the
  // effects above always see this render's values.
  useLayoutEffect(() => {
    fetchSalesDataRef.current = fetchSalesData
    reportTypeRef.current = reportType
  })

  const handleReportTypeChange = (value) => {
    setReportType(value)
    setShowDatePickers(value === "custom")
    
    const today = new Date()
    let newStartDate = today
    
    switch (value) {
      case "daily":
        newStartDate = subDays(today, 7)
        break
      case "weekly":
        newStartDate = subWeeks(today, 4)
        break
      case "monthly":
        newStartDate = subMonths(today, 12)
        break
      case "yearly":
        newStartDate = new Date(today.getFullYear(), 0, 1)
        break
      case "custom":
        return
    }
    
    setStartDate(newStartDate)
    setEndDate(today)
  }

  const handleStartDateChange = (date) => {
    if (date > endDate) {
      toast.error("Start date cannot be after end date")
      return
    }
    setStartDate(date)
  }

  const handleEndDateChange = (date) => {
    if (date < startDate) {
      toast.error("End date cannot be before start date")
      return
    }
    setEndDate(date)
  }

  // const handleGenerateReport = () => {
  //   fetchSalesData()
  // }

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header with store name
    const storeName = "SPECTRAX"; 
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text(storeName, 14, 20);
    
    // Add report date range
    doc.setFontSize(12);
    doc.setTextColor(70);
    doc.text(`Sales Report: ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`, 14, 30);
    
    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
    
    // Add summary statistics in a grid layout
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    
    // Create boxes for summary statistics
    const boxHeight = 25;
    
    // Helper function to draw a statistic box
    const drawStatBox = (title, value, x, y) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(x, y, 45, boxHeight, 'F');
      doc.setFontSize(10);
      doc.setTextColor(70);
      doc.text(title, x + 2, y + 6);
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text(value, x + 2, y + 18);
    };
    
    // Draw summary boxes
    drawStatBox('Total Sales', formatCurrencyForPdf(totalSales), 14, 45);
    drawStatBox('Total Orders', totalOrders.toLocaleString(), 64, 45);
    drawStatBox('Total Discount', formatCurrencyForPdf(totalDiscount), 114, 45);
    drawStatBox('Products Sold', totalProductsSold.toLocaleString(), 164, 45);
    
    // Add some spacing before the table
    const tableHeaders = ['Date', 'Total Sales', 'Total Orders', 'Total Discount', 'Products Sold'];
    
    const tableRows = salesData.map(row => [
      row.date,
      formatCurrencyForPdf(row.totalSales),
      row.totalOrders,
      formatCurrencyForPdf(row.totalDiscount),
      row.totalProductsSold
    ]);
    
    // Add table with enhanced styling
    doc.autoTable({
      startY: 80,  // Adjusted to accommodate summary boxes
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 6,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },  // Date column
        1: { cellWidth: 35 },  // Sales column
        2: { cellWidth: 30 },  // Orders column
        3: { cellWidth: 35 },  // Discount column
        4: { cellWidth: 30 },  // Products column
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 80 },
    });
    
    // Add footer with page number and timestamp
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      doc.text(
        `Generated on ${format(new Date(), 'PPP')} - Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    doc.save('Sales_Report.pdf');
  };

  const handleDownloadExcel = () => {
    // Create a worksheet from sales data
    const worksheet = XLSX.utils.json_to_sheet(
      salesData.map((row) => ({
        Date: row.date,
        'Total Sales': formatCurrency(row.totalSales),
        'Total Orders': row.totalOrders,
        'Total Discount': formatCurrency(row.totalDiscount),
        'Products Sold': row.totalProductsSold,
      }))
    );
  
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Append the worksheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
  
    // Export the Excel file
    XLSX.writeFile(workbook, 'Sales_Report.xlsx');
  };

  const calculateTotals = () => {
    return salesData.reduce(
      (acc, curr) => ({
        totalSales: acc.totalSales + curr.totalSales,
        totalOrders: acc.totalOrders + curr.totalOrders,
        totalDiscount: acc.totalDiscount + curr.totalDiscount,
        totalProductsSold: acc.totalProductsSold + curr.totalProductsSold,
      }),
      { totalSales: 0, totalOrders: 0, totalDiscount: 0, totalProductsSold: 0 }
    )
  }

  const { totalSales, totalOrders, totalDiscount, totalProductsSold } = calculateTotals()

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Sales Report</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Select value={reportType} onValueChange={handleReportTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom Date Range</SelectItem>
          </SelectContent>
        </Select>

        {(showDatePickers || reportType === "custom") && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                  disabled={(date) => date > new Date() || date > endDate}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndDateChange}
                  initialFocus
                  disabled={(date) => date > new Date() || date < startDate}
                />
              </PopoverContent>
            </Popover>

            <Button onClick={fetchSalesData} disabled={loading}>
              {loading ? "Loading..." : "Generate Report"}
            </Button>
          </>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <p className="text-lg font-medium">Total Sales</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-lg font-medium">Total Orders</p>
          <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-lg font-medium">Total Discount</p>
          <p className="text-2xl font-bold">{formatCurrency(totalDiscount)}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <p className="text-lg font-medium">Products Sold</p>
          <p className="text-2xl font-bold">{totalProductsSold.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Sales Chart</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalSales" stroke="#8884d8" name="Total Sales" />
              <Line type="monotone" dataKey="totalOrders" stroke="#82ca9d" name="Total Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Detailed Report</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Products Sold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{formatCurrency(row.totalSales)}</TableCell>
                  <TableCell>{row.totalOrders}</TableCell>
                  <TableCell>{formatCurrency(row.totalDiscount)}</TableCell>
                  <TableCell>{row.totalProductsSold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button onClick={handleDownloadPDF}>Download PDF</Button>
        <Button onClick={handleDownloadExcel}>Download Excel</Button>
      </div>
    </div>
  )
}

export default SalesReport

