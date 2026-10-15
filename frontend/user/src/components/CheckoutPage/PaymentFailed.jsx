import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      {/* Card */}
      <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {/* Icon */}
        <div className="flex justify-center items-center mb-6">
          <div className="bg-red-600 text-white rounded-full p-4">
            <AlertCircle className="h-10 w-10" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-400 mb-4">Payment Failed</h1>

        {/* Description */}
        <p className="text-gray-400 mb-6">
          Unfortunately, we couldn’t process your payment. Please check your payment details or try again.
        </p>

        {/* Retry and Back Buttons */}
        <div className="flex justify-center gap-4">
          {/* <Button
            className="bg-red-600 text-white hover:bg-red-700 transition-all"
            onClick={() => navigate("/retry-payment")}
          >
            Retry Payment
          </Button> */}
          <Button
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-700"
            onClick={() => navigate("/Account")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
