'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  EyeIcon, 
  TagIcon, 
  CalendarIcon,
  SparklesIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import Image from 'next/image';
import Link from 'next/link';
import { deleteBlog } from '@/action/blogAction';

export default function CreatorBlogCard({ blog, refreshBlogs }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Draft';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleEdit = () => {
    router.push(`/creator-dashboard/edit/${blog._id}`);
  };
  
  const handlePreview = () => {
    router.push(`/blogs/${blog._id}`);
  };
  
  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteBlog(blog._id);
      if (response?.success) {
        if (refreshBlogs) refreshBlogs();
      } else {
        console.error("Failed to delete story:", response?.message);
      }
    } catch (error) {
      console.error("Error deleting story:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const blogImage = blog?.image?.imagePath;
  
  return (
    <div className="glass-card rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      
      <div>
        {/* Media / Header Banner */}
        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
          {blogImage ? (
            <Image
              src={blogImage}
              alt={blog.title || "Story thumbnail"}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-tr from-slate-100 to-indigo-50">
              <GlobeAltIcon className="h-10 w-10 text-slate-300" />
            </div>
          )}

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-900/85 text-emerald-100 border border-emerald-400/30 backdrop-blur-md shadow-sm">
              Live
            </span>
          </div>

          {blog.isPremium && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center">
              <SparklesIcon className="h-3 w-3 mr-1" />
              Premium
            </div>
          )}
        </div>
        
        {/* Content Details */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 line-clamp-2 hover:text-purple-700 transition-colors">
            {blog.title || "Untitled Story"}
          </h3>
          
          <p className="text-slate-600 text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed">
            {blog.description || "No excerpt provided."}
          </p>
          
          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {blog.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="bg-emerald-50/80 text-emerald-800 border border-emerald-200/50 text-[11px] font-medium px-2 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center text-slate-400 text-xs">
            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
            <span>{formatDate(blog.date)}</span>
          </div>
        </div>
      </div>
      
      {/* Management Actions */}
      <div className="px-4 sm:px-5 py-3 bg-white/60 border-t border-emerald-900/10 flex items-center justify-between">
        <button 
          onClick={handlePreview}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-purple-700 transition-colors"
        >
          <EyeIcon className="h-3.5 w-3.5 mr-1" />
          <span>Preview</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleEdit}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <PencilSquareIcon className="h-3.5 w-3.5 mr-1" />
            <span>Edit</span>
          </button>
          
          <button 
            onClick={handleDeleteConfirm}
            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            disabled={isDeleting}
          >
            <TrashIcon className="h-3.5 w-3.5 mr-1" />
            <span>Delete</span>
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Story</h3>
            <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{blog.title}"</span>? This will remove the story from the social feed permanently.
            </p>
            
            <div className="flex justify-end space-x-2.5">
              <button 
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center shadow-sm"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
