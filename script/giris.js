import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://glzeezpoacotlbhfercu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U-8A6lfjcmF3x6UOU_NK_A_WV0YWMFY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const loginEmailInput = document.getElementById('loginEmailInput');
const loginPasswordInput = document.getElementById('loginPasswordInput');
const loginBtn = document.getElementById('loginBtn');
const authMessage = document.getElementById('authMessage');

loginBtn.addEventListener('click', async () => {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!email || !password) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Lütfen tüm alanları doldurun!";
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Giriş yapılıyor...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Giriş hatası: " + error.message;
        loginBtn.disabled = false;
        loginBtn.textContent = "Giriş Yap";
    } else {
        authMessage.style.color = "#34d399";
        authMessage.textContent = "Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz...";
        setTimeout(() => {
            window.location.href = "../index.html";
        }, 1000);
    }
});
