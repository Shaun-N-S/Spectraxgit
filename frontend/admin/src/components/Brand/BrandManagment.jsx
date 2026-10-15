import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Pencil, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '@/axios/adminAxios';
import Swal from 'sweetalert2';


function BrandManagement() {
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState({ name: '' });
  const [editingBrand, setEditingBrand] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const brandsPerPage = 5;

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axiosInstance.get('/getallbrands');
        setBrands(response.data.brand);
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast.error('Error fetching brands');
      }
    };

    fetchBrands();
  }, []);

  // Pagination: Calculate the brands to show for the current page
  const indexOfLastBrand = currentPage * brandsPerPage;
  const indexOfFirstBrand = indexOfLastBrand - brandsPerPage;
  const currentBrands = brands.slice(indexOfFirstBrand, indexOfLastBrand);



  // Validation function for brand names
const validateBrandName = (name) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return 'Brand name cannot be empty.';
  }
  
  if (trimmedName.length < 3) {
    return 'Brand name must be at least 3 characters long.';
  }
  if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
    return 'Brand name can only contain letters, numbers, and spaces.';
  }
  if(brands.find((brand) => brand.name.toLowerCase() === trimmedName.toLowerCase())){
    return 'Brand name already exists'
  }
  
  return '';
};


  // Change page handler
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleStatusChange = async (id, currentStatus) => {
    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `You are about to ${currentStatus === 'active' ? 'block' : 'unblock'} this brand.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });
  
    if (result.isConfirmed) {
      try {
        const response = await axiosInstance.patch(`/toggleBrandStatus/${id}`);
        setBrands((prevBrands) =>
          prevBrands.map((brand) =>
            brand._id === id ? { ...brand, status: currentStatus === 'active' ? 'blocked' : 'active' } : brand
          )
        );
        Swal.fire('Success!', response.data.message || 'Brand status updated successfully', 'success');
      } catch (error) {
        console.error('Error updating brand status:', error);
        Swal.fire('Error!', 'Failed to update brand status', 'error');
      }
    }
  };
  

  
  const handleAddBrand = async (e) => {
    e.preventDefault();
    const name = newBrand.name.trim();
    const validationError = validateBrandName(name,brands);
    
    if (validationError) {
      setAddError(validationError);
      return;
    }
  
    try {
      await axiosInstance.post('/addbrand', { name, status: "active" });
      setBrands([...brands, { _id: brands.length + 1, name, status: 'active' }]);
      setNewBrand({ name: '' });
      setAddError('');
      toast.success('Brand added successfully');
    } catch {
      toast.error('Error adding brand');
    }
  };
  

  const handleEditBrand = (brand) => {
    setEditingBrand({ ...brand });
    setShowEditModal(true);
    setEditError('');
  };

  const handleUpdateBrandName = async () => {
    const name = editingBrand.name.trim();
    const validationError = validateBrandName(name, brands, editingBrand._id); 
    if (validationError) {
      setEditError(validationError);
      return;
    }
    try {
      const response = await axiosInstance.patch(`/updateBrandName/${editingBrand._id}`, { name });
      setBrands((prevBrands) =>
        prevBrands.map((brand) =>
          brand._id === editingBrand._id ? { ...brand, name } : brand
        )
      );
      setShowEditModal(false);
      setEditingBrand(null);
      setEditError('');
      toast.success(response.data.message || 'Brand name updated successfully');
    } catch (error) {
      console.error('Error updating brand name:', error);
      toast.error('Failed to update brand name');
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingBrand(null);
    setEditError('');
  };

  // Calculate total pages
  const totalPages = Math.ceil(brands.length / brandsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="text-3xl font-bold mb-6">Brand Management</h1>

      {/* Add New Brand Form */}
      <form onSubmit={handleAddBrand} className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Brand</h2>
        <div>
          <Label htmlFor="brandName">Brand Name</Label>
          <Input
            id="brandName"
            value={newBrand.name}
            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
            placeholder="Enter brand name"
            required
          />
          {addError && <p className="text-red-500 mt-2">{addError}</p>}
        </div>
        <Button type="submit" className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
        </Button>
      </form>

      {/* Brands Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Name</TableHead>
              <TableHead className="w-1/5">Status</TableHead>
              <TableHead className="w-1/4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentBrands.map((brand) => (
              <TableRow key={brand._id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      brand.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {brand.status === 'active' ? 'Active' : 'Blocked'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditBrand(brand)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={brand.status === 'active'}
                      onCheckedChange={() => handleStatusChange(brand._id, brand.status)}
                    />
                    <span className="text-sm text-gray-500">
                      {brand.status === 'active' ? 'Block' : 'Unblock'}
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold">Edit Brand</h2>
              <Button variant="ghost" onClick={handleCloseModal}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div>
              <Label htmlFor="editBrandName">Brand Name</Label>
              <Input
                id="editBrandName"
                value={editingBrand.name}
                onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                placeholder="Enter brand name"
                required
              />
              {editError && <p className="text-red-500 mt-2">{editError}</p>}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpdateBrandName}>
                <Pencil className="mr-2 h-4 w-4" /> Update Brand
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandManagement;

