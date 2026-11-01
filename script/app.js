import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://glzeezpoacotlbhfercu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U-8A6lfjcmF3x6UOU_NK_A_WV0YWMFY'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let activeUser = null;
let userProfile = null;
let selectedFirinId = null;
let lastPostTime = 0;

async function init() {
    await checkAuth();
    await loadFirins();
    await loadPosts();
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    const authNavButtons = document.getElementById('authNavButtons');
    
    if (session) {
        activeUser = session.user;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
        userProfile = profile;

        document.getElementById('postCreateBox').style.display = 'block';
        document.getElementById('createFirinBox').style.display = 'block';

        authNavButtons.innerHTML = `
            <span style="font-size: 13px; color: #38bdf8;">@${profile?.username || 'Fırıncı'} (${profile?.taze_puani || 0} 🍞)</span>
            <button id="logoutBtn" class="action-link" style="color:#ef4444">Çıkış</button>
        `;

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });

        loadProfileStats();
        loadAchievements();
    } else {
        authNavButtons.innerHTML = `
            <a href="HTML/giris.html" class="action-link" style="text-decoration:none; padding:6px 12px;">Giriş Yap</a>
            <a href="HTML/kayit.html" class="btn-primary" style="text-decoration:none; padding:6px 12px; display:inline-block;">Kayıt Ol</a>
        `;
    }
}

async function loadFirins() {
    const { data: firinlar } = await supabase.from('firinlar').select('*').order('name');
    const firinList = document.getElementById('firinList');
    const firinSelect = document.getElementById('firinSelect');

    firinList.innerHTML = `<li><a href="#" id="allFirins">🌍 Tüm Akış</a></li>`;
    if (firinSelect) firinSelect.innerHTML = '';

    document.getElementById('allFirins').addEventListener('click', (e) => {
        e.preventDefault();
        selectedFirinId = null;
        document.getElementById('currentFeedTitle').textContent = "🌍 Ana Akış";
        loadPosts();
    });

    firinlar?.forEach(firin => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#">fırın/${firin.slug}</a>`;
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            selectedFirinId = firin.id;
            document.getElementById('currentFeedTitle').textContent = `fırın/${firin.slug}`;
            loadPosts();
        });
        firinList.appendChild(li);

        if (firinSelect) {
            firinSelect.innerHTML += `<option value="${firin.id}">fırın/${firin.slug} - ${firin.name}</option>`;
        }
    });
}

document.getElementById('createFirinBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('firinNameInput').value.trim();
    const slug = document.getElementById('firinSlugInput').value.trim().toLowerCase();

    if (!name || !slug) return alert("Alanları doldurun!");

    const { error } = await supabase.from('firinlar').insert([{ name, slug, creator_id: activeUser.id }]);
    if (error) alert("Hata: " + error.message);
    else {
        alert("Fırın başarıyla açıldı!");
        window.location.reload();
    }
});

document.getElementById('submitPostBtn')?.addEventListener('click', async () => {
    const now = Date.now();
    if (now - lastPostTime < 30000) {
        return alert("Taze spam koruması! Yeni gönderi için 30 saniye beklemelisin.");
    }

    const firin_id = document.getElementById('firinSelect').value;
    const title = document.getElementById('postTitleInput').value.trim();
    const content = document.getElementById('postContentInput').value.trim();

    if (!title || !content) return alert("Başlık ve içerik gereklidir.");

    const { error } = await supabase.from('posts').insert([{
        firin_id, author_id: activeUser.id, title, content
    }]);

    if (!error) {
        lastPostTime = now;
        document.getElementById('postTitleInput').value = '';
        document.getElementById('postContentInput').value = '';
        
        await supabase.from('profiles').update({ taze_puani: (userProfile.taze_puani || 0) + 10 }).eq('id', activeUser.id);
        loadPosts();
    } else {
        alert("Paylaşım hatası: " + error.message);
    }
});

