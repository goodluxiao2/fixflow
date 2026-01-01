'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, Repository } from '@/lib/api';
import { DEMO_REPOSITORIES, simulateDelay } from '@/lib/mockData';
import { FolderKanban, GitBranch, Coins, CheckCircle, Target, ExternalLink, Plus, ArrowUpRight, Sparkles, Settings } from 'lucide-react';

export default function ProjectsPage() {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadRepositories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemo]);

  const loadRepositories = async () => {
    // Use mock data in demo mode
    if (isDemo) {
      await simulateDelay(400);
      setRepositories(DEMO_REPOSITORIES as Repository[]);
      setLoadingData(false);
      return;
    }

    try {
      const data = await api.getMyRepositories();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-grape-400 to-grape-600 flex items-center justify-center animate-pulse">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <p className="text-warm-500 animate-pulse">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-grape-100 text-grape-700 text-sm font-medium mb-4">
              <GitBranch className="w-4 h-4" />
              <span>GitHub Repositories</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-warm-900 mb-2">My Projects</h1>
            <p className="text-warm-600 text-lg">Repositories with Bounty Hunter installed</p>
          </div>
          
          <a
            href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'bounty-hunter-bot'}/installations/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Repository</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {loadingData ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl skeleton" />
                  <div className="flex-1">
                    <div className="skeleton-title mb-2" />
                    <div className="skeleton-text w-1/2" />
                  </div>
                </div>
                <div className="skeleton h-24 mb-4" />
                <div className="skeleton h-10" />
              </div>
            ))}
          </div>
        ) : repositories.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-grape-100 to-honey-100 flex items-center justify-center mx-auto mb-6">
              <FolderKanban className="w-10 h-10 text-grape-500" />
            </div>
            <h2 className="text-2xl font-bold text-warm-800 mb-3">No projects yet</h2>
            <p className="text-warm-600 mb-8 max-w-md mx-auto">
              Install the Bounty Hunter GitHub App on your repositories to start creating automated bounties.
            </p>
            <a
              href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'bounty-hunter-bot'}/installations/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              <GitBranch className="w-5 h-5" />
              <span>Install GitHub App</span>
            </a>
            
            <div className="mt-10 p-6 rounded-xl bg-warm-50 border border-warm-100 text-left max-w-lg mx-auto">
              <h3 className="font-semibold text-warm-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-honey-500" />
                How it works
              </h3>
              <ol className="space-y-2 text-sm text-warm-600">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-honey-100 text-honey-700 text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <span>Install the GitHub App on your repository</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-honey-100 text-honey-700 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <span>Add the Bounty Hunter workflow to your CI</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-honey-100 text-honey-700 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <span>When tests fail, bounties are created automatically</span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repositories.map((repo, index) => (
              <div
                key={repo.repository}
                className="glass-card-interactive p-6 group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-grape-400 to-grape-600 flex items-center justify-center shadow-grape group-hover:scale-110 transition-transform">
                      <GitBranch className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-warm-800 truncate">{repo.repository.split('/')[1]}</h3>
                      <p className="text-sm text-warm-500 truncate">{repo.repository.split('/')[0]}</p>
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${repo.repository}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg hover:bg-warm-100 flex items-center justify-center text-warm-400 hover:text-warm-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-warm-50 text-center">
                    <p className="text-2xl font-bold text-warm-800">{repo.totalBounties}</p>
                    <p className="text-xs text-warm-500">Total</p>
                  </div>
                  <div className="p-3 rounded-xl bg-ocean-50 text-center">
                    <p className="text-2xl font-bold text-ocean-600">{repo.activeBounties}</p>
                    <p className="text-xs text-ocean-600">Active</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 text-center">
                    <p className="text-2xl font-bold text-green-600">{repo.claimedBounties}</p>
                    <p className="text-xs text-green-600">Claimed</p>
                  </div>
                </div>

                {/* Locked Amount */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-honey-50 to-honey-100 border border-honey-200 mb-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-honey-600" />
                    <span className="text-sm text-honey-700">Locked</span>
                  </div>
                  <span className="font-bold text-honey-700">{repo.totalLocked?.toFixed(0) || 0} MNEE</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/bounties?repo=${repo.repository}`}
                    className="flex-1 btn-secondary text-sm justify-center"
                  >
                    <Target className="w-4 h-4" />
                    <span>Bounties</span>
                  </Link>
                  <a
                    href={`https://github.com/${repo.repository}/settings/installations`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-sm px-3"
                  >
                    <Settings className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add More Section */}
        {repositories.length > 0 && (
          <div className="mt-10">
            <div className="glass-card p-6 bg-gradient-to-r from-grape-50/50 to-honey-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-grape-100 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-grape-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warm-800">Add more repositories</h3>
                    <p className="text-sm text-warm-600">Extend Bounty Hunter to your other projects</p>
                  </div>
                </div>
                <a
                  href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'bounty-hunter-bot'}/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary self-start sm:self-auto group"
                >
                  <span>Configure GitHub App</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}