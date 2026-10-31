import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://glzeezpoacotlbhfercu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U-8A6lfjcmF3x6UOU_NK_A_WV0YWMFY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const authSection = document.getElementById('authSection');
const postSection = document.getElementById('postSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMessage = document.getElementById('authMessage');
const currentUserText = document.getElementById('currentUserText');

const postsContainer = document.getElementById('postsContainer');
const contentInput = document.getElementById('contentInput');
const shareBtn = document.getElementById('shareBtn');
const charCount = document.getElementById('charCount');

let activeUser = null;

async function oturumKontrol() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        activeUser = session.user;
        authSection.style.display = 'none';
        postSection.style.display = 'block';
        currentUserText.textContent = `Giriş yapılan: ${activeUser.email}`;
    } else {
        activeUser = null;
        authSection.style.display = 'block';
        postSection.style.display = 'none';
    }
    gonderileriGetir();
}

registerBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Lütfen e-posta ve şifrenizi boş bırakmayın!";
        return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Kayıt hatası: " + error.message;
    } else {
        authMessage.style.color = "#34d399";
        authMessage.textContent = "Kayıt başarılı! Şimdi giriş yapabilirsiniz.";
    }
});

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Giriş hatası: " + error.message;
    } else {
        authMessage.textContent = "";
        emailInput.value = "";
        passwordInput.value = "";
        oturumKontrol();
    }
});

// Çıkış Yap
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    oturumKontrol();
});

contentInput.addEventListener('input', () => {
    const remaining = 280 - contentInput.value.length;
    charCount.textContent = remaining;
});

async function gonderileriGetir() {
    let { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Veri çekme hatası:", error);
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
        console.error("Kayıt hatası:", error);
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

shareBtn.addEventListener('click', gonderiPaylas);

oturumKontrol();
