'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscribeToCreator, getSubscriptionPrice } from '@/action/subscriptionAction';
import Link from 'next/link';
import { 
  SparklesIcon, 
  CurrencyDollarIcon, 
  CheckCircleIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

function SubscribeContent() {
  const searchParams = useSearchParams();
  const author = searchParams.get('author');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCreatorInfo = async () => {
      if (!author) return;
      try {
        const response = await getSubscriptionPrice(author);
        if (response?.success) {
          setCreatorInfo({
            username: author,
            subscriberCount: response?.subscriberCount ?? 0,
            subscriptionPrice: response.price ?? 0,
            walletAddress: response?.walletAddress || '',
          });
        } else {
          setError(response?.message || 'Unable to load creator info');
        }
      } catch (err) {
        setError('Unable to connect to the network.');
      }
    };

    fetchCreatorInfo();
  }, [author]);

  const handleCopyWallet = () => {
    if (creatorInfo?.walletAddress) {
      navigator.clipboard.writeText(creatorInfo.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await subscribeToCreator(
        author, 
        creatorInfo?.subscriptionPrice > 0 ? transactionHash : undefined
      );
      
      if (response?.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/profile`);
        }, 1800);
      } else {
        setError(response?.message || 'Subscription failed. Please check transaction hash.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!author) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="glass-card rounded-3xl p-8 border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Creator Specified</h1>
          <p className="text-xs text-slate-500 mb-6">
            Please select a creator from the social feed or an article to subscribe.
          </p>
          <Link href="/" className="btn-gradient inline-flex px-5 py-2.5 rounded-full text-xs font-bold text-white">
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  const authorInitial = author.charAt(0).toUpperCase();

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Pulse Feed</span>
      </Link>

      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl">
        
        {/* Header Cover Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />
        </div>

        {/* Creator Info Header */}
        <div className="px-6 sm:px-8 pb-8 pt-0 -mt-12 text-center relative">
          
          {/* Creator Avatar */}
          <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl mx-auto mb-3">
            <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-3xl font-extrabold text-white">
              {authorInitial}
            </div>
          </div>

          <div className="flex items-center justify-center space-x-1.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              @{author}
            </h1>
            <CheckBadgeIcon className="h-5 w-5 text-indigo-600 shrink-0" />
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            Verified Pulse Creator Community
          </p>

          {/* Pricing Box */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 max-w-sm mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Community Membership
            </span>
            <div className="flex items-baseline justify-center space-x-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {creatorInfo?.subscriptionPrice ?? 0}
              </span>
              <span className="text-xs font-bold text-indigo-600">
                Sepolia ETH / Lifetime
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports @{author} with 100% direct decentralized revenue.
            </p>
          </div>

          {/* Benefits List */}
          <div className="mt-6 text-left space-y-2.5 max-w-sm mx-auto text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Full unlock to all exclusive paywalled stories</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Direct member badge on creator posts and replies</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Continuous updates delivered straight into your social feed</span>
            </div>
          </div>

          {/* Web3 Payment Details if price > 0 */}
          {creatorInfo?.subscriptionPrice > 0 && creatorInfo?.walletAddress && (
            <div className="mt-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-left max-w-sm mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">1. Send Sepolia ETH</span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                  Step 1
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={creatorInfo.walletAddress}
                  className="w-full text-xs font-mono bg-white px-2.5 py-2 rounded-xl border border-indigo-200 text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWallet}
                  className="p-2 bg-white hover:bg-indigo-100 rounded-xl border border-indigo-200 text-indigo-700 transition-colors shrink-0"
                  title="Copy wallet"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
              {copied && (
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Wallet address copied to clipboard! ✨
                </p>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">2. Enter Transaction Hash</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                    Step 2
                  </span>
                </div>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="0x... tx hash"
                  className="w-full text-xs font-mono bg-white px-2.5 py-2 rounded-xl border border-indigo-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Status feedback */}
          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
              🎉 Subscription confirmed! Redirecting to profile...
            </div>
          )}

          {/* Subscribe Action Button */}
          <div className="mt-6 max-w-sm mx-auto">
            <button
              onClick={handleSubscribe}
              disabled={loading || success || (creatorInfo?.subscriptionPrice > 0 && !transactionHash)}
              className={`btn-gradient w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-2xl text-xs font-bold text-white shadow-md ${
                loading || success || (creatorInfo?.subscriptionPrice > 0 && !transactionHash)
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              }`}
            >
              {loading ? (
                <span>Confirming on Network...</span>
              ) : success ? (
                <span>Joined Community!</span>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 text-pink-200" />
                  <span>Subscribe to @{author}</span>
                </>
              )}
            </button>

            <button
              onClick={() => router.back()}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Cancel and return
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
