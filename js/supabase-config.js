/**
 * Supabase Public Configuration
 * 
 * SECURITY NOTICE:
 * - Only the Publishable / Anon public key is placed here.
 * - NEVER put the `service_role` secret key in this file.
 * - Sensitive master password checks are handled securely on the Supabase server via RPC/Edge Functions.
 */

window.SUPABASE_CONFIG = {
  url: 'https://dmdqrjkvfwquiuffvskf.supabase.co',
  anonKey: 'sb_publishable_m_L_20FbvhPaJtDIGKyp4w_8xYv3Tcx'
};

(function () {
  'use strict';

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  function installSecureSubmit() {
    const form = document.getElementById('guestbook-form');
    if (!form || !window.supabase || !window.SUPABASE_CONFIG) return;

    const client = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const author = getValue('author-input');
      const password = getValue('password-input');
      const content = getValue('content-input');
      const submitBtn = document.querySelector('.btn-submit');

      if (!author || !password || !content) {
        alert('작성자, 비밀번호, 방명록 내용을 모두 입력해주세요.');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const { error } = await client.rpc('create_guestbook_entry', {
          input_author: author,
          input_password: password,
          input_content: content
        });

        if (error) throw error;

        alert('방명록이 안전하게 등록되었습니다.');
        window.location.reload();
      } catch (err) {
        console.error('Secure guestbook insert failed:', err);
        alert('방명록 등록 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installSecureSubmit);
  } else {
    installSecureSubmit();
  }
})();
