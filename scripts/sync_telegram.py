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

def sync_channel():
    all_posts = []
    before = None
    seen_ids = set()
    url = 'https://t.me/s/RepoFA'
    
    os.makedirs('data', exist_ok=True)
    os.makedirs('src', exist_ok=True)
    
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
                
            # Categories
            keywords = {
                'AI & هوش مصنوعی': ['هوش مصنوعی', 'llm', 'gpt', 'ai', 'عمیق', 'مدل', 'openai', 'ollama', 'یادگیری ماشین'],
                'ابزار توسعه (DevTools)': ['cli', 'devtools', 'ابزار', 'ترمینال', 'گیت', 'docker', 'داکر', 'کدنویسی', 'کد'],
                'فرانت‌اند & وب': ['react', 'vue', 'frontend', 'فرانت', 'css', 'html', 'javascript', 'typescript', 'وب'],
                'بک‌اند & سرور': ['backend', 'پایتون', 'python', 'golang', 'rust', 'سرور', 'api', 'دیتابیس', 'db', 'node'],
                'امنیت & شبکه': ['فیلترشکن', 'پروکسی', 'v2ray', 'امنیت', 'vpn', 'dns', 'tunnel', 'شبکه', 'proxy'],
                'سیستم عامل & لینوکس': ['لینوکس', 'linux', 'سیستم عامل', 'ویندوز', 'mac', 'ابونتو'],
                'ربات & تلگرام': ['تلگرام', 'telegram', 'bot', 'ربات']
            }
            
            detected_cats = []
            text_lower = text_plain.lower()
            for cat, kws in keywords.items():
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
                'categories': detected_cats
            })
            batch_new += 1
            
        if batch_new == 0 or min_id is None or min_id <= 1:
            break
        before = min_id

    if all_posts:
        all_posts.sort(key=lambda x: x['id'], reverse=True)
        with open('data/posts.json', 'w', encoding='utf-8') as f:
            json.dump(all_posts, f, ensure_ascii=False, indent=2)
            
        with open('src/posts_data.json', 'w', encoding='utf-8') as f:
            json.dump(all_posts, f, ensure_ascii=False, indent=2)
            
        print(f'Successfully synced {len(all_posts)} posts.')
    else:
        print('No posts fetched, keeping existing data.')

if __name__ == '__main__':
    sync_channel()
