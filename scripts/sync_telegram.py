import json
import os
import re
import ssl
import urllib.request
from bs4 import BeautifulSoup

# Create unverified context for environments with local proxies/custom CA cert chains
ctx = ssl._create_unverified_context()

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

CATEGORIES_MAP = {
    'هوش مصنوعی و یادگیری ماشین': ['هوش مصنوعی', 'llm', 'gpt', 'ai', 'عمیق', 'مدل', 'openai', 'ollama', 'یادگیری ماشین', 'whisper', 'stable diffusion', 'rag', 'agent', 'claude', 'gemini'],
    'ابزارهای توسعه و CLI': ['cli', 'devtools', 'ابزار', 'ترمینال', 'گیت', 'docker', 'داکر', 'کدنویسی', 'کد', 'کیبورد', 'extension', 'افزونه', 'vs code', 'ide', 'دیباگ', 'پکیج'],
    'فرانت‌اند و UI': ['react', 'vue', 'frontend', 'فرانت', 'css', 'html', 'javascript', 'typescript', 'وب', 'tailwind', 'next.js', 'svelte', 'کامپوننت', 'طراحی', 'ux', 'ui'],
    'بک‌اند و میکروسرویس': ['backend', 'پایتون', 'python', 'golang', 'rust', 'سرور', 'api', 'دیتابیس', 'db', 'node', 'django', 'fastapi', 'express', 'nest', 'postgres', 'redis', 'graphql'],
    'فیلترشکن، پروکسی و شبکه': ['فیلترشکن', 'پروکسی', 'v2ray', 'امنیت', 'vpn', 'dns', 'tunnel', 'شبکه', 'proxy', 'xray', 'vless', 'vmess', 'hysteria', 'warp', 'کانفیگ', 'شادوساکس'],
    'لینوکس و سیستم‌عامل': ['لینوکس', 'linux', 'سیستم عامل', 'ویندوز', 'mac', 'ابونتو', 'ubuntu', 'arch', 'bash', 'shell', 'کرنل', 'اسکریپت'],
    'بات‌های تلگرام و پیام‌رسان': ['تلگرام', 'telegram', 'bot', 'ربات', 'userbot', 'یوزربات', 'بله', 'ایتا', 'دیسکورد', 'discord'],
    'موبایل و اندروید': ['اندروید', 'android', 'flutter', 'react native', 'ios', 'موبایل', 'اپلیکیشن', 'apk', 'کاتلین', 'kotlin', 'swift'],
    'امنیت، تست نفوذ و پنتست': ['امنیت', 'پنتست', 'هک', 'نفوذ', 'اسکنر', 'scanner', 'security', 'crypto', 'رمزنگاری', 'exploit', 'آسیب‌پذیری'],
    'داده، اسکراپینگ و اتوماسیون': ['اسکرپ', 'اسکراپ', 'crawl', 'scraper', 'اتوماسیون', 'automation', 'داده', 'data', 'سلنیوم', 'selenium', 'پانداز', 'pandas']
}

