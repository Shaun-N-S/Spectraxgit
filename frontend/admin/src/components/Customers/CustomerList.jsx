import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '../ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import axiosInstance from '@/axios/adminAxios';
import Swal from 'sweetalert2';
import { formatCustomerName } from '@/lib/utils';



function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(4); // Adjust the number of customers per page
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    axiosInstance
      .get('/fetchallusers')
      .then((response) => {
        console.log('API response for fetching users:', response.data.users);

        // Transform the data to match the expected structure
        const transformedUsers = response.data.users.map((user) => ({
          id: user._id,
          name: formatCustomerName(user),
          email: user.email,
          phone: user.phone || 'N/A', // Fallback if phone is missing
          status: user.status === 'active', // Convert 'active'/'blocked' to boolean
        }));

        setCustomers(transformedUsers);
        setTotalPages(Math.ceil(transformedUsers.length / customersPerPage)); // Calculate total pages
      })
      .catch((err) => {
        console.error('Error in fetch customers:', err);
      });
  }, [customersPerPage]);

  const handleStatusChange = async (id) => {
    try {
      const customer = customers.find((c) => c.id === id);
      const newStatus = customer.status ? 'blocked' : 'active';
  
      // Confirmation Alert
      const result = await Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to ${newStatus} this customer?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, ${newStatus} them!`,
        cancelButtonText: 'Cancel',
      });
  
      if (result.isConfirmed) {
        // API Call
        await axiosInstance.patch(`/updateuserstatus/${id}`, { status: newStatus });
        
        // Update local state
        setCustomers((prevCustomers) =>
          prevCustomers.map((customer) =>
            customer.id === id ? { ...customer, status: newStatus === 'active' } : customer
          )
        );
  
        // Success Alert
        Swal.fire({
          title: 'Success!',
          text: `Customer has been ${newStatus}.`,
          icon: 'success',
        });
      }
    } catch (err) {
      console.error('Error updating status:', err);
  
      // Error Alert
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update customer status. Please try again.',
        icon: 'error',
      });
    }
  };
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  // Get the customers for the current page
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="text-3xl font-bold mb-6">Customer List</h1>
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Name</TableHead>
              <TableHead className="w-1/4">Email</TableHead>
              <TableHead className="w-1/5">Phone</TableHead>
              <TableHead className="w-1/6">Status</TableHead>
              <TableHead className="w-1/6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      customer.status ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {customer.status ? 'Active' : 'Blocked'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Switch
                      checked={customer.status} // Check if the status is active (true)
                      onCheckedChange={() => handleStatusChange(customer.id)} // Handle status toggle
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      {customer.status ? 'Block' : 'Unblock'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center space-x-2">
        {Array.from({ length: totalPages }, (_, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => paginate(index + 1)}
            disabled={index + 1 === currentPage}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default CustomerList;
