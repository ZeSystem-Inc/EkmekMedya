import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://glzeezpoacotlbhfercu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U-8A6lfjcmF3x6UOU_NK_A_WV0YWMFY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const postSection = document.getElementById('postSection');
const loginPromptSection = document.getElementById('loginPromptSection');
const userHeaderBar = document.getElementById('userHeaderBar');
const postsContainer = document.getElementById('postsContainer');
const contentInput = document.getElementById('contentInput');
const shareBtn = document.getElementById('shareBtn');
const charCount = document.getElementById('charCount');

let activeUser = null;

async function oturumKontrol() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        activeUser = session.user;
        postSection.style.display = 'block';
        loginPromptSection.style.display = 'none';
        userHeaderBar.innerHTML = `
            <span style="font-size: 13px; color: #38bdf8;">👤 ${activeUser.email}</span>
            <button id="logoutBtn" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-left: 10px;">Çıkış Yap</button>
        `;
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    } else {
        activeUser = null;
        postSection.style.display = 'none';
        loginPromptSection.style.display = 'block';
        userHeaderBar.innerHTML = '';
    }
    gonderileriGetir();
}

if (contentInput) {
    contentInput.addEventListener('input', () => {
        const remaining = 280 - contentInput.value.length;
        charCount.textContent = remaining;
    });
}

async function gonderileriGetir() {
    let { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        postsContainer.innerHTML = "<p>Gönderiler yüklenirken hata oluştu.</p>";
        return;
    }

    postsContainer.innerHTML = "";

    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>Henüz hiç gönderi yok. İlk ekmeği sen fırına ver!</p>";
        return;
    }

    posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.classList.add('post');
        
        const tarih = new Date(post.created_at).toLocaleString('tr-TR', {
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
        });

        const yazarAdi = post.author ? post.author.split('@')[0] : 'Anonim';

        postElement.innerHTML = `
            <div class="post-header">
                <span class="username">@${escapeHtml(yazarAdi)}</span>
                <span class="time">${tarih}</span>
            </div>
            <p class="post-content">${escapeHtml(post.content)}</p>
            <div class="post-footer">
                <button class="like-btn" data-id="${post.id}" data-likes="${post.likes || 0}">
                    🍞 Taze (${post.likes || 0})
                </button>
            </div>
        `;
        postsContainer.appendChild(postElement);
    });

    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const currentLikes = parseInt(button.getAttribute('data-likes'));
            gonderiBegen(id, currentLikes);
        });
    });
}

async function gonderiPaylas() {
    if (!activeUser) return;
    const content = contentInput.value.trim();

    if (!content) {
        alert("Boş gönderi paylaşılamaz!");
        return;
    }

    shareBtn.disabled = true;
    shareBtn.textContent = "Fırınlanıyor...";

    const { error } = await supabase
        .from('posts')
        .insert([{ author: activeUser.email, content: content, likes: 0 }]);

    if (error) {
        alert("Paylaşım başarısız oldu.");
    } else {
        contentInput.value = "";
        charCount.textContent = "280";
        gonderileriGetir();
    }

    shareBtn.disabled = false;
    shareBtn.textContent = "🍞 Fırına Ver (Paylaş)";
}

async function gonderiBegen(id, currentLikes) {
    const { error } = await supabase
        .from('posts')
        .update({ likes: currentLikes + 1 })
        .eq('id', id);

    if (!error) {
        gonderileriGetir();
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => 
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

if (shareBtn) {
    shareBtn.addEventListener('click', gonderiPaylas);
}

oturumKontrol();
