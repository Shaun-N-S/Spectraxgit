import PropTypes from "prop-types"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const PriceDisplay = ({ originalPrice, productOffer, categoryOffer, className = "", showSavingsBadge = true }) => {
  const calculateBestDiscount = () => {
    let bestDiscountPercent = 0
    const currentDate = new Date()

    // Check product offer
    if (
      productOffer &&
      productOffer.isActive &&
      new Date(productOffer.startDate) <= currentDate &&
      new Date(productOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(bestDiscountPercent, productOffer.discountPercent)
    }

    // Check category offer
    if (
      categoryOffer &&
      categoryOffer.isActive &&
      new Date(categoryOffer.startDate) <= currentDate &&
      new Date(categoryOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(bestDiscountPercent, categoryOffer.discountPercent)
    }

    if (bestDiscountPercent === 0) return null

    const discountedPrice = originalPrice - originalPrice * (bestDiscountPercent / 100)
    const savings = originalPrice - discountedPrice

    return {
      discountedPrice,
      originalPrice,
      savings,
      discountPercent: bestDiscountPercent,
    }
  }

  const discount = calculateBestDiscount()

  return (
    <div className={`flex items-baseline gap-4 ${className}`}>
      {discount ? (
        <>
          <span className="text-3xl font-bold text-white">{formatCurrency(discount.discountedPrice)}</span>
          <span className="text-lg text-red-400 line-through">{formatCurrency(discount.originalPrice)}</span>
          {showSavingsBadge && (
            <Badge variant="secondary" className="ml-2 bg-green-400">
              Save {formatCurrency(discount.savings)} ({discount.discountPercent}% OFF)
            </Badge>
          )}
        </>
      ) : (
        <span className="text-3xl font-bold text-white">{formatCurrency(originalPrice)}</span>
      )}
    </div>
  )
}

const offerShape = PropTypes.shape({
  isActive: PropTypes.bool,
  startDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  discountPercent: PropTypes.number,
})

PriceDisplay.propTypes = {
  originalPrice: PropTypes.number.isRequired,
  productOffer: offerShape,
  categoryOffer: offerShape,
  className: PropTypes.string,
  showSavingsBadge: PropTypes.bool,
}

export default PriceDisplay

