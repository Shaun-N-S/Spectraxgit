import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/axios/adminAxios';
import { useLocation, useParams } from 'react-router-dom';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Offer name must be at least 2 characters.',
  }),
  discountPercent: z.number().min(0).max(100),
  startDate: z.date(),
  endDate: z.date(),
  targetType: z.enum(['product', 'category']),
  targetId: z.string().min(1, {
    message: 'Please select a target.',
  }),
  isActive: z.boolean().default(true),
});

export default function AddOffer() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { offerId } = useParams();

  const existingOffer = location.state?.offer; // Get offer data passed from the OfferList
  const isEditing = !!existingOffer;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? {
          name: existingOffer.name,
          discountPercent: existingOffer.discountPercent,
          startDate: new Date(existingOffer.startDate),
          endDate: new Date(existingOffer.endDate),
          targetType: existingOffer.targetType,
          targetId: existingOffer.targetId,
          isActive: existingOffer.isActive,
        }
      : {
          name: '',
          discountPercent: 0,
          startDate: new Date(),
          endDate: new Date(),
          targetType: 'product',
          targetId: '',
          isActive: true,
        },
  });


  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const ProductData = await axiosInstance.get('/showproductsIsActive');
    setProducts(ProductData.data.products);
    console.log("product data.....",ProductData)
  };

  
  const fetchCategories = async () => {
    const categoryData = await axiosInstance.get('/getallcategoryIsactive');
    setCategories(categoryData.data.categories);
  };

  console.log(categories)


  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        // Update existing offer
        await axiosInstance.put(`/Offer/update/${offerId}`, values);
        toast.success('Offer updated successfully.');
      } else {
        // Add new offer
        await axiosInstance.post('/Offer/Add', values);
        toast.success('The offer has been successfully created.');
      }
      navigate('/offers');
      form.reset();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? 'Error updating the offer.' : 'Error creating the offer.')
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handleCancel = ()=>{
    navigate('/offers')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
     <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Edit Offer' : 'Create New Offer'}
      </h1>
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter offer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.watch('targetType') === 'product'
                          ? products.map((product) => (
                              <SelectItem key={product._id} value={product._id.toString()}>
                                {product.title}
                              </SelectItem>
                            ))
                          : categories.map((category) => (
                              <SelectItem key={category._id} value={category._id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-5 mt-5">
              <Button type="submit" disabled={isLoading}>
                {isEditing ? 'Update Offer' : 'Create Offer'}
              </Button>
              <div>
              <Button type="button" onClick={handleCancel}>Cancel</Button>
              </div>
            </div>
          </form>
        </Form>
        
      </div>
    </div>
  );
}

