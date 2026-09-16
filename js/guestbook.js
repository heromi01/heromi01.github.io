/**
 * Guestbook System connected with Supabase Cloud Database
 * 
 * SECURITY ARCHITECTURE:
 *  - Queries `guestbook_public` view: password_hash is NEVER transmitted to the browser.
 *  - Master Password ('0000') & Author Passwords are ONLY verified server-side inside Postgres RPC functions.
 *  - Client uses minimal-privilege publishable key protected by Row Level Security (RLS).
 *  - Direct client updates/deletes are blocked by RLS; atomic changes occur via SECURITY DEFINER functions.
 */

(function () {
  'use strict';

  const LIKES_KEY = 'heromi01_liked_entries';

  // Initialize Supabase Client
  let supabaseClient = null;
  if (window.supabase && window.SUPABASE_CONFIG) {
    supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
  } else {
    console.error('Supabase library or configuration is not loaded.');
  }

  // State
  let entries = [];
  let likedEntryIds = new Set();
  let pendingDeleteId = null;
  let pendingEditId = null;

  // DOM Elements - Form
  const form = document.getElementById('guestbook-form');
  const authorInput = document.getElementById('author-input');
  const passwordInput = document.getElementById('password-input');
  const contentInput = document.getElementById('content-input');
  const submitBtn = document.querySelector('.btn-submit');
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

  // Helper: Escape HTML
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
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  // Generate avatar character
  function getAvatarChar(name) {
    if (!name) return '👤';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  }

  // Load liked post IDs from localStorage
  function loadLocalLikes() {
    try {
      const data = localStorage.getItem(LIKES_KEY);
      if (data) {
        likedEntryIds = new Set(JSON.parse(data));
      }
    } catch (e) {
      likedEntryIds = new Set();
    }
  }

  // Save liked post IDs
  function saveLocalLikes() {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(likedEntryIds)));
    } catch (e) {
      console.error('Failed to save liked posts', e);
    }
  }

  // Fetch entries from Supabase
  async function fetchEntries() {
    if (!supabaseClient) {
      renderError('Supabase 클라이언트가 초기화되지 않았습니다.');
      return;
    }

    try {
      // Query guestbook_public view (password_hash is completely excluded)
      const { data, error } = await supabaseClient
        .from('guestbook_public')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      entries = data || [];
      render();
    } catch (err) {
      console.error('Error fetching guestbook entries:', err);
      renderError('방명록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  // Render list
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
        const formattedDate = formatDate(item.created_at);
        const avatarChar = getAvatarChar(item.author);
        const isLiked = likedEntryIds.has(item.id);
        const likeCount = item.likes || 0;
        const editedTag = item.is_edited ? '<span class="edited-badge">수정됨</span>' : '';

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

  function renderError(message) {
    if (!listContainer) return;
    listContainer.innerHTML = `
      <div class="empty-guestbook" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
        <div class="empty-icon">⚠️</div>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  // Toggle Like via Supabase Atomic RPC
  async function toggleLike(id) {
    if (!supabaseClient) return;

    const target = entries.find((e) => e.id === id);
    if (!target) return;

    const isCurrentlyLiked = likedEntryIds.has(id);
    const rpcName = isCurrentlyLiked ? 'decrement_guestbook_like' : 'increment_guestbook_like';

    try {
      if (isCurrentlyLiked) {
        likedEntryIds.delete(id);
        target.likes = Math.max(0, (target.likes || 1) - 1);
      } else {
        likedEntryIds.add(id);
        target.likes = (target.likes || 0) + 1;
      }
      saveLocalLikes();
      render(); // Optimistic UI update

      const { data: newLikes, error } = await supabaseClient.rpc(rpcName, { entry_id: id });
      if (error) throw error;

      target.likes = newLikes;
      render();
    } catch (err) {
      console.error('Like toggle failed:', err);
    }
  }

  // Open Success Modal
  function openSuccessModal(title, desc, entry) {
    if (!successModal) {
      alert(`🎉 [${title}]\n${desc}\n작성자: ${entry.author}`);
      return;
    }
    if (successTitle) successTitle.textContent = title;
    if (successDesc) successDesc.textContent = desc;
    if (successAuthor) successAuthor.textContent = entry.author;
    if (successTime) successTime.textContent = formatDate(entry.created_at || new Date().toISOString());
    if (successContent) successContent.textContent = entry.content;

    successModal.classList.add('active');
  }

  // Close Success Modal
  function closeSuccessModal() {
    if (successModal) successModal.classList.remove('active');
  }

  // Open Edit Modal
  function openEditModal(id) {
    const target = entries.find((e) => e.id === id);
    if (!target) {
      alert('해당 방명록을 찾을 수 없습니다.');
      return;
    }

    pendingEditId = id;

    if (editAuthorDisplay) editAuthorDisplay.textContent = target.author;
    if (editContentInput) editContentInput.value = target.content;
    if (editPasswordInput) editPasswordInput.value = '';
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
    if (editModal) editModal.classList.remove('active');
  }

  // Confirm Edit: Secure Server-side verification via Postgres RPC
  async function confirmEdit(id, inputPw, newContent) {
    if (!supabaseClient) return;

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

    if (btnEditConfirm) btnEditConfirm.disabled = true;

    try {
      // Call secure server RPC function (verifies either author password or master password)
      const { data: success, error } = await supabaseClient.rpc('verify_and_update_guestbook', {
        entry_id: id,
        input_password: trimmedPw,
        new_content: trimmedContent
      });

      if (error) throw error;

      if (success) {
        closeEditModal();
        await fetchEntries(); // refresh from DB

        const updatedTarget = entries.find((e) => e.id === id) || {
          author: editAuthorDisplay ? editAuthorDisplay.textContent : '작성자',
          content: trimmedContent
        };
        openSuccessModal('수정 완료!', '방명록 내용이 성공적으로 수정되었습니다. ✏️', updatedTarget);
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
    } catch (err) {
      console.error('Edit error:', err);
      if (editErrorMsg) {
        editErrorMsg.textContent = '❌ 서버 통신 중 오류가 발생했습니다.';
        editErrorMsg.classList.add('active');
      }
    } finally {
      if (btnEditConfirm) btnEditConfirm.disabled = false;
    }
  }

  // Open Delete Modal
  function openDeleteModal(id) {
    pendingDeleteId = id;
    if (!deleteModal) return;

    if (deletePasswordInput) deletePasswordInput.value = '';
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
    if (deleteModal) deleteModal.classList.remove('active');
  }

  // Confirm Delete: Secure Server-side verification via Postgres RPC
  async function confirmDelete(id, inputPw) {
    if (!supabaseClient) return;

    const trimmedPw = (inputPw || '').trim();
    if (!trimmedPw) {
      if (deleteErrorMsg) {
        deleteErrorMsg.textContent = '❌ 비밀번호를 입력해주세요.';
        deleteErrorMsg.classList.add('active');
      }
      return;
    }

    if (btnDeleteConfirm) btnDeleteConfirm.disabled = true;

    try {
      // Call secure server RPC function (verifies either author password or master password)
      const { data: success, error } = await supabaseClient.rpc('verify_and_delete_guestbook', {
        entry_id: id,
        input_password: trimmedPw
      });

      if (error) throw error;

      if (success) {
        likedEntryIds.delete(id);
        saveLocalLikes();
        closeDeleteModal();
        await fetchEntries();
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
    } catch (err) {
      console.error('Delete error:', err);
      if (deleteErrorMsg) {
        deleteErrorMsg.textContent = '❌ 서버 통신 중 오류가 발생했습니다.';
        deleteErrorMsg.classList.add('active');
      }
    } finally {
      if (btnDeleteConfirm) btnDeleteConfirm.disabled = false;
    }
  }

  // Handle Form Submit: Insert to Supabase
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!supabaseClient) {
      alert('데이터베이스 연결에 문제가 발생했습니다.');
      return;
    }

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

    if (submitBtn) submitBtn.disabled = true;

    try {
      // Insert new entry into Supabase
      const { data, error } = await supabaseClient
        .from('guestbook')
        .insert([
          {
            author: author,
            password_hash: password, // processed by RLS / insert policy
            content: content,
            likes: 0
          }
        ])
        .select('id, author, content, likes, is_edited, created_at, updated_at');

      if (error) throw error;

      const createdEntry = (data && data[0]) ? data[0] : {
        author: author,
        content: content,
        created_at: new Date().toISOString()
      };

      // Reset form
      authorInput.value = '';
      passwordInput.value = '';
      contentInput.value = '';

      // Re-fetch to display newest list from cloud
      await fetchEntries();

      // Show completion modal
      openSuccessModal('기록 완료!', '소중한 방명록이 Supabase에 안전하게 등록되었습니다. 🎉', createdEntry);
    } catch (err) {
      console.error('Insert error:', err);
      alert('방명록 등록 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Event Listeners
  if (form) form.addEventListener('submit', handleFormSubmit);
  if (btnSuccessConfirm) btnSuccessConfirm.addEventListener('click', closeSuccessModal);

  // Edit Event Listeners
  if (btnEditCancel) btnEditCancel.addEventListener('click', closeEditModal);
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

  // Delete Event Listeners
  if (btnDeleteCancel) btnDeleteCancel.addEventListener('click', closeDeleteModal);
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
    loadLocalLikes();
    fetchEntries();
  });
})();