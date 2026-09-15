'use client';
import { isValidWalletAddress } from "@/utils/functions/isValidWallet";
import { useSelector, useDispatch } from "react-redux";
import { updateUser } from "@/store/slices/user-slice";
import { useState } from "react";
import { RegisterCreatorAction } from "@/action";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  SparklesIcon, 
  CurrencyDollarIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

export default function BecomeCreator() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.userslice);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidWallet, setIsValidWallet] = useState(true);

  async function handleOnSubmit(e) {
    e.preventDefault();
    if (!isValidWalletAddress(walletAddress)) {
      setIsValidWallet(false);
      return;
    }
    setIsValidWallet(true);
    setIsLoading(true);
    try {
      dispatch(updateUser({ walletAddress, subscriberCount: 0 }));
      const res = await RegisterCreatorAction(walletAddress);
      setIsLoading(false);
      router.push("/creator-dashboard");
    } catch (error) {
      console.error("Error registering as creator:", error);
      setIsLoading(false);
    }
  }

  const PERKS = [
    {
      title: "Decentralized Payouts",
      desc: "Receive subscription payments in Sepolia ETH directly to your non-custodial wallet.",
      icon: CurrencyDollarIcon,
    },
    {
      title: "Pulse Social Feed Reach",
      desc: "Your stories are broadcast across community channels and personalized reader feeds.",
      icon: BoltIcon,
    },
    {
      title: "Creator Studio & Analytics",
      desc: "Track subscriber growth, reader retention, and real-time revenue performance.",
      icon: SparklesIcon,
    },
    {
      title: "AI Co-Pilot Assistance",
      desc: "Generate titles, improve prose, and summarize concepts with built-in Pulse AI.",
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Feed</span>
      </Link>

      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Perks Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 mb-4">
              <SparklesIcon className="h-3.5 w-3.5 text-pink-300" />
              <span>Creator Economy</span>
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight leading-tight mb-3">
              Unlock Your Voice & Monetize on Pulse
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed mb-8">
              Join next-generation writers, technologists, and thinkers building sovereign subscriber communities.
            </p>

            <div className="space-y-4">
              {PERKS.map((perk, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                    <perk.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{perk.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{perk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 text-[11px] text-slate-400">
            Powered by Ethereum Sepolia Testnet
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5">
            Become a Verified Creator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            Enter your Web3 wallet address to initialize your Creator Studio and activate direct subscriber revenue.
          </p>

          <form onSubmit={handleOnSubmit} className="space-y-5">
            <div>
              <label htmlFor="wallet" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Ethereum Sepolia Wallet Address
              </label>
              <input
                type="text"
                id="wallet"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setIsValidWallet(!!isValidWalletAddress(e.target.value));
                }}
                placeholder="0x71C...3a9"
                className={`w-full px-4 py-3 text-sm font-mono bg-slate-50 rounded-2xl border ${
                  !isValidWallet && walletAddress
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                } focus:outline-none focus:ring-4 transition-all`}
                required
              />
              {isValidWallet ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  Subscribers will send payments directly to this wallet address.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-rose-600 font-medium">
                  Please provide a valid Ethereum wallet address (e.g. 0x...).
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !walletAddress || !isValidWallet}
              className={`btn-gradient w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl text-xs font-bold text-white shadow-md transition-all ${
                isLoading || !walletAddress || !isValidWallet ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <span>Registering Creator Profile...</span>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 text-pink-200" />
                  <span>Launch Creator Studio</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Free onboarding</span>
            <span>Instant activation</span>
            <span>Non-custodial</span>
          </div>
        </div>

      </div>
    </div>
  );
}
