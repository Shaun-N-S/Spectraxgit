import { useEffect, useState } from 'react';
import { FaEdit, FaPlusCircle } from 'react-icons/fa';
import axios from '../../axios/adminAxios';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';


const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [fetch, setFetch] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoriesPerPage] = useState(5);

  // Error state for add and edit
  const [errors, setErrors] = useState({
    categoryName: '',
    categoryDescription: '',
  });
  const [isButtonClicked, setIsButtonClicked] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/getallcategory');
        setCategories(response.data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Error fetching categories');
      }
    };
    fetchCategories();
  }, [fetch]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setIsButtonClicked(true); // Show the button clicked state

    // Trim spaces
    const trimmedCategoryName = newCategory.trim();
    const trimmedCategoryDescription = newCategoryDescription.trim();

    // Validation checks
    let validationErrors = {};
    if (!trimmedCategoryName || !trimmedCategoryDescription) {
      if (!trimmedCategoryName) validationErrors.categoryName = 'Category name is required';
      if (!trimmedCategoryDescription) validationErrors.categoryDescription = 'Category description is required';
    } else {
      // Check for numbers in the category name and description
      if (/\d/.test(trimmedCategoryName)) {
        validationErrors.categoryName = 'Category name should not contain numbers';
      }
      if (/\d/.test(trimmedCategoryDescription)) {
        validationErrors.categoryDescription = 'Category description should not contain numbers';
      }

      if (trimmedCategoryName.length < 3 || trimmedCategoryName.length > 50) {
        validationErrors.categoryName = 'Category name must be between 3 and 50 characters';
      }
      if (trimmedCategoryDescription.length < 10 || trimmedCategoryDescription.length > 200) {
        validationErrors.categoryDescription = 'Category description must be between 10 and 200 characters';
      }

      const duplicate = categories.find(
        (cat) => cat.name.toLowerCase() === trimmedCategoryName.toLowerCase()
      );
      if (duplicate) {
        validationErrors.categoryName = 'Category already exists';
      }
    }

    // If validation errors exist, set them and return early
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsButtonClicked(false); // Reset button state
      return;
    }

    try {
      // Send the new category to the server
      await axios.post('/category', {
        name: trimmedCategoryName,
        description: trimmedCategoryDescription,
      });

      // Clear inputs and refresh the list
      setNewCategory('');
      setNewCategoryDescription('');
      setFetch(!fetch);
      toast.success('Category added successfully');
      setIsButtonClicked(false); // Reset button state
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Error adding category');
      setIsButtonClicked(false); // Reset button state
    }
  };

  const handleEditCategory = async () => {
    const trimmedName = editCategoryName.trim();
    const trimmedDescription = editCategoryDescription.trim();

    // Validation checks
    let validationErrors = {};
    if (!trimmedName || !trimmedDescription) {
      if (!trimmedName) validationErrors.categoryName = 'Category name is required';
      if (!trimmedDescription) validationErrors.categoryDescription = 'Category description is required';
    } else {
      // Check for numbers in the category name and description
      if (/\d/.test(trimmedName)) {
        validationErrors.categoryName = 'Category name should not contain numbers';
      }
      if (/\d/.test(trimmedDescription)) {
        validationErrors.categoryDescription = 'Category description should not contain numbers';
      }

      if (trimmedName.length < 3 || trimmedName.length > 50) {
        validationErrors.categoryName = 'Category name must be between 3 and 50 characters';
      }
      if (trimmedDescription.length < 10 || trimmedDescription.length > 200) {
        validationErrors.categoryDescription = 'Category description must be between 10 and 200 characters';
      }

      const duplicate = categories.find(
        (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase() && cat._id !== selectedId
      );
      if (duplicate) {
        validationErrors.categoryName = 'Category with this name already exists';
      }
    }

    // If validation errors exist, set them and return early
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await axios.put(`/editcategory/${selectedId}`, { name: trimmedName, description: trimmedDescription });
      setFetch(!fetch);
      setIsEditOpen(false);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error editing category:', error);
      toast.error('Error editing category');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // Confirmation Alert Before Changing Status
      const result = await Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to ${newStatus} this category?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, ${newStatus} it!`,
        cancelButtonText: 'Cancel',
      });
  
      if (result.isConfirmed) {
        await axios.patch(`/toggleCategoryStatus/${id}`, { status: newStatus });
        
        // Update local state
        setCategories((prevCategories) =>
          prevCategories.map((category) =>
            category._id === id ? { ...category, status: newStatus } : category
          )
        );
  
        // Success Alert
        Swal.fire({
          title: 'Success!',
          text: `Category has been ${newStatus}d.`,
          icon: 'success',
        });
      }
    } catch (error) {
      console.error('Error toggling category status:', error);
  
      // Error Alert
      Swal.fire({
        title: 'Error!',
        text: 'Failed to change category status. Please try again later.',
        icon: 'error',
      });
    }
  };

  // Pagination logic
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = categories.slice(indexOfFirstCategory, indexOfLastCategory);

  const totalPages = Math.ceil(categories.length / categoriesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 border-l-4 border-blue-500 pl-4">
            Category Management
          </h1>

          {/* Add New Category */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Category</h2>
            <form onSubmit={handleAddCategory} className="flex flex-col space-y-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.categoryName ? 'border-red-500' : ''
                }`}
              />
              {errors.categoryName && (
                <p className="text-red-500 text-sm">{errors.categoryName}</p>
              )}
              <textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter category description"
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.categoryDescription ? 'border-red-500' : ''
                }`}
              />
              {errors.categoryDescription && (
                <p className="text-red-500 text-sm">{errors.categoryDescription}</p>
              )}
              <Button
                type="submit"
                className={`${
                  isButtonClicked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                } text-white px-4 py-2 rounded-lg flex items-center space-x-2`}
                disabled={isButtonClicked}
              >
                {isButtonClicked ? 'Adding...' : <><FaPlusCircle /><span>Add</span></>}
              </Button>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="py-4 px-6">S.No</th>
                  <th className="py-4 px-6">Category Name</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCategories.map((category, index) => (
                  <tr key={category._id}>
                    <td className="py-4 px-6">{index + indexOfFirstCategory + 1}</td>
                    <td className="py-4 px-6">{category.name}</td>
                    <td className="py-4 px-6">{category.description}</td>
                    <td className="py-4 px-6">{category.status}</td>
                    <td className="py-4 px-6 text-center space-x-2">
                      <Button
                        onClick={() => {
                          setIsEditOpen(true);
                          setSelectedId(category._id);
                          setEditCategoryName(category.name);
                          setEditCategoryDescription(category.description);
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        onClick={() => handleToggleStatus(category._id, category.status)}
                        className={`${
                          category.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                        } text-white px-4 py-2 rounded`}
                      >
                        {category.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-300 text-white rounded-lg"
              >
                Prev
              </button>
              <div className="px-4 py-2 text-gray-700">{currentPage}</div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-300 text-white rounded-lg"
              >
                Next
              </button>
            </div>
          </div>

          {/* Edit Category Modal */}
          {isEditOpen && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Edit Category</h3>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 ${
                    errors.categoryName ? 'border-red-500' : ''
                  }`}
                />
                {errors.categoryName && (
                  <p className="text-red-500 text-sm">{errors.categoryName}</p>
                )}
                <textarea
                  value={editCategoryDescription}
                  onChange={(e) => setEditCategoryDescription(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 ${
                    errors.categoryDescription ? 'border-red-500' : ''
                  }`}
                />
                {errors.categoryDescription && (
                  <p className="text-red-500 text-sm">{errors.categoryDescription}</p>
                )}
                <div className="flex justify-between">
                  <Button
                    onClick={() => setIsEditOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditCategory}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
