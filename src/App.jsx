import { useState } from "react";
import axios from "axios";

export default function App() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dataPairs, setDataPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 50);
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleUpload = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setCopied(false);
    setDataPairs([]);

    try {
      const formData = new FormData();
      images.forEach((image) => formData.append("images", image)); // Backend expects "images"

      const response = await axios.post("http://localhost:5300/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ✅ Backend already returns { name, number } pairs
      const receivedPairs = response.data;

      if (Array.isArray(receivedPairs)) {
        setDataPairs(receivedPairs.filter(pair => pair.name || pair.number));
      } else {
        console.error("Unexpected data format:", receivedPairs);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const formatted = dataPairs.map((d) => `${d.name} - ${d.number}`).join("\n");
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Multi Image Contact Extractor</h1>

        <label className="block w-full cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 hover:bg-gray-100 transition">
          <input type="file" multiple className="hidden" onChange={handleImageChange} />
          {previews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {previews.map((src, index) => (
                <img key={index} src={src} alt={`Preview ${index}`} className="h-20 object-cover rounded" />
              ))}
            </div>
          ) : (
            <p>Click to upload up to 50 images</p>
          )}
        </label>

        {images.length > 0 && (
          <button
            onClick={handleUpload}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition"
            disabled={loading}
          >
            {loading ? "Extracting..." : "Upload & Extract"}
          </button>
        )}

        {dataPairs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-700 text-center">Extracted Name & Number List</h2>
            <ul className="mt-2 bg-gray-100 p-4 rounded-lg shadow-inner max-h-64 overflow-y-auto">
              {dataPairs.map((pair, index) => (
                <li key={index} className="flex justify-between py-1 border-b last:border-none text-sm">
                  <span className="text-gray-700">{pair.name || "No Name"}</span>
                  <span className="font-semibold text-gray-900">{pair.number || "No Number"}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={copyToClipboard}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition"
            >
              {copied ? "Copied!" : "Copy All"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}