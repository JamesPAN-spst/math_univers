/* ═══════════════════════════════════════════
   Mathematica · components.js
   Quiz rendering, inline quiz, scroll spy
   ═════════════════════════════════════════ */

/* ── Cache original .iq-prompt HTML before MathJax processes them ── */
var _iqOriginalHtml = {};
(function() {
  var prompts = document.querySelectorAll('.iq-prompt');
  for (var i = 0; i < prompts.length; i++) {
    var quiz = prompts[i].closest('.inline-quiz');
    if (quiz && quiz.id) _iqOriginalHtml[quiz.id] = prompts[i].innerHTML;
  }
})();

/* ── Render QUESTIONS into #quiz-zone ── */
function escapeQuizHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderQuiz(questions, container) {
  if (!questions || !container) return;
  container.innerHTML = questions.map(function (q, i) {
    return '<div class="quiz-item" id="quiz-' + i + '">' +
      '<div class="q-header">' +
        '<div class="q-num">' + (i + 1) + '</div>' +
        '<div class="q-text">' + escapeQuizHtml(q.question) + '</div>' +
      '</div>' +
      '<div class="q-options">' +
        q.options.map(function (opt, j) {
          return '<button class="q-opt" onclick="handleQuizAnswer(' + i + ',' + j + ',this)">' +
            '<span class="opt-letter">' + String.fromCharCode(65 + j) + '</span>' + escapeQuizHtml(opt) +
          '</button>';
        }).join('') +
      '</div>' +
      '<div class="q-explanation" id="quiz-exp-' + i + '">' +
        '<button class="q-reset" onclick="resetQuizItem(' + i + ')">↺ 重做</button>' +
        '<span class="exp-label">解析</span>' +
        escapeQuizHtml(q.explanation) +
      '</div>' +
    '</div>';
  }).join('');

  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([container]);
  }
}

/* ── Handle quiz answer ── */
function handleQuizAnswer(qIndex, optIndex, btn) {
  var q = QUESTIONS[qIndex];
  var item = document.getElementById('quiz-' + qIndex);
  var opts = item.querySelectorAll('.q-opt');

  for (var i = 0; i < opts.length; i++) {
    opts[i].disabled = true;
    if (i === q.answer) opts[i].classList.add('correct');
  }
  if (optIndex !== q.answer) {
    btn.classList.add('wrong');
    // Record to wrong-book
    if (typeof WrongBook !== 'undefined') {
      var pageBody = document.body;
      WrongBook.record(q.id, {
        question: q.question,
        correctAnswer: String.fromCharCode(65 + q.answer),
        userAnswer: String.fromCharCode(65 + optIndex),
        module: pageBody.getAttribute('data-module') || '',
        chapter: (pageBody.getAttribute('data-module') || '') + ' Ch.' + (document.querySelector('.chapter-indicator') ? document.querySelector('.chapter-indicator').textContent : '')
      });
    }
  } else {
    // Answered correctly — remove from wrong-book if present
    if (typeof WrongBook !== 'undefined') WrongBook.remove(q.id);
  }

  document.getElementById('quiz-exp-' + qIndex).classList.add('show');
}

/* ── Reset single quiz ── */
function resetQuizItem(qIndex) {
  var item = document.getElementById('quiz-' + qIndex);
  var opts = item.querySelectorAll('.q-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].disabled = false;
    opts[i].classList.remove('correct', 'wrong');
  }
  document.getElementById('quiz-exp-' + qIndex).classList.remove('show');
}

/* ── Inline quiz ── */
function checkInlineQuiz(quizId, btn, isCorrect, feedback) {
  var quiz = document.getElementById(quizId);
  var opts = quiz.querySelectorAll('.iq-options button');
  for (var i = 0; i < opts.length; i++) opts[i].disabled = true;

  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  // Record to wrong-book
  if (!isCorrect && typeof WrongBook !== 'undefined') {
    var pageBody = document.body;
    var mod = pageBody.getAttribute('data-module') || '';
    var prompt = quiz.querySelector('.iq-prompt');
    // Find the correct answer button by scanning onclick attributes
    var correctLetter = '—';
    var allBtns = quiz.querySelectorAll('.iq-options button');
    for (var k = 0; k < allBtns.length; k++) {
      var oc = allBtns[k].getAttribute('onclick') || '';
      if (/,\s*this\s*,\s*true\b/.test(oc)) {
        correctLetter = allBtns[k].textContent.trim().substring(0, 1);
        break;
      }
    }
    WrongBook.record(quizId, {
      question: _iqOriginalHtml[quizId] || (prompt ? prompt.innerHTML : quizId),
      correctAnswer: correctLetter,
      userAnswer: btn.textContent.trim().substring(0, 1),
      module: mod,
      chapter: mod + ' ' + quizId
    });
  } else if (isCorrect && typeof WrongBook !== 'undefined') {
    WrongBook.remove(quizId);
  }

  var fb = quiz.querySelector('.iq-feedback');
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'iq-feedback';
    quiz.appendChild(fb);
  }
  fb.innerHTML = (isCorrect
    ? '<strong style="color:var(--success)">✓ 正确！</strong> '
    : '<strong style="color:var(--error)">✗ 错误。</strong> ') + (feedback || '')
    + '<button class="iq-retry-btn" onclick="resetInlineQuiz(\'' + quizId + '\')">↺ 重做</button>';
  fb.classList.add('show');

  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([fb]);
}

