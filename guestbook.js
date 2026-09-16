/**
 * Guestbook System for GitHub Pages (heromi01.github.io)
 * Features:
 *  - Persistent storage using localStorage
 *  - Author nickname, message, and deletion/edit password
 *  - Master Password validation (Quiet admin access)
 *  - Author Edit functionality with password check
 *  - Sympathy / Like reaction feature with localStorage state
 *  - Dedicated Completion & Action Modals
 *  - Full XSS protection
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'heromi01_guestbook_entries';
  const LIKES_KEY = 'heromi01_liked_entries';
  
  // Master Key verification hash / token (Admin only)
  // Base64 of '0000' is 'MDAwMA=='
  const MASTER_TOKEN = 'MDAwMA==';

  // State
  let entries = [];
  let likedEntryIds = new Set();
  let pendingDeleteId = null;
  let pendingEditId = null;

  // DOM Elements - Main Form
  const form = document.getElementById('guestbook-form');
  const authorInput = document.getElementById('author-input');
  const passwordInput = document.getElementById('password-input');
  const contentInput = document.getElementById('content-input');
  const listContainer = document.getElementById('guestbook-list');
  const countBadge = document.getElementById('guestbook-count');

  // Success Modal Elements
  const successModal = document.getElementById('success-modal');
  const successTitle = document.getElementById('success-title');
  const successDesc = document.getElementById('success-modal-desc');
  const successAuthor = document.getElementById('success-modal-author');
  const successTime = document.getElementById('success-modal-time');
  const successContent = document.getElementById('success-modal-content');
  const btnSuccessConfirm = document.getElementById('btn-success-confirm');

  // Edit Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editAuthorDisplay = document.getElementById('edit-modal-author-display');
  const editPasswordInput = document.getElementById('edit-password-input');
  const editContentInput = document.getElementById('edit-content-input');
  const editErrorMsg = document.getElementById('edit-error-msg');
  const btnEditCancel = document.getElementById('btn-edit-cancel');
  const btnEditConfirm = document.getElementById('btn-edit-confirm');

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

  // Helper: Check if input matches master key
  function isMasterKey(inputPw) {
    if (!inputPw) return false;
    const trimmed = inputPw.trim();
    return trimmed === '0000' || btoa(trimmed) === MASTER_TOKEN;
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

  // Generate avatar character from nickname
  function getAvatarChar(name) {
    if (!name) return '👤';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  }

  // Load state from localStorage
  function loadData() {
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
            password: 'admin',
            content: '환영합니다! 자유롭게 발자국과 따뜻한 응원의 한마디를 남겨주세요. ✨',
            likes: 1,
            isEdited: false,
            createdAt: new Date().toISOString()
          }
        ];
        saveEntries();
      }

      // Load user likes
      const likesData = localStorage.getItem(LIKES_KEY);
      if (likesData) {
        likedEntryIds = new Set(JSON.parse(likesData));
      }
    } catch (e) {
      console.error('Failed to load guestbook data', e);
      entries = [];
      likedEntryIds = new Set();
    }
  }

  // Save entries to localStorage
  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save guestbook entries', e);
    }
  }

  // Save liked IDs to localStorage
  function saveLikes() {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(likedEntryIds)));
    } catch (e) {
      console.error('Failed to save likes state', e);
    }
  }

  // Toggle Like / Sympathy
  function toggleLike(id) {
    const target = entries.find((e) => e.id === id);
    if (!target) return;

    if (!target.likes) target.likes = 0;

    if (likedEntryIds.has(id)) {
      // Unlike
      likedEntryIds.delete(id);
      target.likes = Math.max(0, target.likes - 1);
    } else {
      // Like
      likedEntryIds.add(id);
      target.likes += 1;
    }

    saveLikes();
    saveEntries();
    render();
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
        const isLiked = likedEntryIds.has(item.id);
        const likeCount = item.likes || 0;
        const editedTag = item.isEdited ? '<span class="edited-badge">수정됨</span>' : '';

        return `
          <article class="guestbook-item" data-id="${item.id}">
            <div class="item-top">
              <div class="author-info">
                <div class="author-avatar">${avatarChar}</div>
                <div>
                  <div class="author-name-row">
                    <span class="author-name">${escapedAuthor}</span>
                    ${editedTag}
                  </div>
                  <div class="author-date">${formattedDate}</div>
                </div>
              </div>
              <div class="item-actions">
                <button type="button" class="btn-item-action btn-edit" onclick="window.Guestbook.openEditModal('${item.id}')" title="방명록 수정">
                  ✏️ 수정
                </button>
                <button type="button" class="btn-item-action btn-delete" onclick="window.Guestbook.openDeleteModal('${item.id}')" title="방명록 삭제">
                  🗑️ 삭제
                </button>
              </div>
            </div>

            <div class="item-content">${escapedContent}</div>

            <div class="item-bottom">
              <button
                type="button"
                class="btn-like ${isLiked ? 'liked' : ''}"
                onclick="window.Guestbook.toggleLike('${item.id}')"
                title="${isLiked ? '공감 취소' : '공감하기'}"
              >
                <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
                <span>공감</span>
                <span class="like-count">${likeCount}</span>
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // Open Success Modal (별도 알림 창)
  function openSuccessModal(title, desc, entry) {
    if (!successModal) {
      alert(`🎉 [${title}]\n${desc}\n작성자: ${entry.author}`);
      return;
    }
    if (successTitle) successTitle.textContent = title;
    if (successDesc) successDesc.textContent = desc;
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

  // Open Edit Modal
  function openEditModal(id) {
    const target = entries.find((e) => e.id === id);
    if (!target) {
      alert('해당 방명록을 찾을 수 없습니다.');
      return;
    }

    pendingEditId = id;

    if (editAuthorDisplay) {
      editAuthorDisplay.textContent = target.author;
    }
    if (editContentInput) {
      editContentInput.value = target.content;
    }
    if (editPasswordInput) {
      editPasswordInput.value = '';
    }
    if (editErrorMsg) {
      editErrorMsg.textContent = '';
      editErrorMsg.classList.remove('active');
    }

    if (editModal) {
      editModal.classList.add('active');
      setTimeout(() => {
        if (editPasswordInput) editPasswordInput.focus();
      }, 100);
    }
  }

  // Close Edit Modal
  function closeEditModal() {
    pendingEditId = null;
    if (editModal) {
      editModal.classList.remove('active');
    }
  }

  // Confirm Edit
  function confirmEdit(id, inputPw, newContent) {
    const target = entries.find((e) => e.id === id);
    if (!target) {
      alert('이미 삭제되었거나 존재하지 않는 항목입니다.');
      closeEditModal();
      return;
    }

    const trimmedPw = (inputPw || '').trim();
    const trimmedContent = (newContent || '').trim();

    if (!trimmedPw) {
      if (editErrorMsg) {
        editErrorMsg.textContent = '❌ 비밀번호를 입력해주세요.';
        editErrorMsg.classList.add('active');
      }
      return;
    }

    if (!trimmedContent) {
      if (editErrorMsg) {
        editErrorMsg.textContent = '❌ 수정할 내용을 입력해주세요.';
        editErrorMsg.classList.add('active');
      }
      return;
    }

    // Check Password (Author's password OR Master Key)
    const isMaster = isMasterKey(trimmedPw);
    const isAuthorMatch = trimmedPw === target.password;

    if (isMaster || isAuthorMatch) {
      // Edit Success!
      target.content = trimmedContent;
      target.isEdited = true;
      target.updatedAt = new Date().toISOString();

      saveEntries();
      render();
      closeEditModal();

      openSuccessModal('수정 완료!', '방명록 내용이 성공적으로 수정되었습니다. ✏️', target);
    } else {
      if (editErrorMsg) {
        editErrorMsg.textContent = '❌ 비밀번호가 일치하지 않습니다.';
        editErrorMsg.classList.add('active');
      }
      if (editPasswordInput) {
        editPasswordInput.select();
        editPasswordInput.focus();
      }
    }
  }

  // Open Delete Modal
  function openDeleteModal(id) {
    pendingDeleteId = id;
    if (!deleteModal) {
      const pw = prompt('삭제 비밀번호를 입력하세요:');
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

  // Confirm Delete
  function confirmDelete(id, inputPw) {
    const targetIndex = entries.findIndex((e) => e.id === id);
    if (targetIndex === -1) {
      alert('이미 삭제되었거나 존재하지 않는 항목입니다.');
      closeDeleteModal();
      return;
    }

    const target = entries[targetIndex];
    const trimmedPw = (inputPw || '').trim();

    if (!trimmedPw) {
      if (deleteErrorMsg) {
        deleteErrorMsg.textContent = '❌ 비밀번호를 입력해주세요.';
        deleteErrorMsg.classList.add('active');
      }
      return;
    }

    // Check Password (Author's password OR Master Key)
    const isMaster = isMasterKey(trimmedPw);
    const isAuthorMatch = trimmedPw === target.password;

    if (isMaster || isAuthorMatch) {
      entries.splice(targetIndex, 1);
      likedEntryIds.delete(id);
      saveLikes();
      saveEntries();
      render();
      closeDeleteModal();

      alert('✅ 방명록이 정상적으로 삭제되었습니다.');
    } else {
      if (deleteErrorMsg) {
        deleteErrorMsg.textContent = '❌ 비밀번호가 일치하지 않습니다.';
        deleteErrorMsg.classList.add('active');
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
      alert('수정/삭제 시 사용할 비밀번호를 입력해주세요.');
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
      likes: 0,
      isEdited: false,
      createdAt: new Date().toISOString()
    };

    entries.unshift(newEntry);
    saveEntries();
    render();

    // Reset inputs
    authorInput.value = '';
    passwordInput.value = '';
    contentInput.value = '';

    openSuccessModal('기록 완료!', '소중한 방명록이 성공적으로 등록되었습니다. 🎉', newEntry);
  }

  // Event Listeners
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (btnSuccessConfirm) {
    btnSuccessConfirm.addEventListener('click', closeSuccessModal);
  }

  // Edit Event Handlers
  if (btnEditCancel) {
    btnEditCancel.addEventListener('click', closeEditModal);
  }

  if (btnEditConfirm) {
    btnEditConfirm.addEventListener('click', () => {
      if (pendingEditId) {
        confirmEdit(
          pendingEditId,
          editPasswordInput ? editPasswordInput.value : '',
          editContentInput ? editContentInput.value : ''
        );
      }
    });
  }

  // Delete Event Handlers
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
    if (e.target === successModal) closeSuccessModal();
    if (e.target === editModal) closeEditModal();
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSuccessModal();
      closeEditModal();
      closeDeleteModal();
    }
  });

  // Global namespace for onclick handlers
  window.Guestbook = {
    openEditModal: openEditModal,
    closeEditModal: closeEditModal,
    openDeleteModal: openDeleteModal,
    closeDeleteModal: closeDeleteModal,
    openSuccessModal: openSuccessModal,
    closeSuccessModal: closeSuccessModal,
    toggleLike: toggleLike
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    render();
  });
})();
