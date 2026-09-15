"use client";
import { useState, useEffect } from 'react';

export default function ImageUploader({ onImageSelected, initialPreview }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    // Set preview image when initialPreview is provided
    if (initialPreview) {
      setPreview(initialPreview);
    }
  }, [initialPreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageSelected(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <div className="mt-1 flex items-center">
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <label
          htmlFor="image"
          className="cursor-pointer inline-flex items-center space-x-2 bg-white/90 hover:bg-white py-2.5 px-4 border border-emerald-900/15 rounded-xl shadow-xs text-xs font-bold text-slate-700 transition-all hover:shadow-sm"
        >
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Choose Cover Image</span>
        </label>
        <span className="ml-3 text-xs text-slate-500 font-medium">
          {preview ? '✓ Image selected' : 'No image chosen'}
        </span>
      </div>
      
      {preview && (
        <div className="mt-3 relative rounded-2xl overflow-hidden border border-emerald-900/10 shadow-xs max-w-sm">
          <img src={preview} alt="Cover Preview" className="h-44 w-full object-cover" />
        </div>
      )}
    </div>
  );
}
