// Packet list: filter chips, row selection, details pane and hex bytes.
// The page is complete without this script; it only adds the interactions.
(function () {
  'use strict';

  var root = document.querySelector('[data-packets]');
  if (!root) return;

  var table = root.querySelector('.packet-table');
  var rows = Array.prototype.slice.call(root.querySelectorAll('tbody tr'));
  var chipBox = root.querySelector('[data-chips]');
  var chips = chipBox ? Array.prototype.slice.call(chipBox.querySelectorAll('button')) : [];
  var expr = root.querySelector('[data-expr]');
  var bytesPane = root.querySelector('[data-bytes-pane]');
  var bytesEl = root.querySelector('[data-bytes]');
  var countEl = document.querySelector('[data-count]');
  var selectedEl = document.querySelector('[data-selected]');

  var field = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-d]'), function (el) {
    field[el.getAttribute('data-d')] = el;
  });
  var row = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-f]'), function (el) {
    row[el.getAttribute('data-f')] = el;
  });

  var current = null;

  function visibleRows() {
    return rows.filter(function (r) { return !r.hidden; });
  }

  function span(className, text) {
    var s = document.createElement('span');
    s.className = className;
    s.textContent = text;
    return s;
  }

  function renderBytes(text) {
    var bytes = new TextEncoder().encode(text).slice(0, 96);
    bytesEl.textContent = '';
    for (var i = 0; i < bytes.length; i += 16) {
      var chunk = Array.prototype.slice.call(bytes.slice(i, i + 16));
      var hex = chunk.map(function (b) { return b.toString(16).padStart(2, '0'); });
      var left = hex.slice(0, 8).join(' ');
      var right = hex.slice(8).join(' ');
      var ascii = chunk.map(function (b) {
        return b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
      }).join('');
      var line = document.createElement('div');
      line.className = 'b-row';
      line.appendChild(span('b-off', i.toString(16).padStart(4, '0')));
      line.appendChild(span('b-hex', (left + (right ? '  ' + right : '')).padEnd(48, ' ')));
      line.appendChild(span('b-asc', ascii));
      bytesEl.appendChild(line);
    }
  }

  function select(next) {
    if (!next || next === current) return;
    if (current) {
      current.classList.remove('is-selected');
      current.removeAttribute('aria-current');
    }
    current = next;
    current.classList.add('is-selected');
    current.setAttribute('aria-current', 'true');

    var d = current.dataset;
    field.no.textContent = d.no;
    field.title.textContent = d.title;
    field.date.textContent = d.date;
    field.topic.textContent = d.topic;
    field.length.textContent = d.length;
    field.tags.textContent = d.tags;
    field.summary.textContent = d.summary;
    field.link.setAttribute('href', d.url);
    row.tags.hidden = !d.tags;
    row.summary.hidden = !d.summary;

    if (selectedEl) selectedEl.textContent = 'No. ' + d.no;
    renderBytes(d.summary || d.title);
  }

  function applyFilter(topic) {
    var shown = 0;
    rows.forEach(function (r) {
      var match = !topic || r.dataset.topic === topic;
      r.hidden = !match;
      if (match) shown += 1;
    });
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', String((c.dataset.topic || '') === topic));
    });
    if (expr) expr.textContent = topic ? 'blog.topic == "' + topic + '"' : 'blog';
    if (countEl) countEl.textContent = String(shown);
    if (current && current.hidden) select(visibleRows()[0]);
  }

  rows.forEach(function (r) {
    r.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      select(r);
    });
    r.addEventListener('dblclick', function (e) {
      if (e.target.closest('a')) return;
      window.location.href = r.dataset.url;
    });
    r.addEventListener('focusin', function () { select(r); });
  });

  root.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var link = e.target.closest ? e.target.closest('tbody a') : null;
    if (!link) return;
    var list = visibleRows();
    var at = list.indexOf(link.closest('tr'));
    var to = Math.max(0, Math.min(list.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)));
    e.preventDefault();
    list[to].querySelector('a').focus();
  });

  chips.forEach(function (c) {
    c.addEventListener('click', function () { applyFilter(c.dataset.topic || ''); });
  });

  if (chipBox) chipBox.hidden = false;
  if (bytesPane) bytesPane.hidden = false;
  if (table) table.setAttribute('data-ready', '');
  select(root.querySelector('tbody tr.is-selected') || rows[0]);
})();
