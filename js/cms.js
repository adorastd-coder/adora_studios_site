(function(){
  const fallbackPosts = [
    {
      slug:'why-most-ad-audits-miss-the-point',
      title:'Why most ad audits miss the point',
      date:'2026-05-10',
      excerpt:'Expert guidance on systems, campaigns, and conversion optimization.',
      body:'Most ad audits focus on surface-level metrics. The real value comes from checking the offer, tracking, targeting, creative, and follow-up path together.'
    },
    {
      slug:'meta-vs-google-for-small-business',
      title:'Meta vs Google for small business',
      date:'2026-05-09',
      excerpt:'Practical strategies to scale businesses using performance marketing.',
      body:'Meta is usually stronger for creating demand and testing angles. Google Search is usually stronger when buyers are already searching for the exact service.'
    },
    {
      slug:'five-hooks-that-triple-ctr',
      title:'5 hooks that triple CTR',
      date:'2026-05-08',
      excerpt:'Actionable insights on paid ads, AI automation, and digital growth.',
      body:'Specificity, urgency, local relevance, proof, and pain-point clarity are the first hooks worth testing before making ads more complicated.'
    }
  ];

  const state = {posts:[]};
  const grid = document.getElementById('blogGrid');
  const status = document.getElementById('blogStatus');
  const postView = document.getElementById('postView');
  const config = window.VRIXO_BLOG_CONFIG || {};

  function escapeHTML(value){
    return String(value || '').replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function stripUnsafeHTML(html){
    return String(html || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'')
      .replace(/\son\w+="[^"]*"/gi,'')
      .replace(/\son\w+='[^']*'/gi,'');
  }

  function slugFromName(name){
    return String(name || '').replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.md$/,'').toLowerCase();
  }

  function parseFrontMatter(markdown, fallbackSlug){
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    const data = {};
    let body = markdown;
    if(match){
      body = match[2].trim();
      match[1].split(/\r?\n/).forEach(function(line){
        const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if(!pair)return;
        const key = pair[1].trim();
        const value = pair[2].trim().replace(/^['"]|['"]$/g,'');
        data[key] = value;
      });
    }
    return {
      slug:data.slug || fallbackSlug,
      title:data.title || 'Untitled post',
      date:data.date || '',
      excerpt:data.excerpt || body.replace(/[#*_>`-]/g,'').slice(0,150),
      image:data.image || '',
      body:body
    };
  }

  function formatDate(value){
    if(!value)return 'Vrixo notes';
    const date = new Date(value);
    if(Number.isNaN(date.getTime()))return value;
    return date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  }

  function markdownToHTML(markdown){
    if(window.marked && typeof window.marked.parse === 'function'){
      return stripUnsafeHTML(window.marked.parse(markdown || ''));
    }
    return '<p>'+escapeHTML(markdown || '').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')+'</p>';
  }

  async function fetchPostsFromGitHub(){
    if(!config.owner || !config.repo || /YOUR_/i.test(config.owner + config.repo)){
      throw new Error('Blog repository is not configured yet.');
    }
    const branch = config.branch || 'main';
    const postsPath = config.postsPath || '_posts';
    const apiURL = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${postsPath}?ref=${encodeURIComponent(branch)}`;
    const listResponse = await fetch(apiURL,{headers:{'Accept':'application/vnd.github+json'}});
    if(!listResponse.ok)throw new Error('Could not load posts from GitHub.');
    const files = (await listResponse.json()).filter(function(file){
      return file.type === 'file' && /\.md$/i.test(file.name);
    });
    const posts = await Promise.all(files.map(async function(file){
      const rawResponse = await fetch(file.download_url);
      if(!rawResponse.ok)throw new Error('Could not load '+file.name);
      return parseFrontMatter(await rawResponse.text(),slugFromName(file.name));
    }));
    return posts.sort(function(a,b){return new Date(b.date || 0) - new Date(a.date || 0);});
  }

  function renderList(posts, message, isError){
    state.posts = posts;
    postView.hidden = true;
    grid.hidden = false;
    status.hidden = false;
    status.className = isError ? 'blog-status is-error' : 'blog-status';
    status.textContent = message || '';
    grid.innerHTML = posts.map(function(post){
      return `<a class="blog-card${post.image ? ' blog-card-has-image' : ''}" href="#post/${encodeURIComponent(post.slug)}">
        ${post.image ? `<div class="blog-card-img"><img src="${escapeHTML(post.image)}" alt="${escapeHTML(post.title)}" loading="lazy"></div>` : ''}
        <div>
          <time datetime="${escapeHTML(post.date)}">${escapeHTML(formatDate(post.date))}</time>
          <h2>${escapeHTML(post.title)}</h2>
          <p>${escapeHTML(post.excerpt)}</p>
        </div>
      </a>`;
    }).join('');
  }

  function renderPostFromHash(){
    const match = location.hash.match(/^#post\/(.+)$/);
    if(!match){
      postView.hidden = true;
      grid.hidden = false;
      status.hidden = false;
      return;
    }
    const slug = decodeURIComponent(match[1]);
    const post = state.posts.find(function(item){return item.slug === slug;});
    if(!post)return;
    document.title = `${post.title} | Vrixo Studio`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if(metaDescription && post.excerpt){
      metaDescription.setAttribute('content',post.excerpt);
    }
    status.hidden = true;
    grid.hidden = true;
    postView.hidden = false;
    postView.innerHTML = `<a class="post-back" href="blog.html">Back to insights</a>
      <time datetime="${escapeHTML(post.date)}">${escapeHTML(formatDate(post.date))}</time>
      <h1>${escapeHTML(post.title)}</h1>
      ${post.image ? `<img src="${escapeHTML(post.image)}" alt="${escapeHTML(post.title)}" style="width:100%;border-radius:12px;margin:1.25rem 0 2rem;aspect-ratio:16/9;object-fit:cover;">` : ''}
      <div class="post-body">${markdownToHTML(post.body)}</div>`;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function init(){
    try{
      const posts = await fetchPostsFromGitHub();
      renderList(posts,'');
    }catch(error){
      renderList(fallbackPosts,'Featured insights from Vrixo Studio.',false);
    }
    renderPostFromHash();
  }

  window.addEventListener('hashchange',renderPostFromHash);
  if(document.readyState === 'loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
