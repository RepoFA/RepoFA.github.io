import { useState, useMemo, useEffect } from 'react';
import postsRaw from './posts_data.json';
import { 
  Search, 
  Send, 
  ExternalLink, 
  Layers, 
  Tag, 
  Calendar, 
  Eye, 
  FolderGit2, 
  Moon, 
  Sun, 
  X, 
  CheckCircle2, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  GitBranch, 
  Users, 
  Code2, 
  Cpu, 
  Terminal, 
  Globe, 
  Server, 
  Shield, 
  Bot, 
  Smartphone, 
  ShieldAlert, 
  Database, 
  Grid, 
  MessageCircle, 
  Sparkles, 
  Star, 
  Clock, 
  ArrowUpDown, 
  GitFork 
} from 'lucide-react';

interface RepoDetail {
  owner: string;
  repo: string;
  full_name: string;
  url: string;
}

interface Post {
  id: number;
  post_id: string;
  url: string;
  datetime: string;
  title: string;
  title_clean?: string;
  text_html: string;
  text_plain: string;
  photos: string[];
  views: string;
  github_links: string[];
  tags: string[];
  primary_repo?: string | null;
  repo_names?: string[];
  categories?: string[];
  authors?: string[];
  primary_author?: string | null;
  repo_details?: RepoDetail[];
  stars?: number;
  forks?: number;
  language?: string | null;
}

