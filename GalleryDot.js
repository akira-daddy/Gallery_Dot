/* ====================================================
   GALLERY DOT — AFTER IMAGE
   JavaScript: Sticky CTA, Inventory, Scroll, Animations
   ==================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------
     1. INVENTORY DATA (dummy — replace with API)
     ------------------------------------------------ */
  const inventoryData = {
    '2026-01-10': 38, '2026-01-11': 32, '2026-01-12': 25,
    '2026-01-13': 40, '2026-01-14': 18, '2026-01-15': 9,
    '2026-01-16': 40, '2026-01-17': 7,  '2026-01-18': 3,
    '2026-01-19': 40, '2026-01-20': 29, '2026-01-21': 40,
    '2026-01-22': 15, '2026-01-23': 40, '2026-01-24': 22,
    '2026-01-25': 1,  '2026-01-26': 40
  };

  // Closed days (Tuesdays during exhibition period)
  const closedDays = ['2026-01-13', '2026-01-20'];

  // Day-of-week labels
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  /* ------------------------------------------------
     2. STOCK COLOR HELPER
     ------------------------------------------------ */
  function getStockClass(count) {
    if (count <= 0)  return 'stock-zero';
    if (count <= 10) return 'stock-low';
    if (count <= 20) return 'stock-mid';
    return 'stock-high';
  }

  /* ------------------------------------------------
     3. RENDER CALENDAR
     ------------------------------------------------ */
  function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const frag = document.createDocumentFragment();

    // Sort dates ascending
    const dates = Object.keys(inventoryData).sort();

    dates.forEach(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const dow = DOW[d.getDay()];
      const count = inventoryData[dateStr];
      const isClosed = closedDays.includes(dateStr);

      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.setAttribute('role', 'cell');

      if (isClosed) {
        cell.classList.add('cal-closed');
        cell.innerHTML = `
          <div>
            <div class="cal-date">${month}/${day}</div>
            <div class="cal-dow">${dow}</div>
          </div>
          <div class="cal-stock" aria-label="休廊">×</div>
        `;
        cell.setAttribute('aria-label', `${month}月${day}日 休廊`);
      } else {
        cell.classList.add(getStockClass(count));
        const warning = count > 0 && count <= 10
          ? '<div class="cal-warning">残りわずか</div>'
          : '';
        const stockText = count > 0 ? `残 ${count}` : '完売';
        cell.innerHTML = `
          <div>
            <div class="cal-date">${month}/${day}</div>
            <div class="cal-dow">${dow}</div>
          </div>
          <div>
            <div class="cal-stock">${stockText}</div>
            ${warning}
          </div>
        `;
        cell.setAttribute('aria-label', `${month}月${day}日 残り${count}個`);
      }

      frag.appendChild(cell);
    });

    calendarEl.appendChild(frag);
  }

  /* ------------------------------------------------
     4. TODAY'S STOCK WIDGET
     ------------------------------------------------ */
  function renderTodayStock() {
    const numEl = document.getElementById('todayStockNum');
    const barFill = document.getElementById('todayStockBarFill');
    const stickyNum = document.getElementById('stickyStockNum');
    if (!numEl) return;

    // For the LP preview, pick today's date if within range, else pick the first active day
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    let displayKey = todayKey;
    if (!(todayKey in inventoryData) || closedDays.includes(todayKey)) {
      // fallback: first non-closed day
      displayKey = Object.keys(inventoryData).sort().find(k => !closedDays.includes(k));
    }

    const count = inventoryData[displayKey] || 0;
    const max = 40;

    numEl.textContent = `${count} / ${max}`;
    numEl.style.color =
      count <= 10 ? '#7DD3F0' :
      count <= 20 ? '#3AA7C9' :
      '#1E6B86';

    if (barFill) {
      barFill.style.width = `${Math.max(0, Math.min(100, (count / max) * 100))}%`;
      barFill.style.background =
        count <= 10 ? '#7DD3F0' :
        count <= 20 ? '#3AA7C9' :
        '#1E6B86';
    }

    if (stickyNum) stickyNum.textContent = count;
  }

  /* ------------------------------------------------
     5. STICKY CTA: show after hero leaves viewport
     ------------------------------------------------ */
  function initStickyCTA() {
    const hero = document.getElementById('hero');
    const stickyBar = document.getElementById('sticky-cta');
    if (!hero || !stickyBar) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          stickyBar.classList.remove('is-visible');
          stickyBar.setAttribute('aria-hidden', 'true');
        } else {
          stickyBar.classList.add('is-visible');
          stickyBar.setAttribute('aria-hidden', 'false');
        }
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    observer.observe(hero);
  }

  /* ------------------------------------------------
     6. SMOOTH SCROLL
     ------------------------------------------------ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#' || targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      });
    });
  }

  /* ------------------------------------------------
     7. SCROLL REVEAL ANIMATIONS
     ------------------------------------------------ */
  function initScrollReveal() {
    const items = document.querySelectorAll('[data-animate]');
    if (!items.length) return;

    if (prefersReducedMotion) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    items.forEach(el => observer.observe(el));
  }

  /* ------------------------------------------------
     8. CONCEPT MARQUEE — click/tap to pause, auto-resume after 2s
     ------------------------------------------------ */
  function initMarqueePause() {
    const track = document.querySelector('.concept-marquee-track');
    if (!track) return;
    if (prefersReducedMotion) return; // marquee is already static for reduced-motion users

    const RESUME_DELAY = 2000;
    let resumeTimer = null;

    const pauseAndScheduleResume = () => {
      track.classList.add('is-paused');
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        track.classList.remove('is-paused');
        resumeTimer = null;
      }, RESUME_DELAY);
    };

    // Delegate click on any marquee item
    const items = track.querySelectorAll('.concept-marquee-item');
    items.forEach(item => {
      // Click covers mouse + most touch (synthesised)
      item.addEventListener('click', pauseAndScheduleResume);
      // Touchstart for immediate feedback on mobile before click fires
      item.addEventListener('touchstart', pauseAndScheduleResume, { passive: true });
    });
  }

  /* ------------------------------------------------
     9. RESERVATION MODAL + GAS SUBMISSION
     ------------------------------------------------ */
  function initReservationModal() {
    // ▼▼▼ ここにGASのウェブアプリURLを貼り付け ▼▼▼
    const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwNgp-j4prd3Cz1SS2yYnC6hp46V-zo6RfdH0Afl_UprYqHLLt2u_xHzj7Zvh6hJ1kl/exec';
    // ▲▲▲ ここにGASのウェブアプリURLを貼り付け ▲▲▲

    const modal = document.getElementById('reservationModal');
    const form = document.getElementById('reservationForm');
    const statusEl = document.getElementById('rsvStatus');
    const dateSelect = document.getElementById('rsv-date');
    if (!modal || !form) return;

    // 来場日の選択肢を動的生成（休廊日は除外）
    const allDates = Object.keys(inventoryData).sort();
    const closedSet = new Set(closedDays);
    allDates.forEach(key => {
      if (closedSet.has(key)) return;
      const [y, m, d] = key.split('-').map(Number);
      const dow = ['日','月','火','水','木','金','土'][new Date(y, m-1, d).getDay()];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${m}/${d}(${dow})`;
      dateSelect.appendChild(opt);
    });

    // ==============================
    //   VALIDATION
    // ==============================
    const validators = {
      name: value => {
        if (!value || value.trim() === '') return 'お名前を入力してください';
        if (value.trim().length < 2) return 'お名前は2文字以上で入力してください';
        if (value.length > 50) return 'お名前は50文字以内で入力してください';
        return '';
      },
      email: value => {
        if (!value || value.trim() === '') return 'メールアドレスを入力してください';
        // RFC 5322 簡略版。日常的に通用するメール形式を検証
        const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRe.test(value.trim())) return 'メールアドレスの形式が正しくありません';
        if (value.length > 100) return 'メールアドレスが長すぎます';
        return '';
      },
      phone: value => {
        // 任意項目。入力がある場合のみ検証
        if (!value || value.trim() === '') return '';
        // ハイフン・括弧・スペースを除去した数字のみを検証
        const digits = value.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d+$/.test(digits)) return '電話番号は数字で入力してください';
        if (digits.length < 10 || digits.length > 13) return '電話番号の桁数が正しくありません';
        return '';
      },
      visitDate: value => {
        if (!value) return '来場日を選択してください';
        if (!(value in inventoryData)) return '選択された日付は無効です';
        if (closedSet.has(value)) return 'この日は休廊日です';
        if (inventoryData[value] <= 0) return 'この日は予約枠が満席です';
        return '';
      },
      visitTime: value => {
        if (!value) return '来場時間を選択してください';
        return '';
      },
      people: value => {
        if (!value) return '人数を選択してください';
        const n = Number(value);
        if (isNaN(n) || n < 1 || n > 4) return '人数は1〜4名で選択してください';
        return '';
      },
      note: value => {
        // 任意項目。文字数だけチェック
        if (value && value.length > 500) return '備考は500文字以内で入力してください';
        return '';
      }
    };

    // 各フィールドにエラー表示要素を挿入
    Object.keys(validators).forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      const field = input.closest('.rsv-field');
      if (!field) return;
      if (!field.querySelector('.rsv-field-error')) {
        const errorEl = document.createElement('p');
        errorEl.className = 'rsv-field-error';
        errorEl.setAttribute('aria-live', 'polite');
        errorEl.dataset.errorFor = fieldName;
        field.appendChild(errorEl);
      }
    });

    // 単一フィールドを検証して状態を描画
    function validateField(fieldName, showError = true) {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input || !validators[fieldName]) return true;
      const field = input.closest('.rsv-field');
      const errorEl = field.querySelector('.rsv-field-error');
      const message = validators[fieldName](input.value);

      if (showError) {
        if (message) {
          field.classList.add('has-error');
          input.setAttribute('aria-invalid', 'true');
          if (errorEl) errorEl.textContent = message;
        } else {
          field.classList.remove('has-error');
          input.removeAttribute('aria-invalid');
          if (errorEl) errorEl.textContent = '';
        }
      }
      return message === '';
    }

    // 全フィールドを検証
    function validateAll() {
      let firstInvalid = null;
      Object.keys(validators).forEach(fieldName => {
        const ok = validateField(fieldName, true);
        if (!ok && !firstInvalid) {
          firstInvalid = form.querySelector(`[name="${fieldName}"]`);
        }
      });
      return firstInvalid;
    }

    // リアルタイム検証: blur時にエラー表示、input時にエラー解除（ユーザーが修正中は干渉しない）
    Object.keys(validators).forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      input.addEventListener('blur', () => validateField(fieldName, true));
      input.addEventListener('input', () => {
        const field = input.closest('.rsv-field');
        if (field.classList.contains('has-error')) {
          // 既にエラー表示中の場合のみ、入力中に再検証して素早く解除
          validateField(fieldName, true);
        }
      });
      // selectはchangeイベントの方が反応が良い
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => validateField(fieldName, true));
      }
    });

    // ==============================
    //   MODAL OPEN/CLOSE
    // ==============================
    const openTriggers = document.querySelectorAll('[data-open-modal="reservation"], a[href="#reservation-form"]');
    openTriggers.forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        openModal();
      });
    });

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      // スマホの戻るボタン対策：モーダルを開いたら履歴を1件積む
      history.pushState({ modalOpen: true }, '');
      setTimeout(() => {
        const first = form.querySelector('input, select');
        if (first) first.focus();
      }, 300);
    }
    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      // 閉じる際にエラー状態もクリア
      form.querySelectorAll('.rsv-field.has-error').forEach(f => f.classList.remove('has-error'));
      form.querySelectorAll('.rsv-field-error').forEach(e => e.textContent = '');
      statusEl.textContent = '';
      statusEl.className = 'rsv-status';
    }

    // スマホの戻るボタン（popstate）でモーダルを閉じる
    window.addEventListener('popstate', e => {
      if (modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', e => {
        // × ボタン・背景タップで閉じた場合は履歴も1件戻す
        if (history.state && history.state.modalOpen) {
          history.back();
        } else {
          closeModal();
        }
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        if (history.state && history.state.modalOpen) {
          history.back();
        } else {
          closeModal();
        }
      }
    });

    // ==============================
    //   FORM SUBMIT
    // ==============================
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = form.querySelector('.rsv-submit');
      statusEl.textContent = '';
      statusEl.className = 'rsv-status';

      // バリデーション
      const firstInvalid = validateAll();
      if (firstInvalid) {
        statusEl.textContent = '入力内容に誤りがあります。赤字の項目を確認してください。';
        statusEl.classList.add('is-error');
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const formData = new FormData(form);
      const payload = {};
      formData.forEach((v, k) => { payload[k] = typeof v === 'string' ? v.trim() : v; });

      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      try {
        // GAS の /exec は POST を受け取ると 302 リダイレクトを返す。
        // mode:'cors' + redirect:'follow' だとブラウザがリダイレクト先を
        // opaque リソースと判断して "Failed to fetch" になるため、
        // no-cors で送信し、レスポンス本文は読まずに「送信完了」とみなす。
        await fetch(GAS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        // no-cors では res.ok / res.status が読めないが、
        // fetch が例外を投げなければネットワーク送信は成功している。
        statusEl.textContent = 'ご予約を受け付けました。確認メールをお送りしました。';
        statusEl.classList.add('is-success');
        form.reset();
        setTimeout(closeModal, 4000);
      } catch (err) {
        // ネットワーク層のエラー（オフライン等）
        console.error('[Reservation] submit error:', err);
        const errMsg = err && err.message ? err.message : 'ネットワークエラーが発生しました。';
        statusEl.textContent = `送信に失敗しました: ${errMsg}`;
        statusEl.classList.add('is-error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '予約を送信する <span class="arrow">→</span>';
      }
    });
  }

  /* ------------------------------------------------
     INIT
     ------------------------------------------------ */
  function init() {
    renderCalendar();
    renderTodayStock();
    initStickyCTA();
    initSmoothScroll();
    initScrollReveal();
    initMarqueePause();
    initReservationModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();