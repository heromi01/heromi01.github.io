/**
 * Guestbook System for GitHub Pages (heromi01.github.io)
 * Features:
 *  - Persistent storage using localStorage
 *  - Author nickname, message, and author deletion password
 *  - Master Password (0000) for universal deletion
 *  - Dedicated Completion Modal popup upon submission
 *  - Dedicated Deletion Modal popup with password check
 *  - Full XSS protection
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'heromi01_guestbook_entries';
  const MASTER_PASSWORD = '0000';

  // State
  let entries = [];
  let pendingDeleteId = null;

  // DOM Elements
  const form = document.getElementById('guestbook-form');
  const authorInput = document.getElementById('author-input');
  const passwordInput = document.getElementById('password-input');
  const contentInput = document.getElementById('content-input');
  const listContainer = document.getElementById('guestbook-list');
  const countBadge = document.getElementById('guestbook-count');

  // Success Modal Elements
  const successModal = document.getElementById('success-modal');
  const successAuthor = document.getElementById('success-modal-author');
  const successTime = document.getElementById('success-modal-time');
  const successContent = document.getElementById('success-modal-content');
  const btnSuccessConfirm = document.getElementById('btn-success-confirm');

  // Delete Modal Elements
  const deleteModal = document.getElementById('delete-modal');
  const deletePasswordInput = document.getElementById('delete-password-input');
  const deleteErrorMsg = document.getElementById('delete-error-msg');
  const btnDeleteCancel = document.getElementById('btn-delete-cancel');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

  // Helper: Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Format Date
  function formatDate(isoString) {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  // Generate simple avatar character from nickname
  function getAvatarChar(name) {
    if (!name) return '👤';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  }

  // Load from localStorage
  function loadEntries() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        entries = JSON.parse(data);
      } else {
        // Initial sample welcome message
        entries = [
          {
            id: 'init-1',
            author: 'heromi01',
            password: '0000',
            content: '환영합니다! 자유롭게 발자국을 남겨주세요. ✨\n(마스터 비밀번호: 0000으로 모든 글을 삭제할 수 있습니다)',
            createdAt: new Date().toISOString()
          }
        ];
        saveEntries();
      }
    } catch (e) {
      console.error('Failed to load guestbook entries', e);
      entries = [];
    }
  }

  // Save to localStorage
  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save guestbook entries', e);
    }
  }

  // Render entries list
  function render() {
    if (countBadge) {
      countBadge.textContent = `${entries.length}개`;
    }

    if (!listContainer) return;

    if (entries.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-guestbook">
          <div class="empty-icon">💭</div>
          <p>아직 남겨진 방명록이 없습니다.<br>첫 번째 발자국을 남겨보세요!</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = entries
      .map((item) => {
        const escapedAuthor = escapeHtml(item.author);
        const escapedContent = escapeHtml(item.content);
        const formattedDate = formatDate(item.createdAt);
        const avatarChar = getAvatarChar(item.author);

        return `
          <article class="guestbook-item" data-id="${item.id}">
            <div class="item-top">
              <div class="author-info">
                <div class="author-avatar">${avatarChar}</div>
                <div>
                  <div class="author-name">${escapedAuthor}</div>
                  <div class="author-date">${formattedDate}</div>
                </div>
              </div>
              <button type="button" class="btn-delete" onclick="window.Guestbook.openDeleteModal('${item.id}')" title="방명록 삭제">
                🗑️ 삭제
              </button>
            </div>
            <div class="item-content">${escapedContent}</div>
          </article>
        `;
      })
      .join('');
  }

  // Open Success Modal (별도 알림 창)
  function openSuccessModal(entry) {
    if (!successModal) {
      alert(`🎉 [기록 완료]\n작성자: ${entry.author}\n방명록이 성공적으로 등록되었습니다!`);
      return;
    }
    if (successAuthor) successAuthor.textContent = entry.author;
    if (successTime) successTime.textContent = formatDate(entry.createdAt);
    if (successContent) successContent.textContent = entry.content;

    successModal.classList.add('active');
  }

  // Close Success Modal
  function closeSuccessModal() {
    if (successModal) {
      successModal.classList.remove('active');
    }
  }

  // Open Delete Modal
  function openDeleteModal(id) {
    pendingDeleteId = id;
    if (!deleteModal) {
      // Fallback if modal DOM is missing
      const pw = prompt('삭제 비밀번호 또는 마스터 비밀번호(0000)를 입력하세요:');
      if (pw !== null) confirmDelete(id, pw);
      return;
    }

    if (deletePasswordInput) {
      deletePasswordInput.value = '';
    }
    if (deleteErrorMsg) {
      deleteErrorMsg.textContent = '';
      deleteErrorMsg.classList.remove('active');
    }

    deleteModal.classList.add('active');
    setTimeout(() => {
      if (deletePasswordInput) deletePasswordInput.focus();
    }, 100);
  }

  // Close Delete Modal
  function closeDeleteModal() {
    pendingDeleteId = null;
    if (deleteModal) {
      deleteModal.classList.remove('active');
    }
  }

  // Confirm and Execute Deletion
  function confirmDelete(id, inputPw) {
    const targetIndex = entries.findIndex((e) => e.id === id);
    if (targetIndex === -1) {
      alert('이미 삭제되었거나 존재하지 않는 항목입니다.');
      closeDeleteModal();
      return;
    }

    const target = entries[targetIndex];
    const trimmedPw = (inputPw || '').trim();

    // Check Master Password ('0000') OR Author's Password
    const isMaster = trimmedPw === MASTER_PASSWORD;
    const isAuthorMatch = trimmedPw === target.password;

    if (isMaster || isAuthorMatch) {
      // Deletion Success!
      entries.splice(targetIndex, 1);
      saveEntries();
      render();
      closeDeleteModal();

      if (isMaster) {
        alert('🔑 마스터 비밀번호(0000)가 확인되어 방명록을 강제 삭제하였습니다.');
      } else {
        alert('✅ 방명록이 정상적으로 삭제되었습니다.');
      }
    } else {
      // Password Mismatch
      if (deleteErrorMsg) {
        deleteErrorMsg.textContent = '❌ 비밀번호가 일치하지 않습니다. (마스터 키: 0000)';
        deleteErrorMsg.classList.add('active');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
      if (deletePasswordInput) {
        deletePasswordInput.select();
        deletePasswordInput.focus();
      }
    }
  }

  // Handle Form Submit
  function handleFormSubmit(e) {
    e.preventDefault();

    const author = (authorInput.value || '').trim();
    const password = (passwordInput.value || '').trim();
    const content = (contentInput.value || '').trim();

    if (!author) {
      alert('작성자 닉네임을 입력해주세요.');
      authorInput.focus();
      return;
    }

    if (!password) {
      alert('삭제 시 사용할 비밀번호를 입력해주세요.');
      passwordInput.focus();
      return;
    }

    if (!content) {
      alert('방명록 내용을 입력해주세요.');
      contentInput.focus();
      return;
    }

    const newEntry = {
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      author: author,
      password: password,
      content: content,
      createdAt: new Date().toISOString()
    };

    // Add to top of list
    entries.unshift(newEntry);
    saveEntries();
    render();

    // Reset inputs
    authorInput.value = '';
    passwordInput.value = '';
    contentInput.value = '';

    // Show Dedicated Success Modal popup!
    openSuccessModal(newEntry);
  }

  // Event Listeners
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (btnSuccessConfirm) {
    btnSuccessConfirm.addEventListener('click', closeSuccessModal);
  }

  if (btnDeleteCancel) {
    btnDeleteCancel.addEventListener('click', closeDeleteModal);
  }

  if (btnDeleteConfirm) {
    btnDeleteConfirm.addEventListener('click', () => {
      if (pendingDeleteId) {
        confirmDelete(pendingDeleteId, deletePasswordInput ? deletePasswordInput.value : '');
      }
    });
  }

  if (deletePasswordInput) {
    deletePasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (pendingDeleteId) {
          confirmDelete(pendingDeleteId, deletePasswordInput.value);
        }
      } else if (e.key === 'Escape') {
        closeDeleteModal();
      }
    });
  }

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === successModal) {
      closeSuccessModal();
    }
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSuccessModal();
      closeDeleteModal();
    }
  });

  // Global namespace for inline onclick handlers
  window.Guestbook = {
    openDeleteModal: openDeleteModal,
    closeDeleteModal: closeDeleteModal,
    openSuccessModal: openSuccessModal,
    closeSuccessModal: closeSuccessModal
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadEntries();
    render();
  });
})();
