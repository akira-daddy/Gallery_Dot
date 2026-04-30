/* ====================================================
   GALLERY DOT — AFTER IMAGE
   JavaScript: Sticky CTA, Inventory, Scroll, Animations
   ==================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------
     1. INVENTORY DATA
        - inventoryData はミュータブルなオブジェクト。
        - GASから最新データを取得できた場合はそちらで上書き。
        - 取得失敗時はここのフォールバック値を使用。
     ------------------------------------------------ */
  let inventoryData = {
    '2026-01-10': 38, '2026-01-11': 32, '2026-01-12': 25,
    '2026-01-13': 40, '2026-01-14': 18, '2026-01-15': 9,
    '2026-01-16': 40, '2026-01-17': 7,  '2026-01-18': 3,
    '2026-01-19': 40, '2026-01-20': 29, '2026-01-21': 40,
    '2026-01-22': 15, '2026-01-23': 40, '2026-01-24': 22,
    '2026-01-25': 1,  '2026-01-26': 40
  };

  // 休廊日（火曜）
  const closedDays = ['2026-01-13', '2026-01-20'];
  const closedSet  = new Set(closedDays);

  // 1日あたり最大配布数
  const MAX_PER_DAY = 40;

  // 曜日ラベル
  const DOW    = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const DOW_JP = ['日','月','火','水','木','金','土'];

  /* ------------------------------------------------
     GAS エンドポイント（1箇所で管理）
     ------------------------------------------------ */
  // ▼▼▼ ここにGASのウェブアプリURLを貼り付け ▼▼▼
  const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwNgp-j4prd3Cz1SS2yYnC6hp46V-zo6RfdH0Afl_UprYqHLLt2u_xHzj7Zvh6hJ1kl/exec';
  // ▲▲▲ ここにGASのウェブアプリURLを貼り付け ▲▲▲

  /* ================================================
     2. INVENTORY — GASから最新残数を取得
        GAS側で GET リクエストに対して
        { inventory: { "2026-01-10": 38, ... } }
        の形式の JSON を返すよう実装してください。
        取得できない場合はフォールバック値をそのまま使います。
     ================================================ */
  async function fetchInventoryFromGAS() {
    try {
      const res = await fetch(`${GAS_ENDPOINT}?action=getInventory`, {
        method: 'GET',
        mode: 'cors',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.inventory && typeof data.inventory === 'object') {
        // 取得成功 → inventoryData を最新値で上書き
        Object.assign(inventoryData, data.inventory);
        return true;
      }
    } catch (e) {
      // 取得失敗はサイレントに無視し、フォールバック値を使用
      console.warn('[Inventory] GASからの在庫取得に失敗しました。フォールバック値を使用します。', e);
    }
    return false;
  }

  /* ================================================
     3. INVENTORY — 予約成功後にローカル在庫を減算して再描画
     ================================================ */
  function decrementInventory(dateKey, numPeople) {
    if (!(dateKey in inventoryData)) return;
    inventoryData[dateKey] = Math.max(0, inventoryData[dateKey] - numPeople);
    // カレンダーと当日ウィジェットを再描画
    rerenderCalendar();
    renderTodayStock();
  }

  /* ------------------------------------------------
     4. STOCK COLOR HELPER
     ------------------------------------------------ */
  function getStockClass(count) {
    if (count <= 0)  return 'stock-zero';
    if (count <= 10) return 'stock-low';
    if (count <= 20) return 'stock-mid';
    return 'stock-high';
  }

  /* ------------------------------------------------
     5. CALENDAR — 描画 / 再描画
     ------------------------------------------------ */
  function buildCalendarFragment() {
    const frag  = document.createDocumentFragment();
    const dates = Object.keys(inventoryData).sort();

    dates.forEach(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d        = new Date(year, month - 1, day);
      const dow      = DOW[d.getDay()];
      const count    = inventoryData[dateStr];
      const isClosed = closedSet.has(dateStr);

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
        const warning   = count > 0 && count <= 10 ? '<div class="cal-warning">残りわずか</div>' : '';
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

    return frag;
  }

  function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    calendarEl.appendChild(buildCalendarFragment());
  }

  // 再描画用（既存セルをクリアして建て直す）
  function rerenderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';
    calendarEl.appendChild(buildCalendarFragment());
  }

  /* ------------------------------------------------
     6. TODAY'S STOCK WIDGET
     ------------------------------------------------ */
  function renderTodayStock() {
    const numEl     = document.getElementById('todayStockNum');
    const barFill   = document.getElementById('todayStockBarFill');
    const stickyNum = document.getElementById('stickyStockNum');
    if (!numEl) return;

    const today    = new Date();
    const pad      = n => String(n).padStart(2, '0');
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    let displayKey = todayKey;
    if (!(todayKey in inventoryData) || closedSet.has(todayKey)) {
      displayKey = Object.keys(inventoryData).sort().find(k => !closedSet.has(k));
    }

    const count = inventoryData[displayKey] ?? 0;

    numEl.textContent = `${count} / ${MAX_PER_DAY}`;
    numEl.style.color =
      count <= 10 ? '#7DD3F0' :
      count <= 20 ? '#3AA7C9' :
      '#1E6B86';

    if (barFill) {
      const pct = Math.max(0, Math.min(100, (count / MAX_PER_DAY) * 100));
      barFill.style.width      = `${pct}%`;
      barFill.style.background =
        count <= 10 ? '#7DD3F0' :
        count <= 20 ? '#3AA7C9' :
        '#1E6B86';
    }

    if (stickyNum) stickyNum.textContent = count;
  }

  /* ------------------------------------------------
     7. STICKY CTA
     ------------------------------------------------ */
  function initStickyCTA() {
    const hero      = document.getElementById('hero');
    const stickyBar = document.getElementById('sticky-cta');
    if (!hero || !stickyBar) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = !entry.isIntersecting;
        stickyBar.classList.toggle('is-visible', visible);
        stickyBar.setAttribute('aria-hidden', String(!visible));
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    observer.observe(hero);
  }

  /* ------------------------------------------------
     8. SMOOTH SCROLL
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
     9. SCROLL REVEAL ANIMATIONS
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
     10. CONCEPT MARQUEE
     ------------------------------------------------ */
  function initMarqueePause() {
    const track = document.querySelector('.concept-marquee-track');
    if (!track || prefersReducedMotion) return;

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

    track.querySelectorAll('.concept-marquee-item').forEach(item => {
      item.addEventListener('click', pauseAndScheduleResume);
      item.addEventListener('touchstart', pauseAndScheduleResume, { passive: true });
    });
  }

  /* ------------------------------------------------
     11. RESERVATION MODAL + FORM SUBMIT
     ------------------------------------------------ */
  function initReservationModal() {
    const modal      = document.getElementById('reservationModal');
    const form       = document.getElementById('reservationForm');
    const statusEl   = document.getElementById('rsvStatus');
    const dateSelect = document.getElementById('rsv-date');
    if (!modal || !form) return;

    // 来場日の選択肢を動的生成（休廊日は除外・完売は disabled）
    function populateDateSelect() {
      // 「選択してください」以外を一度クリア
      Array.from(dateSelect.options).forEach(o => {
        if (o.value !== '') dateSelect.removeChild(o);
      });
      Object.keys(inventoryData).sort().forEach(key => {
        if (closedSet.has(key)) return;
        const [y, m, d] = key.split('-').map(Number);
        const dow = DOW_JP[new Date(y, m - 1, d).getDay()];
        const remaining = inventoryData[key];
        const opt = document.createElement('option');
        opt.value = key;
        if (remaining <= 0) {
          opt.textContent = `${m}/${d}(${dow}) — 完売`;
          opt.disabled = true;
        } else {
          opt.textContent = `${m}/${d}(${dow})`;
        }
        dateSelect.appendChild(opt);
      });
    }
    populateDateSelect();

    /* ---- VALIDATION ---- */
    const validators = {
      name: value => {
        if (!value || value.trim() === '') return 'お名前を入力してください';
        if (value.trim().length < 2)        return 'お名前は2文字以上で入力してください';
        if (value.length > 50)              return 'お名前は50文字以内で入力してください';
        return '';
      },
      email: value => {
        if (!value || value.trim() === '') return 'メールアドレスを入力してください';
        const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRe.test(value.trim()))   return 'メールアドレスの形式が正しくありません';
        if (value.length > 100)            return 'メールアドレスが長すぎます';
        return '';
      },
      phone: value => {
        if (!value || value.trim() === '') return '';
        const digits = value.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d+$/.test(digits))              return '電話番号は数字で入力してください';
        if (digits.length < 10 || digits.length > 13) return '電話番号の桁数が正しくありません';
        return '';
      },
      visitDate: value => {
        if (!value)                    return '来場日を選択してください';
        if (!(value in inventoryData)) return '選択された日付は無効です';
        if (closedSet.has(value))      return 'この日は休廊日です';
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
        if (value && value.length > 500) return '備考は500文字以内で入力してください';
        return '';
      }
    };

    // エラー表示要素を挿入
    Object.keys(validators).forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      const field = input.closest('.rsv-field');
      if (!field || field.querySelector('.rsv-field-error')) return;
      const errorEl = document.createElement('p');
      errorEl.className = 'rsv-field-error';
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.dataset.errorFor = fieldName;
      field.appendChild(errorEl);
    });

    function validateField(fieldName, showError = true) {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input || !validators[fieldName]) return true;
      const field   = input.closest('.rsv-field');
      const errorEl = field.querySelector('.rsv-field-error');
      const message = validators[fieldName](input.value);
      if (showError) {
        field.classList.toggle('has-error', !!message);
        input.toggleAttribute('aria-invalid', !!message);
        if (errorEl) errorEl.textContent = message;
      }
      return message === '';
    }

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

    // リアルタイム検証
    Object.keys(validators).forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      input.addEventListener('blur',  () => validateField(fieldName, true));
      input.addEventListener('input', () => {
        if (input.closest('.rsv-field').classList.contains('has-error')) {
          validateField(fieldName, true);
        }
      });
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => validateField(fieldName, true));
      }
    });

    /* ---- MODAL OPEN/CLOSE ---- */
    document.querySelectorAll('[data-open-modal="reservation"], a[href="#reservation-form"]')
      .forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openModal(); });
      });

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
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
      form.querySelectorAll('.rsv-field.has-error').forEach(f => f.classList.remove('has-error'));
      form.querySelectorAll('.rsv-field-error').forEach(e => e.textContent = '');
      statusEl.textContent = '';
      statusEl.className   = 'rsv-status';
    }

    window.addEventListener('popstate', () => {
      if (modal.classList.contains('is-open')) closeModal();
    });

    modal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => {
        if (history.state && history.state.modalOpen) history.back();
        else closeModal();
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        if (history.state && history.state.modalOpen) history.back();
        else closeModal();
      }
    });

    /* ---- FORM SUBMIT ---- */
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = form.querySelector('.rsv-submit');
      statusEl.textContent = '';
      statusEl.className   = 'rsv-status';

      const firstInvalid = validateAll();
      if (firstInvalid) {
        statusEl.textContent = '入力内容に誤りがあります。赤字の項目を確認してください。';
        statusEl.classList.add('is-error');
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const formData = new FormData(form);
      const payload  = {};
      formData.forEach((v, k) => { payload[k] = typeof v === 'string' ? v.trim() : v; });

      // 送信前に選択日・人数を取得しておく
      const selectedDate   = payload.visitDate;
      const selectedPeople = Math.max(1, parseInt(payload.people, 10) || 1);

      submitBtn.disabled    = true;
      submitBtn.textContent = '送信中...';

      try {
        await fetch(GAS_ENDPOINT, {
          method:  'POST',
          mode:    'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body:    JSON.stringify(payload),
        });

        // ────────────────────────────────────────────────
        //  送信成功後:
        //  1. ローカル在庫を予約人数分だけ即座に減算
        //  2. カレンダー・当日ウィジェット・日付セレクトを再描画
        // ────────────────────────────────────────────────
        decrementInventory(selectedDate, selectedPeople);
        populateDateSelect(); // 完売になった日を disabled に更新

        statusEl.textContent = 'ご予約を受け付けました。確認メールをお送りしました。';
        statusEl.classList.add('is-success');
        form.reset();
        setTimeout(closeModal, 4000);

      } catch (err) {
        console.error('[Reservation] submit error:', err);
        statusEl.textContent = `送信に失敗しました: ${err?.message ?? 'ネットワークエラーが発生しました。'}`;
        statusEl.classList.add('is-error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '予約を送信する <span class="arrow">→</span>';
      }
    });
  }

  /* ================================================
     INIT
     ================================================ */
  async function init() {
    // GASから最新在庫を取得してからカレンダーを描画
    // （取得失敗時はフォールバック値でそのまま描画）
    await fetchInventoryFromGAS();

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