def fetch_github_stars(repo_list):
    """Fetch stars and forks using GitHub GraphQL API with token or fallback to REST"""
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    
    # Try getting token from gh CLI if available locally
    if not token:
        try:
            import subprocess
            res = subprocess.run(['gh', 'auth', 'token'], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                token = res.stdout.strip()
        except Exception:
            pass

    stats = {}
    if not repo_list:
        return stats

    if token:
        print(f'Fetching GitHub stats via GraphQL for {len(repo_list)} repos...')
        chunk_size = 40
        for i in range(0, len(repo_list), chunk_size):
            chunk = repo_list[i:i+chunk_size]
            query_parts = []
            for idx, r in enumerate(chunk):
                parts = r.split('/')
                if len(parts) != 2:
                    continue
                owner, name = parts[0], parts[1]
                alias = f'repo_{idx}'
                query_parts.append(f'{alias}: repository(owner: "{owner}", name: "{name}") {{ nameWithOwner stargazerCount forks {{ totalCount }} primaryLanguage {{ name }} }}')
            
            if not query_parts:
                continue
                
            query = 'query { ' + ' '.join(query_parts) + ' }'
            req_data = json.dumps({'query': query}).encode('utf-8')
            req = urllib.request.Request(
                'https://api.github.com/graphql',
                data=req_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'User-Agent': 'RepoFA-Bot',
                    'Content-Type': 'application/json'
                }
            )
            try:
                with urllib.request.urlopen(req, context=ctx) as resp:
                    res_json = json.loads(resp.read().decode('utf-8'))
                    for k, v in res_json.get('data', {}).items():
                        if v and 'nameWithOwner' in v:
                            stats[v['nameWithOwner'].lower()] = {
                                'stars': v.get('stargazerCount', 0),
                                'forks': v.get('forks', {}).get('totalCount', 0),
                                'language': v.get('primaryLanguage', {}).get('name') if v.get('primaryLanguage') else None
                            }
            except Exception as e:
                print(f'GraphQL chunk error: {e}')
    else:
        print('No GitHub token found, attempting unauthenticated REST fetch for sample...')
        for r in repo_list[:30]:
            try:
                req = urllib.request.Request(
                    f'https://api.github.com/repos/{r}',
                    headers={'User-Agent': 'RepoFA-Bot'}
                )
                with urllib.request.urlopen(req, context=ctx) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    stats[r.lower()] = {
                        'stars': data.get('stargazers_count', 0),
                        'forks': data.get('forks_count', 0),
                        'language': data.get('language')
                    }
            except Exception:
                pass

    return stats

