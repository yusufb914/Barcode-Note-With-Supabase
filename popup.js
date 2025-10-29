// Supabase client'ı başlat
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

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const statusDiv = document.getElementById('status');
  const clearButton = document.getElementById('clearButton');
  const exportButton = document.getElementById('exportButton');
  const addForm = document.getElementById('addForm');
  const dataList = document.getElementById('dataList');
  const searchInput = document.getElementById('searchInput');
  const dataStats = document.getElementById('dataStats');
  const pasteButton = document.getElementById('pasteButton');
  const noteTemplate = document.getElementById('noteTemplate');
  const newNote = document.getElementById('newNote');
  const addTemplateButton = document.getElementById('addTemplateButton');
  const templateList = document.getElementById('templateList');
  const templateStats = document.getElementById('templateStats');
  const templateName = document.getElementById('templateName');
  const templateText = document.getElementById('templateText');

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Sayfa yüklendiğinde verileri yükle
  loadDataList();
  loadTemplates();
  loadTemplateOptions();

  // Event listeners
  clearButton.addEventListener('click', clearCSV);
  exportButton.addEventListener('click', exportCSV);
  addForm.addEventListener('submit', addNewEntry);
  searchInput.addEventListener('input', filterDataList);
  pasteButton.addEventListener('click', pasteFromClipboard);
  addTemplateButton.addEventListener('click', addTemplate);
  
  // Hazır not seçildiğinde textarea'yı doldur
  noteTemplate.addEventListener('change', function() {
    if (this.value === '__STOK_NOTU__') {
      // STOK NOTU seçildiğinde adet sor
      const adet = prompt('Kaç adet stok hatası var?');
      if (adet && !isNaN(adet) && parseInt(adet) > 0) {
        newNote.value = `${adet} adet stok hatası!`;
      } else if (adet !== null) {
        alert('Lütfen geçerli bir sayı girin');
        this.value = ''; // Seçimi sıfırla
      } else {
        this.value = ''; // İptal edildi, seçimi sıfırla
      }
    } else if (this.value) {
      newNote.value = this.value;
    }
  });

  // Tab switching function
  function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`).classList.add('active');

    // Sekmeye geçildiğinde ilgili verileri yenile
    if (tabName === 'manage') {
      loadDataList();
    } else if (tabName === 'templates') {
      loadTemplates();
    } else if (tabName === 'add') {
      loadTemplateOptions();
    }
  }

  // Hazır notları yükle ve dropdown'a ekle
  async function loadTemplateOptions() {
    try {
      const { data: templates, error } = await supabaseClient
        .from('note_templates')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Dropdown'ı temizle ve varsayılan seçeneği ekle
      noteTemplate.innerHTML = '<option value="">-- Manuel not gir veya hazır not seç --</option>';
      
      // STOK NOTU özel seçeneğini ekle
      const stokOption = document.createElement('option');
      stokOption.value = '__STOK_NOTU__';
      stokOption.textContent = '⛔ STOK NOTU';
      noteTemplate.appendChild(stokOption);
      
      // Hazır notları ekle
      if (templates && templates.length > 0) {
        templates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.template_text;
          option.textContent = template.name;
          noteTemplate.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Hazır notlar yükleme hatası:', error);
    }
  }
  
  // Hazır notları listele
  async function loadTemplates() {
    try {
      const { data: templates, error } = await supabaseClient
        .from('note_templates')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // İstatistikleri güncelle
      templateStats.innerHTML = `<i class="bi bi-card-list"></i> Toplam ${templates ? templates.length : 0} hazır not`;
      
      // Listeyi temizle
      templateList.innerHTML = '';
      
      if (!templates || templates.length === 0) {
        templateList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><i class="bi bi-inbox"></i> Henüz hazır not yok</div>';
        return;
      }
      
      // Her hazır not için liste öğesi oluştur
      templates.forEach((template) => {
        const item = document.createElement('div');
        item.className = 'data-item';
        
        const dataInfo = document.createElement('div');
        dataInfo.className = 'data-info';
        dataInfo.innerHTML = `
          <div class="barkod-text"><i class="bi bi-pin-angle-fill"></i> ${template.name}</div>
          <div class="note-text"><i class="bi bi-chat-left-text"></i> ${template.template_text}</div>
        `;
        
        const dataActions = document.createElement('div');
        dataActions.className = 'data-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-small';
        editBtn.innerHTML = '<i class="bi bi-pencil-fill"></i>';
        editBtn.addEventListener('click', () => editTemplate(template.id, template.name, template.template_text));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-small danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
        deleteBtn.addEventListener('click', () => deleteTemplate(template.id, template.name));
        
        dataActions.appendChild(editBtn);
        dataActions.appendChild(deleteBtn);
        
        item.appendChild(dataInfo);
        item.appendChild(dataActions);
        templateList.appendChild(item);
      });
    } catch (error) {
      console.error('Hazır notlar yükleme hatası:', error);
      templateStats.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Yükleme hatası';
      templateList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><i class="bi bi-exclamation-triangle-fill"></i> Hazır notlar yüklenemedi</div>';
    }
  }
  
  // Yeni hazır not ekle
  async function addTemplate() {
    const name = templateName.value.trim();
    const text = templateText.value.trim();
    
    if (!name || !text) {
      alert('Not adı ve metni boş olamaz');
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('note_templates')
        .insert([{ name: name, template_text: text }]);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('Bu isimde bir hazır not zaten mevcut');
        } else {
          throw error;
        }
        return;
      }
      
      templateName.value = '';
      templateText.value = '';
      loadTemplates();
      loadTemplateOptions();
      alert('Hazır not eklendi!');
    } catch (error) {
      console.error('Hazır not ekleme hatası:', error);
      alert('Ekleme hatası: ' + error.message);
    }
  }
  
  // Hazır notu düzenle
  async function editTemplate(id, currentName, currentText) {
    const newName = prompt(`Yeni not adı:`, currentName);
    if (newName === null) return;
    
    const newText = prompt(`Yeni not metni:`, currentText);
    if (newText === null) return;
    
    if (newName.trim() === '' || newText.trim() === '') {
      alert('Not adı ve metni boş olamaz');
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from('note_templates')
        .update({ name: newName.trim(), template_text: newText.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      loadTemplates();
      loadTemplateOptions();
      alert('Hazır not güncellendi!');
    } catch (error) {
      console.error('Hazır not güncelleme hatası:', error);
      alert('Güncelleme hatası: ' + error.message);
    }
  }
  
  // Hazır notu sil
  async function deleteTemplate(id, name) {
    if (confirm(`"${name}" hazır notunu silmek istediğinizden emin misiniz?`)) {
      try {
        const { error } = await supabaseClient
          .from('note_templates')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        loadTemplates();
        loadTemplateOptions();
        alert('Hazır not silindi!');
      } catch (error) {
        console.error('Hazır not silme hatası:', error);
        alert('Silme hatası: ' + error.message);
      }
    }
  }

  // Status göster
  function showStatus(message, type = 'info') {
    statusDiv.innerHTML = `<div class="${type}">${message}</div>`;
  }


  // Veri listesini Supabase'den yükle ve göster
  async function loadDataList() {
    try {
      const { data: kitaplar, error } = await supabaseClient
        .from('kitaplar')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      const csvData = kitaplar || [];
      
      // İstatistikleri güncelle
      dataStats.innerHTML = `<i class="bi bi-bar-chart-fill"></i> Toplam ${csvData.length} kayıt`;
      
      // Listeyi temizle
      dataList.innerHTML = '';
      
      if (csvData.length === 0) {
        dataList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><i class="bi bi-inbox"></i> Henüz veri yok</div>';
        return;
      }
      
      // Her kayıt için liste öğesi oluştur
      csvData.forEach((row) => {
        const item = document.createElement('div');
        item.className = 'data-item';
        
        const dataInfo = document.createElement('div');
        dataInfo.className = 'data-info';
        dataInfo.innerHTML = `
          <div class="barkod-text"><i class="bi bi-upc-scan"></i> ${row.isbn}</div>
          <div class="note-text"><i class="bi bi-chat-left-text"></i> ${row.note}</div>
        `;
        
        const dataActions = document.createElement('div');
        dataActions.className = 'data-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-small';
        editBtn.innerHTML = '<i class="bi bi-pencil-fill"></i>';
        editBtn.addEventListener('click', () => editEntry(row.id, row.isbn, row.note));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-small danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
        deleteBtn.addEventListener('click', () => deleteEntry(row.id, row.isbn));
        
        dataActions.appendChild(editBtn);
        dataActions.appendChild(deleteBtn);
        
        item.appendChild(dataInfo);
        item.appendChild(dataActions);
        dataList.appendChild(item);
      });
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      dataStats.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Veri yükleme hatası';
      dataList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><i class="bi bi-exclamation-triangle-fill"></i> Veriler yüklenemedi</div>';
    }
  }

  // Veri listesini filtrele
  function filterDataList() {
    const searchTerm = searchInput.value.toLowerCase();
    const items = dataList.querySelectorAll('.data-item');
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
  }


  // Supabase'deki tüm veriyi temizle
  async function clearCSV() {
    if (confirm('Tüm veriyi Supabase\'den silmek istediğinizden emin misiniz?')) {
      try {
        const { error } = await supabaseClient
          .from('kitaplar')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        
        showStatus('Tüm veriler temizlendi', 'info');
        loadDataList();
      } catch (error) {
        console.error('Temizleme hatası:', error);
        showStatus('Temizleme hatası: ' + error.message, 'error');
      }
    }
  }

  // Supabase'den CSV'yi dışa aktar
  async function exportCSV() {
    try {
      const { data: kitaplar, error } = await supabaseClient
        .from('kitaplar')
        .select('isbn, note')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      if (!kitaplar || kitaplar.length === 0) {
        showStatus('Dışa aktaracak veri yok', 'error');
        return;
      }
      
      let csvContent = '';
      kitaplar.forEach(row => {
        csvContent += `"${row.isbn}","${row.note}"\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'barkod_notlari.csv';
      link.click();
      
      showStatus('CSV dosyası indirildi', 'success');
    } catch (error) {
      console.error('Dışa aktarma hatası:', error);
      showStatus('Dışa aktarma hatası: ' + error.message, 'error');
    }
  }

  // Yeni kayıt ekle - Supabase'e
  async function addNewEntry(e) {
    e.preventDefault();
    
    const barkod = document.getElementById('newBarkod').value.trim();
    const note = document.getElementById('newNote').value.trim();
    
    if (!barkod || !note) {
      showStatus('Barkod ve not boş olamaz', 'error');
      return;
    }
    
    try {
      // Aynı barkod var mı kontrol et
      const { data: existing, error: checkError } = await supabaseClient
        .from('kitaplar')
        .select('id')
        .eq('isbn', barkod)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existing) {
        if (confirm('Bu barkod zaten mevcut. Üzerine yazmak istiyorsunuz?')) {
          const { error: updateError } = await supabaseClient
            .from('kitaplar')
            .update({ note: note })
            .eq('isbn', barkod);
          
          if (updateError) throw updateError;
          showStatus('Kayıt güncellendi!', 'success');
        } else {
          return;
        }
      } else {
        const { error: insertError } = await supabaseClient
          .from('kitaplar')
          .insert([{ isbn: barkod, note: note }]);
        
        if (insertError) throw insertError;
        showStatus('Kayıt eklendi!', 'success');
      }
      
      addForm.reset();
      loadDataList();
      switchTab('manage'); // Yönetim sekmesine geç
    } catch (error) {
      console.error('Ekleme hatası:', error);
      showStatus('Ekleme hatası: ' + error.message, 'error');
    }
  }

  // Panodaki barkodu yapıştır
  async function pasteFromClipboard() {
    try {
      // Popup'ta doğrudan clipboard API kullan
      const clipboardText = await navigator.clipboard.readText();
      
      if (clipboardText && clipboardText.trim()) {
        document.getElementById('newBarkod').value = clipboardText.trim();
        showStatus('Barkod panoddan yapıştırıldı', 'success');
      } else {
        showStatus('Panoda metin bulunamadı', 'error');
      }
    } catch (error) {
      console.error('Yapıştırma hatası:', error);
      showStatus('Yapıştırma hatası: ' + error.message, 'error');
    }
  }

  // Kayıt düzenle - Supabase'de
  async function editEntry(id, isbn, currentNote) {
    const newNote = prompt(`"${isbn}" için yeni not:`, currentNote);
    
    if (newNote !== null && newNote.trim() !== '') {
      try {
        const { error } = await supabaseClient
          .from('kitaplar')
          .update({ note: newNote.trim() })
          .eq('id', id);
        
        if (error) throw error;
        
        showStatus('Not güncellendi!', 'success');
        loadDataList();
      } catch (error) {
        console.error('Güncelleme hatası:', error);
        showStatus('Güncelleme hatası: ' + error.message, 'error');
      }
    }
  }

  // Kayıt sil - Supabase'den
  async function deleteEntry(id, isbn) {
    if (confirm(`"${isbn}" kaydını silmek istediğinizden emin misiniz?`)) {
      try {
        const { error } = await supabaseClient
          .from('kitaplar')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        showStatus('Kayıt silindi!', 'success');
        loadDataList();
      } catch (error) {
        console.error('Silme hatası:', error);
        showStatus('Silme hatası: ' + error.message, 'error');
      }
    }
  }
});