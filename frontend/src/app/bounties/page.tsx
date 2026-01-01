'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, Bounty } from '@/lib/api';
import { MOCK_BOUNTIES, simulateDelay } from '@/lib/mockData';
import { Search, SlidersHorizontal, ExternalLink, Clock, TrendingUp, Coins, Target, Sparkles, GitBranch, User, ChevronLeft, ChevronRight, Flame, Timer, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BountiesPage() {
  const { isDemo } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadBounties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, isDemo]);

  const loadBounties = async () => {
    setLoading(true);
    
    // Use mock data in demo mode
    if (isDemo) {
      await simulateDelay(400);
      let filteredBounties = [...MOCK_BOUNTIES];
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredBounties = filteredBounties.filter(b => b.status === statusFilter);
      }
      
      // Paginate (12 per page)
      const totalItems = filteredBounties.length;
      const pages = Math.ceil(totalItems / 12);
      const startIndex = (page - 1) * 12;
      const paginatedBounties = filteredBounties.slice(startIndex, startIndex + 12);
      
      setBounties(paginatedBounties as Bounty[]);
      setTotalPages(pages);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getAllBounties({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 12,
      });
      setBounties(data.bounties || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBounties = bounties.filter((bounty) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return bounty.repository.toLowerCase().includes(query) || bounty.issueId.toString().includes(query);
  });

  const getStatusConfig = (status: string, isEscalating?: boolean) => {
    if (status === 'active' && isEscalating) {
      return { badge: 'badge-pending', icon: Flame, label: 'Escalating', color: 'grape' };
    }
    switch (status) {
      case 'active': return { badge: 'badge-active', icon: Target, label: 'Active', color: 'ocean' };
      case 'claimed': return { badge: 'badge-claimed', icon: Sparkles, label: 'Claimed', color: 'honey' };
      default: return { badge: 'badge-active', icon: Target, label: status, color: 'warm' };
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ocean-100 text-ocean-700 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Earn MNEE by fixing bugs</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-warm-900 mb-2">Explore Bounties</h1>
            <p className="text-warm-600 text-lg">Find your next opportunity to earn</p>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-warm-500">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warm-100">
              <div className="w-2 h-2 rounded-full bg-ocean-500 animate-pulse" />
              <span>{filteredBounties.filter(b => b.status === 'active').length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-warm-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search repositories or issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12"
              />
            </div>
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="text-warm-400 w-5 h-5 hidden sm:block" />
              <div className="flex rounded-xl overflow-hidden border border-warm-200">
                {['active', 'claimed', 'all'].map((status) => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setPage(1); }}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-honey-500 text-white'
                        : 'bg-white text-warm-600 hover:bg-warm-50'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bounties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl skeleton" />
                  <div className="flex-1">
                    <div className="skeleton-title mb-2" />
                    <div className="skeleton-text w-1/2" />
                  </div>
                </div>
                <div className="skeleton h-20 mb-4" />
                <div className="flex justify-between">
                  <div className="skeleton w-24 h-8" />
                  <div className="skeleton w-20 h-8" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBounties.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-warm-400" />
            </div>
            <h3 className="text-xl font-semibold text-warm-800 mb-2">No bounties found</h3>
            <p className="text-warm-500 mb-6 max-w-md mx-auto">
              {searchQuery ? `No results for "${searchQuery}"` : `No ${statusFilter !== 'all' ? statusFilter : ''} bounties at the moment`}
            </p>
            {(statusFilter !== 'all' || searchQuery) && (
              <button onClick={() => { setStatusFilter('all'); setSearchQuery(''); }} className="btn-secondary">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBounties.map((bounty, index) => {
                const statusConfig = getStatusConfig(bounty.status, bounty.isEligibleForEscalation);
                const hasEscalated = bounty.currentAmount > bounty.initialAmount;
                
                return (
                  <div
                    key={bounty.bountyId}
                    className="glass-card-interactive p-6 animate-slide-up group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${statusConfig.color}-400 to-${statusConfig.color}-600 flex items-center justify-center shadow-${statusConfig.color} group-hover:scale-110 transition-transform`}>
                          <GitBranch className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-warm-800 truncate">{bounty.repository.split('/')[1] || bounty.repository}</h3>
                          <p className="text-sm text-warm-500 truncate">{bounty.repository.split('/')[0]}</p>
                        </div>
                      </div>
                      <span className={statusConfig.badge}>
                        <statusConfig.icon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Issue Info */}
                    <div className="mb-4 p-3 rounded-xl bg-warm-50 border border-warm-100">
                      <div className="flex items-center justify-between">
                        <a href={bounty.issueUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-honey-600 hover:text-honey-700 font-medium">
                          <span>Issue #{bounty.issueId}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <div className="flex items-center gap-1 text-warm-500 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: false })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bounty Amount */}
                    <div className="mb-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-warm-500 uppercase tracking-wide font-medium mb-1">Bounty</p>
                          <div className="flex items-baseline gap-1">
                            <span className="bounty-amount text-3xl">{bounty.currentAmount}</span>
                            <span className="text-warm-500 font-medium">MNEE</span>
                          </div>
                        </div>
                        {hasEscalated && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-grape-100 text-grape-700 text-xs font-medium">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{bounty.currentAmount - bounty.initialAmount}</span>
                          </div>
                        )}
                      </div>
                      
                      {bounty.isEligibleForEscalation && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-grape-600">
                          <Timer className="w-3.5 h-3.5 animate-pulse" />
                          <span>Escalating soon — higher reward coming!</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-warm-100">
                      {bounty.status === 'active' ? (
                        <a
                          href={bounty.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary w-full justify-center group/btn"
                        >
                          <span>Claim This Bounty</span>
                          <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                        </a>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-warm-600">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{bounty.solver || 'Unknown'}</span>
                          </div>
                          {bounty.pullRequestUrl && (
                            <a href={bounty.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2">
                              View PR
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary p-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-medium transition-all ${
                          page === pageNum
                            ? 'bg-honey-500 text-white shadow-honey'
                            : 'bg-white text-warm-600 hover:bg-warm-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-warm-400">...</span>}
                </div>
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary p-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* How to Claim Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16">
        <div className="glass-card p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-honey-200/30 to-ocean-200/30 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-honey-400 to-honey-600 flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-warm-800">How to Claim a Bounty</h2>
                <p className="text-warm-500">Four simple steps to earning MNEE</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { num: 1, title: 'Find a bounty', desc: 'Browse active bounties and pick one you can fix' },
                { num: 2, title: 'Fix the bug', desc: 'Fork the repo and implement your solution' },
                { num: 3, title: 'Add your wallet', desc: 'Include your MNEE address in the PR description' },
                { num: 4, title: 'Get paid', desc: 'Once merged, payment is sent automatically' },
              ].map((step) => (
                <div key={step.num} className="relative">
                  <div className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 font-bold text-sm flex items-center justify-center mb-3">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-warm-800 mb-1">{step.title}</h3>
                  <p className="text-sm text-warm-600">{step.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 rounded-xl bg-warm-800 text-white">
              <p className="text-sm font-mono">
                <span className="text-warm-400"># Add this to your PR description:</span>
                <br />
                <span className="text-honey-400">MNEE:</span> <span className="text-ocean-400">1YourWalletAddressHere</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}