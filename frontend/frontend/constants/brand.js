// constants/brand.js
// -----------------------------------------------------------------------------
// Real organization details for Al-Hidaya Center (Latham, NY), used across the
// app so it feels like their own product. Source: https://www.al-hidaya.org
//
// Centralised here so contact info / links live in ONE place. Image assets are
// downloaded into assets/branding so they render reliably on iOS/Android/Web.
// -----------------------------------------------------------------------------

export const brand = {
  name: 'Sabeel 114',
  shortName: 'Sabeel 114',
  tagline: 'Islamic Community',
  portal: 'School Portal',

  // Contact
  address: '4065 E Plano Pkwy Ste 200, Plano, TX 75074',
  phone: '(469) 891-2797',
  email: 'office@al-hidaya.org',
  website: 'https://www.al-hidaya.org',

  // Social
  social: {
    instagram: 'https://www.instagram.com/sabeel_114/?hl=en',
  },
};

// Local image assets (require() so Metro bundles them for every platform).
export const brandImages = {
  logo: require('../assets/branding/logo.png'),
  masjid: require('../assets/branding/masjid.webp'),
};

export default brand;
