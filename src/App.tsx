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
  LayoutGrid,
  Code2
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
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'all' | 'categories' | 'creators'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasGithubOnly, setHasGithubOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [creatorProfileModal, setCreatorProfileModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const posts = postsRaw as Post[];
  const postsPerPage = 12;

  // Process posts
  const processedPosts = useMemo(() => {
    return posts.map(p => {
      const text = p.text_plain || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const titleClean = p.title_clean || (lines.length > 0 ? (lines[0].length > 100 ? lines[0].substring(0, 97) + '...' : lines[0]) : 'بدون عنوان');
      
      let cats = p.categories || [];
      if (!cats || cats.length === 0) {
        const keywords: Record<string, string[]> = {
          'AI & هوش مصنوعی': ['هوش مصنوعی', 'llm', 'gpt', 'ai', 'مدل', 'openai', 'ollama', 'یادگیری ماشین'],
          'ابزار توسعه (DevTools)': ['cli', 'devtools', 'ابزار', 'ترمینال', 'گیت', 'docker', 'داکر', 'کد'],
          'فرانت‌اند & وب': ['react', 'vue', 'frontend', 'فرانت', 'css', 'html', 'javascript', 'typescript', 'وب'],
          'بک‌اند & سرور': ['backend', 'پایتون', 'python', 'golang', 'rust', 'سرور', 'api', 'دیتابیس', 'db', 'node'],
          'امنیت & شبکه': ['فیلترشکن', 'پروکسی', 'v2ray', 'امنیت', 'vpn', 'dns', 'tunnel', 'شبکه', 'proxy'],
          'سیستم عامل & لینوکس': ['لینوکس', 'linux', 'سیستم عامل', 'ویندوز', 'mac', 'ابونتو'],
          'ربات & تلگرام': ['تلگرام', 'telegram', 'bot', 'ربات']
        };
        const textLower = text.toLowerCase();
        const detected = [];
        for (const [cat, kws] of Object.entries(keywords)) {
          if (kws.some(kw => textLower.includes(kw))) {
            detected.push(cat);
          }
        }
        cats = detected.length > 0 ? detected : ['سایر پروژه‌ها'];
      }

      const authors = p.authors || [];
      return {
        ...p,
        title_clean: titleClean,
        categories: cats,
        authors: authors
      };
    });
  }, [posts]);

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

  // Category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { 'همه': processedPosts.length };
    processedPosts.forEach(p => {
      p.categories.forEach(cat => {
        stats[cat] = (stats[cat] || 0) + 1;
      });
    });
    return stats;
  }, [processedPosts]);

  // Creator stats & profiles mapping
  const creatorStats = useMemo(() => {
    const map: Record<string, { count: number; avatar: string; repos: string[]; posts: Post[] }> = {};
    processedPosts.forEach(p => {
      (p.authors || []).forEach(author => {
        if (!map[author]) {
          map[author] = {
            count: 0,
            avatar: `https://github.com/${author}.png?size=120`,
            repos: [],
            posts: []
          };
        }
        map[author].count += 1;
        map[author].posts.push(p);
        if (p.primary_repo && !map[author].repos.includes(p.primary_repo)) {
          map[author].repos.push(p.primary_repo);
        }
      });
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [processedPosts]);

  const activeCreatorData = useMemo(() => {
    if (!creatorProfileModal) return null;
    return creatorStats.find(c => c.name === creatorProfileModal) || null;
  }, [creatorProfileModal, creatorStats]);

  // Top tags
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    processedPosts.forEach(p => {
      (p.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([tag]) => tag);
  }, [processedPosts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return processedPosts.filter(post => {
      // Category filter
      if (selectedCategory !== 'همه' && !post.categories.includes(selectedCategory)) {
        return false;
      }

      // Creator filter
      if (selectedCreator && !(post.authors || []).includes(selectedCreator)) {
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
        const inTitle = (post.title_clean || '').toLowerCase().includes(q);
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
  }, [processedPosts, selectedCategory, selectedCreator, selectedTag, hasGithubOnly, searchQuery]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCreator, selectedTag, hasGithubOnly, activeTab]);

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
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${darkMode ? 'bg-slate-950/85 border-slate-800/80' : 'bg-white/85 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  RepoFA
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  Persian GitHub Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">آرشیو و کاوشگر جامع پروژه‌های اوپن‌سورس و توسعه‌دهندگان ایرانی</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a 
              href="https://t.me/RepoFA" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">کانال تلگرام</span>
            </a>
            <a 
              href="https://github.com/RepoFA/RepoFA.github.io" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
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

      {/* Featured Creators Carousel on Home */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200 shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-200">توسعه‌دهندگان و خالقان پروژه‌ها</h2>
              <span className="text-[11px] text-slate-400">({creatorStats.length} سازنده و سازمان)</span>
            </div>
            <button
              onClick={() => {
                setActiveTab('creators');
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              مشاهده همه افراد ←
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {creatorStats.slice(0, 18).map(creator => {
              const isSelected = selectedCreator === creator.name;
              return (
                <button
                  key={creator.name}
                  onClick={() => setCreatorProfileModal(creator.name)}
                  className={`shrink-0 flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all duration-200 group ${
                    isSelected 
                      ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-500/30' 
                      : darkMode
                        ? 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/80'
                        : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 hover:bg-slate-100'
                  }`}
                  style={{ minWidth: '92px' }}
                >
                  <div className="relative">
                    <img 
                      src={creator.avatar} 
                      alt={creator.name} 
                      className="w-12 h-12 rounded-full border-2 border-slate-700 group-hover:border-cyan-400 object-cover shadow transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                      }}
                    />
                    <span className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black shadow">
                      {creator.count}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium truncate max-w-[80px] text-slate-300 group-hover:text-cyan-300">
                    {creator.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-center">
          <div className={`p-1.5 rounded-2xl border flex items-center gap-1 shadow-lg ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('همه');
                setSelectedCreator(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>همه پروژه‌ها ({processedPosts.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('categories');
                setSelectedCreator(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>دسته‌بندی موضوعی ({Object.keys(categoryStats).length - 1})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('creators');
                setSelectedCategory('همه');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'creators'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>تفکیک افراد ({creatorStats.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero & Search Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 text-center">
        {selectedCreator && (
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-bold mb-4 animate-fade-in shadow-lg">
            <img 
              src={`https://github.com/${selectedCreator}.png?size=48`} 
              alt={selectedCreator} 
              className="w-6 h-6 rounded-full border border-cyan-400"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span>فیلتر فعال: پروژه‌های {selectedCreator}</span>
            <button 
              onClick={() => setCreatorProfileModal(selectedCreator)}
              className="text-xs px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 underline"
            >
              مشاهده پروفایل
            </button>
            <button 
              onClick={() => setSelectedCreator(null)}
              className="p-1 hover:bg-cyan-500/20 rounded-lg text-cyan-300"
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
              placeholder="جستجو در ۵۳۰+ پروژه اوپن‌سورس، نام توسعه‌دهنده، تکنولوژی یا هشتگ..."
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

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHasGithubOnly(!hasGithubOnly)}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-bold ${
                  hasGithubOnly 
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' 
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-300'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>فقط دارای مخزن گیت‌هاب</span>
              </button>
            </div>

            <div className="text-slate-400 font-bold">
              نمایش <span className="text-cyan-400">{filteredPosts.length}</span> پروژه
            </div>
          </div>
        </div>

        {/* Categories Tab Content */}
        {activeTab === 'categories' && (
          <div className="max-w-5xl mx-auto mb-8 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {Object.entries(categoryStats).filter(([cat]) => cat !== 'همه').map(([cat, count]) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(isSelected ? 'همه' : cat);
                      setSelectedTag(null);
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]' 
                        : darkMode 
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Layers className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-black ${isSelected ? 'bg-black/20 text-white' : 'bg-slate-800 text-cyan-400'}`}>
                        {count} ریپو
                      </span>
                    </div>
                    <span className="font-bold text-sm">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Creators Tab Content */}
        {activeTab === 'creators' && (
          <div className="max-w-6xl mx-auto mb-10 text-right animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                لیست تمام توسعه‌دهندگان (کلیک روی هر فرد برای مشاهده پروفایل و پروژه‌ها):
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {creatorStats.map(creator => {
                const isSelected = selectedCreator === creator.name;
                return (
                  <button
                    key={creator.name}
                    onClick={() => setCreatorProfileModal(creator.name)}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 group cursor-pointer ${
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
                        className="w-14 h-14 rounded-full border-2 border-slate-700 group-hover:border-cyan-400 object-cover group-hover:scale-105 transition-transform shadow"
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
                    <span className="text-[10px] text-slate-500">
                      {creator.count} پروژه معرفی شده
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags bar */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-3xl mx-auto mb-6">
            <span className="text-slate-500 text-xs flex items-center gap-1 ml-2 font-bold">
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
            <p className="text-xs text-slate-500 mb-4">عبارت جستجو، فیلتر فرد یا دسته‌بندی را تغییر دهید.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('همه');
                setSelectedCreator(null);
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
                  {/* Media Preview: Guaranteed Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-950">
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
                    
                    {post.primary_repo && (
                      <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-xs font-mono font-bold text-cyan-300 border border-slate-800 shadow">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[220px]">{post.primary_repo}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta badges */}
                      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {(post.categories || []).slice(0, 2).map(cat => (
                            <button 
                              key={cat}
                              onClick={() => {
                                setSelectedCategory(cat);
                                setActiveTab('categories');
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 text-[11px] font-bold transition-colors"
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
                        className="text-base font-black text-slate-100 mb-2.5 line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors leading-relaxed"
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 hover:border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold border border-slate-700 transition-all shadow-sm"
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
                              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded-md"
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all hover:border-cyan-500/40"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                              <span>گیت‌هاب</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">بدون ریپو</span>
                          )}

                          <button
                            onClick={() => setSelectedPost(post)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20 transition-all"
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
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
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
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all ${
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
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Creator Profile Modal */}
      {activeCreatorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-950/80">
          <div 
            className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src={activeCreatorData.avatar} 
                  alt={activeCreatorData.name} 
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-400 shadow-xl object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black font-mono text-cyan-400">
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
                  <p className="text-xs text-slate-400 mt-1">
                    تعداد پروژه‌های معرفی شده در ریپوفا: <span className="font-bold text-cyan-300">{activeCreatorData.count} پروژه</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setCreatorProfileModal(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content - Repos List */}
            <div className="p-6 overflow-y-auto space-y-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                لیست ریپازیتوری‌ها و پست‌های {activeCreatorData.name}:
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {activeCreatorData.posts.map(post => {
                  return (
                    <div 
                      key={post.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h4 
                          onClick={() => {
                            setSelectedPost(post);
                            setCreatorProfileModal(null);
                          }}
                          className="text-sm font-bold text-slate-100 hover:text-cyan-400 cursor-pointer"
                        >
                          {post.title_clean}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono text-cyan-400">{post.primary_repo || 'پروژه'}</span>
                          <span>·</span>
                          <span>{formatDate(post.datetime)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20"
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedCreator(activeCreatorData.name);
                  setCreatorProfileModal(null);
                  setActiveTab('all');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition-colors"
              >
                فیلتر صفحه اصلی با پروژه‌های این فرد
              </button>

              <button
                onClick={() => setCreatorProfileModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-72 bg-slate-950">
                <img 
                  src={getPostCoverImage(selectedPost)} 
                  alt={selectedPost.title_clean || ''} 
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-100 leading-relaxed">
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
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
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
