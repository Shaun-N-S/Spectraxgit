import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";

// Page controls driven by the backend's `pagination` metadata. Hidden when
// there is only one page.
const PaginationControls = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = pagination;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap justify-center items-center gap-2">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="px-3 py-1 text-gray-600"
        >
          Previous
        </Button>
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const isActive = page === currentPage;
          return (
            <Button
              key={page}
              variant={isActive ? "default" : "outline"}
              onClick={() => onPageChange(page)}
              aria-current={isActive ? "page" : undefined}
              className={`px-3 py-1 ${
                isActive
                  ? "border border-transparent bg-green-500 text-black hover:bg-green-600"
                  : "text-gray-600"
              }`}
            >
              {page}
            </Button>
          );
        })}
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="px-3 py-1 text-gray-600"
        >
          Next
        </Button>
      </div>
      <p className="mt-2 text-center text-sm text-gray-400">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  );
};

PaginationControls.propTypes = {
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    hasPreviousPage: PropTypes.bool.isRequired,
    hasNextPage: PropTypes.bool.isRequired,
  }),
  onPageChange: PropTypes.func.isRequired,
};

export default PaginationControls;
