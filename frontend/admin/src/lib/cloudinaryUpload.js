import axios from "axios";
import axiosInstance from "@/axios/adminAxios";

// Uploads one product image straight to Cloudinary using a short-lived
// signature from the backend (admin only). The Cloudinary API secret stays on
// the server; the cloud name, key and folder come from the server too.
export async function uploadProductImage(file) {
  const { data } = await axiosInstance.post("/upload-signature", {});
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", data.apiKey);
  formData.append("timestamp", data.timestamp);
  formData.append("signature", data.signature);
  formData.append("folder", data.folder);
  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(data.cloudName)}/image/upload`,
    formData,
  );
  return response.data.secure_url;
}
