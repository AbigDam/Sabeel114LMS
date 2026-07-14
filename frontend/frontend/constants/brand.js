// constants/brand.js
// -----------------------------------------------------------------------------
// Organization details for Sabeel 114, used across the app so it feels like
// their own product.
//
// Centralised here so contact info / links live in ONE place. Image assets are
// stored in assets/branding so they render reliably on iOS/Android/Web.
// -----------------------------------------------------------------------------

export const brand = {
  name: 'Sabeel 114',
  shortName: 'Sabeel 114',
  tagline: 'Islamic Learning',
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
