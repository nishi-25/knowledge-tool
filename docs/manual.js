(function () {
  const content = document.querySelector('.manual-content');
  const input = document.getElementById('manual-search-input');
  const countEl = document.getElementById('manual-search-count');
  const prevBtn = document.getElementById('manual-search-prev');
  const nextBtn = document.getElementById('manual-search-next');
  const clearBtn = document.getElementById('manual-search-clear');
  if (!content || !input) return;

  const pristineHTML = content.innerHTML;
  let hits = [];
  let currentIndex = -1;

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function clearHighlights() {
    content.innerHTML = pristineHTML;
    hits = [];
    currentIndex = -1;
  }

  function highlight(query) {
    const re = new RegExp(escapeRegExp(query), 'gi');
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !re.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        re.lastIndex = 0;
        const parentTag = node.parentNode && node.parentNode.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let n;
    // eslint-disable-next-line no-cond-assign
    while ((n = walker.nextNode())) targets.push(n);

    targets.forEach((textNode) => {
      const text = textNode.nodeValue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let lastEnd = 0;
      let m;
      // eslint-disable-next-line no-cond-assign
      while ((m = re.exec(text))) {
        if (m.index > lastEnd) frag.appendChild(document.createTextNode(text.slice(lastEnd, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'manual-hit';
        mark.textContent = m[0];
        frag.appendChild(mark);
        lastEnd = m.index + m[0].length;
        if (m.index === re.lastIndex) re.lastIndex++; // 空マッチ対策
      }
      if (lastEnd < text.length) frag.appendChild(document.createTextNode(text.slice(lastEnd)));
      textNode.parentNode.replaceChild(frag, textNode);
    });

    hits = Array.from(content.querySelectorAll('mark.manual-hit'));
  }

  function updateCount() {
    countEl.textContent = hits.length ? `${currentIndex + 1} / ${hits.length}` : (input.value ? '0件' : '');
    prevBtn.disabled = hits.length === 0;
    nextBtn.disabled = hits.length === 0;
  }

  function goTo(index) {
    if (!hits.length) return;
    if (currentIndex >= 0 && hits[currentIndex]) hits[currentIndex].classList.remove('current');
    currentIndex = (index + hits.length) % hits.length;
    const el = hits[currentIndex];
    el.classList.add('current');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateCount();
  }

  function runSearch() {
    clearHighlights();
    const query = input.value.trim();
    if (!query) {
      updateCount();
      return;
    }
    highlight(query);
    updateCount();
    if (hits.length) goTo(0);
  }

  input.addEventListener('input', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hits.length) goTo(currentIndex + (e.shiftKey ? -1 : 1));
    }
  });
  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearHighlights();
    updateCount();
    input.focus();
  });

  updateCount();
})();
