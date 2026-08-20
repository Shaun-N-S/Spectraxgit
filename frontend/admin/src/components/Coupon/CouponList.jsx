import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axiosInstance from "@/axios/adminAxios";
import Swal from "sweetalert2";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

function CouponList() {
  const [coupons, setCoupons] = useState([]);

  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const couponsPerPage = 5;

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axiosInstance.get("/Coupon/fetch");
        setCoupons(response.data.couponData);
      } catch (error) {
        console.error("Error fetching coupons:", error);
        toast.error("Error fetching coupons");
      }
    };

    fetchCoupons();
  }, []);

  // Pagination: Calculate the coupons to show for the current page
  const indexOfLastCoupon = currentPage * couponsPerPage;
  const indexOfFirstCoupon = indexOfLastCoupon - couponsPerPage;
  const currentCoupons = coupons.slice(indexOfFirstCoupon, indexOfLastCoupon);

  // Change page handler
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Calculate total pages
  const totalPages = Math.ceil(coupons.length / couponsPerPage);

  const handleAddCoupon = () => {
    navigate("/Add/Coupon");
  };

  const handleEdit = (coupon) => {
    navigate("/Add/Coupon", {
      state: {
        isEditing: true,
        couponData: {
          id: coupon._id,
          couponCode: coupon.name,
          CouponType: coupon.CouponType,
          couponType: coupon.CouponType,
          description: coupon.description,
          discountValue: coupon.offerPrice,
          minimumPrice: coupon.minimumPrice,
          expireDate: new Date(coupon.expireOn),
        },
      },
    });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this coupon!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, keep it",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (result.isConfirmed) {
      try {
        await axiosInstance.patch("/Coupon/remove", { id });
        setCoupons(coupons.filter((coupon) => coupon._id !== id));
        Swal.fire("Deleted!", "The coupon has been deleted.", "success");
      } catch (error) {
        console.error("Error deleting coupon:", error);
        Swal.fire("Error!", "Failed to delete the coupon.", "error");
      }
    }
  };

  return (
    <div className="ml-[280px] p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Coupon Management</h1>
        <Button onClick={handleAddCoupon}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/5">Name</TableHead>
              <TableHead className="w-1/4">Description</TableHead>
              <TableHead className="w-1/5">Created Date</TableHead>
              <TableHead className="w-1/5">Expiry Date</TableHead>
              <TableHead className="w-1/5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCoupons.map((coupon) => (
              <TableRow key={coupon._id}>
                <TableCell className="font-medium">{coupon.name}</TableCell>
                <TableCell>{coupon.description}</TableCell>
                <TableCell>
                  {format(new Date(coupon.createdOn), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  {format(new Date(coupon.expireOn), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(coupon)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(coupon._id)}
                    >
                      <Trash2 />
                    </Button>
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

export default CouponList;
