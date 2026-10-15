import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/axios/adminAxios';
// import { toast } from 'react-toastify';
import {toast} from 'react-hot-toast';
import { uploadProductImage } from '@/lib/cloudinaryUpload';
import Cropper from 'react-easy-crop';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  getPriceError,
  getQuantityError,
  getSpecificationError,
  hasVariantErrors,
  validateSpecifications,
  validateVariants,
} from './productValidation';

const AddProduct = () => {

  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status] = useState('active');
  const [variants, setVariants] = useState([{ 
    attributes: [], 
    sku: '', 
    price: '', 
    availableQuantity: '',
    specifications: {}
  }]);
  const [variantErrors, setVariantErrors] = useState([]);
  const [variantAttributes, setVariantAttributes] = useState([
    { attribute: '', values: [''] }
  ]);
  const [specifications, setSpecifications] = useState({
    brand: '',
    model: '',
    series: '',
    warranty: '',
    manufacturer: '',
    itemWeight: '',
    dimensions: '',
    countryOfOrigin: ''
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [zoom, setZoom] = useState(1);
  const [currentImage, setCurrentImage] = useState(null);
  const [croppedAreas, setCroppedAreas] = useState([]);
  const [showCropper, setShowCropper] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Submission error the backend (or image upload) reported that belongs to no single field
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({
    title: '',
    sku: '',
    price: '',
    color: '',
    availableQuantity: '',
    description: '',
    categoryId: '',
    brandId: '',
    images: '',
    specifications: {
      model: '',
      series: '',
      warranty: '',
      manufacturer: '',
      itemWeight: '',
      dimensions: '',
      countryOfOrigin: ''
    }
  });

  useEffect(() => {
    axiosInstance.get('/getallcategoryIsactive')
      .then((res) => setCategories(res.data.categories))
      .catch(() => toast.error('Error fetching categories'));

    axiosInstance.get('/getallIsactiveBrands')
      .then((res) => setBrands(res.data.brand))
      .catch(() => toast.error('Error fetching brands'));
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
      0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const onCropComplete = useCallback(async (croppedArea, croppedAreaPixels) => {
    setCroppedAreas(prev => [...prev, croppedAreaPixels]);
  }, []);

  const handleImageSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        await validateImage(file);
        setErrors(prev => ({ ...prev, images: '' }));
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setCurrentImage(reader.result);
          setShowCropper(true);
        };
      } catch (error) {
        setErrors(prev => ({ ...prev, images: error }));
        // Reset the file input
        e.target.value = '';
      }
    }
  };

  const handleCropSave = async () => {
    try {
      if (currentImage && croppedAreas.length > 0) {
        const lastCroppedArea = croppedAreas[croppedAreas.length - 1];
        const croppedBlob = await getCroppedImg(currentImage, lastCroppedArea);
        const croppedImage = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
        setProductImages(prev => [...prev, croppedImage]);
        setPreviewImages(prev => [...prev, URL.createObjectURL(croppedBlob)]);
        setShowCropper(false);
        setCurrentImage(null);
        setCroppedAreas([]);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Error cropping image');
    }
  };

  const removeImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prevVariants) => {
      const updatedVariants = [...prevVariants];
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        updatedVariants[index][parent] = {
          ...updatedVariants[index][parent],
          [child]: value
        };
      } else {
        updatedVariants[index][field] = value;
      }
      return updatedVariants;
    });
    setVariantErrors((prev) => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      updated[index] = validateVariants([{ ...variants[index], [field]: value }])[0];
      return updated;
    });
  };

  const handleAttributeChange = (index, value) => {
    setVariantAttributes(prev => {
      const updated = [...prev];
      updated[index].attribute = value;
      return updated;
    });
  };

  const handleAttributeValueChange = (attrIndex, valueIndex, value) => {
    setVariantAttributes(prev => {
      const updated = [...prev];
      updated[attrIndex].values[valueIndex] = value;
      return updated;
    });
  };

  const addAttributeValue = (attrIndex) => {
    setVariantAttributes(prev => {
      const updated = [...prev];
      updated[attrIndex].values.push('');
      return updated;
    });
  };

  const removeAttributeValue = (attrIndex, valueIndex) => {
    setVariantAttributes(prev => {
      const updated = [...prev];
      updated[attrIndex].values = updated[attrIndex].values.filter((_, index) => index !== valueIndex);
      return updated;
    });
  };

  const addNewAttribute = () => {
    setVariantAttributes(prev => [...prev, { attribute: '', values: [''] }]);
  };

  const removeAttribute = (index) => {
    setVariantAttributes(prev => prev.filter((_, i) => i !== index));
    generateVariants(); // Regenerate variants when an attribute is removed
  };

  const generateVariants = () => {
    // Filter out attributes with empty names or values
    const validAttributes = variantAttributes.filter(attr => 
      attr.attribute.trim() !== '' && attr.values.some(v => v.trim() !== '')
    );

    if (validAttributes.length === 0) {
      setVariants([{ 
        attributes: [], 
        sku: '', 
        price: '', 
        availableQuantity: '',
        specifications: {}
      }]);
      return;
    }

    // Generate all possible combinations
    const generateCombinations = (arrays) => {
      const result = arrays.reduce((acc, curr) => {
        const temp = [];
        acc.forEach(x => {
          curr.forEach(y => {
            temp.push([...x, y]);
          });
        });
        return temp;
      }, [[]]);
      return result;
    };

    const attributeValues = validAttributes.map(attr => 
      attr.values.filter(value => value.trim() !== '')
    );
    
    const combinations = generateCombinations(attributeValues);
    
    // Create variants based on combinations
    const newVariants = combinations.map(combination => {
      const variantAttributes = combination.map((value, index) => ({
        name: validAttributes[index].attribute,
        value: value
      }));

      return {
        attributes: variantAttributes,
        sku: '',
        price: '',
        availableQuantity: '',
        specifications: {}
      };
    });

    setVariants(newVariants);
  };

  const handleSpecificationChange = (key, value) => {
    setSpecifications(prev => ({
      ...prev,
      [key]: value
    }));
    
    setErrors(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: getSpecificationError(key, value)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');
  
    // Validate all fields
    const specErrors = validateSpecifications(specifications);
    const newErrors = {
      title: validateField('title', title),
      sku: validateField('sku', sku),
      price: validateField('price', price),
      color: validateField('color', color),
      availableQuantity: validateField('availableQuantity', availableQuantity),
      description: validateField('description', description),
      categoryId: !categoryId ? 'Please select a category' : '',
      brandId: !brandId ? 'Please select a brand' : '',
      images: productImages.length === 0 ? 'Please add at least one product image' : '',
      specifications: specErrors
    };
    const newVariantErrors = validateVariants(variants);

    setErrors(newErrors);
    setVariantErrors(newVariantErrors);

    const hasFieldErrors = Object.entries(newErrors).some(([key, value]) =>
      key === 'specifications' ? Object.keys(value).length > 0 : Boolean(value)
    );
    if (hasFieldErrors || hasVariantErrors(newVariantErrors)) {
      toast.error('Please fix the highlighted fields');
      // Bring the first highlighted field into view once the errors render
      setTimeout(() => {
        const firstInvalid = document.querySelector('form .border-red-500');
        firstInvalid?.scrollIntoView({ block: 'center' });
        firstInvalid?.focus();
      }, 0);
      return;
    }

    setIsSubmitting(true);
    try {
  
      // Upload images to Cloudinary (signed by the backend)
      const imageUrls = await Promise.all(
        productImages.map((image) => uploadProductImage(image))
      );
  
      const selectedBrand = brands.find(b => b.name === specifications.brand);
      
      // Prepare product data
      const productData = {
        title,
        sku,
        price,
        color,
        availableQuantity,
        description,
        categoryId,
        brandId,
        productImages: imageUrls,
        status,
        variants,
        specifications: {
          ...specifications,
          brand: selectedBrand ? selectedBrand._id : ''
        },
      };
  
      await axiosInstance.post('/product', productData);
      toast.success('Product added successfully!');
      
      resetForm();
      
      navigate('/products');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Error adding product. Please check the console for more details.');
      setFormError(
        error.response?.data?.message ||
          (String(error.config?.url).includes('cloudinary')
            ? 'Image upload failed. Please check your connection and try again.'
            : 'Could not add the product. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anything entered that leaving the page would lose
  const hasUnsavedChanges = () =>
    [title, sku, price, color, availableQuantity, description, categoryId, brandId].some(
      (value) => String(value).trim() !== ''
    ) ||
    productImages.length > 0 ||
    Object.values(specifications).some((value) => String(value ?? '').trim() !== '') ||
    variants.length !== 1 ||
    variants.some(
      (variant) =>
        variant.attributes.length > 0 ||
        ['sku', 'price', 'availableQuantity'].some((field) => String(variant[field] ?? '').trim() !== '')
    ) ||
    variantAttributes.some((attr) => attr.attribute.trim() || attr.values.some((value) => value.trim()));

  // Close / Cancel: back to the product list without submitting. Asks first
  // only when something has been entered.
  const handleClose = async () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges()) {
      const result = await Swal.fire({
        title: 'Discard this product?',
        text: 'The details you entered will not be saved.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep editing',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      });
      if (!result.isConfirmed) return;
    }
    navigate('/products');
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        return value.length < 3 ? 'Title must be at least 3 characters' : '';
      case 'sku':
        return value.length < 4 ? 'SKU must be at least 4 characters' : '';
      case 'price':
        return getPriceError(value);
      case 'color':
        return value.length < 2 ? 'Color must be at least 2 characters' : '';
      case 'availableQuantity':
        return getQuantityError(value);
      case 'description':
        return value.length < 10 ? 'Description must be at least 10 characters' : '';
      default:
        return '';
    }
  };

  const validateImage = (file) => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        reject('Invalid file type. Only JPG, PNG and WebP are allowed');
        return;
      }

      if (file.size > maxSize) {
        reject('File size must be less than 5MB');
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < 200 || img.height < 200) {
          reject('Image dimensions must be at least 200x200 pixels');
        } else if (img.width > 4000 || img.height > 4000) {
          reject('Image dimensions must not exceed 4000x4000 pixels');
        } else {
          resolve(true);
        }
      };
      img.onerror = () => reject('Invalid image file');
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case 'title':
        setTitle(value);
        break;
      case 'sku':
        setSku(value);
        break;
      case 'price':
        setPrice(value);
        break;
      case 'color':
        setColor(value);
        break;
      case 'availableQuantity':
        setAvailableQuantity(value);
        break;
      case 'description':
        setDescription(value);
        break;
    }
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  const resetForm = () => {
    setTitle('');
    setSku('');
    setPrice('');
    setColor('');
    setAvailableQuantity('');
    setDescription('');
    setProductImages([]);
    setPreviewImages([]);
    setCategoryId('');
    setBrandId('');
    setSpecifications({
      brand: '',
      model: '',
      series: '',
      warranty: '',
      manufacturer: '',
      itemWeight: '',
      dimensions: '',
      countryOfOrigin: ''
    });
    setVariants([{
      attributes: [],
      sku: '',
      price: '',
      availableQuantity: '',
      specifications: {}
    }]);
    setVariantAttributes([{ attribute: '', values: [''] }]);
    setShowCropper(false);
    setCurrentImage(null);
    setCroppedAreas([]);
  };

  const handleAttributeSelect = (attribute, value) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attribute]: value
    }));
  };

  const addSelectedVariant = () => {
    // Check if all attributes have values selected
    const allAttributesSelected = variantAttributes
      .every(attr => selectedAttributes[attr.attribute]);

    if (!allAttributesSelected) {
      toast.error('Please select all attribute values');
      return;
    }

    // Create new variant with selected attributes
    const newVariant = {
      attributes: Object.entries(selectedAttributes).map(([name, value]) => ({
        name,
        value
      })),
      sku: '',
      price: '',
      availableQuantity: '',
      specifications: {}
    };

    // Check if this combination already exists
    const exists = variants.some(variant => 
      variant.attributes.length === newVariant.attributes.length &&
      variant.attributes.every(attr => 
        newVariant.attributes.find(
          newAttr => newAttr.name === attr.name && newAttr.value === attr.value
        )
      )
    );

    if (exists) {
      toast.error('This variant combination already exists');
      return;
    }

    setVariants(prev => [...prev, newVariant]);
    setSelectedAttributes({});
    setShowVariantForm(false);
  };

  const handleRemoveVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    setVariantErrors(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white shadow rounded mt-10">
      <div className="relative mb-4">
        <h2 className="text-2xl font-bold text-center">Add New Product</h2>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close and return to products"
          title="Close"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {/* noValidate: the inline messages below replace the browser's one-field-at-a-time popups */}
      <form onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="mb-6">
            <input
              placeholder="Title"
              name="title"
              value={title}
              onChange={handleInputChange}
              className={`border ${errors.title ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          
          <div className="mb-6">
            <input
              placeholder="SKU"
              name="sku"
              value={sku}
              onChange={handleInputChange}
              className={`border ${errors.sku ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
          </div>

          <div className="mb-6">
            <input
              type="number"
              placeholder="Price (₹)"
              name="price"
              value={price}
              onChange={handleInputChange}
              className={`border ${errors.price ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          <div className="mb-6">
            <input
              placeholder="Color"
              name="color"
              value={color}
              onChange={handleInputChange}
              className={`border ${errors.color ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color}</p>}
          </div>

          <div className="mb-6">
            <input
              type="number"
              placeholder="Available Quantity"
              name="availableQuantity"
              value={availableQuantity}
              onChange={handleInputChange}
              className={`border ${errors.availableQuantity ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.availableQuantity && <p className="text-red-500 text-xs mt-1">{errors.availableQuantity}</p>}
          </div>

          <div className="mb-6 col-span-2">
            <textarea
              placeholder="Description"
              name="description"
              value={description}
              onChange={handleInputChange}
              className={`border ${errors.description ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="mb-6 col-span-2">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setErrors(prev => ({ ...prev, categoryId: e.target.value ? '' : 'Please select a category' }));
              }}
              className={`border ${errors.categoryId ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
          </div>

          <div className="mb-6 col-span-2">
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setErrors(prev => ({ ...prev, brandId: e.target.value ? '' : 'Please select a brand' }));
              }}
              className={`border ${errors.brandId ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              required
            >
              <option value="">Select Brand</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>{brand.name}</option>
              ))}
            </select>
            {errors.brandId && <p className="text-red-500 text-xs mt-1">{errors.brandId}</p>}
          </div>
        </div>

        <div className="my-4">
          <label className="block text-lg font-semibold">Product Images <span className="text-red-500 text-sm">(Required: at least one image)</span></label>
          {previewImages.length < 7 && (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className={`border ${errors.images ? 'border-red-500' : 'border-gray-300'} p-2 rounded w-full`}
              />
              {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
            </div>
          )}
          <div className="flex mt-4 flex-wrap gap-4">
            {previewImages.map((image, index) => (
              <div key={index} className="relative w-24 h-24">
                <img src={image} alt={`Preview ${index}`} className="object-cover w-full h-full rounded" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-0 right-0 text-white bg-red-600 rounded-full text-xs p-1"
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {previewImages.length}/7 images uploaded
          </p>
        </div>

        <div className="my-6">
          <label className="block text-xl font-semibold mb-4">Common Product Specifications</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                value={specifications.model}
                onChange={(e) => handleSpecificationChange('model', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.model ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.model && <p className="text-red-500 text-xs mt-1">{errors.specifications.model}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Series</label>
              <input
                type="text"
                value={specifications.series}
                onChange={(e) => handleSpecificationChange('series', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.series ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.series && <p className="text-red-500 text-xs mt-1">{errors.specifications.series}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Warranty</label>
              <input
                type="text"
                value={specifications.warranty}
                onChange={(e) => handleSpecificationChange('warranty', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.warranty ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.warranty && <p className="text-red-500 text-xs mt-1">{errors.specifications.warranty}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
              <input
                type="text"
                value={specifications.manufacturer}
                onChange={(e) => handleSpecificationChange('manufacturer', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.manufacturer ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.specifications.manufacturer}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Item Weight</label>
              <input
                type="text"
                value={specifications.itemWeight}
                onChange={(e) => handleSpecificationChange('itemWeight', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.itemWeight ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.itemWeight && <p className="text-red-500 text-xs mt-1">{errors.specifications.itemWeight}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Dimensions</label>
              <input
                type="text"
                value={specifications.dimensions}
                onChange={(e) => handleSpecificationChange('dimensions', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.dimensions ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.dimensions && <p className="text-red-500 text-xs mt-1">{errors.specifications.dimensions}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Country of Origin</label>
              <input
                type="text"
                value={specifications.countryOfOrigin}
                onChange={(e) => handleSpecificationChange('countryOfOrigin', e.target.value)}
                className={`mt-1 block w-full border ${errors.specifications?.countryOfOrigin ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                required
              />
              {errors.specifications?.countryOfOrigin && <p className="text-red-500 text-xs mt-1">{errors.specifications.countryOfOrigin}</p>}
            </div>
          </div>
        </div>

        <div className="my-6">
          <label className="block text-xl font-semibold mb-4">Variant Attributes</label>
          
          {variantAttributes.map((attr, attrIndex) => (
            <div key={attrIndex} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <input
                  type="text"
                  value={attr.attribute}
                  onChange={(e) => handleAttributeChange(attrIndex, e.target.value)}
                  placeholder="Attribute Name (e.g., RAM, Color)"
                  className="flex-1 min-w-[10rem] border border-gray-300 p-2 rounded"
                />
                <button
                  type="button"
                  onClick={() => removeAttribute(attrIndex)}
                  className="text-red-600 hover:text-red-800 px-2"
                  disabled={variantAttributes.length === 1}
                >
                  Remove Attribute
                </button>
              </div>

              <div className="ml-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Values</label>
                {attr.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleAttributeValueChange(attrIndex, valueIndex, e.target.value)}
                      placeholder="Attribute Value"
                      className="flex-1 border border-gray-300 p-2 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                      className="text-red-600 hover:text-red-800 px-2"
                      disabled={attr.values.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addAttributeValue(attrIndex)}
                  className="text-blue-600 hover:text-blue-800 text-sm mt-1"
                >
                  + Add Value
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={addNewAttribute}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add New Attribute
            </button>
            <button
              type="button"
              onClick={() => setShowVariantForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add Specific Variant
            </button>
            <button
              type="button"
              onClick={generateVariants}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate All Combinations
            </button>
          </div>
        </div>

        {showVariantForm && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
              <h3 className="text-lg font-semibold mb-4">Add New Variant</h3>
              
              {variantAttributes.map((attr, index) => (
                <div key={index} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {attr.attribute}
                  </label>
                  <select
                    value={selectedAttributes[attr.attribute] || ''}
                    onChange={(e) => handleAttributeSelect(attr.attribute, e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                  >
                    <option value="">Select {attr.attribute}</option>
                    {attr.values.filter(v => v.trim()).map((value, i) => (
                      <option key={i} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariantForm(false);
                    setSelectedAttributes({});
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addSelectedVariant}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Variant
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="my-6">
          <label className="block text-xl font-semibold mb-4">Product Variants ({variants.length})</label>
          {variants.length === 0 && (
            <p className="text-sm text-gray-600 mb-4">
              No variants: the product is saved with one default variant that uses its SKU, price and available quantity.
            </p>
          )}
          {variants.map((variant, index) => (
            <div key={index} className="mb-8 p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Variant Combination</label>
                  <div className="flex flex-wrap gap-2">
                    {variant.attributes.map((attr, attrIndex) => (
                      <span key={attrIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {attr.name}: {attr.value}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { field: 'sku', placeholder: 'Variant SKU' },
                  { field: 'price', placeholder: 'Variant Price (₹)' },
                  { field: 'availableQuantity', placeholder: 'Available Quantity' },
                ].map(({ field, placeholder }) => (
                  <div key={field}>
                    <input
                      placeholder={placeholder}
                      value={variant[field]}
                      onChange={(e) => handleVariantChange(index, field, e.target.value)}
                      className={`w-full border ${variantErrors[index]?.[field] ? 'border-red-500' : 'border-gray-300'} p-2 rounded`}
                    />
                    {variantErrors[index]?.[field] && (
                      <p className="text-red-500 text-xs mt-1">{variantErrors[index][field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {formError && (
          <p role="alert" className="text-red-600 text-sm mb-3">{formError}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white py-2 px-4 rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding Product...' : 'Add Product'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border border-gray-300 text-gray-700 py-2 px-4 rounded-full hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>

      {showCropper && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="relative w-96 h-96">
            <Cropper
              image={currentImage}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              aspect={1}  // Set aspect ratio to 1:1 for a square crop
              style={{ height: "100%", width: "100%" }}  // Resize the cropper container
            />
          </div>
          <button
            type="button"
            onClick={handleCropSave}
            className="bg-green-600 text-white py-2 px-4 rounded-full mt-4"
          >
            Save Crop
          </button>
          <button
            type="button"
            onClick={() => setShowCropper(false)}
            className="bg-red-600 text-white py-2 px-4 rounded-full mt-4 ml-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
export default AddProduct;