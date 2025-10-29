// Supabase client'ı import et
importScripts('supabase.js');

const SUPABASE_URL = 'https://izlcuykhlogenvkytuwo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bGN1eWtobG9nZW52a3l0dXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDU5NzYsImV4cCI6MjA3NjE4MTk3Nn0.GbK1jPzrn1j8VQ94do3Gn7AUd1wdAI9pQhgt8HTo--4';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

let tabIdGlobal = null;
let lastClipboardText = '';
let clipboardCheckInterval = null;

// Aktif tabı kaydet
chrome.tabs.onActivated.addListener(activeInfo => {
  tabIdGlobal = activeInfo.tabId;
});

// Extension kurulduğunda aktif tabı al ve clipboard monitoring başlat
chrome.runtime.onStartup.addListener(() => {
  getActiveTab();
  startClipboardMonitoring();
});

// Extension ilk yüklendiğinde de aktif tabı al ve clipboard monitoring başlat
chrome.runtime.onInstalled.addListener(() => {
  getActiveTab();
  startClipboardMonitoring();
});

// Aktif tab'ı güvenli bir şekilde al
async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0]) {
      tabIdGlobal = tabs[0].id;
    }
  } catch (error) {
    console.error("Aktif tab alma hatası:", error);
  }
}

// Clipboard monitoring başlat
function startClipboardMonitoring() {
  // Önceki interval'i temizle
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
  }
  
  // Her 1 saniyede bir clipboard'u kontrol et
  clipboardCheckInterval = setInterval(async () => {
    const currentClipboardText = await getClipboardText();
    
    // Clipboard değişti mi ve boş değil mi kontrol et
    if (currentClipboardText && currentClipboardText !== lastClipboardText) {
      lastClipboardText = currentClipboardText;
      
      // Otomatik arama yap
      await autoSearchBarkod(currentClipboardText);
    }
  }, 1000); // 1 saniye interval
}

// Commands listener - Ctrl+Shift+S (manuel arama için hala kullanılabilir)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "search-barkod") {
    await searchBarkod();
  }
});

// Clipboard'dan metin al
async function getClipboardText() {
  try {
    // Aktif tabı kontrol et ve gerekirse yeniden al
    if (!tabIdGlobal) {
      await getActiveTab();
    }
    
    // Hala tab bulunamazsa, query ile yeniden dene
    if (!tabIdGlobal) {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs[0]) {
        tabIdGlobal = tabs[0].id;
      } else {
        return null;
      }
    }
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabIdGlobal },
      func: () => navigator.clipboard.readText()
    });
    
    return results[0].result;
  } catch (error) {
    // Hata durumunda sessizce null döndür (çok fazla log kalabalığı yapmamak için)
    return null;
  }
}

// Supabase'den verileri yükle
async function loadDataFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('kitaplar')
      .select('isbn, note');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Supabase yükleme hatası:", error);
    return [];
  }
}

// Supabase'de barkod ara
async function searchInSupabase(barkod) {
  try {
    const { data, error } = await supabaseClient
      .from('kitaplar')
      .select('note')
      .eq('isbn', barkod.trim())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Kayıt bulunamadı
      }
      throw error;
    }
    
    return data ? data.note : null;
  } catch (error) {
    console.error("Arama hatası:", error);
    return null;
  }
}

// Otomatik arama fonksiyonu (clipboard değiştiğinde) - Supabase'den
async function autoSearchBarkod(barkod) {
  try {
    // Supabase'den ara
    const note = await searchInSupabase(barkod);
    
    if (note) {
      showResultPopup('✅ Not Bulundu!', `📦 ${barkod}\nNot var!`, 'success');
    } 
  } catch (error) {
    console.error("Otomatik arama hatası:", error);
  }
}

// Ana arama fonksiyonu (manuel Ctrl+Shift+S için) - Supabase'den
async function searchBarkod() {
  try {
    // Clipboard'dan barkod al
    const barkod = await getClipboardText();
    if (!barkod) {
      showResultPopup('❌ Hata', 'Panoda metin bulunamadı', 'error');
      return;
    }

    // Supabase'den ara
    const note = await searchInSupabase(barkod);
    
    if (note) {
      showResultPopup('✅ Barkod Bulundu', `📦 ${barkod}\n💡 ${note}`, 'success');
    } else {
      showResultPopup('🔍 Bulunamadı', `📦 "${barkod}" Supabase'de bulunamadı`, 'warning');
    }
  } catch (error) {
    console.error("Arama hatası:", error);
    showResultPopup('❌ Hata', 'Arama sırasında hata oluştu', 'error');
  }
}

// Güzel popup göster (Windows bildirim kaldırıldı)
async function showResultPopup(title, message, type) {
  try {
    // Aktif tabı kontrol et ve gerekirse yeniden al
    if (!tabIdGlobal) {
      await getActiveTab();
    }
    
    // Hala tab bulunamazsa, query ile yeniden dene
    if (!tabIdGlobal) {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs[0]) {
        tabIdGlobal = tabs[0].id;
      } else {
        return; // Tab bulunamazsa sessizce çık
      }
    }

    await chrome.scripting.executeScript({
      target: { tabId: tabIdGlobal },
      func: (title, message, type) => {
        // Mevcut popup'ı kaldır
        const existingPopup = document.getElementById('barkod-result-popup');
        if (existingPopup) {
          existingPopup.remove();
        }

        // Yeni popup oluştur
        const popup = document.createElement('div');
        popup.id = 'barkod-result-popup';
        
        const colors = {
          success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
          error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
          warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' }
        };
        
        const color = colors[type] || colors.success;
        
        popup.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border: 2px solid ${color.border};
            color: ${color.text};
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 350px;
            min-width: 250px;
            animation: slideIn 0.3s ease-out;
          ">
            <div style="
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span>${title}</span>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: ${color.text};
                opacity: 0.7;
                padding: 0;
                width: 20px;
                height: 20px;
              ">×</button>
            </div>
            <div style="white-space: pre-line; line-height: 1.4;">
              ${message}
            </div>
          </div>
          <style>
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          </style>
        `;
        
        document.body.appendChild(popup);
        
        // 5 saniye sonra otomatik kapat
        setTimeout(() => {
          if (popup.parentElement) {
            popup.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => popup.remove(), 300);
          }
        }, 5000);
      },
      args: [title, message, type]
    });
  } catch (error) {
    console.error("Popup gösterme hatası:", error);
    // Windows bildirim fallback'i kaldırıldı
  }
}