/* ── Reset inline quiz ── */
function resetInlineQuiz(quizId) {
  var quiz = document.getElementById(quizId);
  var opts = quiz.querySelectorAll('.iq-options button');
  for (var i = 0; i < opts.length; i++) {
    opts[i].disabled = false;
    opts[i].classList.remove('correct', 'wrong');
  }
  var fb = quiz.querySelector('.iq-feedback');
  if (fb) fb.classList.remove('show');
}

/* ── Scroll spy for TOC sidebar ── */
function initScrollSpy() {
  var sections = document.querySelectorAll('.kp-section, .exercises-section');
  var links = document.querySelectorAll('.toc-list a');
  if (!sections.length || !links.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        for (var i = 0; i < links.length; i++) {
          links[i].classList.toggle('active', links[i].getAttribute('href') === '#' + id);
        }
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

  for (var i = 0; i < sections.length; i++) observer.observe(sections[i]);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function () {
  initScrollSpy();
  if (typeof QUESTIONS !== 'undefined') {
    var zone = document.getElementById('quiz-zone');
    if (zone) renderQuiz(QUESTIONS, zone);
  }
  initWrongBook();
  initSearch();
  initPageTransitions();
});

/* ═══════════════════════════════════════════
   错题本 UI
   ═════════════════════════════════════════ */
function initWrongBook() {
  if (typeof WrongBook === 'undefined') return;

  // Floating button
  var fab = document.createElement('button');
  fab.className = 'wrong-book-fab';
  fab.title = '错题本';
  fab.innerHTML = '📋<span class="wrong-book-badge" id="wrong-book-badge">0</span>';
  fab.onclick = function () { toggleWrongBookPanel(); };
  document.body.appendChild(fab);

  // Panel
  var panel = document.createElement('div');
  panel.className = 'wrong-book-panel';
  panel.id = 'wrong-book-panel';
  panel.innerHTML =
    '<div class="wb-header">' +
      '<h3>📋 错题本</h3>' +
    '</div>' +
    '<div class="wb-body" id="wrong-book-body"></div>' +
    '<div class="wb-footer">' +
      '<button class="wb-clear" onclick="WrongBook.clear();renderWrongBookList()">🗑 清空</button>' +
      '<button class="wb-close" onclick="toggleWrongBookPanel()">✕ 关闭</button>' +
    '</div>';
  document.body.appendChild(panel);

  WrongBook._updateBadge();
}

function toggleWrongBookPanel() {
  var panel = document.getElementById('wrong-book-panel');
  if (!panel) return;
  var isOpen = panel.classList.toggle('open');
  if (isOpen) renderWrongBookList();
}

function renderWrongBookList() {
  var body = document.getElementById('wrong-book-body');
  if (!body) return;
  var items = WrongBook.getAll();
  if (items.length === 0) {
    body.innerHTML = '<div class="wb-empty">🎉 暂无错题，继续保持！</div>';
    return;
  }
  body.innerHTML = items.map(function (item) {
    return '<div class="wb-item">' +
      '<div class="wb-item-header">' +
        '<span class="wb-item-count">× ' + item.count + '</span>' +
        '<span class="wb-item-chapter">' + escapeHtmlWb(item.chapter || item.module) + '</span>' +
        '<button class="wb-item-remove" onclick="WrongBook.remove(\'' + escapeAttrWb(item.id) + '\');renderWrongBookList()">✕</button>' +
      '</div>' +
      '<div class="wb-item-question">' + item.question + '</div>' +
      '<div class="wb-item-answer">你的答案: <strong style="color:var(--error)">' + escapeHtmlWb(item.userAnswer) + '</strong> · 正确: <strong style="color:var(--success)">' + escapeHtmlWb(item.correctAnswer) + '</strong></div>' +
    '</div>';
  }).join('');
  if (window.MathJax && MathJax.typesetPromise) {
    if (MathJax.typesetClear) MathJax.typesetClear([body]);
    MathJax.typesetPromise([body]);
  }
}

function escapeHtmlWb(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttrWb(s) {
  return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════
   Global Search
   ═════════════════════════════════════════ */
function initSearch() {
  if (typeof SEARCH_INDEX === 'undefined') return;

  // Determine root-relative prefix
  var scripts = document.querySelectorAll('script[src*="search-data"]');
  var rootPrefix = '';
  if (scripts.length) {
    var src = scripts[0].getAttribute('src');
    rootPrefix = src.replace(/shared\/search-data\.js$/, '');
  }

  // Build capsule container
  var capsule = document.createElement('div');
  capsule.className = 'search-capsule';
  capsule.id = 'search-capsule';
  capsule.innerHTML =
    '<div class="sc-bar">' +
      '<span class="sc-icon">🔍</span>' +
      '<input type="text" id="sc-input" placeholder="搜索…" autocomplete="off">' +
      '<kbd class="sc-kbd">Ctrl+K</kbd>' +
    '</div>' +
    '<div class="sc-results" id="sc-results"></div>';
  document.body.appendChild(capsule);

  // Adjust position when sidebar is present
  if (document.querySelector('.toc-sidebar')) {
    capsule.classList.add('has-sidebar');
  }

  var input = document.getElementById('sc-input');
  var results = document.getElementById('sc-results');

  // Accent normalizer
  function norm(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function escH(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Extract snippet around match with ±40 chars
  function snippet(text, query) {
    var nText = norm(text);
    var nQuery = norm(query);
    var idx = nText.indexOf(nQuery);
    if (idx === -1) return '';
    var start = Math.max(0, idx - 40);
    var end = Math.min(text.length, idx + query.length + 40);
    var raw = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    // Highlight
    var nRaw = norm(raw);
    var hIdx = nRaw.indexOf(nQuery);
    if (hIdx === -1) return escH(raw);
    return escH(raw.slice(0, hIdx)) +
      '<mark class="search-hl">' + escH(raw.slice(hIdx, hIdx + query.length)) + '</mark>' +
      escH(raw.slice(hIdx + query.length));
  }

  var debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { doSearch(input.value.trim()); }, 150);
  });

  function doSearch(query) {
    if (!query) {
      results.innerHTML = '';
      capsule.classList.remove('has-results');
      return;
    }
    var nq = norm(query);
    var matches = [];
    for (var i = 0; i < SEARCH_INDEX.length; i++) {
      var entry = SEARCH_INDEX[i];
      // Search in title + body
      var inTitle = norm(entry.title).indexOf(nq) !== -1;
      var bodyIdx = norm(entry.body).indexOf(nq);
      if (!inTitle && bodyIdx === -1) continue;
      // Extract matching sentence from body (split by |)
      var matchSentence = '';
      if (bodyIdx !== -1) {
        // Find the segment containing the match
        var segs = entry.body.split(' | ');
        for (var j = 0; j < segs.length; j++) {
          if (norm(segs[j]).indexOf(nq) !== -1) {
            matchSentence = segs[j];
            break;
          }
        }
      }
      var score = 0;
      if (inTitle) score += 3;
      if (bodyIdx !== -1) score += 1;
      matches.push({ entry: entry, score: score, sentence: matchSentence });
    }
    matches.sort(function (a, b) { return b.score - a.score; });
    if (matches.length === 0) {
      results.innerHTML = '<div class="sc-empty">未找到匹配结果</div>';
      capsule.classList.add('has-results');
      return;
    }
    capsule.classList.add('has-results');
    results.innerHTML = matches.slice(0, 20).map(function (m) {
      var e = m.entry;
      var href = rootPrefix + e.url;
      var titleHtml = inlineHighlight(e.title, query);
      var sentHtml = m.sentence ? snippet(m.sentence, query) : '';
      return '<a class="sc-item" href="' + href + '">' +
        '<div class="sc-item-title">' + titleHtml + '</div>' +
        (sentHtml ? '<div class="sc-item-text">' + sentHtml + '</div>' : '') +
      '</a>';
    }).join('');
  }

  function inlineHighlight(text, query) {
    var nText = norm(text);
    var nQuery = norm(query);
    var result = '';
    var i = 0;
    while (i < text.length) {
      var idx = nText.indexOf(nQuery, i);
      if (idx === -1) { result += escH(text.slice(i)); break; }
      result += escH(text.slice(i, idx));
      result += '<mark class="search-hl">' + escH(text.slice(idx, idx + query.length)) + '</mark>';
      i = idx + query.length;
    }
    return result;
  }

  // Click outside to close results
  document.addEventListener('click', function (e) {
    if (!capsule.contains(e.target)) {
      capsule.classList.remove('has-results');
    }
  });

  // Focus shows results if there's a query
  input.addEventListener('focus', function () {
    if (input.value.trim()) doSearch(input.value.trim());
  });

  // Keyboard: Ctrl+K to focus, ESC to blur
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.blur();
      capsule.classList.remove('has-results');
    }
  });
}

/* ═══════════════════════════════════════════
   Page Transitions
   ═════════════════════════════════════════ */
function initPageTransitions() {
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript') || link.target === '_blank') return;
    if (href.startsWith('http') && !href.includes(location.host)) return;
    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(function () { window.location.href = href; }, 250);
  });
}
