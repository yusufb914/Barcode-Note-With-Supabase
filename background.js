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
    // Her zaman güncel aktif sekmeyi al
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs[0]) {
      return null;
    }
    
    const currentTabId = tabs[0].id;
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
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
      showTogglePopup(barkod, note);
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
    // Tüm sekmeleri al ve her birine popup inject et
    const tabs = await chrome.tabs.query({});
    
    if (tabs.length === 0) {
      return;
    }

    // Her sekmeye popup'ı inject et
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
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
            padding-bottom: 15px;
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
            <div style="white-space: pre-line; line-height: 1.4; margin-bottom: 12px;">
              ${message}
            </div>
            <div style="
              width: 100%;
              height: 4px;
              background: rgba(0,0,0,0.1);
              border-radius: 2px;
              overflow: hidden;
            ">
              <div style="
                width: 100%;
                height: 100%;
                background: ${color.text};
                animation: timerBar 15s linear forwards;
              "></div>
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
            @keyframes timerBar {
              from {
                width: 100%;
              }
              to {
                width: 0%;
              }
            }
          </style>
        `;
        
        document.body.appendChild(popup);
        
        // 15 saniye sonra otomatik kapat
        setTimeout(() => {
          if (popup.parentElement) {
            popup.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => popup.remove(), 300);
          }
        }, 15000);
      },
      args: [title, message, type]
    });
  } catch (error) {
    console.error("Popup gösterme hatası:", error);
    // Windows bildirim fallback'i kaldırıldı
  }
}

// Toggle özellikli popup göster (otomatik kopyalama için)
async function showTogglePopup(barkod, note) {
  try {
    // Tüm sekmeleri al ve her birine popup inject et
    const tabs = await chrome.tabs.query({});
    
    if (tabs.length === 0) {
      return;
    }

    // Her sekmeye popup'ı inject et
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
      func: (barkod, note) => {
        // Mevcut popup'ı kaldır
        const existingPopup = document.getElementById('barkod-result-popup');
        if (existingPopup) {
          existingPopup.remove();
        }

        // Yeni popup oluştur
        const popup = document.createElement('div');
        popup.id = 'barkod-result-popup';
        
        const color = { bg: '#d4edda', border: '#c3e6cb', text: '#155724' };
        
        popup.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border: 2px solid ${color.border};
            color: ${color.text};
            padding: 20px;
            padding-bottom: 15px;
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
              <span>✅ Not Var!</span>
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
            <div style="margin-bottom: 12px;">
              <div 
                onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.toggle-icon').textContent = this.nextElementSibling.style.display === 'none' ? '▶' : '▼';"
                style="
                  cursor: pointer;
                  padding: 8px;
                  background: rgba(0,0,0,0.05);
                  border-radius: 6px;
                  user-select: none;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                "
              >
                <span class="toggle-icon" style="font-size: 12px;">▶</span>
                <span style="font-weight: 500;">📦 ${barkod}</span>
              </div>
              <div style="
                display: none;
                margin-top: 8px;
                padding: 10px;
                background: rgba(255,255,255,0.6);
                border-radius: 6px;
                border-left: 3px solid ${color.text};
              ">
                <div style="white-space: pre-line; line-height: 1.4;">💡 ${note}</div>
              </div>
            </div>
            <div style="
              width: 100%;
              height: 4px;
              background: rgba(0,0,0,0.1);
              border-radius: 2px;
              overflow: hidden;
            ">
              <div style="
                width: 100%;
                height: 100%;
                background: ${color.text};
                animation: timerBar 15s linear forwards;
              "></div>
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
            @keyframes timerBar {
              from {
                width: 100%;
              }
              to {
                width: 0%;
              }
            }
          </style>
        `;
        
        document.body.appendChild(popup);
        
        // 15 saniye sonra otomatik kapat
        setTimeout(() => {
          if (popup.parentElement) {
            popup.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => popup.remove(), 300);
          }
        }, 15000);
        },
        args: [barkod, note]
      });
      } catch (err) {
        // Bazı sekmelerde (chrome://, extension sayfaları) inject edilemez, sessizce devam et
        console.log(`Sekme ${tab.id} için popup inject edilemedi:`, err.message);
      }
    }
  } catch (error) {
    console.error("Toggle popup gösterme hatası:", error);
  }
}