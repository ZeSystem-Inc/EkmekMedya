import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://glzeezpoacotlbhfercu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U-8A6lfjcmF3x6UOU_NK_A_WV0YWMFY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const regEmailInput = document.getElementById('regEmailInput');
const regPasswordInput = document.getElementById('regPasswordInput');
const registerBtn = document.getElementById('registerBtn');
const authMessage = document.getElementById('authMessage');

registerBtn.addEventListener('click', async () => {
    const email = regEmailInput.value.trim();
    const password = regPasswordInput.value.trim();

    if (!email || !password) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Lütfen tüm alanları doldurun!";
        return;
    }

    if (password.length < 6) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Şifre en az 6 karakter olmalıdır!";
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "Kaydediliyor...";

    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
        authMessage.style.color = "#f87171";
        authMessage.textContent = "Kayıt hatası: " + error.message;
        registerBtn.disabled = false;
        registerBtn.textContent = "Kayıt Ol";
    } else {
        authMessage.style.color = "#34d399";
        authMessage.textContent = "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...";
        setTimeout(() => {
            window.location.href = "giris.html";
        }, 1500);
    }
});
