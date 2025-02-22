import posthog from 'posthog-js';

posthog.init('YOUR_POSTHOG_API_KEY', { api_host: 'https://app.posthog.com' });

export const trackEvent = (eventName, properties = {}) => {
  posthog.capture(eventName, properties);
};