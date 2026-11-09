// GA4 on beto.sh: the one tracking entry point and the page's delegated events.
// The head of each page sets the consent defaults (ads denied everywhere,
// analytics denied in the EU, EEA, UK and Switzerland until consent), the
// guarded config and the tag; only beto.sh reports, so local runs and copies
// send nothing. No event carries personal data: no name, phone, email or
// typed text, only fixed names, page sections and choices from a list.
;(function () {
  var HOST = 'beto.sh'

  function track(event, params) {
    params = params || {}
    var row = { event: event }
    for (var k in params) row[k] = params[k]
    ;(window.dataLayer = window.dataLayer || []).push(row)
    if (location.hostname === HOST && typeof window.gtag === 'function') window.gtag('event', event, params)
  }
  window.betoTrack = track

  // Which part of the page a click came from: the nearest section id, else the
  // header, footer or the floating bar.
  function where(el) {
    var tagged = el.closest('[data-cta-location]')
    if (tagged) return tagged.getAttribute('data-cta-location')
    var sec = el.closest('section[id]')
    if (sec) return sec.id
    if (el.closest('#nav, header')) return 'nav'
    if (el.closest('footer')) return 'footer'
    if (el.closest('#dockbar')) return 'dockbar'
    if (el.closest('#launcher')) return 'launcher'
    return location.pathname
  }
  var text = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a, button')
    if (!a) return
    var href = a.getAttribute('href') || ''
    var loc = where(a)
    if (href.indexOf('tel:') === 0) track('phone_click', { cta_location: loc })
    else if (href.indexOf('mailto:') === 0) track('email_click', { cta_location: loc })
    if (a.hasAttribute('data-chat')) track('chat_open', { cta_location: loc, chat_intent: a.getAttribute('data-chat') || 'general' })
    if (a.hasAttribute('data-ask')) track('ask_chip', { cta_location: loc })
    var sample = href.match(/[?&]sample=([a-z]+)/)
    if (sample) track('sample_open', { sample: sample[1], cta_location: loc })
    if (a.hasAttribute('data-cta') || /#plan$/.test(href)) track('cta_click', { cta_text: text(a), cta_location: loc, destination: href || 'button' })
  }, true)

  // The first focus in a lead form, and the thank-you once the form is sent
  // (saved, or queued to retry: either way the visitor's request is kept).
  var started = []
  document.addEventListener('focusin', function (e) {
    var form = e.target && e.target.closest && e.target.closest('form[data-form-name]')
    if (!form || started.indexOf(form) >= 0) return
    started.push(form)
    track('form_start', { form_name: form.getAttribute('data-form-name') })
  })
  function watchLeads() {
    var forms = document.querySelectorAll('form[data-form-name]')
    for (var i = 0; i < forms.length; i++) (function (form) {
      var interest = ''
      form.addEventListener('submit', function () {
        var c = form.querySelector('input[name="interest"]:checked')
        interest = c ? c.value : ''
      }, true)
      var done = form.parentElement && form.parentElement.querySelector('.lead-done')
      if (!done || !window.MutationObserver) return
      new MutationObserver(function () {
        if (!done.hidden && !done.dataset.tracked) {
          done.dataset.tracked = '1'
          track('generate_lead', { form_name: form.getAttribute('data-form-name'), interest: interest || 'unsure' })
        }
      }).observe(done, { attributes: true, attributeFilter: ['hidden'] })
    })(forms[i])
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchLeads)
  else watchLeads()
})()
