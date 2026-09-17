// Feed URL builder for the homepage.
// Kept in a separate file so it works under the Express CSP (script-src 'self').
(function () {
  'use strict';

  var BASE = 'https://www.bibleplanfeed.com/rssbible';
  var PLAN_CHAPTERS = { full: 1189, ot: 929, nt: 260 };
  // Matches the server's clamp: earlier dates already give the complete plan
  var MAX_DAYS_AHEAD = 365;

  var form = document.getElementById('builder-form');
  var translation = document.getElementById('translation');
  var start = document.getElementById('start');
  var chapters = document.getElementById('chapters');
  var output = document.getElementById('feed-url');
  var summary = document.getElementById('summary');
  var copyButton = document.getElementById('copy');
  var openLink = document.getElementById('open');

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toInputValue(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function fromInputValue(value) {
    var parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function selectedPlan() {
    var checked = form.querySelector('input[name="plan"]:checked');
    return checked ? checked.value : 'full';
  }

  function chapterCount() {
    var n = parseInt(chapters.value, 10);
    if (isNaN(n)) return 1;
    return Math.min(99, Math.max(1, n));
  }

  function addDays(date, days) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }

  // Limit the picker to dates that change the feed, and pull the value into range.
  function syncDateRange(plan, perDay, clampValue) {
    var today = new Date();
    var min = toInputValue(addDays(today, -Math.ceil(PLAN_CHAPTERS[plan] / perDay)));
    var max = toInputValue(addDays(today, MAX_DAYS_AHEAD));
    start.min = min;
    start.max = max;
    if (clampValue && /^\d{4}-\d{2}-\d{2}$/.test(start.value)) {
      if (start.value < min) start.value = min;
      if (start.value > max) start.value = max;
    }
  }

  function update(event) {
    var plan = selectedPlan();
    var perDay = chapterCount();
    // Don't snap the date while it's still being typed (e.g. a partial year).
    var typingDate = event && event.type === 'input' && event.target === start;
    syncDateRange(plan, perDay, !typingDate);
    var startValue = /^\d{4}-\d{2}-\d{2}$/.test(start.value) ? start.value : toInputValue(new Date());
    var url = [
      BASE,
      plan,
      encodeURIComponent(translation.value.toLowerCase()),
      startValue.replace(/-/g, ''),
      perDay,
      'feed.rss',
    ].join('/');

    output.textContent = url;
    openLink.href = url;

    var days = Math.ceil(PLAN_CHAPTERS[plan] / perDay);
    var finish = fromInputValue(startValue);
    finish.setDate(finish.getDate() + days);
    var finishText = finish.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    summary.innerHTML = '';
    summary.append(
      'That’s ',
      strong(days.toLocaleString() + (days === 1 ? ' day' : ' days')),
      ', finishing ',
      strong(finishText),
      '.'
    );
  }

  function strong(text) {
    var el = document.createElement('strong');
    el.textContent = text;
    return el;
  }

  function loadTranslations() {
    fetch('translations.json')
      .then(function (res) {
        return res.ok ? res.json() : [];
      })
      .then(function (list) {
        if (!Array.isArray(list) || list.length === 0) return;
        var current = translation.value;
        list
          .slice()
          .sort(function (a, b) {
            return a.Name.localeCompare(b.Name);
          })
          .forEach(function (item) {
            if (item.Code === 'ESV') return;
            var option = document.createElement('option');
            option.value = item.Code;
            option.textContent = item.Name;
            translation.appendChild(option);
          });
        // Put ESV back in alphabetical position without losing the selection.
        var esv = translation.querySelector('option[value="ESV"]');
        var next = Array.prototype.find.call(translation.options, function (o) {
          return o !== esv && o.textContent.localeCompare(esv.textContent) > 0;
        });
        translation.insertBefore(esv, next || null);
        translation.value = current;
      })
      .catch(function () {
        // Keep the ESV-only fallback.
      });
  }

  function copyUrl() {
    var text = output.textContent;
    var done = function () {
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('copied');
      setTimeout(function () {
        copyButton.textContent = 'Copy URL';
        copyButton.classList.remove('copied');
      }, 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }

    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(output);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        if (document.execCommand('copy')) done();
      } catch (e) {
        // Leave the URL selected so the user can copy it manually.
      }
    }
  }

  // Default to yesterday so day 1 shows up in the feed today.
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  start.value = toInputValue(yesterday);

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
  });

  form.querySelectorAll('.step').forEach(function (button) {
    button.addEventListener('click', function () {
      chapters.value = Math.min(99, Math.max(1, chapterCount() + Number(button.dataset.step)));
      update();
    });
  });

  chapters.addEventListener('blur', function () {
    chapters.value = chapterCount();
  });

  copyButton.addEventListener('click', copyUrl);

  loadTranslations();
  update();
})();
