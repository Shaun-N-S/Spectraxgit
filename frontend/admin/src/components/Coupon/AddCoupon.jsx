import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import axiosInstance from "@/axios/adminAxios";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

const formSchema = z
  .object({
    couponCode: z.string().min(3, {
      message: "Coupon code must be at least 3 characters.",
    }),
    couponType: z.enum(["percentage", "fixed"]),
    description: z.string().min(10, {
      message: "Description must be at least 10 characters.",
    }),
    discountValue: z.number().positive({
      message: "Discount value must be a positive number.",
    }),
    minimumPrice: z.number().nonnegative({
      message: "Minimum price must be a non-negative number.",
    }),
    expireDate: z.date({
      required_error: "Expiration date is required.",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.couponType === "percentage" && values.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discount cannot exceed 100%.",
        path: ["discountValue"],
      });
    }
  });

export default function AddCoupon() {
  const location = useLocation();
  const isEditing = location.state?.isEditing;
  const editData = location.state?.couponData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Convert the date string to a Date object for the form
  const initialExpireDate = editData?.expireOn
    ? new Date(editData.expireOn)
    : new Date();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      couponCode: editData?.couponCode || "",
      couponType: editData?.CouponType || editData?.couponType || "percentage",
      description: editData?.description || "",
      discountValue: editData?.discountValue || 0,
      minimumPrice: editData?.minimumPrice || 0,
      expireDate: initialExpireDate,
    },
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        // Map form values to match the backend schema
        console.log("id", editData._id);
        const updateData = {
          id: editData.id, // Include the ID
          name: values.couponCode,
          CouponType: values.couponType,
          description: values.description,
          offerPrice: values.discountValue,
          minimumPrice: values.minimumPrice,
          expireOn: values.expireDate.toISOString(), // Convert date to ISO format
        };

        console.log("Update Payload:", updateData); // Debugging log

        await axiosInstance.post("/Coupon/update", updateData);
        toast.success("Coupon updated successfully!");
      } else {
        await axiosInstance.post("/Coupon/Add", values);
        toast.success("Coupon added successfully!");
      }
      navigate("/coupons");
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "add"} coupon`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ml-[280px] p-10">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? "Edit Coupon" : "Add New Coupon"}
      </h1>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-8 p-4 bg-gray-100 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="couponCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter coupon code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="couponType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coupon type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter discount value"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter minimum price"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter coupon description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expireDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiration Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
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
                          date < new Date() || date > new Date("2100-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="mt-4" disabled={isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
                ? "Update Coupon"
                : "Add Coupon"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
