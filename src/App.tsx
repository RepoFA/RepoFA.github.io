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
  Sparkles, 
  FolderGit2, 
  Moon, 
  Sun,
  X,
  Filter,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  GitBranch
} from 'lucide-react';

interface Post {
  id: number;
  post_id: string;
  url: string;
  datetime: string;
  title: string;
  title_clean: string;
  text_html: string;
  text_plain: string;
  photos: string[];
  views: string;
  github_links: string[];
  tags: string[];
  primary_repo: string | null;
  repo_names: string[];
  categories: string[];
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasGithubOnly, setHasGithubOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const posts = postsRaw as Post[];
  const postsPerPage = 12;

  // Extract all categories and count
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { 'همه': posts.length };
    posts.forEach(p => {
      p.categories.forEach(cat => {
        stats[cat] = (stats[cat] || 0) + 1;
      });
    });
    return stats;
  }, [posts]);

  // Extract all tags
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(p => {
      p.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Category filter
      if (selectedCategory !== 'همه' && !post.categories.includes(selectedCategory)) {
        return false;
      }

      // Tag filter
      if (selectedTag && !post.tags.includes(selectedTag)) {
        return false;
      }

      // Github only filter
      if (hasGithubOnly && (!post.github_links || post.github_links.length === 0)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = post.title_clean.toLowerCase().includes(q);
        const inText = post.text_plain.toLowerCase().includes(q);
        const inRepo = post.repo_names.some(r => r.toLowerCase().includes(q));
        const inTags = post.tags.some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inText && !inRepo && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [posts, selectedCategory, selectedTag, hasGithubOnly, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTag, hasGithubOnly]);

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
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${darkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight font-vazir bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  RepoFA
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  Persian GitHub Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">آرشیو و کاوشگر جامع پروژه‌های اوپن‌سورس فارسی</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a 
              href="https://t.me/RepoFA" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">کانال تلگرام</span>
            </a>
            <a 
              href="https://github.com/RepoFA/RepoFA.github.io" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مخزن گیت‌هاب</span>
            </a>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              title="تغییر حالت شب/روز"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>مرجع کشف و معرفی بیش از ۵۰۰ ریپازیتوری کاربردی و بومی</span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
          کاوش در دنیای <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">ریپازیتوری‌های برتر</span>
        </h2>
        
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 mb-8 leading-relaxed">
          تمام ابزارها، اسکریپت‌ها، کتابخانه‌ها و پروژه‌های اوپن‌سورس معرفی شده در کانال تلگرامی RepoFA با جستجوی هوشمند و دسته‌بندی موضوعی.
        </p>

        {/* Big Search Bar */}
        <div className="max-w-3xl mx-auto relative mb-8">
          <div className="relative flex items-center">
            <Search className="absolute right-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام ریپازیتوری، توضیحات، تگ یا کلیدواژه..."
              className={`w-full pr-12 pl-12 py-4 rounded-2xl text-base font-medium outline-none transition-all duration-200 shadow-xl ${
                darkMode 
                  ? 'bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10' 
                  : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-4 p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5" /> فیلتر سریع:
              </span>
              <button
                onClick={() => setHasGithubOnly(!hasGithubOnly)}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  hasGithubOnly 
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 font-bold' 
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-300'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>دارای لینک گیت‌هاب</span>
              </button>
            </div>

            <div className="text-slate-400 font-medium">
              نمایش <span className="text-cyan-400 font-bold">{filteredPosts.length}</span> مورد از {posts.length} پست
            </div>
          </div>
        </div>

        {/* Category Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto mb-6">
          {Object.entries(categoryStats).map(([cat, count]) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedTag(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 font-bold scale-105' 
                    : darkMode 
                      ? 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isSelected ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Top Tags List */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-3xl mx-auto mb-10">
            <span className="text-slate-500 text-xs flex items-center gap-1 ml-2">
              <Tag className="w-3 h-3" /> هشتگ‌ها:
            </span>
            {topTags.map(tag => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
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

      {/* Main Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {currentPosts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 max-w-md mx-auto">
            <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
            <h3 className="text-base font-bold text-slate-300 mb-1">هیچ پروژه‌ای با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-500 mb-4">عبارت جستجو یا فیلترها را تغییر دهید.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('همه');
                setSelectedTag(null);
                setHasGithubOnly(false);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 hover:bg-cyan-500/20"
            >
              پاکسازی همه فیلترها
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPosts.map(post => {
              return (
                <div 
                  key={post.id}
                  className={`group rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl ${
                    darkMode 
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/90' 
                      : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-cyan-500/5'
                  }`}
                >
                  {/* Card Media Preview (if exists) */}
                  {post.photos && post.photos.length > 0 && (
                    <div className="relative h-44 overflow-hidden bg-slate-950">
                      <img 
                        src={post.photos[0]} 
                        alt={post.title_clean} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                      
                      {/* Badge on Photo */}
                      {post.primary_repo && (
                        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-xs font-mono font-medium text-cyan-300 border border-slate-800">
                            <GitBranch className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{post.primary_repo}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Badges & Meta */}
                      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {post.categories.slice(0, 2).map(cat => (
                            <span 
                              key={cat}
                              className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-medium"
                            >
                              {cat}
                            </span>
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
                        className="text-base font-bold text-slate-100 mb-2.5 line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors leading-relaxed"
                      >
                        {post.title_clean}
                      </h3>

                      {/* Snippet */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                        {post.text_plain}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-800/60 mt-auto">
                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 3).map(tag => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 bg-slate-800/40 px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {post.github_links.length > 0 ? (
                            <a
                              href={post.github_links[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all hover:border-cyan-500/40"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                              <span>گیت‌هاب</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">بدون ریپو اختصاصی</span>
                          )}

                          <button
                            onClick={() => setSelectedPost(post)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/20 transition-all"
                          >
                            مشاهده کامل
                          </button>
                        </div>

                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          title="مشاهده در تلگرام"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
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
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
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
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-all ${
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
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Modal View for Detailed Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-950/80">
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                <span className="text-xs font-mono text-slate-400">پست #{selectedPost.id}</span>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {selectedPost.photos && selectedPost.photos.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-72 bg-slate-950">
                  <img 
                    src={selectedPost.photos[0]} 
                    alt={selectedPost.title_clean} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h2 className="text-lg sm:text-xl font-black text-slate-100 leading-relaxed">
                {selectedPost.title_clean}
              </h2>

              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {selectedPost.categories.map(cat => (
                  <span key={cat} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                    {cat}
                  </span>
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
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedPost.text_plain}
              </div>

              {/* GitHub Links Box */}
              {selectedPost.github_links.length > 0 && (
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4" />
                    مخزن‌های مرتبط در گیت‌هاب:
                  </div>
                  {selectedPost.github_links.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 shrink-0"
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
              <a
                href={selectedPost.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                <Send className="w-4 h-4" />
                مشاهده مستقیم در کانال تلگرام
              </a>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            ساخته شده برای حمایت از اکوسیستم اوپن‌سورس فارسی · <strong className="text-slate-400">RepoFA</strong>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://t.me/RepoFA" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">کانال تلگرام</a>
            <a href="https://t.me/RepoFaGP" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">سوپرگروه</a>
            <a href="https://github.com/RepoFA" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">سازمان گیت‌هاب</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
