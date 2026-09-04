(function () {
  'use strict';

  var measurementId = 'G-32VLC15W5G';
  var productionHost = 'www.signaltrue.ai';
  var suppressionKey = 'signaltrue:analytics-suppressed:v1';
  var automationMarker = /^(?:production[_ -]?smoke|qa|quality[_ -]?assurance|automated[_ -]?qa|e2e|playwright|puppeteer|test)$/i;
  var allowedIntents = ['demo', 'pilot', 'pricing', 'security-review', 'au-pilot', 'workload-scan', 'sample-report'];
  var privatePrefixes = [
    '/app',
    '/dashboard',
    '/login',
    '/forgot-password',
    '/register',
    '/onboarding',
    '/admin',
    '/superadmin',
    '/settings',
    '/notifications',
    '/integrations',
    '/team-analytics',
    '/ceo-summary',
    '/drift-report',
  ];

  function safePath(url) {
    var safeSearch = new URLSearchParams();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'cta', 'intent'].forEach(
      function (key) {
        var value = url.searchParams.get(key);
        if (value) {
          var limitedValue = value.slice(0, 120);
          safeSearch.set(
            key,
            /[^\s@]+@[^\s@]+\.[^\s@]+/.test(limitedValue) || /^\s*\+?\d[\d\s().-]{7,}\d\s*$/.test(limitedValue)
              ? '[redacted]'
              : limitedValue
          );
        }
      }
    );
    var query = safeSearch.toString();
    return url.pathname + (query ? '?' + query : '');
  }

  function isPrivatePath(pathname) {
    var normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    return privatePrefixes.some(function (prefix) {
      return normalized === prefix || normalized.indexOf(prefix + '/') === 0;
    });
  }

  function isAutomation() {
    var params = new URLSearchParams(window.location.search);
    var truthy = ['1', 'true', 'yes'];
    if (navigator.webdriver || /(?:bot|crawler|spider|headlesschrome|lighthouse|playwright|puppeteer)/i.test(navigator.userAgent)) {
      return true;
    }
    if (truthy.indexOf((params.get('debug_mode') || '').toLowerCase()) !== -1) return true;
    if (truthy.indexOf((params.get('qa') || '').toLowerCase()) !== -1) return true;
    return ['utm_source', 'utm_medium', 'utm_campaign'].some(function (key) {
      return automationMarker.test(params.get(key) || '');
    });
  }

  function suppressSession() {
    try {
      window.sessionStorage.setItem(suppressionKey, 'true');
    } catch (_) {
      // The current page is still suppressed if storage is unavailable.
    }
  }

  function isSessionSuppressed() {
    try {
      return window.sessionStorage.getItem(suppressionKey) === 'true';
    } catch (_) {
      return false;
    }
  }

  function setDisabled(disabled) {
    window['ga-disable-' + measurementId] = disabled;
  }

  window.signaltrueTrack = function () {};

  function normalizeContactLink(link) {
    var url;
    try {
      url = new URL(link.getAttribute('href') || '', window.location.origin);
    } catch (_) {
      return null;
    }
    if (url.origin !== window.location.origin || !/^\/contact(?:\.html)?\/?$/.test(url.pathname)) {
      return null;
    }

    var oldLocation = url.searchParams.get('cta') || link.getAttribute('data-cta-location');
    var rawIntent = url.searchParams.get('intent') || 'demo';
    var intent = rawIntent.split('?')[0] || 'demo';
    if (allowedIntents.indexOf(intent) === -1) intent = 'demo';
    var params = new URLSearchParams();
    params.set('intent', intent);
    url.pathname = '/contact';
    url.search = params.toString();
    url.hash = '';
    link.setAttribute('href', url.pathname + '?' + url.searchParams.toString());
    if (oldLocation) link.setAttribute('data-cta-location', oldLocation.slice(0, 120));
    return { url: url, intent: intent, location: oldLocation || 'static_page' };
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href]'), normalizeContactLink);

  if (isAutomation()) suppressSession();

  var eligible =
    window.location.hostname.toLowerCase() === productionHost &&
    !isPrivatePath(window.location.pathname) &&
    !isAutomation() &&
    !isSessionSuppressed();

  if (!eligible) {
    setDisabled(true);
    return;
  }

  setDisabled(false);
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  var script = document.createElement('script');
  script.id = 'signaltrue-ga4-static';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
  });

  var currentUrl = new URL(window.location.href);
  var currentPath = safePath(currentUrl);
  var allowedEvents = [
    'primary_cta_click',
    'sample_report_click',
    'sample_report_view',
    'lead_form_start',
    'lead_form_error',
    'lead_submit_success',
    'lead_confirmed',
    'booking_link_click',
  ];
  var allowedParams = [
    'page_path',
    'cta_location',
    'cta_destination',
    'intent',
    'error_type',
    'form_version',
  ];
  window.signaltrueTrack = function (eventName, params) {
    if (allowedEvents.indexOf(eventName) === -1) return;
    var safeParams = { page_path: currentPath };
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (allowedParams.indexOf(key) === -1 || !['string', 'number', 'boolean'].includes(typeof value)) {
        return;
      }
      var stringValue = String(value).slice(0, 300);
      safeParams[key] = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(stringValue) ? '[redacted]' : value;
    });
    window.gtag('event', eventName, safeParams);
  };
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: currentUrl.origin + currentPath,
    page_path: currentPath,
  });

  if (/\/(?:sample-report)(?:\.html)?\/?$/i.test(currentUrl.pathname)) {
    window.signaltrueTrack('sample_report_view', {
      cta_location: 'sample_report_page',
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;

    var contact = normalizeContactLink(link);
    if (contact) {
      window.signaltrueTrack('primary_cta_click', {
        cta_location: contact.location,
        cta_destination: contact.url.pathname + '?' + contact.url.searchParams.toString(),
        intent: contact.intent,
      });
      return;
    }

    try {
      var destination = new URL(link.getAttribute('href') || '', window.location.origin);
      if (/\/(?:sample-report)(?:\.html)?\/?$/i.test(destination.pathname)) {
        window.signaltrueTrack('sample_report_click', {
          cta_location: link.getAttribute('data-cta-location') || 'static_page',
        });
      }
    } catch (_) {
      // Invalid or non-URL links do not affect navigation.
    }
  });
})();