def sync_channel():
    all_posts = []
    before = None
    seen_ids = set()
    url = 'https://t.me/s/RepoFA'
    
    os.makedirs('data', exist_ok=True)
    os.makedirs('src', exist_ok=True)
    
    # Load existing posts to preserve cached stars if GitHub API is rate limited
    existing_stars = {}
    if os.path.exists('data/posts.json'):
        try:
            with open('data/posts.json', 'r', encoding='utf-8') as f:
                old_posts = json.load(f)
                for p in old_posts:
                    if p.get('primary_repo'):
                        existing_stars[p['primary_repo'].lower()] = {
                            'stars': p.get('stars', 0),
                            'forks': p.get('forks', 0),
                            'language': p.get('language')
                        }
        except Exception:
            pass

    while True:
        target_url = f'{url}?before={before}' if before else url
        req = urllib.request.Request(target_url, headers=headers)
        try:
            with urllib.request.urlopen(req, context=ctx) as resp:
                html = resp.read().decode('utf-8')
        except Exception as e:
            print(f'Error fetching {target_url}: {e}')
            break
            
        soup = BeautifulSoup(html, 'html.parser')
        msgs = soup.find_all('div', class_='tgme_widget_message')
        if not msgs:
            break
            
        batch_new = 0
        min_id = None
        for m in msgs:
            msg_id_val = m.get('data-post')
            if not msg_id_val or not isinstance(msg_id_val, str):
                continue
            msg_id = str(msg_id_val)
            num_id = int(msg_id.split('/')[-1])
            if min_id is None or num_id < min_id:
                min_id = num_id
                
            if msg_id in seen_ids:
                continue
            seen_ids.add(msg_id)
            
            text_el = m.find('div', class_='tgme_widget_message_text')
            text_html = text_el.decode_contents() if text_el else ''
            text_plain = text_el.get_text('\n') if text_el else ''
            
            time_el = m.find('time')
            datetime_val = str(time_el.get('datetime')) if time_el and time_el.get('datetime') else ''
            
            photos = []
            photo_wrap = m.find_all('a', class_='tgme_widget_message_photo_wrap')
            for p in photo_wrap:
                style = str(p.get('style', ''))
                match = re.search(r"background-image:url\('([^']+)'\)", style)
                if match:
                    photos.append(match.group(1))
                    
            views_el = m.find('span', class_='tgme_widget_message_views')
            views = views_el.get_text().strip() if views_el else ''
            
            gh_links = []
            if text_el:
                for a in text_el.find_all('a'):
                    href = str(a.get('href', ''))
                    if 'github.com' in href:
                        gh_links.append(href)
            
            tags = re.findall(r'#([A-Za-z0-9_\u0600-\u06FF]+)', text_plain)
            
            # Repos & authors extraction
            repo_names = []
            authors = []
            repo_details = []
            for link in gh_links:
                match = re.search(r'github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)', link)
                if match:
                    owner, repo = match.group(1), match.group(2)
                    if owner.lower() not in ['features', 'topics', 'trending', 'collections', 'events', 'about']:
                        repo_names.append(f'{owner}/{repo}')
                        authors.append(owner)
                        repo_details.append({
                            'owner': owner,
                            'repo': repo,
                            'full_name': f'{owner}/{repo}',
                            'url': link
                        })
            
            # Clean title
            lines = [l.strip() for l in text_plain.split('\n') if l.strip()]
            first_line = lines[0] if lines else 'بدون عنوان'
            title = first_line
            if len(title) > 100:
                title = title[:97] + '...'
                
            # Rich Categories
            detected_cats = []
            text_lower = text_plain.lower()
            for cat, kws in CATEGORIES_MAP.items():
                if any(kw in text_lower for kw in kws):
                    detected_cats.append(cat)
                    
            if not detected_cats:
                detected_cats.append('سایر پروژه‌ها')
            
            all_posts.append({
                'id': num_id,
                'post_id': msg_id,
                'url': f'https://t.me/{msg_id}',
                'datetime': datetime_val,
                'title': title,
                'title_clean': title,
                'text_html': text_html,
                'text_plain': text_plain,
                'photos': photos,
                'views': views,
                'github_links': list(set(gh_links)),
                'tags': list(set(tags)),
                'primary_repo': repo_names[0] if repo_names else None,
                'repo_names': list(set(repo_names)),
                'authors': list(dict.fromkeys(authors)),
                'primary_author': authors[0] if authors else None,
                'repo_details': repo_details,
                'categories': detected_cats,
                'stars': 0,
                'forks': 0,
                'language': None
            })
            batch_new += 1
            
        if batch_new == 0 or min_id is None or min_id <= 1:
            break
        before = min_id

    if all_posts:
        # Collect unique primary repos for stats fetch
        unique_repos = list(set([p['primary_repo'] for p in all_posts if p.get('primary_repo')]))
        fetched_stats = fetch_github_stars(unique_repos)
        
        # Merge fetched stats or fallback to existing cached stats
        for p in all_posts:
            if p.get('primary_repo'):
                key = p['primary_repo'].lower()
                if key in fetched_stats:
                    p['stars'] = fetched_stats[key]['stars']
                    p['forks'] = fetched_stats[key]['forks']
                    p['language'] = fetched_stats[key]['language']
                elif key in existing_stars:
                    p['stars'] = existing_stars[key]['stars']
                    p['forks'] = existing_stars[key]['forks']
                    p['language'] = existing_stars[key]['language']

        all_posts.sort(key=lambda x: x['id'], reverse=True)
        with open('data/posts.json', 'w', encoding='utf-8') as f:
            json.dump(all_posts, f, ensure_ascii=False, indent=2)
            
        with open('src/posts_data.json', 'w', encoding='utf-8') as f:
            json.dump(all_posts, f, ensure_ascii=False, indent=2)
            
        print(f'Successfully synced {len(all_posts)} posts with GitHub stars & forks.')
    else:
        print('No posts fetched, keeping existing data.')

if __name__ == '__main__':
    sync_channel()
