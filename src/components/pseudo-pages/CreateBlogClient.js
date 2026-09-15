// app/creator-dashboard/create/CreateBlogClient.js
'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/creator/ImageUploader';
import Link from 'next/link';

const TipTapEditor = dynamic(() => import('@/components/editor/tip-tap-editor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[350px] p-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 rounded-2xl border border-slate-200/80">
      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600"></div>
      <span className="text-xs text-slate-400 font-medium">Loading rich editor...</span>
    </div>
  ),
});
import { 
  SparklesIcon, 
  ArrowLeftIcon,
  TagIcon,
  PhotoIcon,
  LockClosedIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

const MagicWandIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2" /><path d="M15 10V8" /><path d="M12.3 7.7 11 9" /><path d="m10 6-1.8 1.8" /><path d="M7 10H5" /><path d="M7 4H5" /><path d="m3 6 1.8 1.8" /><path d="M14 13.5V10h-3V7a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3H2v3.5a3.5 3.5 0 0 0 3.5 3.5h7A3.5 3.5 0 0 0 16 13.5Z" /><path d="M22 6h-3" /><path d="M20.5 4.5 19 6" /><path d="m22 10-3-1" />
  </svg>
);

export default function CreateBlog({ AddBlog, initialData = {} }) {
  const safeData = initialData || {};
  useEffect(() => {
    if (safeData?.image?.imagePath) {
      setPreview(safeData.image.imagePath);
    }
  }, [safeData]);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Loading states for AI features
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isCreatingDescription, setIsCreatingDescription] = useState(false);
  const [isEnhancingContent, setIsEnhancingContent] = useState(false);

  const [formData, setFormData] = useState({
    title: safeData.title || '',
    description: safeData.description || '',
    content: safeData.content || '',
    tags: safeData.tags ? (Array.isArray(safeData.tags) ? safeData.tags.join(', ') : safeData.tags) : '',
    isPremium: safeData.isPremium || false,
    image: safeData.image || null
  });
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleContentChange = (content) => {
    setFormData({ ...formData, content });
  };

  const handleAIStream = async (context, option, setLoading, updateState) => {
    if (!context || context.trim().length < 40) {
      setError(`Please provide more content in your article before using this AI feature.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, option }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            const rawChunk = line.substring(2);
            let chunkText = '';
            try {
              chunkText = JSON.parse(rawChunk);
            } catch {
              // Fallback for partial/escaped chunk
              chunkText = rawChunk
                .replace(/^"/, '')
                .replace(/"$/, '')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            }
            fullResponse += chunkText;

            // Strip thinking tokens and unescape any literal \n produced by LLMs
            let cleaned = fullResponse
              .replace(/<think>[\s\S]*?<\/think>/g, '')
              .replace(/\\n/g, '\n')
              .trim();

            if (option === 'enhance-content') {
              // Ensure TipTap receives clean HTML paragraphs rather than raw text with newlines
              if (!/<(p|h[1-6]|ul|ol|blockquote|div)[\s\S]*>/i.test(cleaned)) {
                cleaned = cleaned
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map(para => `<p>${para.replace(/\n/g, '<br />').trim()}</p>`)
                  .join('');
              } else {
                // Remove raw newlines between HTML tags
                cleaned = cleaned.replace(/>\s*\n+\s*</g, '><');
              }
            } else if (option === 'suggest-title') {
              cleaned = cleaned.replace(/^[#*`"\s]+/, '').replace(/[#*`"\s]+$/, '');
            } else if (option === 'create-description') {
              cleaned = cleaned.replace(/^[#*`"\s]+/, '').replace(/[#*`"\s]+$/, '');
            }

            updateState(cleaned);
          }
        }
      }
    } catch (err) {
      console.error('AI Stream Error:', err);
      setError(err.message || `Failed to ${option.replace('-', ' ')}.`);
    } finally {
      setLoading(false);
    }
  };

  const suggestTitle = (e) => {
    e.preventDefault();
    handleAIStream(
      formData.content, 
      'suggest-title', 
      setIsSuggestingTitle, 
      (newTitle) => setFormData(prev => ({ ...prev, title: newTitle }))
    );
  };

  const createDescription = (e) => {
    e.preventDefault();
    handleAIStream(
      formData.content, 
      'create-description', 
      setIsCreatingDescription, 
      (newDescription) => setFormData(prev => ({ ...prev, description: newDescription }))
    );
  };
  
  const enhanceContent = (e) => {
    e.preventDefault();
    handleAIStream(
      formData.content, 
      'enhance-content', 
      setIsEnhancingContent, 
      handleContentChange
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const blogData = {
        ...formData,
        tags: tagsArray,
        date: new Date(),
        _id: initialData._id || undefined
      };

      const response = await AddBlog(blogData);

      if (response?.success) {
        setSuccess('Story published successfully! Broadcasting to Pulse...');
        setTimeout(() => router.push('/creator-dashboard'), 1500);
      } else {
        setError(response?.message || 'Failed to publish story');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const AILoadingButton = ({ isLoading, children }) => (
    <span className="flex items-center">
      {isLoading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating...
        </>
      ) : (
        children
      )}
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href="/creator-dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Creator Studio</span>
      </Link>

      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-emerald-900/10 shadow-xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-900/10 pb-6">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-2">
              Pulse Story Editor
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {safeData._id ? "Edit Story" : "Compose New Story"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Draft your piece, enhance with Pulse AI, and publish to the network.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Title Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Story Title <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={suggestTitle}
                disabled={isSuggestingTitle}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50"
              >
                <AILoadingButton isLoading={isSuggestingTitle}>
                  <MagicWandIcon className="w-3 h-3 mr-1.5" />
                  Suggest Title
                </AILoadingButton>
              </button>
            </div>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base sm:text-lg font-bold bg-white/80 hover:bg-white focus:bg-white text-slate-900 rounded-2xl border border-emerald-900/10 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all"
              placeholder="e.g. The Architecture of Next-Generation Social Media"
            />
          </div>
          
          {/* Description Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Hook & Excerpt <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={createDescription}
                disabled={isCreatingDescription}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50"
              >
                <AILoadingButton isLoading={isCreatingDescription}>
                  <MagicWandIcon className="w-3 h-3 mr-1.5" />
                  Auto Summarize
                </AILoadingButton>
              </button>
            </div>
            <textarea
              id="description"
              name="description"
              rows={2}
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white text-slate-900 rounded-2xl border border-emerald-900/10 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all"
              placeholder="A concise synopsis displayed on reader feeds and cards."
            />
          </div>

          {/* Content Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Full Story Content <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={enhanceContent}
                disabled={isEnhancingContent}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <AILoadingButton isLoading={isEnhancingContent}>
                  <MagicWandIcon className="w-3 h-3 mr-1.5" />
                  Enhance Prose with AI
                </AILoadingButton>
              </button>
            </div>
            <div className="min-h-[350px] border border-emerald-900/10 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-purple-500/10 focus-within:border-purple-500 bg-white shadow-inner">
              <TipTapEditor value={formData.content} onChange={handleContentChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Featured Image */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Featured Cover Image
              </label>
              <ImageUploader
                onImageSelected={(file) => setFormData({ ...formData, image: file })}
                initialPreview={safeData?.image?.imagePath || null}
              />
            </div>
            
            {/* Tags & Premium Toggle */}
            <div className="space-y-4">
              <div>
                <label htmlFor="tags" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Topics / Tags <span className="text-rose-500">*</span>
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  required
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white/80 rounded-xl border border-emerald-900/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 focus:outline-none"
                  placeholder="tech, ai, web3, design"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Separate tags with commas to categorize your story in feeds.
                </p>
              </div>
              
              {/* Premium Toggle */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3">
                <input
                  id="isPremium"
                  name="isPremium"
                  type="checkbox"
                  checked={formData.isPremium}
                  onChange={handleChange}
                  className="h-4 w-4 mt-0.5 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                />
                <div>
                  <label htmlFor="isPremium" className="block text-xs font-bold text-amber-950 cursor-pointer">
                    💎 Lock for Paid Subscribers Only
                  </label>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Only readers who subscribe to your channel in Sepolia ETH will unlock the full text.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-gradient w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl text-xs font-bold text-white shadow-lg ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span>Publishing Story to Network...</span>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 text-pink-200" />
                  <span>{safeData._id ? 'Update Story' : 'Publish Story to Pulse Feed'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}