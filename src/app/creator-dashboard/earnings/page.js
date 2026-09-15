// src/app/creator-dashboard/earnings/page.js
'use client';

import { useState, useEffect } from 'react';
import { updateCreatorSettings, getCreatorEarnings } from '@/action/userAction';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { isValidWalletAddress } from '@/utils/functions/isValidWallet';
import Link from 'next/link';
import CreatorSidebar from '@/components/creator-sidebar';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  SparklesIcon,
  Bars3Icon as MenuIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Earnings() {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch earnings data
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCreatorEarnings();
        if (data?.success) {
          setEarningsData(data);
          setWalletAddress(data.walletAddress || '');
          setSubscriptionPrice(data.subscriptionPrice || 0);
        } else {
          setError(data?.message || 'Failed to load revenue data');
        }
      } catch (err) {
        setError('Failed to load earnings data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setWalletError('');
    
    // Validate wallet address
    if (walletAddress && !isValidWalletAddress(walletAddress)) {
      setWalletError('Invalid Ethereum wallet address format');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const result = await updateCreatorSettings({
        walletAddress,
        subscriptionPrice: parseFloat(subscriptionPrice)
      });
      
      if (result?.success) {
        setIsEditing(false);
        setEarningsData(prev => ({
          ...prev,
          walletAddress,
          subscriptionPrice: parseFloat(subscriptionPrice)
        }));
      } else {
        setError(result?.message || 'Failed to update settings');
      }
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chart preparation
  const prepareChartData = () => {
    if (!earningsData?.recentEarnings) return null;
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const monthlyData = earningsData.recentEarnings.reduce((acc, { date, amount }) => {
      const monthDate = new Date(date);
      const monthKey = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = 0;
      }
      
      acc[monthKey] += amount;
      return acc;
    }, {});
    
    const sortedLabels = Object.keys(monthlyData).sort((a, b) => {
      const [aMonth, aYear] = a.split(' ');
      const [bMonth, bYear] = b.split(' ');
      
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
    });
    
    return {
      labels: sortedLabels,
      datasets: [
        {
          label: 'Earnings (Sepolia ETH)',
          data: sortedLabels.map(label => monthlyData[label]),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  const chartData = earningsData ? prepareChartData() : null;
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <CreatorSidebar
        user={{ username: earningsData?.username || "Creator", email: earningsData?.email }}
        activeTab="earnings"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 w-full min-w-0">
        {/* Top bar for mobile toggle */}
        <div className="lg:hidden glass-nav px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 hover:bg-white/80 transition-colors"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-sm text-slate-900">Creator Revenue</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Treasury
            </span>
          </div>
          <div className="w-6" />
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Creator Revenue & Treasury
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1">
                Real-time decentralized subscriptions paid in Sepolia ETH
              </p>
            </div>
          </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-6">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-card rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
                <CurrencyDollarIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Cumulative Revenue</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {(earningsData?.totalEarnings || 0).toFixed(4)}{" "}
                  <span className="text-xs font-bold text-amber-600">ETH</span>
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600">
                <UserGroupIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Subscribers</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {earningsData?.subscriberCount || 0}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <ArrowTrendingUpIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Subscription Price</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {parseFloat(earningsData?.subscriptionPrice || 0).toFixed(4)}{" "}
                  <span className="text-xs font-bold text-emerald-600">ETH</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Settings Panel */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Web3 Payout Settings
                </h2>
                <p className="text-xs text-slate-500">
                  Configure your Ethereum recipient address and subscription pricing
                </p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-gradient inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  <span>Edit Settings</span>
                </button>
              ) : null}
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                <div>
                  <label htmlFor="walletAddress" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Ethereum Wallet Address
                  </label>
                  <input
                    id="walletAddress"
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0x..."
                  />
                  {walletError && <p className="mt-1 text-xs text-rose-600">{walletError}</p>}
                </div>
                
                <div>
                  <label htmlFor="subscriptionPrice" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Lifetime Subscription Price (Sepolia ETH)
                  </label>
                  <input
                    id="subscriptionPrice"
                    type="number"
                    min="0"
                    max="10"
                    step="0.0001"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-gradient px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setWalletAddress(earningsData?.walletAddress || '');
                      setSubscriptionPrice(earningsData?.subscriptionPrice || 0);
                      setWalletError('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium mb-1">Configured Recipient Wallet</span>
                  <p className="text-slate-800 font-mono break-all font-semibold">
                    {walletAddress || 'Not set'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium mb-1">Subscriber Pass Price</span>
                  <p className="text-slate-800 font-bold text-sm">
                    {parseFloat(subscriptionPrice || 0).toFixed(4)} Sepolia ETH
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Earnings Chart */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Revenue Growth
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Monthly historical inflows from reader subscriptions
            </p>

            {chartData && chartData.labels.length > 0 ? (
              <div className="h-64">
                <Line 
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `${value} ETH`
                        }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.raw.toFixed(4)} ETH`
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-48 text-center">
                <SparklesIcon className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">
                  No subscription payouts recorded yet. As members subscribe to your stories, your volume chart will populate here.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
        </main>
      </div>
    </div>
  );
}