async function loadPosts() {
    let query = supabase.from('posts').select('*, profiles(username), firinlar(slug, creator_id)').order('created_at', { ascending: false });
    
    if (selectedFirinId) query = query.eq('firin_id', selectedFirinId);

    const { data: posts } = await query;
    const feed = document.getElementById('postsFeed');
    feed.innerHTML = '';

    if (!posts || posts.length === 0) {
        feed.innerHTML = "<p style='color:#94a3b8; font-size:14px;'>Bu fırında henüz hiç gönderi yok.</p>";
        return;
    }

    posts.forEach(post => {
        const netScore = (post.taze_count || 0) - (post.kuflu_count || 0);
        const isAdmin = userProfile?.is_admin;
        const isMod = post.firinlar?.creator_id === activeUser?.id;

        const postEl = document.createElement('div');
        postEl.className = 'post-card';
        postEl.innerHTML = `
            <div class="vote-box">
                <button class="vote-btn taze-btn" title="Taze (Beğen)">🍞</button>
                <span class="vote-count ${netScore >= 0 ? 'positive' : 'negative'}">${netScore}</span>
                <button class="vote-btn kuflu-btn" title="Küflü (Beğenme)">🍄</button>
            </div>
            <div class="post-main">
                <div class="post-meta">
                    fırın/${post.firinlar?.slug || 'genel'} • @${post.profiles?.username || 'anonim'}
                </div>
                <div class="post-title">${escapeHtml(post.title)}</div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="action-link comment-toggle-btn">💬 Yorumlar</button>
                    ${(isAdmin || isMod) ? `<button class="action-link admin-del delete-btn">🗑️ Sil</button>` : ''}
                </div>
                <div class="comments-section" style="display:none;">
                    <div class="comments-list"></div>
                    ${activeUser ? `
                        <div style="display:flex; gap:6px; margin-top:8px;">
                            <input type="text" class="input-field comment-input" placeholder="Yorum yaz...">
                            <button class="btn-primary comment-send-btn" style="width:70px; padding:6px;">Gönder</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        postEl.querySelector('.taze-btn').addEventListener('click', () => oyVer(post.id, 'taze'));
        postEl.querySelector('.kuflu-btn').addEventListener('click', () => oyVer(post.id, 'kuflu'));

        if (isAdmin || isMod) {
            postEl.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm("Bu gönderiyi silmek istediğine emin misin?")) {
                    await supabase.from('posts').delete().eq('id', post.id);
                    loadPosts();
                }
            });
        }

        const commentSection = postEl.querySelector('.comments-section');
        postEl.querySelector('.comment-toggle-btn').addEventListener('click', () => {
            const isHidden = commentSection.style.display === 'none';
            commentSection.style.display = isHidden ? 'block' : 'none';
            if (isHidden) loadComments(post.id, commentSection.querySelector('.comments-list'));
        });

        const sendBtn = postEl.querySelector('.comment-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                const input = postEl.querySelector('.comment-input');
                if (!input.value.trim()) return;
                await supabase.from('comments').insert([{ post_id: post.id, author_id: activeUser.id, content: input.value.trim() }]);
                input.value = '';
                loadComments(post.id, commentSection.querySelector('.comments-list'));
            });
        }

        feed.appendChild(postEl);
    });
}

async function oyVer(postId, type) {
    if (!activeUser) return alert("Oy vermek için giriş yapmalısın!");

    const { data: existingVote } = await supabase.from('votes').select('*').eq('user_id', activeUser.id).eq('post_id', postId).single();

    if (existingVote) {
        if (existingVote.vote_type === type) return;
        await supabase.from('votes').update({ vote_type: type }).eq('id', existingVote.id);
    } else {
        await supabase.from('votes').insert([{ user_id: activeUser.id, post_id: postId, vote_type: type }]);
    }

    const { count: tazeCount } = await supabase.from('votes').select('*', { count: 'exact' }).eq('post_id', postId).eq('vote_type', 'taze');
    const { count: kufluCount } = await supabase.from('votes').select('*', { count: 'exact' }).eq('post_id', postId).eq('vote_type', 'kuflu');

    await supabase.from('posts').update({ taze_count: tazeCount, kuflu_count: kufluCount }).eq('id', postId);
    loadPosts();
}

async function loadComments(postId, container) {
    const { data: comments } = await supabase.from('comments').select('*, profiles(username)').eq('post_id', postId).order('created_at');
    container.innerHTML = comments?.length ? '' : '<span style="font-size:12px; color:#64748b;">Henüz yorum yok.</span>';

    comments?.forEach(c => {
        container.innerHTML += `
            <div class="comment-card">
                <div class="comment-author">@${c.profiles?.username || 'anonim'}</div>
                <div>${escapeHtml(c.content)}</div>
            </div>
        `;
    });
}

async function loadProfileStats() {
    document.getElementById('userStats').innerHTML = `
        <strong>Kullanıcı:</strong> @${userProfile.username}<br>
        <strong>Puan:</strong> ${userProfile.taze_puani} 🍞<br>
        <strong>Rol:</strong> ${userProfile.is_admin ? '<span style="color:#ef4444">Admin</span>' : 'Üye'}
    `;
}

async function loadAchievements() {
    const { data: badges } = await supabase.from('achievements').select('*').eq('user_id', activeUser.id);
    const box = document.getElementById('achievementsList');
    box.innerHTML = '';
    badges?.forEach(b => {
        box.innerHTML += `<span class="badge-item">${b.badge_icon} ${b.title}</span>`;
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

init();