type SortOption = 'stars' | 'latest' | 'views';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasGithubOnly, setHasGithubOnly] = useState<boolean>(false);
  const [minStars, setMinStars] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('stars');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [creatorProfileModal, setCreatorProfileModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const posts = postsRaw as Post[];
  const postsPerPage = 12;

  // Category Icon Map
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'هوش مصنوعی و یادگیری ماشین': return <Cpu className="w-4 h-4 text-emerald-400" />;
      case 'ابزارهای توسعه و CLI': return <Terminal className="w-4 h-4 text-cyan-400" />;
      case 'فرانت‌اند و UI': return <Globe className="w-4 h-4 text-sky-400" />;
      case 'بک‌اند و میکروسرویس': return <Server className="w-4 h-4 text-indigo-400" />;
      case 'فیلترشکن، پروکسی و شبکه': return <Shield className="w-4 h-4 text-violet-400" />;
      case 'لینوکس و سیستم‌عامل': return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'بات‌های تلگرام و پیام‌رسان': return <Bot className="w-4 h-4 text-blue-400" />;
      case 'موبایل و اندروید': return <Smartphone className="w-4 h-4 text-green-400" />;
      case 'امنیت، تست نفوذ و پنتست': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'داده، اسکراپینگ و اتوماسیون': return <Database className="w-4 h-4 text-orange-400" />;
      default: return <Grid className="w-4 h-4 text-cyan-400" />;
    }
  };

  // Helper to get image or GitHub OG fallback
  const getPostCoverImage = (post: Post) => {
    if (post.photos && post.photos.length > 0 && post.photos[0]) {
      return post.photos[0];
    }
    if (post.primary_repo) {
      return `https://opengraph.githubassets.com/1/${post.primary_repo}`;
    }
    if (post.authors && post.authors.length > 0) {
      return `https://opengraph.githubassets.com/1/${post.authors[0]}/RepoFA`;
    }
    return `https://opengraph.githubassets.com/1/RepoFA/RepoFA.github.io`;
  };

  // Format star & fork counts (e.g., 1.2k, 15.4k)
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  // Latest 8 fresh projects for Carousel
  const latestPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.id - a.id).slice(0, 8);
  }, [posts]);

  // Category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { 'همه': posts.length };
    posts.forEach(p => {
      (p.categories || []).forEach(cat => {
        stats[cat] = (stats[cat] || 0) + 1;
      });
    });
    return stats;
  }, [posts]);

  // Creator stats & profiles mapping
  const creatorStats = useMemo(() => {
    const map: Record<string, { count: number; totalStars: number; totalForks: number; avatar: string; repos: string[]; posts: Post[] }> = {};
    posts.forEach(p => {
      (p.authors || []).forEach(author => {
        if (!map[author]) {
          map[author] = {
            count: 0,
            totalStars: 0,
            totalForks: 0,
            avatar: `https://github.com/${author}.png?size=120`,
            repos: [],
            posts: []
          };
        }
        map[author].count += 1;
        map[author].totalStars += (p.stars || 0);
        map[author].totalForks += (p.forks || 0);
        map[author].posts.push(p);
        if (p.primary_repo && !map[author].repos.includes(p.primary_repo)) {
          map[author].repos.push(p.primary_repo);
        }
      });
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const activeCreatorData = useMemo(() => {
    if (!creatorProfileModal) return null;
    return creatorStats.find(c => c.name === creatorProfileModal) || null;
  }, [creatorProfileModal, creatorStats]);

  // Top tags
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(p => {
      (p.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([tag]) => tag);
  }, [posts]);

  // Filtered & Sorted posts
  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(post => {
      // Category filter
      if (selectedCategory !== 'همه' && !(post.categories || []).includes(selectedCategory)) {
        return false;
      }

      // Creator filter
      if (selectedCreator && !(post.authors || []).includes(selectedCreator)) {
        return false;
      }

      // Tag filter
      if (selectedTag && !(post.tags || []).includes(selectedTag)) {
        return false;
      }

      // Github only filter
      if (hasGithubOnly && (!post.github_links || post.github_links.length === 0)) {
        return false;
      }

      // Minimum Stars filter
      if (minStars > 0 && (post.stars || 0) < minStars) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (post.title_clean || post.title || '').toLowerCase().includes(q);
        const inText = post.text_plain.toLowerCase().includes(q);
        const inRepo = (post.repo_names || []).some(r => r.toLowerCase().includes(q));
        const inAuthor = (post.authors || []).some(a => a.toLowerCase().includes(q));
        const inTags = (post.tags || []).some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inText && !inRepo && !inAuthor && !inTags) {
          return false;
        }
      }

      return true;
    });

    // Sorting (Default: Stars descending)
    return filtered.sort((a, b) => {
      if (sortBy === 'stars') {
        const starsA = a.stars || 0;
        const starsB = b.stars || 0;
        if (starsB !== starsA) return starsB - starsA;
        return b.id - a.id;
      } else if (sortBy === 'latest') {
        return b.id - a.id;
      } else if (sortBy === 'views') {
        const viewsA = parseInt((a.views || '0').replace(/[^0-9]/g, '')) || 0;
        const viewsB = parseInt((b.views || '0').replace(/[^0-9]/g, '')) || 0;
        return viewsB - viewsA;
      }
      return 0;
    });
  }, [posts, selectedCategory, selectedCreator, selectedTag, hasGithubOnly, minStars, searchQuery, sortBy]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCreator, selectedTag, hasGithubOnly, minStars, sortBy]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(start, start + postsPerPage);
  }, [filteredPosts, currentPage]);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(d);
    } catch {
      return isoStr.split('T')[0];
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} style={{ fontFamily: "'Vazirmatn', sans-serif" }}>
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header - Fully Mobile Responsive */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${darkMode ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white shrink-0">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    RepoFA
                  </h1>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    Persian GitHub
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden xs:block">آرشیو و کاوشگر جامع پروژه‌های اوپن‌سورس فارسی</p>
              </div>
            </div>

            {/* Dark Mode Toggle on Mobile */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`sm:hidden p-2 rounded-xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
              title="تغییر حالت شب/روز"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Social Links Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto justify-start sm:justify-end">
            <a 
              href="https://t.me/GitHubLensBot" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all shrink-0"
              title="ربات هوشمند گیت‌هاب لِنز"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>ربات @GitHubLensBot</span>
            </a>

            <a 
              href="https://t.me/RepoFaGP" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shrink-0"
              title="گروه گفتگوی RepoFA"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>گروه @RepoFaGP</span>
            </a>

            <a 
              href="https://x.com/PersianGitHub" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-all shrink-0"
              title="صفحه اکس (توییتر) PersianGitHub"
            >
              <span className="font-mono font-bold text-xs">𝕏</span>
              <span className="hidden sm:inline">اکس</span>
            </a>

            <a 
              href="https://t.me/RepoFA" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all shrink-0"
              title="کانال تلگرام"
            >
              <Send className="w-3.5 h-3.5" />
              <span>کانال</span>
            </a>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`hidden sm:flex p-2 rounded-xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              title="تغییر حالت شب/روز"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Community & Official Channels Banner */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl ${darkMode ? 'bg-slate-900/60 border-slate-800/90' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100">جامعه و ابزارهای رسمی RepoFA</h2>
              <p className="text-xs text-slate-400">برای ارسال ریپازیتوری، گفتگو با برنامه‌نویسان و تحلیل هوشمند مخازن</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://t.me/GitHubLensBot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>@GitHubLensBot</span>
            </a>

            <a
              href="https://t.me/RepoFaGP"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>@RepoFaGP</span>
            </a>

            <a
              href="https://x.com/PersianGitHub"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all"
            >
              <span className="font-mono font-bold text-xs">𝕏</span>
              <span>@PersianGitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Latest Releases & Recent Posts Showcase */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm sm:text-base font-black text-slate-100">جدیدترین پروژه‌های معرفی شده در RepoFA</h2>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                تازه و پرطرفدار
              </span>
            </div>
            <button
              onClick={() => {
                setSortBy('latest');
                window.scrollTo({ top: 800, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 text-right cursor-pointer"
            >
              مرتب‌سازی بر اساس جدیدترین‌ها ↓
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {latestPosts.slice(0, 4).map(post => {
              return (
                <div 
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    darkMode 
                      ? 'bg-slate-950/60 border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-900/80' 
                      : 'bg-slate-50 border-slate-200 hover:border-amber-500/50 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        پست #{post.id}
                      </span>
                      
                      {/* Metric Badges (Star & Fork) */}
                      <div className="flex items-center gap-2">
                        {post.stars !== undefined && post.stars > 0 && (
                          <span className="flex items-center gap-1 font-mono text-amber-400 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {formatNumber(post.stars)}
                          </span>
                        )}
                        {post.forks !== undefined && post.forks > 0 && (
                          <span className="flex items-center gap-1 font-mono text-slate-400 text-xs">
                            <GitFork className="w-3 h-3 text-cyan-400" />
                            {formatNumber(post.forks)}
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-relaxed mb-2">
                      {post.title_clean}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5 mt-2 font-mono">
                    <span className="truncate max-w-[140px] text-cyan-300">{post.primary_repo || 'پروژه اوپن‌سورس'}</span>
                    <span className="text-amber-400 group-hover:translate-x-[-2px] transition-transform">←</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero & Search Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 text-center">
        {selectedCreator && (
          <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-bold mb-6 animate-fade-in shadow-lg">
            <img 
              src={`https://github.com/${selectedCreator}.png?size=48`} 
              alt={selectedCreator} 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-cyan-400"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span>فیلتر فعال: پروژه‌های {selectedCreator}</span>
            <button 
              onClick={() => setCreatorProfileModal(selectedCreator)}
              className="text-xs px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 underline cursor-pointer"
            >
              پروفایل
            </button>
            <button 
              onClick={() => setSelectedCreator(null)}
              className="p-1 hover:bg-cyan-500/20 rounded-lg text-cyan-300 cursor-pointer"
              title="حذف فیلتر"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Big Search Bar */}
        <div className="max-w-3xl mx-auto relative mb-6">
          <div className="relative flex items-center">
            <Search className="absolute right-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در ۵۳۰+ پروژه اوپن‌سورس، نام توسعه‌دهنده، تکنولوژی..."
              className={`w-full pr-12 pl-12 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-medium outline-none transition-all duration-200 shadow-xl ${
                darkMode 
                  ? 'bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10' 
                  : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter and Sorting Control Bar - Responsive Layout */}
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border mb-8 bg-slate-900/60 border-slate-800/80 text-xs">
          
          {/* Sorting Buttons (Default: Highest Stars) */}
          <div className="flex flex-col xs:flex-row xs:items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 font-bold">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              مرتب‌سازی:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto">
              <button
                onClick={() => setSortBy('stars')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                  sortBy === 'stars' 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>بیشترین استار</span>
              </button>

              <button
                onClick={() => setSortBy('latest')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                  sortBy === 'latest' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>جدیدترین‌ها</span>
              </button>

              <button
                onClick={() => setSortBy('views')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                  sortBy === 'views' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پربازدید</span>
              </button>
            </div>
          </div>

          {/* Star Threshold Quick Filters */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-bold hidden xs:inline">استار:</span>
              {[0, 100, 1000, 10000].map(starCount => (
                <button
                  key={starCount}
                  onClick={() => setMinStars(starCount)}
                  className={`px-2 py-1 rounded-lg border font-mono font-bold transition-all cursor-pointer text-[11px] sm:text-xs ${
                    minStars === starCount
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {starCount === 0 ? 'همه' : `+${formatNumber(starCount)}`}
                </button>
              ))}
            </div>

            <button
              onClick={() => setHasGithubOnly(!hasGithubOnly)}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-bold cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                hasGithubOnly 
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' 
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-300'
              }`}
            >
              <GitBranch className="w-3 h-3" />
              <span>فقط با ریپو</span>
            </button>
          </div>
        </div>

        {/* Extensive Categories Grid */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs sm:text-sm font-black text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              دسته‌بندی‌های موضوعی پروژه‌ها:
            </h2>
            {selectedCategory !== 'همه' && (
              <button
                onClick={() => setSelectedCategory('همه')}
                className="text-xs text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                نمایش همه دسته‌ها
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {Object.entries(categoryStats).map(([cat, count]) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedTag(null);
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-400 shadow-lg shadow-cyan-500/25 scale-[1.02] sm:scale-[1.03] ring-2 ring-cyan-400' 
                      : darkMode 
                        ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:bg-slate-900' 
                        : 'bg-white border-slate-200 hover:border-cyan-500/40 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCategoryIcon(cat)}
                    <span className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-black ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-cyan-400'}`}>
                      {count}
                    </span>
                  </div>
                  <span className="font-bold text-[11px] sm:text-xs leading-snug line-clamp-2">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags bar */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-4xl mx-auto mb-6">
            <span className="text-slate-500 text-xs flex items-center gap-1 ml-2 font-bold">
              <Tag className="w-3 h-3" /> هشتگ‌ها:
            </span>
            {topTags.map(tag => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-500/20 border border-blue-400 text-blue-300 font-bold' 
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Posts Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-16">
        {currentPosts.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 max-w-md mx-auto px-4">
            <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
            <h3 className="text-base font-bold text-slate-300 mb-1">هیچ پروژه‌ای با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-500 mb-4">فیلتر استار، عبارت جستجو یا دسته‌بندی را تغییر دهید.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('همه');
                setSelectedCreator(null);
                setSelectedTag(null);
                setHasGithubOnly(false);
                setMinStars(0);
                setSortBy('stars');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
            >
              پاکسازی همه فیلترها
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {currentPosts.map(post => {
              const coverUrl = getPostCoverImage(post);
              return (
                <div 
                  key={post.id}
                  className={`group rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-2xl ${
                    darkMode 
                      ? 'bg-slate-900/70 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/90' 
                      : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-cyan-500/10'
                  }`}
                >
                  {/* Media Preview */}
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-950">
                    <img 
                      src={coverUrl} 
                      alt={post.title_clean || ''} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://opengraph.githubassets.com/1/RepoFA/RepoFA.github.io`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                    
                    {/* Stars & Forks Floating Badge on Top Right */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {post.stars !== undefined && post.stars > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md text-xs font-mono font-black text-amber-400 border border-amber-500/40 shadow-lg">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{formatNumber(post.stars)}</span>
                        </span>
                      )}
                      {post.forks !== undefined && post.forks > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30 shadow-lg">
                          <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{formatNumber(post.forks)}</span>
                        </span>
                      )}
                    </div>

                    {post.primary_repo && (
                      <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-xs font-mono font-bold text-cyan-300 border border-slate-800 shadow">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{post.primary_repo}</span>
                        </span>
                        {post.language && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/85 text-[10px] font-mono text-slate-300 border border-slate-800">
                            {post.language}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta badges */}
                      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {(post.categories || []).slice(0, 2).map(cat => (
                            <button 
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(post.datetime)}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 
                        onClick={() => setSelectedPost(post)}
                        className="text-sm sm:text-base font-black text-slate-100 mb-2.5 line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors leading-relaxed"
                      >
                        {post.title_clean}
                      </h3>

                      {/* Creators badge inside card with avatar */}
                      {post.authors && post.authors.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] text-slate-500 font-bold">توسعه‌دهنده:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {post.authors.map(author => (
                              <button
                                key={author}
                                onClick={() => setCreatorProfileModal(author)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 hover:border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold border border-slate-700 transition-all shadow-sm cursor-pointer"
                              >
                                <img 
                                  src={`https://github.com/${author}.png?size=32`} 
                                  alt="" 
                                  className="w-4 h-4 rounded-full border border-slate-600"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <span>{author}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Snippet */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                        {post.text_plain}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-800/60 mt-auto">
                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 3).map(tag => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded-md cursor-pointer"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {post.github_links && post.github_links.length > 0 ? (
                            <a
                              href={post.github_links[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all hover:border-cyan-500/40"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                              <span>مخزن</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">بدون ریپو</span>
                          )}

                          <button
                            onClick={() => setSelectedPost(post)}
                            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20 transition-all cursor-pointer"
                          >
                            مشاهده کامل
                          </button>
                        </div>

                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          title="مشاهده در تلگرام"
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-mono text-xs">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer ${
                      currentPage === pageNum 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20' 
                        : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Creators / People Section at Bottom of Homepage */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-20 border-t border-slate-800/60 pt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              توسعه‌دهندگان و خالقان پروژه‌ها
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              کلیک روی هر فرد برای مشاهده پروفایل و تمامی پروژه‌های اوپن‌سورس او در RepoFA ({creatorStats.length} فرد و سازمان)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {creatorStats.slice(0, 36).map(creator => {
            const isSelected = selectedCreator === creator.name;
            return (
              <button
                key={creator.name}
                onClick={() => setCreatorProfileModal(creator.name)}
                className={`p-3 sm:p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 group cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md ring-2 ring-cyan-500/30'
                    : darkMode
                      ? 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:bg-slate-900'
                      : 'bg-white border-slate-200 hover:border-cyan-500/40 text-slate-700'
                }`}
              >
                <div className="relative">
                  <img 
                    src={creator.avatar} 
                    alt={creator.name} 
                    className="w-12 sm:w-14 h-12 sm:h-14 rounded-full border-2 border-slate-700 group-hover:border-cyan-400 object-cover group-hover:scale-105 transition-transform shadow"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                    }}
                  />
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-mono text-[10px] font-black shadow">
                    {creator.count}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold truncate w-full text-center group-hover:text-cyan-400">
                  {creator.name}
                </span>
                
                {/* Stats badge on Creator Avatar */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  {creator.totalStars > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {formatNumber(creator.totalStars)}
                    </span>
                  )}
                  <span>{creator.count} پروژه</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Creator Profile Modal */}
      {activeCreatorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-950/80">
          <div 
            className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <img 
                  src={activeCreatorData.avatar} 
                  alt={activeCreatorData.name} 
                  className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl border-2 border-cyan-400 shadow-xl object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                      {activeCreatorData.name}
                    </h2>
                    <a 
                      href={`https://github.com/${activeCreatorData.name}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      title="پروفایل گیت‌هاب"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>پروژه‌ها: <strong className="text-cyan-300">{activeCreatorData.count}</strong></span>
                    {activeCreatorData.totalStars > 0 && (
                      <span className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {formatNumber(activeCreatorData.totalStars)} استار
                      </span>
                    )}
                    {activeCreatorData.totalForks > 0 && (
                      <span className="flex items-center gap-1 font-mono text-slate-300 font-bold">
                        <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                        {formatNumber(activeCreatorData.totalForks)} فورک
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setCreatorProfileModal(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content - Repos List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                لیست ریپازیتوری‌ها و پست‌های {activeCreatorData.name}:
              </h3>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                {activeCreatorData.posts.map(post => {
                  return (
                    <div 
                      key={post.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="space-y-1 w-full sm:w-auto">
                        <h4 
                          onClick={() => {
                            setSelectedPost(post);
                            setCreatorProfileModal(null);
                          }}
                          className="text-xs sm:text-sm font-bold text-slate-100 hover:text-cyan-400 cursor-pointer"
                        >
                          {post.title_clean}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono text-cyan-400">{post.primary_repo || 'پروژه'}</span>
                          {post.stars !== undefined && post.stars > 0 && (
                            <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {formatNumber(post.stars)}
                            </span>
                          )}
                          {post.forks !== undefined && post.forks > 0 && (
                            <span className="flex items-center gap-1 text-slate-400 font-mono font-bold">
                              <GitFork className="w-3 h-3 text-cyan-400" />
                              {formatNumber(post.forks)}
                            </span>
                          )}
                          <span>·</span>
                          <span>{formatDate(post.datetime)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        {post.github_links && post.github_links.length > 0 && (
                          <a
                            href={post.github_links[0]}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                          >
                            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                            <span>مخزن</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPost(post);
                            setCreatorProfileModal(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20 cursor-pointer"
                        >
                          مشاهده
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profile Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedCreator(activeCreatorData.name);
                  setCreatorProfileModal(null);
                  window.scrollTo({ top: 800, behavior: 'smooth' });
                }}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                فیلتر صفحه اصلی با پروژه‌های این فرد
              </button>

              <button
                onClick={() => setCreatorProfileModal(null)}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View for Detailed Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-950/80">
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span className="text-xs font-mono text-slate-400">پست #{selectedPost.id}</span>
                {selectedPost.stars !== undefined && selectedPost.stars > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold mr-1.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {formatNumber(selectedPost.stars)} Stars
                  </span>
                )}
                {selectedPost.forks !== undefined && selectedPost.forks > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                    <GitFork className="w-3 h-3" />
                    {formatNumber(selectedPost.forks)} Forks
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
              <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-60 sm:max-h-72 bg-slate-950">
                <img 
                  src={getPostCoverImage(selectedPost)} 
                  alt={selectedPost.title_clean || ''} 
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-base sm:text-xl font-black text-slate-100 leading-relaxed">
                {selectedPost.title_clean}
              </h2>

              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(selectedPost.categories || []).map(cat => (
                  <span key={cat} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    {cat}
                  </span>
                ))}
                {selectedPost.authors && selectedPost.authors.map(author => (
                  <button
                    key={author}
                    onClick={() => {
                      setCreatorProfileModal(author);
                      setSelectedPost(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1.5 font-mono font-bold hover:bg-slate-700 transition-colors"
                  >
                    <img 
                      src={`https://github.com/${author}.png?size=24`} 
                      alt="" 
                      className="w-4 h-4 rounded-full"
                    />
                    <span>توسعه‌دهنده: {author}</span>
                  </button>
                ))}
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(selectedPost.datetime)}
                </span>
                {selectedPost.views && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {selectedPost.views} بازدید
                  </span>
                )}
              </div>

              {/* Full Text Content */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedPost.text_plain}
              </div>

              {/* GitHub Links Box */}
              {selectedPost.github_links && selectedPost.github_links.length > 0 && (
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4" />
                    مخزن‌های مرتبط در گیت‌هاب:
                  </div>
                  {selectedPost.github_links.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-mono text-cyan-300 hover:underline truncate flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                        {link}
                      </a>
                      <button 
                        onClick={() => copyToClipboard(link, selectedPost.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 shrink-0 cursor-pointer"
                        title="کپی آدرس ریپازیتوری"
                      >
                        {copiedId === selectedPost.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
              <a
                href={selectedPost.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                <Send className="w-4 h-4" />
                <span className="hidden xs:inline">مشاهده مستقیم در تلگرام</span>
                <span className="xs:hidden">تلگرام</span>
              </a>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-8 sm:py-10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right">
            <p className="font-bold text-slate-300 text-sm">RepoFA | پایگاه پروژه‌ها و ابزارهای اوپن‌سورس فارسی</p>
            <p className="text-slate-500 mt-1">حمایت، معرفی و مستندسازی برترین ابزارها و ریپازیتوری‌های توسعه‌دهندگان ایرانی</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-bold">
            <a href="https://t.me/GitHubLensBot" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors">
              <Bot className="w-4 h-4" />
              <span>@GitHubLensBot</span>
            </a>
            <a href="https://t.me/RepoFaGP" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>@RepoFaGP</span>
            </a>
            <a href="https://x.com/PersianGitHub" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors">
              <span className="font-mono font-bold text-xs">𝕏</span>
              <span>@PersianGitHub</span>
            </a>
            <a href="https://t.me/RepoFA" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
              <Send className="w-4 h-4" />
              <span>@RepoFA</span>
            </a>
            <a href="https://github.com/RepoFA" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 transition-colors">
              <FolderGit2 className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
