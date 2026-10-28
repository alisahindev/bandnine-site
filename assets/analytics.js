// bandnine.org analytics: PostHog EU, the app's project. Until the visitor chooses, and after Reject, PostHog
// runs cookieless (a daily server-side hash, nothing stored on the device, no replay or surveys); Accept adds
// cookies and session replay with every input masked. Loaded on every page by docs/site/partials/footer.html.
(() => {
  // The email pages (/band, /unsubscribe) carry the email's token in ?t=, so they send nothing.
  if (/^\/(band|unsubscribe)(\.html)?$/.test(location.pathname)) return;

  // PostHog's snippet (posthog.com/docs/libraries/js): loads the current array.js from eu-assets.i.posthog.com.
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  // A referrer from an email page would still carry its token.
  const scrub = (v) => (typeof v === 'string' ? v.replace(/([?&]t=)[^&#]*/g, '$1<masked>') : v);
  posthog.init('phc_C3kBDa9m3pxJG9PH6EvTTikLCWQGEJY4uTob39Hkbhe5', {
    api_host: 'https://eu.i.posthog.com',
    defaults: '2026-08-30',
    cookieless_mode: 'on_reject',
    opt_out_capturing_by_default: true, // no choice yet counts as Reject: cookieless events, not none
    capture_exceptions: true,
    capture_performance: { web_vitals: true },
    enable_heatmaps: true,
    capture_dead_clicks: true,
    session_recording: { maskAllInputs: true },
    before_send: (e) => { for (const o of [e.properties, e.$set_once]) if (o) for (const k in o) o[k] = scrub(o[k]); return e; },
    loaded: (ph) => { if (ph.get_explicit_consent_status() === 'pending') show(); },
  });

  // The cookie choice: Accept as a button, Reject as a text link. Cookie settings in the footer reopens it.
  let bar;
  function show() {
    if (!bar) {
      bar = document.createElement('section');
      bar.className = 'consent';
      bar.setAttribute('aria-label', 'Cookies');
      bar.innerHTML = '<p>bandnine.org counts visits without cookies. If you accept, it also uses cookies to recognise you when you come back and records how you move through the pages, with anything you type hidden. Read more in the <a href="/privacy#website-analytics">privacy policy</a>.</p><div><button type="button" data-consent="yes">Accept cookies</button><button type="button" data-consent="no">Reject cookies</button></div>';
      document.body.append(bar);
    }
    bar.hidden = false;
  }

  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    const choice = el?.closest('[data-consent]');
    if (choice) {
      if (choice.dataset.consent === 'yes') posthog.opt_in_capturing(); else posthog.opt_out_capturing();
      bar.hidden = true;
      return;
    }
    if (el?.closest('[data-cookies]')) { e.preventDefault(); show(); return; }
    const store = el?.closest('a[data-store]');
    if (store) posthog.capture('store_link_clicked', { store: store.dataset.store === 'ios' ? 'app_store' : 'google_play', page: location.pathname }, { transport: 'sendBeacon', send_instantly: true });
  });
})();
