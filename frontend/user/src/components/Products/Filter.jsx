import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import axiosInstance from "../../axios/userAxios"

const FilterComponent = ({ isOpen, setIsOpen, setProducts }) => {
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedSort, setSelectedSort] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandsResponse = await axiosInstance.get('/Brand/active')
        const categoriesResponse = await axiosInstance.get('/category/active')
        console.log("fetched categories",categoriesResponse.data)
        console.log("fetched brands",brandsResponse.data.brand)
        setBrands(brandsResponse.data.brand)
        setCategories(categoriesResponse.data.categories)
      } catch (error) {
        console.log('Error while fetching data in filter component', error)
      }
    }
    fetchData()
  }, [])

  const toggleModal = () => setIsOpen(!isOpen);

  const modalVariants = {
    closed: { x: "-100%", opacity: 0 },
    open: { x: 0, opacity: 1 }
  };

  const handleSortChange = (value) => {
    setSelectedSort(value)
  }

  const handleBrandChange = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleApplyFilter = async () => {
    try {
      const response = await axiosInstance.get("/filterProduct", {
        params: {
          sortBy: selectedSort,
          brands: selectedBrands,
          categories: selectedCategories,
          // minPrice: priceRange[0],
          // maxPrice: priceRange[1],
        },
      });
      setProducts(response.data)
      
      setIsOpen(false)
    } catch (error) {
      console.log('Error applying filters:', error)
    }
  }

  return (
    <>
      <Button 
  onClick={toggleModal} 
  className="left-4 mb-7 z-50 bg-green-500 hover:bg-green-600 text-black"
>
  <Filter className="mr-2 h-4 w-4" /> Filters
</Button>
      <AnimatePresence>
        {isOpen && (
            <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={modalVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-80 bg-gray-900 border-r border-gray-800 shadow-lg shadow-green-500/20 z-50 overflow-y-auto no-scrollbar"
            style={{
              scrollbarWidth: 'none',  // Firefox
              msOverflowStyle: 'none',  // IE 10+
            }}
          >
            <style>{`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-bold text-green-400">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleModal}
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-6 ">
                <div className="space-y-2">
                  <Label className="text-green-400 font-medium">Sort By</Label>
                  <Select onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white hover:border-green-400 transition-colors">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {/* <SelectItem value="popularity" className="hover:bg-gray-700">Popularity</SelectItem> */}
                      <SelectItem value="price-low-high" className="hover:bg-gray-700">Price: Low to High</SelectItem>
                      <SelectItem value="price-high-low" className="hover:bg-gray-700">Price: High to Low</SelectItem>
                      {/* <SelectItem value="average-rating" className="hover:bg-gray-700">Average Rating</SelectItem> */}
                      {/* <SelectItem value="featured" className="hover:bg-gray-700">Featured</SelectItem> */}
                      <SelectItem value="new-arrivals" className="hover:bg-gray-700">New Arrivals</SelectItem>
                      <SelectItem value="a-z" className="hover:bg-gray-700">A - Z</SelectItem>
                      <SelectItem value="z-a" className="hover:bg-gray-700">Z - A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* <div className="space-y-2">
                  <Label className="text-green-400 font-medium">Price Range</Label>
                  <Slider
                    min={0}
                    max={100000}
                    step={10}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="mt-2"
                  />
                  <div className="flex justify-between mt-2 text-gray-400">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                </div> */}

                <div className="space-y-2">
                  <Label className="text-green-400 font-medium">Brand</Label>
                  <div className="space-y-2 mt-2">
                    {brands.map((brand) => (
                      <div key={brand._id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={brand._id}
                          checked={selectedBrands.includes(brand._id)}
                          onCheckedChange={() => handleBrandChange(brand._id)}
                          className="border-gray-700 data-[state=checked]:bg-green-400 data-[state=checked]:border-green-400" 
                        />
                        <Label htmlFor={brand._id} className="text-gray-300 hover:text-white cursor-pointer">{brand.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-green-400 font-medium">Category</Label>
                  <div className="space-y-2 mt-2">
                    {categories.map((category) => (
                      <div key={category._id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={category._id}
                          checked={selectedCategories.includes(category._id)}
                          onCheckedChange={() => handleCategoryChange(category._id)}
                          className="border-gray-700 data-[state=checked]:bg-green-400 data-[state=checked]:border-green-400" 
                        />
                        <Label htmlFor={category._id} className="text-gray-300 hover:text-white cursor-pointer">{category.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
              onClick={() => {
                    handleApplyFilter();
                    toggleModal();
                  }}
                 className="w-full bg-green-500 text-black hover:bg-green-600 transition-colors font-medium">
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Also rendered without props by the /filter route, so all are optional
FilterComponent.propTypes = {
  isOpen: PropTypes.bool,
  setIsOpen: PropTypes.func,
  setProducts: PropTypes.func,
};

export default FilterComponent;

