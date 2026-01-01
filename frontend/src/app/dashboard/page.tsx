'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { api, Bounty } from '@/lib/api';
import { MOCK_BOUNTIES, MOCK_STATS, simulateDelay } from '@/lib/mockData';
import { Coins, CheckCircle, Clock, ExternalLink, TrendingUp, Sparkles, AlertCircle, ArrowUpRight, Wallet, GitPullRequest, Trophy, Target, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserStats {
  totalClaimed: number;
  totalEarned: number;
  repositoriesContributed: number;
  memberSince: string;
}

export default function DashboardPage() {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemo]);

  const loadData = async () => {
    // Use mock data in demo mode
    if (isDemo) {
      await simulateDelay(500);
      setStats(MOCK_STATS);
      // Get bounties claimed by the current demo user
      const userBounties = MOCK_BOUNTIES.filter(b =>
        b.claimedBy === user?.githubLogin || b.status === 'active'
      ).slice(0, 10);
      setBounties(userBounties as Bounty[]);
      setLoadingData(false);
      return;
    }

    try {
      const [statsData, bountiesData] = await Promise.all([
        api.getMyStats(),
        api.getMyBounties({ limit: 10 }),
      ]);
      setStats(statsData);
      setBounties(bountiesData.bounties || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-honey-400 to-honey-600 flex items-center justify-center animate-pulse">
            <Target className="w-8 h-8 text-white" />
          </div>
          <p className="text-warm-500 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'badge-active';
      case 'claimed': return 'badge-claimed';
      case 'pending': return 'badge-pending';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-active';
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header with greeting */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name || user.githubLogin} width={64} height={64} className="rounded-2xl ring-4 ring-white shadow-glass" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-honey-400 to-honey-600 flex items-center justify-center text-white text-2xl font-bold shadow-honey">
                {user.githubLogin[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-warm-900">
                  Welcome back, {user.name?.split(' ')[0] || user.githubLogin}
                </h1>
                <span className="text-2xl">👋</span>
              </div>
              <p className="text-warm-500 mt-1">Here&apos;s what&apos;s happening with your bounties</p>
            </div>
          </div>
          
          <Link href="/bounties" className="btn-primary self-start md:self-auto">
            <Sparkles className="w-4 h-4" />
            <span>Find Bounties</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div className="stat-card-honey">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-honey-400 to-honey-600 flex items-center justify-center shadow-honey">
                <Coins className="w-6 h-6 text-white" />
              </div>
              {!loadingData && stats && stats.totalEarned > 0 && (
                <span className="badge-success text-xs">
                  <TrendingUp className="w-3 h-3" />
                  Earning
                </span>
              )}
            </div>
            <div className="bounty-amount text-3xl">{loadingData ? '...' : stats?.totalEarned?.toFixed(0) || '0'}</div>
            <p className="text-warm-500 text-sm mt-1">Total MNEE Earned</p>
            <div className="text-xs text-warm-400 mt-2">≈ ${loadingData ? '...' : stats?.totalEarned?.toFixed(2) || '0.00'} USD</div>
          </div>

          <div className="stat-card-ocean">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-ocean">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-ocean-600">{loadingData ? '...' : stats?.totalClaimed || 0}</div>
            <p className="text-warm-500 text-sm mt-1">Bounties Completed</p>
            <div className="text-xs text-warm-400 mt-2">Bugs squashed 🐛</div>
          </div>

          <div className="stat-card-grape">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-grape-400 to-grape-600 flex items-center justify-center shadow-grape">
                <GitPullRequest className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-grape-600">{loadingData ? '...' : stats?.repositoriesContributed || 0}</div>
            <p className="text-warm-500 text-sm mt-1">Projects Helped</p>
            <div className="text-xs text-warm-400 mt-2">Open source hero 🦸</div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-lg font-bold text-warm-800">
              {loadingData ? '...' : stats?.memberSince ? formatDistanceToNow(new Date(stats.memberSince)) : 'New'}
            </div>
            <p className="text-warm-500 text-sm mt-1">Time Hunting</p>
            <div className="text-xs text-warm-400 mt-2">Keep it up! 💪</div>
          </div>
        </div>

        {/* MNEE Address Section */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-honey-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-honey-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-warm-800">Payment Wallet</h2>
              <p className="text-sm text-warm-500">Where your bounties land</p>
            </div>
          </div>
          
          {user.mneeAddress ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-ocean-50 to-honey-50 border border-ocean-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-ocean-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-ocean-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-warm-500 uppercase tracking-wide font-medium">MNEE Address</p>
                  <p className="font-mono text-warm-800 text-sm truncate">{user.mneeAddress}</p>
                </div>
              </div>
              <Link href="/settings" className="btn-secondary text-sm flex-shrink-0">
                Update Address
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-r from-honey-50 to-honey-100 border border-honey-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-honey-200 flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-5 h-5 text-honey-700" />
                  </div>
                  <div>
                    <p className="font-medium text-honey-800">No wallet connected</p>
                    <p className="text-sm text-honey-600">Add your MNEE address to receive payments</p>
                  </div>
                </div>
                <Link href="/settings" className="btn-primary text-sm flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                  Add Wallet
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Bounties */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-warm-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-grape-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-grape-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-warm-800">Your Bounty History</h2>
                  <p className="text-sm text-warm-500">Recent claims and completions</p>
                </div>
              </div>
              <Link href="/bounties" className="inline-flex items-center gap-1 text-honey-600 hover:text-honey-700 font-medium text-sm group">
                Browse all bounties
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>

          {loadingData ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-warm-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Zap className="w-6 h-6 text-warm-400" />
              </div>
              <p className="text-warm-500">Loading your bounties...</p>
            </div>
          ) : bounties.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-honey-100 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-honey-500" />
              </div>
              <h3 className="text-lg font-semibold text-warm-800 mb-2">No bounties yet</h3>
              <p className="text-warm-500 mb-6 max-w-sm mx-auto">Your bounty hunting journey starts here. Find your first bug to fix!</p>
              <Link href="/bounties" className="btn-primary">
                <Sparkles className="w-4 h-4" />
                Explore Bounties
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Issue</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th>When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bounties.map((bounty, index) => (
                    <tr key={bounty.bountyId} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center">
                            <GitPullRequest className="w-4 h-4 text-warm-500" />
                          </div>
                          <span className="font-medium text-warm-800">{bounty.repository.split('/')[1] || bounty.repository}</span>
                        </div>
                      </td>
                      <td>
                        <a href={bounty.issueUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-honey-600 hover:text-honey-700 font-medium">
                          #{bounty.issueId}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-warm-800">{bounty.claimedAmount || bounty.currentAmount}</span>
                          <span className="text-xs text-warm-500">MNEE</span>
                        </div>
                      </td>
                      <td>
                        <span className={getStatusBadge(bounty.status)}>
                          {bounty.status === 'claimed' && <CheckCircle className="w-3 h-3" />}
                          {bounty.status.charAt(0).toUpperCase() + bounty.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-warm-500">
                          {bounty.claimedAt
                            ? formatDistanceToNow(new Date(bounty.claimedAt), { addSuffix: true })
                            : formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td>
                        {bounty.pullRequestUrl && (
                          <a href={bounty.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg hover:bg-warm-100 flex items-center justify-center text-warm-400 hover:text-warm-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}