(function () {
  'use strict';

  var spec = null;
  var currentLang = 'curl';

  function boot() {
    if (window.__SPEC__) {
      init(window.__SPEC__);
    } else if (window.__SPEC_DATA_URL__) {
      document.getElementById('app').innerHTML =
        '<div class="empty-state">Loading…</div>';
      fetch(window.__SPEC_DATA_URL__)
        .then(function (r) { return r.json(); })
        .then(init)
        .catch(function (e) {
          document.getElementById('app').innerHTML =
            '<div class="empty-state">Failed to load: ' + esc(e.message) + '</div>';
        });
    } else {
      document.getElementById('app').innerHTML =
        '<div class="empty-state">No spec data found.</div>';
    }
  }

  function init(data) {
    spec = data;
    spec.groups.forEach(function (g) {
      g._flat = flatten(g);
    });
    renderShell();
    window.addEventListener('hashchange', onRoute);
    onRoute();
  }

  function flatten(grp) {
    var out = [];
    grp.endpoints.forEach(function (ep) { out.push(ep); });
    grp.subGroups.forEach(function (sg) {
      sg.endpoints.forEach(function (ep) { out.push(ep); });
    });
    return out;
  }

  function renderShell() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<aside class="sidebar">' +
        '<div class="sidebar-head">' +
          '<div class="sidebar-title">' + esc(spec.info.title || 'API Docs') + '</div>' +
          '<button class="postman-btn">Run in Postman</button>' +
          '<div class="search-wrap" id="search-wrap">' +
            '<span class="search-ico">⌕</span>' +
            '<input class="search-input" id="search" type="search" placeholder="Search" autocomplete="off" spellcheck="false">' +
            '<kbd class="search-kbd">⌘K</kbd>' +
          '</div>' +
        '</div>' +
        '<nav class="nav" id="nav">' + buildNav() + '</nav>' +
      '</aside>' +
      '<div class="page">' +
        '<div class="doc-col" id="doc-col"><div class="empty-state">Select an endpoint</div></div>' +
        '<div class="code-col" id="code-col"></div>' +
      '</div>';

    document.getElementById('search').addEventListener('input', onSearchInput);
    document.getElementById('search').addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.target.value = ''; onSearchClear(); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });
  }

  function buildNav() {
    return spec.groups.map(function (g, gi) {
      var eps = g._flat;
      return (
        '<div class="nav-group" id="ng-' + gi + '">' +
          '<div class="nav-group-hd" data-gi="' + gi + '">' +
            '<span class="nav-group-arrow">▶</span>' +
            '<span class="nav-group-name">' + esc(g.title) + '</span>' +
          '</div>' +
          '<div class="nav-eps">' +
            eps.map(function (ep, ei) {
              return (
                '<a class="nav-ep" href="#' + esc(g.name) + '/' + ei + '" ' +
                    'data-gi="' + gi + '" data-ei="' + ei + '">' +
                  '<span class="nav-ep-sum">' + esc(ep.summary || ep.path) + '</span>' +
                  '<span class="mtag ' + ep.method + '">' + methodLabel(ep.method) + '</span>' +
                '</a>'
              );
            }).join('') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var hd = e.target.closest('.nav-group-hd');
    if (hd) {
      var gi = parseInt(hd.dataset.gi, 10);
      var grpEl = document.getElementById('ng-' + gi);
      if (grpEl) grpEl.classList.toggle('open');
    }
  });

  function methodLabel(m) {
    return m === 'delete' ? 'DEL' : m.toUpperCase();
  }

  function onRoute() {
    var hash = location.hash.slice(1);
    if (!hash && spec.groups.length) {
      var firstGrp = spec.groups[0];
      if (firstGrp._flat.length) {
        location.replace('#' + firstGrp.name + '/0');
        return;
      }
    }

    var slash = hash.indexOf('/');
    var groupName = slash === -1 ? hash : hash.slice(0, slash);
    var epIndex   = slash === -1 ? 0    : parseInt(hash.slice(slash + 1), 10) || 0;

    var grpIdx = spec.groups.findIndex(function (g) { return g.name === groupName; });
    if (grpIdx === -1) return;

    var grp = spec.groups[grpIdx];
    var eps = grp._flat;
    if (!eps.length) return;

    var ep = eps[Math.min(epIndex, eps.length - 1)];
    setNavActive(grpIdx, epIndex);
    renderEndpoint(ep);
    renderCodePanel(ep);
  }

  function setNavActive(grpIdx, epIdx) {
    document.querySelectorAll('.nav-ep').forEach(function (el) { el.classList.remove('active'); });
    var el = document.querySelector('.nav-ep[data-gi="' + grpIdx + '"][data-ei="' + epIdx + '"]');
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'nearest' });
    }

    document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('open'); });
    var grpEl = document.getElementById('ng-' + grpIdx);
    if (grpEl) grpEl.classList.add('open');
  }

  function renderEndpoint(ep) {
    var col = document.getElementById('doc-col');
    var html =
      '<h1 class="ep-title">' + esc(ep.summary || ep.path) + '</h1>' +
      (ep.description ? '<p class="ep-desc">' + esc(ep.description) + '</p>' : '');

    html += renderParams(ep.parameters);

    if (ep.requestBody) {
      html += renderBodySection(ep.requestBody);
    }

    html += renderResponsesSection(ep.responses);
    col.innerHTML = html;

    col.querySelectorAll('.resp-card').forEach(function (card) {
      card.querySelector('.resp-card-hd').addEventListener('click', function () {
        card.classList.toggle('open');
      });
    });
  }

  function renderParams(params) {
    if (!params || !params.length) return '';
    var byLoc = { path: [], query: [], header: [], cookie: [] };
    params.forEach(function (p) { (byLoc[p.in] || byLoc.query).push(p); });

    var html = '<div class="section"><div class="section-hd"><span class="section-title">Parameters</span></div>';
    ['path', 'query', 'header', 'cookie'].forEach(function (loc) {
      if (!byLoc[loc].length) return;
      html += '<div class="param-location">' + loc + '</div>' +
              '<div class="prop-list">' + byLoc[loc].map(renderPropRow).join('') + '</div>';
    });
    return html + '</div>';
  }

  function renderBodySection(body) {
    var content  = body.content || {};
    var mediaKey = Object.keys(content)[0] || 'application/json';
    var media    = content[mediaKey];
    var schema   = media && media.schema;
    return (
      '<div class="section">' +
        '<div class="section-hd">' +
          '<span class="section-title">Body</span>' +
          (body.description ? '<span class="section-sub">' + esc(body.description) + '</span>' : '') +
          '<span class="media-pill">' + esc(mediaKey) + '</span>' +
        '</div>' +
        (schema ? renderSchemaProps(schema, 0) : '') +
      '</div>'
    );
  }

  function renderResponsesSection(responses) {
    if (!responses || !Object.keys(responses).length) return '';
    var entries = Object.entries(responses);
    return (
      '<div class="section">' +
        '<div class="section-hd"><span class="section-title">Responses</span></div>' +
        '<div class="resp-cards">' +
          entries.map(function (kv, i) {
            return renderResponseCard(kv[0], kv[1], i === 0);
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function renderResponseCard(code, resp, autoOpen) {
    var cls     = code.startsWith('2') ? 's2' : code.startsWith('4') ? 's4' : code.startsWith('5') ? 's5' : 'sx';
    var content = (resp && resp.content) || {};
    var media   = content['application/json'] || Object.values(content)[0];
    var schema  = media && media.schema;
    var props   = schema ? renderSchemaProps(schema, 0) : '';
    var open    = autoOpen ? ' open' : '';
    return (
      '<div class="resp-card' + open + '">' +
        '<div class="resp-card-hd">' +
          '<span class="resp-card-arrow">▶</span>' +
          '<span class="scode ' + cls + '">' + esc(code) + '</span>' +
          '<span class="resp-desc-txt">' + esc((resp && resp.description) || '') + '</span>' +
        '</div>' +
        (props ? '<div class="resp-card-body">' + props + '</div>' : '') +
      '</div>'
    );
  }

  function renderSchemaProps(schema, depth) {
    if (!schema || depth > 4) return '';
    var composed = schema.allOf || schema.oneOf || schema.anyOf;
    if (composed && composed.length) return renderSchemaProps(composed[0], depth);

    if (schema.type === 'array' || (schema.items && !schema.properties)) {
      return schema.items ? renderSchemaProps(schema.items, depth) : '';
    }

    var props = schema.properties;
    if (!props || !Object.keys(props).length) return '';
    var req     = schema.required || [];
    var entries = Object.entries(props);

    return (
      '<div class="prop-list">' +
        entries.slice(0, 30).map(function (kv) {
          return renderPropRow(kv[1], kv[0], req.indexOf(kv[0]) !== -1, depth);
        }).join('') +
        (entries.length > 30
          ? '<div class="prop-row"><span style="color:var(--txt-muted);font-size:12px">+' + (entries.length - 30) + ' more</span></div>'
          : '') +
      '</div>'
    );
  }

  function renderPropRow(prop, nameOverride, isRequired, depth) {
    var isParam = (typeof prop.in === 'string');
    var name    = nameOverride || prop.name || '—';
    var schema  = isParam ? (prop.schema || {}) : prop;
    var type    = schema.type || (schema.allOf ? 'object' : schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : schema.items ? 'array' : '—');
    var fmt     = schema.format ? ' · ' + schema.format : '';
    var desc    = prop.description || schema.description || '';
    var reqFlag = isRequired || (isParam && prop.required);

    var badges = '';
    if (schema.readOnly) badges += '<span class="prop-badge readonly">read-only</span>';
    if (reqFlag)         badges += '<span class="prop-badge required">required</span>';

    var nested = '';
    if (depth < 3) {
      if (schema.properties) {
        nested = '<div class="prop-nested">' + renderSchemaProps(schema, depth + 1) + '</div>';
      } else if (schema.type === 'array' && schema.items && schema.items.properties) {
        nested = '<div class="prop-nested">' + renderSchemaProps(schema.items, depth + 1) + '</div>';
      }
    }

    var enumHtml = '';
    if (schema.enum && schema.enum.length) {
      enumHtml = '<div class="prop-enum">' +
        schema.enum.map(function (v) {
          return '<span class="prop-enum-val">' + esc(String(v)) + '</span>';
        }).join('') +
      '</div>';
    }

    return (
      '<div class="prop-row">' +
        '<div class="prop-hd">' +
          '<span class="prop-name">' + esc(name) + '</span>' +
          '<span class="prop-type">' + esc(type + fmt) + '</span>' +
          badges +
          (schema.example !== undefined ? '<span class="prop-example">Example</span>' : '') +
        '</div>' +
        (desc ? '<div class="prop-desc">' + esc(desc) + '</div>' : '') +
        enumHtml +
        nested +
      '</div>'
    );
  }

  function renderCodePanel(ep) {
    var col  = document.getElementById('code-col');
    var base = baseUrl();
    var code = currentLang === 'python' ? generatePython(ep, base)
             : currentLang === 'php'    ? generatePhp(ep, base)
             : currentLang === 'node'   ? generateNode(ep, base)
             : generateCurl(ep, base);

    var respEntries = Object.entries(ep.responses || {});
    var firstCode   = respEntries.length ? respEntries[0][0] : null;

    col.innerHTML =
      '<div class="code-panel-head">' +
        '<span class="code-panel-method ' + ep.method + '">' + methodLabel(ep.method) + '</span>' +
        '<span class="code-panel-path">' + esc(ep.path) + '</span>' +
        '<select class="lang-select" id="lang-sel">' +
          '<option value="curl"'   + (currentLang === 'curl'   ? ' selected' : '') + '>Shell Curl</option>' +
          '<option value="node"'   + (currentLang === 'node'   ? ' selected' : '') + '>JavaScript</option>' +
          '<option value="python"' + (currentLang === 'python' ? ' selected' : '') + '>Python</option>' +
          '<option value="php"'    + (currentLang === 'php'    ? ' selected' : '') + '>PHP</option>' +
        '</select>' +
      '</div>' +
      '<div class="code-block-wrap">' +
        '<div class="code-block"><pre>' + renderCodeLines(code) + '</pre></div>' +
      '</div>' +
      '<div class="test-btn-row">' +
        '<button class="test-btn">▶ Test Request</button>' +
      '</div>' +
      (respEntries.length
        ? '<div class="resp-tabs" id="resp-tabs">' +
            respEntries.map(function (kv) {
              var c  = kv[0];
              var tc = c.startsWith('2') ? 's2' : c.startsWith('4') ? 's4' : c.startsWith('5') ? 's5' : '';
              var active = c === firstCode ? ' active' : '';
              return '<button class="resp-tab ' + tc + active + '" data-code="' + esc(c) + '">' + esc(c) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="resp-panel" id="resp-panel">' +
            renderRespPanel(firstCode, ep.responses[firstCode]) +
          '</div>'
        : '');

    col.querySelector('#lang-sel').addEventListener('change', function (e) {
      currentLang = e.target.value;
      renderCodePanel(ep);
    });

    var tabsEl = col.querySelector('#resp-tabs');
    if (tabsEl) {
      tabsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.resp-tab');
        if (!btn) return;
        tabsEl.querySelectorAll('.resp-tab').forEach(function (t) { t.classList.remove('active'); });
        btn.classList.add('active');
        var code2 = btn.dataset.code;
        document.getElementById('resp-panel').innerHTML =
          renderRespPanel(code2, ep.responses[code2]);
      });
    }
  }

  function renderRespPanel(code, resp) {
    if (!resp) return '';
    var content = (resp.content) || {};
    var media   = content['application/json'] || Object.values(content)[0];
    var schema  = media && media.schema;
    var sample  = schema ? sampleFromSchema(schema, 0) : null;
    var jsonStr = sample !== null ? JSON.stringify(sample, null, 2) : null;
    return (
      (jsonStr ? '<div class="resp-json">' + hlJson(jsonStr) + '</div>' : '') +
      (resp.description ? '<div class="resp-label">' + esc(resp.description) + '</div>' : '')
    );
  }

  function renderCodeLines(code) {
    return code.split('\n').map(function (line, i) {
      return '<span class="ln">' + (i + 1) + '</span>' + line;
    }).join('\n');
  }

  function baseUrl() {
    return (spec.servers && spec.servers[0] && spec.servers[0].url) || 'https://api.example.com';
  }

  function generateCurl(ep, base) {
    var url = base + ep.path;
    var m   = ep.method.toUpperCase();
    var lines = [
      '<span class="ck">curl</span> ' + esc(url) + ' \\'
    ];

    lines.push('  <span class="cf">--request</span> <span class="cm">' + m + '</span> \\');
    lines.push('  <span class="cf">--header</span> <span class="cv">\'Content-Type: application/json\'</span> \\');
    lines.push('  <span class="cf">--header</span> <span class="cv">\'Authorization: Bearer YOUR_SECRET_TOKEN\'</span>');

    if (ep.requestBody) {
      var content = ep.requestBody.content || {};
      var media   = content['application/json'] || Object.values(content)[0];
      var schema  = media && media.schema;
      if (schema) {
        var sample = sampleFromSchema(schema, 0);
        if (sample !== null) {
          lines[lines.length - 1] += ' \\';
          lines.push('  <span class="cf">--data</span> <span class="cv">\'' + esc(JSON.stringify(sample, null, 2)) + '\'</span>');
        }
      }
    }

    return lines.join('\n');
  }

  function generateNode(ep, base) {
    var url     = base + ep.path;
    var m       = ep.method.toUpperCase();
    var content = (ep.requestBody && ep.requestBody.content) || {};
    var media   = content['application/json'] || Object.values(content)[0];
    var schema  = media && media.schema;
    var sample  = schema ? sampleFromSchema(schema, 0) : null;

    var lines = [
      '<span class="ck">const</span> response = <span class="ck">await</span> fetch(<span class="cv">\'' + esc(url) + '\'</span>, {',
      '  method: <span class="cv">\'' + m + '\'</span>,',
      '  headers: {',
      '    <span class="cv">\'Content-Type\'</span>: <span class="cv">\'application/json\'</span>,',
      '    <span class="cv">\'Authorization\'</span>: <span class="cv">\'Bearer YOUR_SECRET_TOKEN\'</span>',
      '  }' + (sample !== null ? ',' : ''),
    ];
    if (sample !== null) {
      lines.push('  body: JSON.stringify(' + esc(JSON.stringify(sample, null, 2)) + ')');
    }
    lines.push('});');
    lines.push('<span class="ck">const</span> data = <span class="ck">await</span> response.json();');
    return lines.join('\n');
  }

  function generatePython(ep, base) {
    var url     = base + ep.path;
    var m       = ep.method.toLowerCase();
    var content = (ep.requestBody && ep.requestBody.content) || {};
    var media   = content['application/json'] || Object.values(content)[0];
    var sample  = (media && media.schema) ? sampleFromSchema(media.schema, 0) : null;
    var kw = '<span class="ck">'; var kwe = '</span>';
    var st = '<span class="cv">'; var ste = '</span>';
    var lines = [
      kw + 'import' + kwe + ' requests',
      '',
      'url = ' + st + '\'' + esc(url) + '\'' + ste,
      'headers = {',
      '    ' + st + '\'Content-Type\'' + ste + ': ' + st + '\'application/json\'' + ste + ',',
      '    ' + st + '\'Authorization\'' + ste + ': ' + st + '\'Bearer YOUR_SECRET_TOKEN\'' + ste + ',',
      '}',
      '',
    ];
    if (sample !== null) {
      lines.push('payload = ' + esc(JSON.stringify(sample, null, 4)));
      lines.push('');
      lines.push('response = requests.' + kw + m + kwe + '(url, headers=headers, json=payload)');
    } else {
      lines.push('response = requests.' + kw + m + kwe + '(url, headers=headers)');
    }
    lines.push('data = response.json()');
    return lines.join('\n');
  }

  function generatePhp(ep, base) {
    var url     = base + ep.path;
    var m       = ep.method.toUpperCase();
    var content = (ep.requestBody && ep.requestBody.content) || {};
    var media   = content['application/json'] || Object.values(content)[0];
    var sample  = (media && media.schema) ? sampleFromSchema(media.schema, 0) : null;
    var kw = '<span class="ck">'; var kwe = '</span>';
    var fn = '<span class="cf">'; var fne = '</span>';
    var st = '<span class="cv">'; var ste = '</span>';
    var lines = ['<span class="cm"><?php</span>', ''];
    if (sample !== null) {
      lines.push('$payload = ' + fn + 'json_encode' + fne + '(' + esc(JSON.stringify(sample, null, 4)) + ');');
      lines.push('');
    }
    lines.push('$ch = ' + fn + 'curl_init' + fne + '();');
    lines.push(fn + 'curl_setopt_array' + fne + '($ch, [');
    lines.push('    CURLOPT_URL            => ' + st + '\'' + esc(url) + '\'' + ste + ',');
    lines.push('    CURLOPT_RETURNTRANSFER => ' + kw + 'true' + kwe + ',');
    if (m !== 'GET') {
      lines.push('    CURLOPT_CUSTOMREQUEST  => ' + st + '\'' + m + '\'' + ste + ',');
    }
    if (sample !== null) {
      lines.push('    CURLOPT_POSTFIELDS     => $payload,');
    }
    lines.push('    CURLOPT_HTTPHEADER     => [');
    lines.push('        ' + st + '\'Content-Type: application/json\'' + ste + ',');
    lines.push('        ' + st + '\'Authorization: Bearer YOUR_SECRET_TOKEN\'' + ste + ',');
    lines.push('    ],');
    lines.push(']);');
    lines.push('');
    lines.push('$response = ' + fn + 'curl_exec' + fne + '($ch);');
    lines.push(fn + 'curl_close' + fne + '($ch);');
    lines.push('$data = ' + fn + 'json_decode' + fne + '($response, ' + kw + 'true' + kwe + ');');
    return lines.join('\n');
  }

  function sampleFromSchema(schema, depth) {
    if (!schema || depth > 3) return null;
    if (schema.example !== undefined) return schema.example;

    var composed = schema.allOf || schema.oneOf || schema.anyOf;
    if (composed && composed.length) return sampleFromSchema(composed[0], depth);

    switch (schema.type) {
      case 'string':
        if (schema.enum && schema.enum.length) return schema.enum[0];
        if (schema.format === 'uuid')      return 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        if (schema.format === 'date-time') return '2024-01-15T09:30:00Z';
        if (schema.format === 'date')      return '2024-01-15';
        if (schema.format === 'email')     return 'user@example.com';
        if (schema.format === 'uri')       return 'https://example.com';
        return 'string';
      case 'integer':
        return schema.minimum !== undefined ? schema.minimum : 1;
      case 'number':
        return schema.minimum !== undefined ? schema.minimum : 1.0;
      case 'boolean':
        return true;
      case 'array':
        if (schema.items) {
          var item = sampleFromSchema(schema.items, depth + 1);
          return item !== null ? [item] : [];
        }
        return [];
      case 'object':
      default:
        if (!schema.properties) return {};
        var obj = {};
        Object.entries(schema.properties).slice(0, 8).forEach(function (kv) {
          var v = sampleFromSchema(kv[1], depth + 1);
          if (v !== null) obj[kv[0]] = v;
        });
        return obj;
    }
  }

  function hlJson(json) {
    return json.replace(
      /("(?:\\.|[^"\\])*")([ \t]*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      function (match, str, colon, bool, num) {
        if (str !== undefined) {
          var safe = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          if (colon) return '<span class="jk">' + safe + '</span>' + colon;
          return '<span class="jv">' + safe + '</span>';
        }
        if (bool !== undefined) return '<span class="jb">' + bool + '</span>';
        if (num  !== undefined) return '<span class="jn">' + num  + '</span>';
        return match;
      }
    );
  }

  var searchTimer = null;

  function onSearchInput(e) {
    clearTimeout(searchTimer);
    var q = e.target.value;
    searchTimer = setTimeout(function () { q ? doSearch(q.trim()) : onSearchClear(); }, 140);
  }

  function onSearchClear() {
    var nav = document.getElementById('nav');
    nav.innerHTML = buildNav();
    onRoute();
  }

  function doSearch(query) {
    var q       = query.toLowerCase();
    var results = [];
    spec.groups.forEach(function (g) {
      g._flat.forEach(function (ep) {
        if (epMatches(ep, q)) results.push(ep);
      });
    });

    var nav = document.getElementById('nav');
    if (!results.length) {
      nav.innerHTML = '<div style="padding:12px 14px;font-size:12.5px;color:var(--txt-muted)">No results</div>';
      return;
    }

    nav.innerHTML = results.slice(0, 80).map(function (ep, i) {
      return (
        '<div class="nav-ep" style="padding-left:14px" data-search-idx="' + i + '">' +
          '<span class="nav-ep-sum">' + highlight(esc(ep.summary || ep.path), q) + '</span>' +
          '<span class="mtag ' + ep.method + '">' + methodLabel(ep.method) + '</span>' +
        '</div>'
      );
    }).join('');

    nav.querySelectorAll('.nav-ep[data-search-idx]').forEach(function (el, i) {
      el.addEventListener('click', function () {
        var ep = results[i];
        renderEndpoint(ep);
        renderCodePanel(ep);
        document.querySelectorAll('.nav-ep').forEach(function (e2) { e2.classList.remove('active'); });
        el.classList.add('active');
      });
    });
  }

  function epMatches(ep, q) {
    return ep.path.toLowerCase().indexOf(q) !== -1 ||
           ep.summary.toLowerCase().indexOf(q) !== -1 ||
           ep.method.toLowerCase().indexOf(q) !== -1 ||
           ep.description.toLowerCase().indexOf(q) !== -1;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function highlight(html, q) {
    var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return html.replace(new RegExp('(' + safe + ')', 'gi'), '<mark>$1</mark>');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
