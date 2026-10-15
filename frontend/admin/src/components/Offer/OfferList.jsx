import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/axios/adminAxios';
import { toast } from 'react-hot-toast';

export default function OfferList() {
  const [offers, setOffers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const offersPerPage = 5;

  useEffect(() => {
    fetchOffers();
  }, []);

  const navigate = useNavigate();

  const fetchOffers = async () => {
    
    const response = await axiosInstance.get(`/Offer/fetch`);
    console.log(response.data.offersData)
    setOffers(response.data.offersData);

    
  };

  console.log("offerss",offers)
  const handleEdit = (offer) => {
    navigate(`/edit/offer/${offer._id}`, { state: { offer } });
    console.log('Edit offer:', offer);
  };
  

  const handleDelete = async(offerId) => {

    try {

      const response = await axiosInstance.delete(`/Offer/remove/${offerId}`);
      toast.success(response.data.message);

      setOffers((prevOffers)=>prevOffers.filter((offer)=>offer._id !== offerId));
      
    } catch (error) {
      console.error("Error in deleting offers:",error)
      toast.error("Failed to delete the offer.")
    }

  };

  const handleAddOffer = ()=>{
    navigate('/Add/Offers')
  }

  // Pagination
  const indexOfLastOffer = currentPage * offersPerPage;
  const indexOfFirstOffer = indexOfLastOffer - offersPerPage;
  const currentOffers = offers.slice(indexOfFirstOffer, indexOfLastOffer);
  const totalPages = Math.ceil(offers.length / offersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  return (
    <div className="p-4 sm:p-6 lg:p-10">
     
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Offer List</h1>
        <Button onClick={handleAddOffer}>
          <PlusCircle className="mr-2 h-4 w-4" />  Create Offer
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/5">Name</TableHead>
              <TableHead className="w-1/5">Discount</TableHead>
              <TableHead className="w-1/5">Type</TableHead>
              <TableHead className="w-1/5">Start Date</TableHead>
              <TableHead className="w-1/5">End Date</TableHead>
              <TableHead className="w-1/5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOffers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell className="font-medium">{offer.name}</TableCell>
                <TableCell>{offer.discountPercent}%</TableCell>
                <TableCell>{offer.targetType}</TableCell>
                <TableCell>{format(new Date(offer.startDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{format(new Date(offer.endDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(offer)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(offer._id)}
                    >
                      <Trash2 className="h-4 w-4" />
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

